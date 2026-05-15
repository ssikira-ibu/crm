import { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import { ensureCompanyAccess } from "./company.service.js";
import { recordEvent } from "./event.service.js";
import type { OrgContext, ActivityQueryParams, CreateActivityInput, UpdateActivityInput } from "@crm/shared";

async function ensureDealBelongsToCompany(
  ctx: OrgContext,
  companyId: string,
  dealId?: string | null,
) {
  if (!dealId) return;
  const deal = await prisma.deal.findFirst({
    where: {
      id: dealId,
      companyId,
      organizationId: ctx.organizationId,
    },
    select: { id: true },
  });
  if (!deal) {
    throw new AppError(400, "INVALID_DEAL", "Deal does not belong to the specified company");
  }
}

export async function listActivities(
  ctx: OrgContext,
  companyId: string,
  params: ActivityQueryParams,
) {
  await ensureCompanyAccess(ctx, companyId);
  const { page, limit, type } = params;
  const where: Prisma.ActivityWhereInput = { companyId };

  if (type) {
    where.type = type;
  }

  const [data, total] = await prisma.$transaction([
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
  companyId: string,
  activityId: string,
) {
  await ensureCompanyAccess(ctx, companyId);
  const activity = await prisma.activity.findFirst({
    where: { id: activityId, companyId },
  });
  if (!activity) {
    throw new AppError(404, "ACTIVITY_NOT_FOUND", "Activity not found");
  }
  return activity;
}

export async function createActivity(
  ctx: OrgContext,
  companyId: string,
  data: CreateActivityInput,
) {
  await ensureCompanyAccess(ctx, companyId);
  await ensureDealBelongsToCompany(ctx, companyId, data.dealId);
  const activity = await prisma.activity.create({
    data: { ...data, companyId },
  });
  await recordEvent({
    ctx, companyId, entityType: "ACTIVITY", entityId: activity.id,
    action: "CREATED",
    metadata: { title: activity.title, type: activity.type },
  });
  return activity;
}

export async function updateActivity(
  ctx: OrgContext,
  companyId: string,
  activityId: string,
  data: UpdateActivityInput,
) {
  await ensureCompanyAccess(ctx, companyId);
  await ensureDealBelongsToCompany(ctx, companyId, data.dealId);
  const activity = await prisma.activity.findFirst({
    where: { id: activityId, companyId },
  });
  if (!activity) {
    throw new AppError(404, "ACTIVITY_NOT_FOUND", "Activity not found");
  }
  return prisma.activity.update({ where: { id: activityId }, data });
}

export async function deleteActivity(
  ctx: OrgContext,
  companyId: string,
  activityId: string,
) {
  await ensureCompanyAccess(ctx, companyId);
  const activity = await prisma.activity.findFirst({
    where: { id: activityId, companyId },
  });
  if (!activity) {
    throw new AppError(404, "ACTIVITY_NOT_FOUND", "Activity not found");
  }
  await prisma.activity.delete({ where: { id: activityId } });
}
