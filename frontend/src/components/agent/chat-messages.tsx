"use client";

import { useEffect, useRef } from "react";
import type { AgentPendingAction } from "@crm/shared";
import { cn } from "@/lib/utils";
import { Bot, Check, Loader2, ShieldAlert, User, Wrench, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { UIAgentMessage } from "@/hooks/use-agent-chat";

interface ChatMessagesProps {
  messages: UIAgentMessage[];
  pendingActions: AgentPendingAction[];
  onApproveAction: (actionId: string) => void;
  onRejectAction: (actionId: string) => void;
}

export function ChatMessages({
  messages,
  pendingActions,
  onApproveAction,
  onRejectAction,
}: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pendingActions]);

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
      {messages.map((msg, i) => {
        if (msg.role === "user") {
          return (
            <div key={i} className="flex gap-2 justify-end">
              <div className="rounded-lg px-3 py-2 text-sm max-w-[85%] whitespace-pre-wrap bg-primary text-primary-foreground">
                {msg.content}
              </div>
              <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted mt-0.5">
                <User className="size-3.5" />
              </div>
            </div>
          );
        }

        const hasTools = (msg.toolEvents?.length ?? 0) > 0;
        const hasText = msg.content.length > 0;
        return (
          <div key={i} className="flex gap-2 justify-start">
            <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
              <Bot className="size-3.5 text-primary" />
            </div>
            <div className="flex flex-col gap-1.5 max-w-[85%]">
              {msg.toolEvents?.map((evt, j) => (
                <div
                  key={j}
                  className={cn(
                    "flex items-center gap-1.5 text-xs px-2 py-1 rounded-md border bg-muted/40 w-fit",
                    evt.status === "running" && "text-muted-foreground",
                  )}
                >
                  {evt.status === "running" ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <Wrench className="size-3 text-muted-foreground" />
                  )}
                  <span>{evt.description}</span>
                </div>
              ))}
              {/* Show text bubble when we have text, or as a placeholder while
                  tools are running and no text has streamed yet. */}
              {(hasText || !hasTools) && (
                <div className="rounded-lg px-3 py-2 text-sm whitespace-pre-wrap bg-muted">
                  {msg.content || "…"}
                </div>
              )}
            </div>
          </div>
        );
      })}
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
