import type { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";

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
  userId: string;
  customerId: string;
  entityType: EntityType;
  entityId: string;
  action: EventAction;
  metadata?: Record<string, unknown>;
}) {
  await prisma.event.create({
    data: {
      ...params,
      metadata: params.metadata as Prisma.InputJsonValue | undefined,
    },
  });
}

export async function listGlobalEvents(
  userId: string,
  limit = 50,
  cursor?: string,
) {
  const customerIds = await prisma.customer.findMany({
    where: { userId },
    select: { id: true },
  });
  const ids = customerIds.map((c) => c.id);

  return prisma.event.findMany({
    where: {
      customerId: { in: ids },
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
  userId: string,
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
