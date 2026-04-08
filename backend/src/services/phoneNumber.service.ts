import { prisma } from "../lib/prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import { ensureCustomerOwnership } from "./customer.service.js";
import type { CreatePhoneNumberInput, UpdatePhoneNumberInput } from "../schemas/phoneNumber.schema.js";

export async function listPhoneNumbers(userId: string, customerId: string) {
  await ensureCustomerOwnership(userId, customerId);
  return prisma.phoneNumber.findMany({
    where: { customerId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getPhoneNumber(
  userId: string,
  customerId: string,
  phoneNumberId: string,
) {
  await ensureCustomerOwnership(userId, customerId);
  const phone = await prisma.phoneNumber.findFirst({
    where: { id: phoneNumberId, customerId },
  });
  if (!phone) {
    throw new AppError(404, "PHONE_NUMBER_NOT_FOUND", "Phone number not found");
  }
  return phone;
}

export async function createPhoneNumber(
  userId: string,
  customerId: string,
  data: CreatePhoneNumberInput,
) {
  await ensureCustomerOwnership(userId, customerId);
  return prisma.phoneNumber.create({
    data: { ...data, customerId },
  });
}

export async function updatePhoneNumber(
  userId: string,
  customerId: string,
  phoneNumberId: string,
  data: UpdatePhoneNumberInput,
) {
  await ensureCustomerOwnership(userId, customerId);
  const phone = await prisma.phoneNumber.findFirst({
    where: { id: phoneNumberId, customerId },
  });
  if (!phone) {
    throw new AppError(404, "PHONE_NUMBER_NOT_FOUND", "Phone number not found");
  }
  return prisma.phoneNumber.update({ where: { id: phoneNumberId }, data });
}

export async function deletePhoneNumber(
  userId: string,
  customerId: string,
  phoneNumberId: string,
) {
  await ensureCustomerOwnership(userId, customerId);
  const phone = await prisma.phoneNumber.findFirst({
    where: { id: phoneNumberId, customerId },
  });
  if (!phone) {
    throw new AppError(404, "PHONE_NUMBER_NOT_FOUND", "Phone number not found");
  }
  await prisma.phoneNumber.delete({ where: { id: phoneNumberId } });
}
