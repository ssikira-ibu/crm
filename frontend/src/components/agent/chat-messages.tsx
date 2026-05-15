"use client";

import type { AgentPendingAction } from "@crm/shared";
import { Bot, Check, X } from "lucide-react";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  Tool,
  ToolContent,
  ToolHeader,
} from "@/components/ai-elements/tool";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import {
  Confirmation,
  ConfirmationAction,
  ConfirmationActions,
  ConfirmationRequest,
  ConfirmationTitle,
} from "@/components/ai-elements/confirmation";
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
  if (messages.length === 0 && pendingActions.length === 0) {
    return (
      <Conversation>
        <ConversationContent>
          <ConversationEmptyState
            icon={<Bot className="size-10 opacity-40" />}
            title="CRM Assistant"
            description="Ask me to search, create, or update anything in your CRM."
          />
        </ConversationContent>
      </Conversation>
    );
  }

  return (
    <Conversation>
      <ConversationContent>
        {messages.map((msg, i) => {
          if (msg.role === "user") {
            return (
              <Message key={i} from="user">
                <MessageContent>
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                </MessageContent>
              </Message>
            );
          }

          const parts =
            msg.parts && msg.parts.length > 0
              ? msg.parts
              : msg.content.length > 0
                ? [{ type: "text" as const, text: msg.content }]
                : [];

          return (
            <Message key={i} from="assistant">
              <MessageContent>
                {parts.length === 0 && (
                  <div className="text-muted-foreground">…</div>
                )}
                {parts.map((part, j) => {
                  if (part.type === "text") {
                    return <MessageResponse key={j}>{part.text}</MessageResponse>;
                  }
                  if (part.type === "reasoning") {
                    const streaming =
                      j === parts.length - 1 &&
                      messages[i] === messages[messages.length - 1];
                    return (
                      <Reasoning
                        key={j}
                        isStreaming={streaming}
                        defaultOpen={false}
                      >
                        <ReasoningTrigger />
                        <ReasoningContent>{part.text}</ReasoningContent>
                      </Reasoning>
                    );
                  }
                  return (
                    <Tool key={j} defaultOpen={false}>
                      <ToolHeader
                        title={part.tool.description}
                        type={`tool-${part.tool.name}` as `tool-${string}`}
                        state={
                          part.tool.status === "running"
                            ? "input-available"
                            : "output-available"
                        }
                      />
                      <ToolContent />
                    </Tool>
                  );
                })}
              </MessageContent>
            </Message>
          );
        })}

        {pendingActions.map((action) => (
          <Message key={action.id} from="assistant">
            <MessageContent>
              <Confirmation
                approval={{ id: action.id }}
                state={"approval-requested" as never}
              >
                <ConfirmationTitle>{action.summary}</ConfirmationTitle>
                <ConfirmationRequest>
                  Approve this action?
                </ConfirmationRequest>
                <ConfirmationActions>
                  <ConfirmationAction
                    variant="outline"
                    onClick={() => onRejectAction(action.id)}
                  >
                    <X className="size-4" />
                    Reject
                  </ConfirmationAction>
                  <ConfirmationAction
                    onClick={() => onApproveAction(action.id)}
                  >
                    <Check className="size-4" />
                    Approve
                  </ConfirmationAction>
                </ConfirmationActions>
              </Confirmation>
            </MessageContent>
          </Message>
        ))}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
}
