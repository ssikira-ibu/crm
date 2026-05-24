import { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import type { OrgContext, NotificationQueryParams } from "@crm/shared";
import { publishNotification } from "../lib/notificationBus.js";

export async function listNotifications(
  ctx: OrgContext,
  params: NotificationQueryParams,
) {
  const where: Prisma.NotificationWhereInput = {
    userId: ctx.userId,
    organizationId: ctx.organizationId,
    ...(params.unreadOnly ? { readAt: null } : {}),
    ...(params.cursor ? { createdAt: { lt: new Date(params.cursor) } } : {}),
  };
  const items = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: params.limit,
  });
  const unreadCount = await prisma.notification.count({
    where: {
      userId: ctx.userId,
      organizationId: ctx.organizationId,
      readAt: null,
    },
  });
  return { data: items, unreadCount };
}

export async function markRead(ctx: OrgContext, id: string) {
  const existing = await prisma.notification.findFirst({
    where: { id, userId: ctx.userId, organizationId: ctx.organizationId },
  });
  if (!existing) {
    throw new AppError(404, "NOTIFICATION_NOT_FOUND", "Notification not found");
  }
  return prisma.notification.update({
    where: { id },
    data: { readAt: existing.readAt ?? new Date() },
  });
}

export async function markAllRead(ctx: OrgContext) {
  await prisma.notification.updateMany({
    where: {
      userId: ctx.userId,
      organizationId: ctx.organizationId,
      readAt: null,
    },
    data: { readAt: new Date() },
  });
}

/**
 * Internal API used by the workflow worker to create a notification and
 * publish it on the live SSE bus.
 */
export async function emitNotification(params: {
  organizationId: string;
  userId: string;
  workflowId?: string | null;
  title: string;
  body?: string | null;
  link?: string | null;
  metadata?: Record<string, unknown> | null;
}) {
  const notification = await prisma.notification.create({
    data: {
      organizationId: params.organizationId,
      userId: params.userId,
      workflowId: params.workflowId ?? null,
      title: params.title,
      body: params.body ?? null,
      link: params.link ?? null,
      metadata: params.metadata
        ? (params.metadata as Prisma.InputJsonValue)
        : Prisma.JsonNull,
    },
  });
  publishNotification(params.userId, notification);
  return notification;
}
