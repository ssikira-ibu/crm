"use client";

import { useState, useCallback, useRef } from "react";
import type { AgentMessage, AgentPendingAction, AgentSSEEvent } from "@crm/shared";

export interface ToolEvent {
  name: string;
  description: string;
  status: "running" | "done";
}

/**
 * UI-only extension of AgentMessage that captures the tool calls fired
 * during this assistant turn. Stored on the message so the timeline
 * shows which tools were used, even after they finish.
 */
export interface UIAgentMessage extends AgentMessage {
  toolEvents?: ToolEvent[];
}

interface UseAgentChatReturn {
  messages: UIAgentMessage[];
  isStreaming: boolean;
  conversationId: string | null;
  pendingActions: AgentPendingAction[];
  sendMessage: (message: string) => void;
  approveAction: (actionId: string) => void;
  rejectAction: (actionId: string) => void;
  clearChat: () => void;
}

/**
 * Open an SSE stream against `url` and dispatch each event. Implements proper
 * SSE framing: events are separated by blank lines (`\n\n`); within each event
 * we read the `data:` field and parse it as JSON.
 */
async function streamSSE(
  url: string,
  init: RequestInit,
  onEvent: (event: AgentSSEEvent) => void,
): Promise<void> {
  const res = await fetch(url, init);
  if (!res.ok || !res.body) {
    throw new Error(`Failed to open stream: ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";

    for (const frame of frames) {
      const dataLines = frame
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart());
      if (dataLines.length === 0) continue;
      try {
        const event: AgentSSEEvent = JSON.parse(dataLines.join("\n"));
        onEvent(event);
      } catch {
        // skip malformed events
      }
    }
  }
}

export function useAgentChat(): UseAgentChatReturn {
  const [messages, setMessages] = useState<UIAgentMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [pendingActions, setPendingActions] = useState<AgentPendingAction[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  // Updates to the last assistant message in `messages`. All SSE events
  // affecting the in-flight assistant turn flow through this helper so we
  // don't open-code the same array slice everywhere.
  const updateLastAssistant = useCallback(
    (mutator: (msg: UIAgentMessage) => UIAgentMessage) => {
      setMessages((prev) => {
        const updated = [...prev];
        const idx = updated.length - 1;
        const last = updated[idx];
        if (last?.role === "assistant") {
          updated[idx] = mutator(last);
        }
        return updated;
      });
    },
    [],
  );

  const consumeStream = useCallback(
    async (url: string, body: object) => {
      const controller = new AbortController();
      abortRef.current = controller;
      let assistantText = "";

      // Reserve the assistant bubble before any deltas arrive.
      const assistantMsg: UIAgentMessage = {
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);

      try {
        await streamSSE(
          url,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            signal: controller.signal,
          },
          (event) => {
            switch (event.type) {
              case "text_delta":
                assistantText += event.delta;
                updateLastAssistant((m) => ({ ...m, content: assistantText }));
                break;
              case "tool_start":
                updateLastAssistant((m) => ({
                  ...m,
                  toolEvents: [
                    ...(m.toolEvents ?? []),
                    {
                      name: event.tool,
                      description: event.description,
                      status: "running",
                    },
                  ],
                }));
                break;
              case "tool_end":
                updateLastAssistant((m) => {
                  const events = m.toolEvents ?? [];
                  // Mark the latest running event with this tool name as done.
                  for (let i = events.length - 1; i >= 0; i--) {
                    if (events[i].name === event.tool && events[i].status === "running") {
                      const next = [...events];
                      next[i] = { ...next[i], status: "done" };
                      return { ...m, toolEvents: next };
                    }
                  }
                  return m;
                });
                break;
              case "confirmation_required":
                setPendingActions((prev) =>
                  prev.some((a) => a.id === event.action.id) ? prev : [...prev, event.action],
                );
                break;
              case "done":
                setConversationId(event.conversationId);
                break;
              case "error":
                assistantText += `\n\n*Error: ${event.message}*`;
                updateLastAssistant((m) => ({ ...m, content: assistantText }));
                break;
            }
          },
        );
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        updateLastAssistant((m) => ({
          ...m,
          content: "Sorry, I encountered an error. Please try again.",
        }));
      } finally {
        abortRef.current = null;
      }
    },
    [updateLastAssistant],
  );

  const sendMessage = useCallback(
    async (message: string) => {
      if (isStreaming) return;

      setMessages((prev) => [
        ...prev,
        { role: "user", content: message, createdAt: new Date().toISOString() },
      ]);
      setIsStreaming(true);

      try {
        await consumeStream(
          "/api/agent/chat",
          conversationId ? { message, conversationId } : { message },
        );
      } finally {
        setIsStreaming(false);
      }
    },
    [isStreaming, conversationId, consumeStream],
  );

  const clearChat = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    setMessages([]);
    setConversationId(null);
    setIsStreaming(false);
    setPendingActions([]);
  }, []);

  const settleAction = useCallback(
    async (actionId: string, decision: "approve" | "reject") => {
      const res = await fetch(`/api/agent/actions/${actionId}/${decision}`, {
        method: "POST",
      });
      if (!res.ok) {
        throw new Error(`Failed to ${decision} action`);
      }

      setPendingActions((prev) => prev.filter((a) => a.id !== actionId));

      // The backend has appended a real tool_result to the conversation
      // transcript. Resume the agent so it can react to that result.
      if (!conversationId) return;
      setIsStreaming(true);
      try {
        await consumeStream("/api/agent/resume", { conversationId });
      } finally {
        setIsStreaming(false);
      }
    },
    [conversationId, consumeStream],
  );

  const approveAction = useCallback(
    (actionId: string) => {
      void settleAction(actionId, "approve");
    },
    [settleAction],
  );

  const rejectAction = useCallback(
    (actionId: string) => {
      void settleAction(actionId, "reject");
    },
    [settleAction],
  );

  return {
    messages,
    isStreaming,
    conversationId,
    pendingActions,
    sendMessage,
    approveAction,
    rejectAction,
    clearChat,
  };
}
