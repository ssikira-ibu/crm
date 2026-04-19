import type { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import type { OrgContext } from "@crm/shared";

export type EntityType =
  | "CUSTOMER"
  | "DEAL"
  | "CONTACT"
  | "NOTE"
  | "REMINDER"
  | "ACTIVITY"
  | "TAG";

export type EventAction =
  | "CREATED"
  | "UPDATED"
  | "DELETED"
  | "STATUS_CHANGED"
  | "COMPLETED"
  | "TAGGED"
  | "UNTAGGED";

export async function recordEvent(params: {
  ctx: OrgContext;
  customerId: string;
  entityType: EntityType;
  entityId: string;
  action: EventAction;
  metadata?: Record<string, unknown>;
}) {
  await prisma.event.create({
    data: {
      organizationId: params.ctx.organizationId,
      actorId: params.ctx.userId,
      customerId: params.customerId,
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
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
        ? { customer: { ownerId: ctx.userId } }
        : {}),
      ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
    },
    include: {
      customer: { select: { id: true, companyName: true, status: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function listCustomerEvents(
  _ctx: OrgContext,
  customerId: string,
  limit = 50,
  cursor?: string,
) {
  return prisma.event.findMany({
    where: {
      customerId,
      ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
    },
    include: {
      customer: { select: { id: true, companyName: true, status: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
