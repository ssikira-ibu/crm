import { prisma } from "../lib/prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import { ensureCustomerAccess } from "./customer.service.js";
import type { OrgContext, CreateAddressInput, UpdateAddressInput } from "@crm/shared";

export async function listAddresses(ctx: OrgContext, customerId: string) {
  await ensureCustomerAccess(ctx, customerId);
  return prisma.address.findMany({
    where: { customerId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getAddress(
  ctx: OrgContext,
  customerId: string,
  addressId: string,
) {
  await ensureCustomerAccess(ctx, customerId);
  const address = await prisma.address.findFirst({
    where: { id: addressId, customerId },
  });
  if (!address) {
    throw new AppError(404, "ADDRESS_NOT_FOUND", "Address not found");
  }
  return address;
}

export async function createAddress(
  ctx: OrgContext,
  customerId: string,
  data: CreateAddressInput,
) {
  await ensureCustomerAccess(ctx, customerId);
  return prisma.address.create({
    data: { ...data, customerId },
  });
}

export async function updateAddress(
  ctx: OrgContext,
  customerId: string,
  addressId: string,
  data: UpdateAddressInput,
) {
  await ensureCustomerAccess(ctx, customerId);
  const address = await prisma.address.findFirst({
    where: { id: addressId, customerId },
  });
  if (!address) {
    throw new AppError(404, "ADDRESS_NOT_FOUND", "Address not found");
  }
  return prisma.address.update({ where: { id: addressId }, data });
}

export async function deleteAddress(
  ctx: OrgContext,
  customerId: string,
  addressId: string,
) {
  await ensureCustomerAccess(ctx, customerId);
  const address = await prisma.address.findFirst({
    where: { id: addressId, customerId },
  });
  if (!address) {
    throw new AppError(404, "ADDRESS_NOT_FOUND", "Address not found");
  }
  await prisma.address.delete({ where: { id: addressId } });
}
