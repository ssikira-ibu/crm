"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Bot, RotateCcw } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAgentChat } from "@/hooks/use-agent-chat";
import { ChatMessages } from "./chat-messages";
import { ChatInput } from "./chat-input";

export function ChatPanel() {
  const [open, setOpen] = useState(false);
  const {
    messages,
    isStreaming,
    activeTools,
    pendingActions,
    sendMessage,
    approveAction,
    rejectAction,
    clearChat,
  } =
    useAgentChat();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
            >
              <Bot className="size-4" />
            </Button>
          </SheetTrigger>
        </TooltipTrigger>
        <TooltipContent side="right">AI Assistant</TooltipContent>
      </Tooltip>
      <SheetContent
        side="right"
        className="flex flex-col w-full sm:max-w-md p-0"
      >
        <SheetHeader className="flex flex-row items-center justify-between px-4 py-3 border-b space-y-0">
          <SheetTitle className="text-sm font-medium">AI Assistant</SheetTitle>
          {messages.length > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={clearChat}
                >
                  <RotateCcw className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>New conversation</TooltipContent>
            </Tooltip>
          )}
        </SheetHeader>
        <ChatMessages
          messages={messages}
          activeTools={activeTools}
          pendingActions={pendingActions}
          onApproveAction={approveAction}
          onRejectAction={rejectAction}
        />
        <ChatInput onSend={sendMessage} disabled={isStreaming} />
      </SheetContent>
    </Sheet>
  );
}
