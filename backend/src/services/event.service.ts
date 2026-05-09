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
  await prisma.event.create({
    data: {
      organizationId: params.ctx.organizationId,
      actorId: params.ctx.userId,
      companyId: params.companyId ?? null,
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      source: params.source ?? "user",
      metadata: params.metadata as Prisma.InputJsonValue | undefined,
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
        ? { company: { ownerId: ctx.userId } }
        : {}),
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
      ...(cursor ? { sequence: { lt: Number(cursor) } } : {}),
    },
    include: {
      company: { select: { id: true, name: true, status: true } },
    },
    orderBy: { sequence: "desc" },
    take: limit,
  });
}
