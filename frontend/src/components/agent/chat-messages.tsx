"use client";

import type { AgentPendingAction } from "@crm/shared";
import {
  AlertTriangle,
  Bot,
  Check,
  CheckCircle2,
  LoaderCircle,
  PencilLine,
  X,
} from "lucide-react";
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
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ToolEvent, UIAgentMessage } from "@/hooks/use-agent-chat";

interface ChatMessagesProps {
  messages: UIAgentMessage[];
  pendingActions: AgentPendingAction[];
  onApproveAction: (actionId: string) => void;
  onRejectAction: (actionId: string) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  conversationClassName?: string;
  contentClassName?: string;
}

const COMPLETED_TOOL_LABELS: Record<string, string> = {
  "Searching CRM...": "Searched CRM",
  "Loading dashboard...": "Loaded dashboard",
  "Listing companies...": "Listed companies",
  "Loading company...": "Loaded company",
  "Loading pipeline overview...": "Loaded pipeline overview",
  "Loading deal details...": "Loaded deal details",
  "Loading tasks...": "Loaded tasks",
  "Loading recent events...": "Loaded recent events",
  "Loading contacts...": "Loaded contacts",
  "Loading pipelines...": "Loaded pipelines",
  "Logging activity...": "Logged activity",
  "Creating task...": "Created task",
  "Creating note...": "Created note",
  "Creating company...": "Created company",
  "Creating contact...": "Created contact",
  "Creating deal...": "Created deal",
  "Updating deal...": "Updated deal",
  "Updating task...": "Updated task",
  "Updating company...": "Updated company",
  "Loading tags...": "Loaded tags",
  "Adding tag...": "Added tag",
  "Removing tag...": "Removed tag",
};

const ACTION_LABELS: Record<string, string> = {
  update_deal: "Update deal",
  update_task: "Update task",
  update_company: "Update company",
  add_tag_to_company: "Add tag",
  remove_tag_from_company: "Remove tag",
};

const ID_FIELDS = new Set(["companyId", "dealId", "taskId", "tagId"]);
const ID_LABELS: Record<string, string> = {
  companyId: "Company",
  dealId: "Deal",
  taskId: "Task",
  tagId: "Tag",
};

const TARGET_LABELS: Record<string, string> = {
  company: "Company",
  deal: "Deal",
  task: "Task",
  tag: "Tag",
};

function toolLabel(tool: ToolEvent) {
  if (tool.status === "done") {
    const normalized = tool.description.replace(/…$/, "...");
    return COMPLETED_TOOL_LABELS[normalized] ?? tool.description.replace(/(?:\.\.\.|…)$/, "");
  }
  return tool.description;
}

function AgentToolActivity({ tool }: { tool: ToolEvent }) {
  const done = tool.status === "done";
  const label = toolLabel(tool);

  return (
    <Badge
      variant={done ? "outline" : "secondary"}
      className={cn(
        "not-prose h-7 w-fit rounded-full px-2.5 text-sm",
        done && "border-emerald-500/20 bg-emerald-500/5 text-muted-foreground",
      )}
    >
      {done ? (
        <CheckCircle2 data-icon="inline-start" className="text-emerald-500" />
      ) : (
        <LoaderCircle data-icon="inline-start" className="animate-spin" />
      )}
      {label}
    </Badge>
  );
}

function formatFieldName(key: string) {
  return key
    .replace(/Id$/, "")
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (char) => char.toUpperCase());
}

