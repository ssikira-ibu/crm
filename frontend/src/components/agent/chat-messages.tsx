"use client";

import { useEffect, useRef } from "react";
import type { AgentMessage, AgentPendingAction } from "@crm/shared";
import { cn } from "@/lib/utils";
import { Bot, Check, ShieldAlert, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatMessagesProps {
  messages: AgentMessage[];
  activeTools: string[];
  pendingActions: AgentPendingAction[];
  onApproveAction: (actionId: string) => void;
  onRejectAction: (actionId: string) => void;
}

export function ChatMessages({
  messages,
  activeTools,
  pendingActions,
  onApproveAction,
  onRejectAction,
}: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeTools, pendingActions]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-center text-muted-foreground">
        <div>
          <Bot className="size-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium">CRM Assistant</p>
          <p className="text-xs mt-1">
            Ask me to search, create, or update anything in your CRM.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-3">
      {messages.map((msg, i) => (
        <div
          key={i}
          className={cn(
            "flex gap-2",
            msg.role === "user" ? "justify-end" : "justify-start",
          )}
        >
          {msg.role === "assistant" && (
            <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
              <Bot className="size-3.5 text-primary" />
            </div>
          )}
          <div
            className={cn(
              "rounded-lg px-3 py-2 text-sm max-w-[85%] whitespace-pre-wrap",
              msg.role === "user"
                ? "bg-primary text-primary-foreground"
                : "bg-muted",
            )}
          >
            {msg.content || (msg.role === "assistant" ? "..." : "")}
          </div>
          {msg.role === "user" && (
            <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted mt-0.5">
              <User className="size-3.5" />
            </div>
          )}
        </div>
      ))}
      {activeTools.length > 0 && (
        <div className="flex gap-2 items-center text-xs text-muted-foreground animate-pulse">
          <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Bot className="size-3.5 text-primary" />
          </div>
          {activeTools[0]}
        </div>
      )}
      {pendingActions.map((action) => (
        <div key={action.id} className="flex gap-2 justify-start">
          <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-amber-500/10 mt-0.5">
            <ShieldAlert className="size-3.5 text-amber-600" />
          </div>
          <div className="w-[85%] rounded-lg border bg-background p-3 text-sm">
            <div className="font-medium">Confirm agent action</div>
            <div className="mt-1 text-muted-foreground">{action.summary}</div>
            <div className="mt-3 flex gap-2">
              <Button size="sm" onClick={() => onApproveAction(action.id)}>
                <Check className="size-4" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onRejectAction(action.id)}
              >
                <X className="size-4" />
                Reject
              </Button>
            </div>
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
