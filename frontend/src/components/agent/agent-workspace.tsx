"use client";

import {
  Bot,
  Clock,
  Search,
  RotateCcw,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAgentChat } from "@/hooks/use-agent-chat";
import { ChatInput } from "./chat-input";
import { ChatMessages } from "./chat-messages";

const SUGGESTED_ACTIONS = [
  {
    label: "What needs attention?",
    prompt: "What needs my attention in the CRM today?",
    icon: Sparkles,
  },
  {
    label: "Find follow-ups",
    prompt: "Find companies that need a follow-up and suggest the next action for each.",
    icon: Clock,
  },
  {
    label: "Review pipeline",
    prompt: "Review my open deals and summarize the highest-priority opportunities.",
    icon: TrendingUp,
  },
  {
    label: "Search records",
    prompt: "Search the CRM for recent notes, tasks, and activities related to active accounts.",
    icon: Search,
  },
] as const;

export function AgentWorkspace() {
  const {
    messages,
    isStreaming,
    pendingActions,
    sendMessage,
    approveAction,
    rejectAction,
    stopStreaming,
    clearChat,
  } = useAgentChat();
  const hasConversation = messages.length > 0 || pendingActions.length > 0;

  return (
    <div className="flex h-[calc(100svh-2.5rem)] min-h-0 flex-col overflow-hidden md:h-svh">
      <div className="border-b px-4 py-3">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-lg border bg-background">
              <Bot />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Agent</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isStreaming ? "secondary" : "outline"}>
              {isStreaming ? "Working" : "Ready"}
            </Badge>
            {pendingActions.length > 0 && (
              <Badge variant="destructive">{pendingActions.length} pending</Badge>
            )}
            {messages.length > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={clearChat}>
                    <RotateCcw />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>New conversation</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </div>

      <div className="flex min-h-0 w-full flex-1 flex-col">
        {hasConversation ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <ChatMessages
                messages={messages}
                pendingActions={pendingActions}
                onApproveAction={approveAction}
                onRejectAction={rejectAction}
                emptyTitle="CRM Agent"
                emptyDescription="Ask about companies, contacts, deals, tasks, notes, and activity."
                conversationClassName="w-full"
                contentClassName="mx-auto w-full max-w-3xl px-6 pt-10 pb-28"
              />
            </div>
            <div className="pointer-events-none relative px-6 pb-4">
              <div className="pointer-events-none absolute inset-x-0 -top-10 h-10 bg-linear-to-t from-background to-transparent" />
              <div className="pointer-events-auto relative mx-auto w-full max-w-3xl">
                <ChatInput
                  onSend={sendMessage}
                  onStop={stopStreaming}
                  disabled={isStreaming}
                  isStreaming={isStreaming}
                />
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  AI can make mistakes. Check important info.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 pb-20">
            <h2 className="text-center text-2xl font-medium tracking-tight md:text-3xl">
              What are you working on?
            </h2>
            <div className="w-full max-w-3xl">
              <ChatInput
                onSend={sendMessage}
                onStop={stopStreaming}
                disabled={isStreaming}
                isStreaming={isStreaming}
                autoFocus
                large
              />
            </div>
            <div className="flex max-w-3xl flex-wrap items-center justify-center gap-2">
              {SUGGESTED_ACTIONS.map(({ label, prompt, icon: Icon }) => (
                <Button
                  key={label}
                  variant="outline"
                  size="sm"
                  className="rounded-full bg-background/60 px-3 text-muted-foreground shadow-none hover:text-foreground"
                  onClick={() => sendMessage(prompt)}
                  disabled={isStreaming}
                >
                  <Icon data-icon="inline-start" />
                  {label}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