function formatValue(value: unknown): string {
  if (value === null) return "None";
  if (value === undefined) return "Not set";
  if (value instanceof Date) return value.toLocaleDateString();
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
      return new Date(value).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
    if (/^[A-Z][A-Z0-9_]+$/.test(value)) {
      return value
        .toLowerCase()
        .replaceAll("_", " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());
    }
  }
  if (Array.isArray(value)) return value.map(formatValue).join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function isHexColor(value: unknown) {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
}

function shortId(value: unknown) {
  const id = String(value);
  if (id.length <= 12) return id;
  return `${id.slice(0, 8)}…${id.slice(-6)}`;
}

function approvalContext(action: AgentPendingAction) {
  const input = action.input;
  switch (action.toolName) {
    case "update_task": {
      const changes: string[] = [];
      if ("status" in input) changes.push(`set status to ${formatValue(input.status)}`);
      if ("priority" in input) changes.push(`set priority to ${formatValue(input.priority)}`);
      if ("dueDate" in input) changes.push(`set due date to ${formatValue(input.dueDate)}`);
      if ("title" in input) changes.push("rename the task");
      if ("description" in input) changes.push("update the task description");
      return {
        title: "Task update",
        description:
          changes.length > 0
            ? `This will ${changes.join(", ")}.`
            : "This will update the selected task.",
        details: ["Tasks may appear differently on dashboards, timelines, and company records."],
      };
    }
    case "update_deal":
      return {
        title: "Deal update",
        description: "This will update an existing deal in the pipeline.",
        details: [
          "Pipeline views and forecast totals may change if stage, value, or close date is updated.",
        ],
      };
    case "update_company":
      return {
        title: "Company update",
        description: "This will update the company profile fields shown across the CRM.",
        details: ["Company lists, search results, and linked record headers may reflect this change."],
      };
    case "add_tag_to_company":
      return {
        title: "Tag company",
        description: "This will add the selected tag to the company.",
        details: ["Tagged companies may appear in saved filters, segments, or search results."],
      };
    case "remove_tag_from_company":
      return {
        title: "Remove company tag",
        description: "This will remove the selected tag from the company.",
        details: ["The company may no longer appear in filters or segments based on this tag."],
      };
    default:
      return {
        title: "CRM change",
        description: "This will apply a change to your CRM data.",
        details: ["Review the proposed payload before approving."],
      };
  }
}

function ApprovalCard({
  action,
  onApprove,
  onReject,
}: {
  action: AgentPendingAction;
  onApprove: (actionId: string) => void;
  onReject: (actionId: string) => void;
}) {
  const targetEntries = Object.entries(action.input).filter(([key]) => ID_FIELDS.has(key));
  const changeEntries = Object.entries(action.input).filter(([key]) => !ID_FIELDS.has(key));
  const actionLabel = ACTION_LABELS[action.toolName] ?? action.toolName.replaceAll("_", " ");
  const context = approvalContext(action);
  const target = action.context?.target;
  const related = action.context?.related ?? [];
  const currentEntries = Object.entries(action.context?.current ?? {}).filter(([, value]) => value);
  const primaryTarget = targetEntries[0];
  const summaryLooksRedundant = primaryTarget
    ? action.summary.toLowerCase().includes(String(primaryTarget[1]).toLowerCase())
    : false;
  const showTechnicalTargets = !target && related.length === 0;

  return (
    <div className="not-prose w-full max-w-2xl rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-muted/40">
            <PencilLine />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold">{actionLabel}</h3>
              <Badge variant="destructive" className="rounded-full">
                <AlertTriangle data-icon="inline-start" />
                Approval required
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {target
                ? `${TARGET_LABELS[target.type] ?? "Record"}: ${target.label}`
                : summaryLooksRedundant
                ? context.description
                : action.summary}
            </p>
            {target?.subtitle && (
              <p className="mt-0.5 text-xs text-muted-foreground">{target.subtitle}</p>
            )}
          </div>
        </div>

        {(target || related.length > 0) && (
          <div className="grid gap-2 rounded-lg border bg-muted/20 p-3 md:grid-cols-2">
            {target && (
              <div>
                <div className="text-xs font-medium text-muted-foreground">
                  Updating
                </div>
                <div className="mt-1 truncate text-sm font-medium">{target.label}</div>
                {target.subtitle && (
                  <div className="text-xs text-muted-foreground">{formatValue(target.subtitle)}</div>
                )}
              </div>
            )}
            {related.map((item) => (
              <div key={`${item.type}-${item.id}`}>
                <div className="text-xs font-medium text-muted-foreground">
                  Related {TARGET_LABELS[item.type] ?? item.type}
                </div>
                <div className="mt-1 truncate text-sm font-medium">{item.label}</div>
                {isHexColor(item.subtitle) ? (
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span
                      className="size-2.5 rounded-full border"
                      style={{ backgroundColor: item.subtitle ?? undefined }}
                    />
                    Tag color
                  </div>
                ) : item.subtitle ? (
                  <div className="text-xs text-muted-foreground">{formatValue(item.subtitle)}</div>
                ) : null}
              </div>
            ))}
          </div>
        )}

        <div className="rounded-lg border bg-muted/20 px-3 py-2.5">
          <div className="text-sm font-medium">{context.title}</div>
          {context.details.map((detail) => (
            <div key={detail} className="mt-1 text-xs text-muted-foreground">
              {detail}
            </div>
          ))}
        </div>

        {currentEntries.length > 0 && (
          <div className="rounded-lg border bg-muted/10">
            <div className="border-b px-3 py-2 text-xs font-medium text-muted-foreground">
              Current record
            </div>
            <div className="grid gap-0 sm:grid-cols-3">
              {currentEntries.map(([key, value]) => (
                <div key={key} className="border-b px-3 py-2 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
                  <div className="text-xs text-muted-foreground">{key}</div>
                  <div className="mt-1 truncate text-sm font-medium">{formatValue(value)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {showTechnicalTargets && targetEntries.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {targetEntries.map(([key, value]) => (
              <Badge key={key} variant="outline" className="rounded-full">
                <span className="text-muted-foreground">{ID_LABELS[key] ?? formatFieldName(key)}</span>
                <span className="font-mono">{shortId(value)}</span>
              </Badge>
            ))}
          </div>
        )}

        {changeEntries.length > 0 && (
          <div className="rounded-lg border bg-muted/20">
            <div className="border-b px-3 py-2 text-xs font-medium text-muted-foreground">
              Proposed changes
            </div>
            <div className="divide-y">
              {changeEntries.map(([key, value]) => (
                <div key={key} className="grid grid-cols-[9rem_1fr] gap-3 px-3 py-2 text-sm">
                  <div className="text-muted-foreground">{formatFieldName(key)}</div>
                  <div className="min-w-0 break-words font-medium">{formatValue(value)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" onClick={() => onReject(action.id)}>
            <X data-icon="inline-start" />
            Reject
          </Button>
          <Button onClick={() => onApprove(action.id)}>
            <Check data-icon="inline-start" />
            Approve
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ChatMessages({
  messages,
  pendingActions,
  onApproveAction,
  onRejectAction,
  emptyTitle = "CRM Assistant",
  emptyDescription = "Ask me to search, create, or update anything in your CRM.",
  conversationClassName,
  contentClassName,
}: ChatMessagesProps) {
  if (messages.length === 0 && pendingActions.length === 0) {
    return (
      <Conversation className={conversationClassName}>
        <ConversationContent className={contentClassName}>
          <ConversationEmptyState
            icon={<Bot className="size-10 opacity-40" />}
            title={emptyTitle}
            description={emptyDescription}
          />
        </ConversationContent>
      </Conversation>
    );
  }

  return (
    <Conversation className={conversationClassName}>
      <ConversationContent className={contentClassName}>
        {messages.map((msg, i) => {
          if (msg.role === "user") {
            return (
              <Message key={i} from="user" className="max-w-[72%]">
                <MessageContent className="rounded-[22px]! bg-[#003f7a]! px-4! py-2.5! text-base text-[#f5faff]! leading-6">
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
            <Message key={i} from="assistant" className="max-w-none">
              <MessageContent className="w-full max-w-3xl gap-4 overflow-visible text-base leading-7 [&>div:not(.not-prose)]:max-w-3xl">
                {parts.length === 0 && (
                  <div className="text-muted-foreground">…</div>
                )}
                {parts.map((part, j) => {
                  if (part.type === "text") {
                    return (
                      <MessageResponse
                        key={j}
                        className="[&_p]:my-3 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0"
                      >
                        {part.text}
                      </MessageResponse>
                    );
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
                        className="mb-0"
                      >
                        <ReasoningTrigger className="w-fit text-xs" />
                        <ReasoningContent className="mt-2 rounded-lg border bg-muted/30 p-3">
                          {part.text}
                        </ReasoningContent>
                      </Reasoning>
                    );
                  }
                  return <AgentToolActivity key={j} tool={part.tool} />;
                })}
              </MessageContent>
            </Message>
          );
        })}

        {pendingActions.map((action) => (
          <Message key={action.id} from="assistant" className="max-w-none">
            <MessageContent className="w-full max-w-3xl overflow-visible">
              <ApprovalCard
                action={action}
                onApprove={onApproveAction}
                onReject={onRejectAction}
              />
            </MessageContent>
          </Message>
        ))}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
}
