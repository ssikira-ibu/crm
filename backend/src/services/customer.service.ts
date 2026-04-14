import { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import type { CustomerQueryParams, CreateCustomerInput, UpdateCustomerInput } from "../schemas/customer.schema.js";

export async function listCustomers(userId: string, params: CustomerQueryParams) {
  const { page, limit, status, search } = params;
  const where: Prisma.CustomerWhereInput = { userId };

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
        _count: { select: { contacts: true, reminders: true, notes: true } },
      },
    }),
    prisma.customer.count({ where }),
  ]);

  return {
    data,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function getCustomer(userId: string, customerId: string) {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, userId },
    include: {
      contacts: true,
      addresses: true,
      phoneNumbers: true,
      notes: { orderBy: { createdAt: "desc" } },
      reminders: { orderBy: { dueDate: "asc" } },
    },
  });
  if (!customer) {
    throw new AppError(404, "CUSTOMER_NOT_FOUND", "Customer not found");
  }
  return customer;
}

export async function createCustomer(
  userId: string,
  data: CreateCustomerInput,
) {
  return prisma.customer.create({
    data: { ...data, userId },
  });
}

export async function updateCustomer(
  userId: string,
  customerId: string,
  data: UpdateCustomerInput,
) {
  await ensureCustomerOwnership(userId, customerId);
  return prisma.customer.update({
    where: { id: customerId },
    data,
  });
}

export async function deleteCustomer(userId: string, customerId: string) {
  await ensureCustomerOwnership(userId, customerId);
  await prisma.customer.delete({ where: { id: customerId } });
}

export async function ensureCustomerOwnership(
  userId: string,
  customerId: string,
) {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, userId },
    select: { id: true },
  });
  if (!customer) {
    throw new AppError(404, "CUSTOMER_NOT_FOUND", "Customer not found");
  }
}
