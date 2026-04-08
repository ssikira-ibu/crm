import { prisma } from "../lib/prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import { ensureCustomerOwnership } from "./customer.service.js";
import type { CreateAddressInput, UpdateAddressInput } from "../schemas/address.schema.js";

export async function listAddresses(userId: string, customerId: string) {
  await ensureCustomerOwnership(userId, customerId);
  return prisma.address.findMany({
    where: { customerId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getAddress(
  userId: string,
  customerId: string,
  addressId: string,
) {
  await ensureCustomerOwnership(userId, customerId);
  const address = await prisma.address.findFirst({
    where: { id: addressId, customerId },
  });
  if (!address) {
    throw new AppError(404, "ADDRESS_NOT_FOUND", "Address not found");
  }
  return address;
}

export async function createAddress(
  userId: string,
  customerId: string,
  data: CreateAddressInput,
) {
  await ensureCustomerOwnership(userId, customerId);
  return prisma.address.create({
    data: { ...data, customerId },
  });
}

export async function updateAddress(
  userId: string,
  customerId: string,
  addressId: string,
  data: UpdateAddressInput,
) {
  await ensureCustomerOwnership(userId, customerId);
  const address = await prisma.address.findFirst({
    where: { id: addressId, customerId },
  });
  if (!address) {
    throw new AppError(404, "ADDRESS_NOT_FOUND", "Address not found");
  }
  return prisma.address.update({ where: { id: addressId }, data });
}

export async function deleteAddress(
  userId: string,
  customerId: string,
  addressId: string,
) {
  await ensureCustomerOwnership(userId, customerId);
  const address = await prisma.address.findFirst({
    where: { id: addressId, customerId },
  });
  if (!address) {
    throw new AppError(404, "ADDRESS_NOT_FOUND", "Address not found");
  }
  await prisma.address.delete({ where: { id: addressId } });
}
