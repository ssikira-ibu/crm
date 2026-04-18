import { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import { ensureCustomerOwnership } from "./customer.service.js";
import { recordEvent } from "./event.service.js";
import type { DealQueryParams, CreateDealInput, UpdateDealInput } from "@crm/shared";

export async function listDeals(
  userId: string,
  customerId: string,
  params: DealQueryParams,
) {
  await ensureCustomerOwnership(userId, customerId);
  const { page, limit, status } = params;
  const where: Prisma.DealWhereInput = { customerId };

  if (status) {
    where.status = status;
  }

  const [data, total] = await Promise.all([
    prisma.deal.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.deal.count({ where }),
  ]);

  return {
    data,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function getDeal(
  userId: string,
  customerId: string,
  dealId: string,
) {
  await ensureCustomerOwnership(userId, customerId);
  const deal = await prisma.deal.findFirst({
    where: { id: dealId, customerId },
  });
  if (!deal) {
    throw new AppError(404, "DEAL_NOT_FOUND", "Deal not found");
  }
  return deal;
}

export async function createDeal(
  userId: string,
  customerId: string,
  data: CreateDealInput,
) {
  await ensureCustomerOwnership(userId, customerId);
  const deal = await prisma.deal.create({
    data: { ...data, customerId },
  });
  await recordEvent({
    userId, customerId, entityType: "DEAL", entityId: deal.id,
    action: "CREATED",
    metadata: { title: deal.title, value: Number(deal.value), status: deal.status },
  });
  return deal;
}

export async function updateDeal(
  userId: string,
  customerId: string,
  dealId: string,
  data: UpdateDealInput,
) {
  await ensureCustomerOwnership(userId, customerId);
  const old = await prisma.deal.findFirst({
    where: { id: dealId, customerId },
  });
  if (!old) {
    throw new AppError(404, "DEAL_NOT_FOUND", "Deal not found");
  }
  const deal = await prisma.deal.update({ where: { id: dealId }, data });
  if (data.status && data.status !== old.status) {
    await recordEvent({
      userId, customerId, entityType: "DEAL", entityId: dealId,
      action: "STATUS_CHANGED",
      metadata: { title: deal.title, value: Number(deal.value), old: old.status, new: deal.status },
    });
  }
  return deal;
}

export async function deleteDeal(
  userId: string,
  customerId: string,
  dealId: string,
) {
  await ensureCustomerOwnership(userId, customerId);
  const deal = await prisma.deal.findFirst({
    where: { id: dealId, customerId },
  });
  if (!deal) {
    throw new AppError(404, "DEAL_NOT_FOUND", "Deal not found");
  }
  await prisma.deal.delete({ where: { id: dealId } });
  await recordEvent({
    userId, customerId, entityType: "DEAL", entityId: dealId,
    action: "DELETED",
    metadata: { title: deal.title, value: Number(deal.value) },
  });
}
