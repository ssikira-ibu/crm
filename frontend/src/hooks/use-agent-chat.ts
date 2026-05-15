"use client";

import { useState, useCallback, useRef } from "react";
import type { AgentMessage, AgentSSEEvent } from "@crm/shared";

interface UseAgentChatReturn {
  messages: AgentMessage[];
  isStreaming: boolean;
  conversationId: string | null;
  activeTools: string[];
  sendMessage: (message: string) => void;
  clearChat: () => void;
}

export function useAgentChat(): UseAgentChatReturn {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [activeTools, setActiveTools] = useState<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (message: string) => {
      if (isStreaming) return;

      const userMsg: AgentMessage = {
        role: "user",
        content: message,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsStreaming(true);
      setActiveTools([]);

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
        const res = await fetch("/api/agent/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message, conversationId }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          throw new Error("Failed to connect to agent");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const event: AgentSSEEvent = JSON.parse(line.slice(6));

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
                    setActiveTools((prev) => [...prev, event.description]);
                    break;
                  case "tool_end":
                    setActiveTools((prev) => prev.slice(1));
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
              } catch {
                // skip malformed events
              }
            }
          }
        }
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
        setIsStreaming(false);
        setActiveTools([]);
        abortRef.current = null;
      }
    },
    [isStreaming, conversationId],
  );

  const clearChat = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    setMessages([]);
    setConversationId(null);
    setIsStreaming(false);
    setActiveTools([]);
  }, []);

  return { messages, isStreaming, conversationId, activeTools, sendMessage, clearChat };
}
