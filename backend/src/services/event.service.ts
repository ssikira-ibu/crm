import type { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import type { OrgContext } from "@crm/shared";

export type EntityType =
  | "COMPANY"
  | "DEAL"
  | "CONTACT"
  | "NOTE"
  | "TASK"
  | "ACTIVITY"
  | "TAG"
  | "PIPELINE";

export type EventAction =
  | "CREATED"
  | "UPDATED"
  | "DELETED"
  | "STATUS_CHANGED"
  | "STAGE_CHANGED"
  | "COMPLETED"
  | "TAGGED"
  | "UNTAGGED";

export async function recordEvent(params: {
  ctx: OrgContext;
  companyId?: string;
  entityType: EntityType;
  entityId: string;
  action: EventAction;
  source?: string;
  metadata?: Record<string, unknown>;
}) {
  const agentMetadata =
    params.ctx.actor.type === "agent"
      ? {
          agentConversationId: params.ctx.actor.conversationId,
          agentToolCallId: params.ctx.actor.toolCallId,
        }
      : {};

  await prisma.event.create({
    data: {
      organizationId: params.ctx.organizationId,
      actorId: params.ctx.userId,
      companyId: params.companyId ?? null,
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      source: params.source ?? (params.ctx.actor.type === "agent" ? "agent" : "user"),
      metadata: { ...params.metadata, ...agentMetadata } as Prisma.InputJsonValue,
    },
  });
}

export async function listGlobalEvents(
  ctx: OrgContext,
  limit = 50,
  cursor?: string,
) {
  return prisma.event.findMany({
    where: {
      organizationId: ctx.organizationId,
      ...(ctx.role === "SALESPERSON"
        ? { company: { ownerId: ctx.userId, deletedAt: null } }
        : { OR: [{ companyId: null }, { company: { deletedAt: null } }] }),
      ...(cursor ? { sequence: { lt: Number(cursor) } } : {}),
    },
    include: {
      company: { select: { id: true, name: true, status: true } },
    },
    orderBy: { sequence: "desc" },
    take: limit,
  });
}

export async function listCompanyEvents(
  ctx: OrgContext,
  companyId: string,
  limit = 50,
  cursor?: string,
) {
  return prisma.event.findMany({
    where: {
      companyId,
      organizationId: ctx.organizationId,
      company: { deletedAt: null },
      ...(cursor ? { sequence: { lt: Number(cursor) } } : {}),
    },
    include: {
      company: { select: { id: true, name: true, status: true } },
    },
    orderBy: { sequence: "desc" },
    take: limit,
  });
}
