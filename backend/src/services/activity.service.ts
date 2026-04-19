import { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import { ensureCustomerAccess } from "./customer.service.js";
import { recordEvent } from "./event.service.js";
import type { OrgContext, ActivityQueryParams, CreateActivityInput, UpdateActivityInput } from "@crm/shared";

export async function listActivities(
  ctx: OrgContext,
  customerId: string,
  params: ActivityQueryParams,
) {
  await ensureCustomerAccess(ctx, customerId);
  const { page, limit, type } = params;
  const where: Prisma.ActivityWhereInput = { customerId };

  if (type) {
    where.type = type;
  }

  const [data, total] = await Promise.all([
    prisma.activity.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { date: "desc" },
    }),
    prisma.activity.count({ where }),
  ]);

  return {
    data,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function getActivity(
  ctx: OrgContext,
  customerId: string,
  activityId: string,
) {
  await ensureCustomerAccess(ctx, customerId);
  const activity = await prisma.activity.findFirst({
    where: { id: activityId, customerId },
  });
  if (!activity) {
    throw new AppError(404, "ACTIVITY_NOT_FOUND", "Activity not found");
  }
  return activity;
}

export async function createActivity(
  ctx: OrgContext,
  customerId: string,
  data: CreateActivityInput,
) {
  await ensureCustomerAccess(ctx, customerId);
  const activity = await prisma.activity.create({
    data: { ...data, customerId },
  });
  await recordEvent({
    ctx, customerId, entityType: "ACTIVITY", entityId: activity.id,
    action: "CREATED",
    metadata: { title: activity.title, type: activity.type },
  });
  return activity;
}

export async function updateActivity(
  ctx: OrgContext,
  customerId: string,
  activityId: string,
  data: UpdateActivityInput,
) {
  await ensureCustomerAccess(ctx, customerId);
  const activity = await prisma.activity.findFirst({
    where: { id: activityId, customerId },
  });
  if (!activity) {
    throw new AppError(404, "ACTIVITY_NOT_FOUND", "Activity not found");
  }
  return prisma.activity.update({ where: { id: activityId }, data });
}

export async function deleteActivity(
  ctx: OrgContext,
  customerId: string,
  activityId: string,
) {
  await ensureCustomerAccess(ctx, customerId);
  const activity = await prisma.activity.findFirst({
    where: { id: activityId, customerId },
  });
  if (!activity) {
    throw new AppError(404, "ACTIVITY_NOT_FOUND", "Activity not found");
  }
  await prisma.activity.delete({ where: { id: activityId } });
}
