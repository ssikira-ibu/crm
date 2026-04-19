import { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import { recordEvent } from "./event.service.js";
import type { OrgContext, CustomerQueryParams, CreateCustomerInput, UpdateCustomerInput } from "@crm/shared";

function customerWhere(ctx: OrgContext): Prisma.CustomerWhereInput {
  const where: Prisma.CustomerWhereInput = { organizationId: ctx.organizationId };
  if (ctx.role === "SALESPERSON") {
    where.ownerId = ctx.userId;
  }
  return where;
}

export async function listCustomers(ctx: OrgContext, params: CustomerQueryParams) {
  const { page, limit, status, search } = params;
  const where: Prisma.CustomerWhereInput = customerWhere(ctx);

  if (status) {
    where.status = status;
  }
  if (search) {
    where.OR = [
      { companyName: { contains: search, mode: "insensitive" } },
      { industry: { contains: search, mode: "insensitive" } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            contacts: true,
            reminders: true,
            notes: true,
            deals: true,
            activities: true,
          },
        },
      },
    }),
    prisma.customer.count({ where }),
  ]);

  return {
    data,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function getCustomer(ctx: OrgContext, customerId: string) {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, ...customerWhere(ctx) },
    include: {
      contacts: { include: { phoneNumbers: true } },
      addresses: true,
      deals: { orderBy: { createdAt: "desc" } },
      activities: { orderBy: { date: "desc" } },
      notes: { orderBy: { createdAt: "desc" } },
      reminders: { orderBy: { dueDate: "asc" } },
      tags: { include: { tag: true } },
    },
  });
  if (!customer) {
    throw new AppError(404, "CUSTOMER_NOT_FOUND", "Customer not found");
  }
  const { tags: customerTags, ...rest } = customer;
  return { ...rest, tags: customerTags.map((ct) => ct.tag) };
}

export async function createCustomer(
  ctx: OrgContext,
  data: CreateCustomerInput,
) {
  return prisma.customer.create({
    data: { ...data, organizationId: ctx.organizationId, ownerId: ctx.userId },
  });
}

export async function updateCustomer(
  ctx: OrgContext,
  customerId: string,
  data: UpdateCustomerInput,
) {
  const old = await prisma.customer.findFirst({ where: { id: customerId, ...customerWhere(ctx) } });
  if (!old) {
    throw new AppError(404, "CUSTOMER_NOT_FOUND", "Customer not found");
  }
  const customer = await prisma.customer.update({
    where: { id: customerId },
    data,
  });
  if (data.status && data.status !== old.status) {
    await recordEvent({
      ctx, customerId, entityType: "CUSTOMER", entityId: customerId,
      action: "STATUS_CHANGED",
      metadata: { old: old.status, new: customer.status, companyName: customer.companyName },
    });
  }
  return customer;
}

export async function deleteCustomer(ctx: OrgContext, customerId: string) {
  await ensureCustomerAccess(ctx, customerId);
  await prisma.customer.delete({ where: { id: customerId } });
}

export async function ensureCustomerAccess(
  ctx: OrgContext,
  customerId: string,
) {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, ...customerWhere(ctx) },
    select: { id: true },
  });
  if (!customer) {
    throw new AppError(404, "CUSTOMER_NOT_FOUND", "Customer not found");
  }
}
