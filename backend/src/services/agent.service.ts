import { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import {
  updateCompanySchema,
  updateDealSchema,
  updateTaskSchema,
} from "@crm/shared";
import type {
  AgentPendingAction,
  AgentProviderMessage,
  AppendAgentConversationInput,
  CreateAgentActionInput,
  CreateAgentConversationInput,
  OrgContext,
  UpdateCompanyInput,
  UpdateDealInput,
  UpdateTaskInput,
} from "@crm/shared";
import { z } from "zod";
import * as companyService from "./company.service.js";
import * as dealService from "./deal.service.js";
import * as taskService from "./task.service.js";
import * as tagService from "./tag.service.js";

function whereForUser(ctx: OrgContext, id: string) {
  return {
    id,
    organizationId: ctx.organizationId,
    userId: ctx.userId,
  };
}

function toPendingAction(action: {
  id: string;
  conversationId: string;
  toolCallId: string;
  toolName: string;
  risk: string;
  summary: string;
  input: unknown;
  status: string;
  createdAt: Date;
  expiresAt: Date;
}): AgentPendingAction {
  return {
    id: action.id,
    conversationId: action.conversationId,
    toolCallId: action.toolCallId,
    toolName: action.toolName,
    risk: action.risk as AgentPendingAction["risk"],
    summary: action.summary,
    input: action.input as Record<string, unknown>,
    status: action.status as AgentPendingAction["status"],
    createdAt: action.createdAt.toISOString(),
    expiresAt: action.expiresAt.toISOString(),
  };
}

export async function listConversations(ctx: OrgContext) {
  const conversations = await prisma.agentConversation.findMany({
    where: { organizationId: ctx.organizationId, userId: ctx.userId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, createdAt: true, updatedAt: true },
  });

  return conversations.map((c) => ({
    ...c,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }));
}

export async function createConversation(
  ctx: OrgContext,
  data: CreateAgentConversationInput,
) {
  const conversation = await prisma.agentConversation.create({
    data: {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      title: data.title ?? null,
    },
    select: { id: true, title: true, createdAt: true, updatedAt: true },
  });

  return {
    ...conversation,
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString(),
  };
}

export async function getConversation(ctx: OrgContext, id: string) {
  const conversation = await prisma.agentConversation.findFirst({
    where: whereForUser(ctx, id),
    include: {
      messages: { orderBy: { sequence: "asc" } },
      actions: {
        where: { status: "PENDING" },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!conversation) {
    throw new AppError(404, "CONVERSATION_NOT_FOUND", "Conversation not found");
  }

  const providerMessages = conversation.messages.map(
    (m) => m.providerPayload as unknown as AgentProviderMessage,
  );

  return {
    id: conversation.id,
    title: conversation.title,
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString(),
    messages: conversation.messages
      .filter((m) => m.role !== "tool" && m.displayContent.length > 0)
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.displayContent,
        createdAt: m.createdAt.toISOString(),
      })),
    providerMessages,
    pendingActions: conversation.actions.map(toPendingAction),
  };
}

export async function appendConversation(
  ctx: OrgContext,
  id: string,
  data: AppendAgentConversationInput,
) {
  const conversation = await prisma.agentConversation.findFirst({
    where: whereForUser(ctx, id),
    select: { id: true, title: true },
  });

  if (!conversation) {
    throw new AppError(404, "CONVERSATION_NOT_FOUND", "Conversation not found");
  }

  await appendMessagesAtomic(id, data.providerMessages);

  await prisma.agentConversation.update({
    where: { id },
    data: {
      tokenUsage: { increment: data.inputTokens + data.outputTokens },
      title:
        conversation.title ??
        data.messages[0]?.content.slice(0, 100) ??
        null,
    },
  });
}

/**
 * Append messages to a conversation, allocating sequence numbers atomically
 * via a per-conversation Postgres advisory lock. Without the lock, two
 * concurrent appends could read the same MAX(sequence) and collide on the
 * (conversationId, sequence) unique constraint — possible when an
 * approval-driven append races with an in-flight chat loop on the same
 * conversation.
 */
async function appendMessagesAtomic(
  conversationId: string,
  providerMessages: AgentProviderMessage[],
) {
  if (providerMessages.length === 0) return;

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${
      "agent_seq:" + conversationId
    }))`;

    const last = await tx.agentMessage.findFirst({
      where: { conversationId },
      orderBy: { sequence: "desc" },
      select: { sequence: true },
    });
    const startSequence = (last?.sequence ?? 0) + 1;

    const rows = providerMessages.map((message, index) => ({
      conversationId,
      role: message.role,
      displayContent: message.role === "assistant" || message.role === "user" ? message.content : "",
      providerPayload: message as Prisma.InputJsonValue,
      sequence: startSequence + index,
    }));

    await tx.agentMessage.createMany({ data: rows });
  });
}

export async function deleteConversation(ctx: OrgContext, id: string) {
  const conversation = await prisma.agentConversation.findFirst({
    where: whereForUser(ctx, id),
    select: { id: true },
  });

  if (!conversation) {
    throw new AppError(404, "CONVERSATION_NOT_FOUND", "Conversation not found");
  }

  await prisma.agentConversation.delete({ where: { id } });
}

export async function createPendingAction(
  ctx: OrgContext,
  data: CreateAgentActionInput,
) {
  const conversation = await prisma.agentConversation.findFirst({
    where: whereForUser(ctx, data.conversationId),
    select: { id: true },
  });

  if (!conversation) {
    throw new AppError(404, "CONVERSATION_NOT_FOUND", "Conversation not found");
  }

  // Validate the input now so an LLM that produces malformed input fails
  // before we ever ask the user. We also re-validate at approval time
  // in case the row was tampered with between create and approve.
  validateActionInput(data.toolName, data.input);

  const action = await prisma.agentAction.upsert({
    where: {
      conversationId_toolCallId: {
        conversationId: data.conversationId,
        toolCallId: data.toolCallId,
      },
    },
    create: {
      conversationId: data.conversationId,
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      toolCallId: data.toolCallId,
      toolName: data.toolName,
      risk: data.risk,
      summary: data.summary,
      input: data.input as Prisma.InputJsonValue,
      expiresAt: new Date(data.expiresAt),
    },
    update: {},
  });

  return toPendingAction(action);
}

export async function approveAction(ctx: OrgContext, actionId: string) {
  const action = await prisma.agentAction.findFirst({
    where: {
      id: actionId,
      organizationId: ctx.organizationId,
      userId: ctx.userId,
    },
  });

  if (!action) {
    throw new AppError(404, "ACTION_NOT_FOUND", "Agent action not found");
  }
  if (action.status !== "PENDING") {
    throw new AppError(409, "ACTION_NOT_PENDING", "Agent action is no longer pending");
  }
  if (action.expiresAt <= new Date()) {
    await prisma.agentAction.update({
      where: { id: action.id },
      data: { status: "EXPIRED" },
    });
    throw new AppError(410, "ACTION_EXPIRED", "Agent action has expired");
  }

  // Re-validate input against the shared schema before executing. This
  // closes the window where the persisted JSON could be malformed or
  // mutated after creation. The user is also shown the (validated) input
  // on the approval card so what they confirm is what runs.
  const validatedInput = validateActionInput(action.toolName, action.input);

  const actorCtx: OrgContext = {
    ...ctx,
    actor: {
      type: "agent",
      conversationId: action.conversationId,
      toolCallId: action.toolCallId,
    },
  };

  await prisma.agentAction.update({
    where: { id: action.id },
    data: { status: "APPROVED", approvedAt: new Date() },
  });

  let result: unknown;
  let isError = false;
  try {
    result = await executeApprovedAction(actorCtx, action.toolName, validatedInput);
  } catch (err) {
    isError = true;
    const message =
      err instanceof AppError ? `${err.code}: ${err.message}` : "Action execution failed";
    result = { error: message };
  }

  await prisma.agentAction.update({
    where: { id: action.id },
    data: {
      status: "EXECUTED",
      executedAt: new Date(),
      result: result as Prisma.InputJsonValue,
    },
  });

  // Append a real tool_result row so the next loop iteration resumes the
  // Anthropic transcript coherently — never a synthetic user message.
  await appendMessagesAtomic(action.conversationId, [
    {
      role: "tool",
      toolUseId: action.toolCallId,
      content: JSON.stringify(result),
      isError,
    },
  ]);

  return {
    action: { ...toPendingAction({ ...action, status: "EXECUTED" }), result },
    result,
  };
}

export async function rejectAction(ctx: OrgContext, actionId: string) {
  const action = await prisma.agentAction.findFirst({
    where: {
      id: actionId,
      organizationId: ctx.organizationId,
      userId: ctx.userId,
    },
  });

  if (!action) {
    throw new AppError(404, "ACTION_NOT_FOUND", "Agent action not found");
  }
  if (action.status !== "PENDING") {
    throw new AppError(409, "ACTION_NOT_PENDING", "Agent action is no longer pending");
  }

  const updated = await prisma.agentAction.update({
    where: { id: action.id },
    data: { status: "REJECTED", rejectedAt: new Date() },
  });

  await appendMessagesAtomic(action.conversationId, [
    {
      role: "tool",
      toolUseId: action.toolCallId,
      content: JSON.stringify({ rejected: true, reason: "User rejected this action." }),
      isError: true,
    },
  ]);

  return toPendingAction(updated);
}

// ---------------------------------------------------------------------------
// Action validation + execution
// ---------------------------------------------------------------------------

const updateDealActionSchema = z.object({
  companyId: z.string().uuid(),
  dealId: z.string().uuid(),
}).and(updateDealSchema);

const updateTaskActionSchema = z.object({
  taskId: z.string().uuid(),
  companyId: z.string().uuid().optional(),
}).and(updateTaskSchema);

const updateCompanyActionSchema = z.object({
  companyId: z.string().uuid(),
}).and(updateCompanySchema);

const tagActionSchema = z.object({
  companyId: z.string().uuid(),
  tagId: z.string().uuid(),
});

const ACTION_SCHEMAS: Record<string, z.ZodTypeAny> = {
  update_deal: updateDealActionSchema,
  update_task: updateTaskActionSchema,
  update_company: updateCompanyActionSchema,
  add_tag_to_company: tagActionSchema,
  remove_tag_from_company: tagActionSchema,
};

function validateActionInput(
  toolName: string,
  input: unknown,
): Record<string, unknown> {
  const schema = ACTION_SCHEMAS[toolName];
  if (!schema) {
    throw new AppError(
      400,
      "UNSUPPORTED_AGENT_ACTION",
      `Unsupported agent action: ${toolName}`,
    );
  }
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new AppError(
      400,
      "INVALID_AGENT_ACTION_INPUT",
      "Agent action input failed validation",
      result.error.issues,
    );
  }
  return result.data as Record<string, unknown>;
}

async function executeApprovedAction(
  ctx: OrgContext,
  toolName: string,
  input: Record<string, unknown>,
) {
  switch (toolName) {
    case "update_deal": {
      const { companyId, dealId, ...body } = input;
      return dealService.updateDeal(
        ctx,
        companyId as string,
        dealId as string,
        body as UpdateDealInput,
      );
    }
    case "update_task": {
      const { taskId, companyId, ...body } = input;
      return taskService.updateTask(
        ctx,
        taskId as string,
        body as UpdateTaskInput,
        companyId as string | undefined,
      );
    }
    case "update_company": {
      const { companyId, ...body } = input;
      return companyService.updateCompany(
        ctx,
        companyId as string,
        body as UpdateCompanyInput,
      );
    }
    case "add_tag_to_company":
      await tagService.addTagToCompany(
        ctx,
        input.companyId as string,
        input.tagId as string,
      );
      return { ok: true };
    case "remove_tag_from_company":
      await tagService.removeTagFromCompany(
        ctx,
        input.companyId as string,
        input.tagId as string,
      );
      return { ok: true };
    default:
      throw new AppError(
        400,
        "UNSUPPORTED_AGENT_ACTION",
        `Unsupported agent action: ${toolName}`,
      );
  }
}
