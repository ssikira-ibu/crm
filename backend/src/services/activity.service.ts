import { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import { ensureCustomerOwnership } from "./customer.service.js";
import { recordEvent } from "./event.service.js";
import type { ActivityQueryParams, CreateActivityInput, UpdateActivityInput } from "@crm/shared";

export async function listActivities(
  userId: string,
  customerId: string,
  params: ActivityQueryParams,
) {
  await ensureCustomerOwnership(userId, customerId);
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
  userId: string,
  customerId: string,
  activityId: string,
) {
  await ensureCustomerOwnership(userId, customerId);
  const activity = await prisma.activity.findFirst({
    where: { id: activityId, customerId },
  });
  if (!activity) {
    throw new AppError(404, "ACTIVITY_NOT_FOUND", "Activity not found");
  }
  return activity;
}

export async function createActivity(
  userId: string,
  customerId: string,
  data: CreateActivityInput,
) {
  await ensureCustomerOwnership(userId, customerId);
  const activity = await prisma.activity.create({
    data: { ...data, customerId },
  });
  await recordEvent({
    userId, customerId, entityType: "ACTIVITY", entityId: activity.id,
    action: "CREATED",
    metadata: { title: activity.title, type: activity.type },
  });
  return activity;
}

export async function updateActivity(
  userId: string,
  customerId: string,
  activityId: string,
  data: UpdateActivityInput,
) {
  await ensureCustomerOwnership(userId, customerId);
  const activity = await prisma.activity.findFirst({
    where: { id: activityId, customerId },
  });
  if (!activity) {
    throw new AppError(404, "ACTIVITY_NOT_FOUND", "Activity not found");
  }
  return prisma.activity.update({ where: { id: activityId }, data });
}

export async function deleteActivity(
  userId: string,
  customerId: string,
  activityId: string,
) {
  await ensureCustomerOwnership(userId, customerId);
  const activity = await prisma.activity.findFirst({
    where: { id: activityId, customerId },
  });
  if (!activity) {
    throw new AppError(404, "ACTIVITY_NOT_FOUND", "Activity not found");
  }
  await prisma.activity.delete({ where: { id: activityId } });
}
