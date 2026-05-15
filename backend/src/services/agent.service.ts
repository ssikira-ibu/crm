import { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../middleware/errorHandler.js";
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
import * as companyService from "./company.service.js";
import * as dealService from "./deal.service.js";
import * as taskService from "./task.service.js";
import * as tagService from "./tag.service.js";

function agentWhere(ctx: OrgContext, id: string) {
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

function toProviderMessage(payload: unknown): AgentProviderMessage {
  return payload as AgentProviderMessage;
}

export async function listConversations(ctx: OrgContext) {
  const conversations = await prisma.agentConversation.findMany({
    where: { organizationId: ctx.organizationId, userId: ctx.userId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, createdAt: true, updatedAt: true },
  });

  return conversations.map((conversation) => ({
    ...conversation,
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString(),
  }));
}

export async function createConversation(
  ctx: OrgContext,
  data: CreateAgentConversationInput,
) {
  const conversation = await prisma.agentConversation.create({
    data: {
      id: data.id,
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
    where: agentWhere(ctx, id),
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

  const providerMessages = conversation.messages.map((message) =>
    toProviderMessage(message.providerPayload),
  );

  return {
    id: conversation.id,
    title: conversation.title,
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString(),
    messages: conversation.messages
      .filter((message) => message.role !== "tool" && message.displayContent.length > 0)
      .map((message) => ({
        role: message.role as "user" | "assistant",
        content: message.displayContent,
        createdAt: message.createdAt.toISOString(),
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
    where: agentWhere(ctx, id),
    select: { id: true, title: true },
  });

  if (!conversation) {
    throw new AppError(404, "CONVERSATION_NOT_FOUND", "Conversation not found");
  }

  const lastMessage = await prisma.agentMessage.findFirst({
    where: { conversationId: id },
    orderBy: { sequence: "desc" },
    select: { sequence: true },
  });

  const startSequence = (lastMessage?.sequence ?? 0) + 1;
  const rows = data.providerMessages.map((message, index) => ({
    conversationId: id,
    role: message.role,
    displayContent:
      message.role === "tool"
        ? ""
        : message.content,
    providerPayload: message as Prisma.InputJsonValue,
    sequence: startSequence + index,
  }));

  await prisma.$transaction([
    ...(rows.length
      ? [prisma.agentMessage.createMany({ data: rows })]
      : []),
    prisma.agentConversation.update({
      where: { id },
      data: {
        tokenUsage: { increment: data.inputTokens + data.outputTokens },
        title: conversation.title ?? data.messages[0]?.content.slice(0, 100) ?? null,
      },
    }),
  ]);
}

export async function deleteConversation(ctx: OrgContext, id: string) {
  const conversation = await prisma.agentConversation.findFirst({
    where: agentWhere(ctx, id),
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
    where: agentWhere(ctx, data.conversationId),
    select: { id: true },
  });

  if (!conversation) {
    throw new AppError(404, "CONVERSATION_NOT_FOUND", "Conversation not found");
  }

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

  const result = await executeApprovedAction(actorCtx, action.toolName, action.input);

  await prisma.agentAction.update({
    where: { id: action.id },
    data: {
      status: "EXECUTED",
      executedAt: new Date(),
      result: result as Prisma.InputJsonValue,
    },
  });

  return { action: { ...toPendingAction({ ...action, status: "EXECUTED" }), result }, result };
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

  return toPendingAction(updated);
}

async function executeApprovedAction(
  ctx: OrgContext,
  toolName: string,
  input: unknown,
) {
  const params = input as Record<string, unknown>;

  switch (toolName) {
    case "update_deal": {
      const { companyId, dealId, ...body } = params;
      return dealService.updateDeal(
        ctx,
        companyId as string,
        dealId as string,
        body as UpdateDealInput,
      );
    }
    case "update_task": {
      const { taskId, companyId, ...body } = params;
      return taskService.updateTask(
        ctx,
        taskId as string,
        body as UpdateTaskInput,
        companyId as string | undefined,
      );
    }
    case "update_company": {
      const { companyId, ...body } = params;
      return companyService.updateCompany(
        ctx,
        companyId as string,
        body as UpdateCompanyInput,
      );
    }
    case "add_tag_to_company":
      await tagService.addTagToCompany(ctx, params.companyId as string, params.tagId as string);
      return { ok: true };
    case "remove_tag_from_company":
      await tagService.removeTagFromCompany(ctx, params.companyId as string, params.tagId as string);
      return { ok: true };
    default:
      throw new AppError(400, "UNSUPPORTED_AGENT_ACTION", `Unsupported agent action: ${toolName}`);
  }
}
