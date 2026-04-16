import { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import { ensureCustomerOwnership } from "./customer.service.js";
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
  return prisma.deal.create({
    data: { ...data, customerId },
  });
}

export async function updateDeal(
  userId: string,
  customerId: string,
  dealId: string,
  data: UpdateDealInput,
) {
  await ensureCustomerOwnership(userId, customerId);
  const deal = await prisma.deal.findFirst({
    where: { id: dealId, customerId },
  });
  if (!deal) {
    throw new AppError(404, "DEAL_NOT_FOUND", "Deal not found");
  }
  return prisma.deal.update({ where: { id: dealId }, data });
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
}
