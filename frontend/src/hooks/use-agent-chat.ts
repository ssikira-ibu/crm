"use client";

import { useState, useCallback, useRef } from "react";
import type { AgentMessage, AgentPendingAction, AgentSSEEvent } from "@crm/shared";

interface UseAgentChatReturn {
  messages: AgentMessage[];
  isStreaming: boolean;
  conversationId: string | null;
  activeTools: string[];
  pendingActions: AgentPendingAction[];
  sendMessage: (message: string) => void;
  approveAction: (actionId: string) => void;
  rejectAction: (actionId: string) => void;
  clearChat: () => void;
}

/**
 * Open an SSE stream against `url` and dispatch each event. Implements proper
 * SSE framing: events are separated by blank lines (`\n\n`); within each event
 * we read the `data:` field and parse it as JSON. The previous implementation
 * split on `\n` and broke if any payload contained a literal newline.
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

    // SSE event boundary is a blank line. Split on \n\n, the last fragment is
    // an incomplete event we keep buffered.
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
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [pendingActions, setPendingActions] = useState<AgentPendingAction[]>([]);
  // activeTools keyed by tool_use id (when the agent provides one), so
  // parallel tool calls don't clobber each other's labels.
  const [activeToolMap, setActiveToolMap] = useState<Map<string, string>>(new Map());
  const abortRef = useRef<AbortController | null>(null);

  const activeTools = Array.from(activeToolMap.values());

  const consumeStream = useCallback(
    async (url: string, body: object) => {
      const controller = new AbortController();
      abortRef.current = controller;
      let assistantText = "";

      const assistantMsg: AgentMessage = {
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
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last?.role === "assistant") {
                    updated[updated.length - 1] = { ...last, content: assistantText };
                  }
                  return updated;
                });
                break;
              case "tool_start":
                setActiveToolMap((prev) => {
                  const next = new Map(prev);
                  // No tool_use id is exposed today; key on tool name so the
                  // matching tool_end clears it.
                  next.set(event.tool, event.description);
                  return next;
                });
                break;
              case "tool_end":
                setActiveToolMap((prev) => {
                  if (!prev.has(event.tool)) return prev;
                  const next = new Map(prev);
                  next.delete(event.tool);
                  return next;
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
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last?.role === "assistant") {
                    updated[updated.length - 1] = { ...last, content: assistantText };
                  }
                  return updated;
                });
                break;
            }
          },
        );
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last?.role === "assistant") {
            updated[updated.length - 1] = {
              ...last,
              content: "Sorry, I encountered an error. Please try again.",
            };
          }
          return updated;
        });
      } finally {
        setActiveToolMap(new Map());
        abortRef.current = null;
      }
    },
    [],
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
        await consumeStream("/api/agent/chat", { message, conversationId });
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
    setActiveToolMap(new Map());
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
    activeTools,
    pendingActions,
    sendMessage,
    approveAction,
    rejectAction,
    clearChat,
  };
}
