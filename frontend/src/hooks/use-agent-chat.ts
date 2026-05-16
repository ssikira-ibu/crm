"use client";

import { useState, useCallback, useRef } from "react";
import type { AgentMessage, AgentPendingAction, AgentSSEEvent } from "@crm/shared";

export interface ToolEvent {
  name: string;
  description: string;
  status: "running" | "done";
  summary?: string;
}

export type AgentPart =
  | { type: "text"; text: string }
  | { type: "reasoning"; text: string }
  | { type: "tool"; tool: ToolEvent };

/**
 * UI-only extension of AgentMessage. `parts` preserves the order in which
 * text deltas and tool calls arrived from the agent — the model can emit
 * text, then a tool call, then more text in a single turn, and the UI must
 * render them in that order. `content` is kept as the concatenated text for
 * back-compat with the AgentMessage type.
 */
export interface UIAgentMessage extends AgentMessage {
  parts?: AgentPart[];
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
  stopStreaming: () => void;
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

      // Reserve the assistant bubble before any deltas arrive.
      const assistantMsg: UIAgentMessage = {
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
        parts: [],
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
                updateLastAssistant((m) => {
                  const parts = [...(m.parts ?? [])];
                  const last = parts[parts.length - 1];
                  if (last?.type === "text") {
                    parts[parts.length - 1] = {
                      type: "text",
                      text: last.text + event.delta,
                    };
                  } else {
                    parts.push({ type: "text", text: event.delta });
                  }
                  return {
                    ...m,
                    parts,
                    content: m.content + event.delta,
                  };
                });
                break;
              case "thinking_delta":
                updateLastAssistant((m) => {
                  const parts = [...(m.parts ?? [])];
                  const last = parts[parts.length - 1];
                  if (last?.type === "reasoning") {
                    parts[parts.length - 1] = {
                      type: "reasoning",
                      text: last.text + event.delta,
                    };
                  } else {
                    parts.push({ type: "reasoning", text: event.delta });
                  }
                  return { ...m, parts };
                });
                break;
              case "tool_start":
                updateLastAssistant((m) => {
                  const tool: ToolEvent = {
                    name: event.tool,
                    description: event.description,
                    status: "running",
                  };
                  return {
                    ...m,
                    parts: [...(m.parts ?? []), { type: "tool", tool }],
                    toolEvents: [...(m.toolEvents ?? []), tool],
                  };
                });
                break;
              case "tool_end":
                updateLastAssistant((m) => {
                  const parts = [...(m.parts ?? [])];
                  for (let i = parts.length - 1; i >= 0; i--) {
                    const p = parts[i];
                    if (
                      p.type === "tool" &&
                      p.tool.name === event.tool &&
                      p.tool.status === "running"
                    ) {
                      parts[i] = {
                        type: "tool",
                        tool: { ...p.tool, status: "done", ...(event.summary ? { summary: event.summary } : {}) },
                      };
                      break;
                    }
                  }
                  const events = [...(m.toolEvents ?? [])];
                  for (let i = events.length - 1; i >= 0; i--) {
                    if (events[i].name === event.tool && events[i].status === "running") {
                      events[i] = { ...events[i], status: "done", ...(event.summary ? { summary: event.summary } : {}) };
                      break;
                    }
                  }
                  return { ...m, parts, toolEvents: events };
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
              case "error": {
                const errorText = `\n\n*Error: ${event.message}*`;
                updateLastAssistant((m) => {
                  const parts = [...(m.parts ?? [])];
                  const last = parts[parts.length - 1];
                  if (last?.type === "text") {
                    parts[parts.length - 1] = {
                      type: "text",
                      text: last.text + errorText,
                    };
                  } else {
                    parts.push({ type: "text", text: errorText });
                  }
                  return { ...m, parts, content: m.content + errorText };
                });
                break;
              }
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

  const stopStreaming = useCallback(() => {
    if (!abortRef.current) return;
    abortRef.current.abort();
    abortRef.current = null;
    setIsStreaming(false);
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
    stopStreaming,
    clearChat,
  };
}
