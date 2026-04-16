import { prisma } from "../lib/prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import { ensureCustomerOwnership } from "./customer.service.js";
import type { CreatePhoneNumberInput, UpdatePhoneNumberInput } from "@crm/shared";

async function ensureContactOwnership(
  userId: string,
  customerId: string,
  contactId: string,
) {
  await ensureCustomerOwnership(userId, customerId);
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, customerId },
    select: { id: true },
  });
  if (!contact) {
    throw new AppError(404, "CONTACT_NOT_FOUND", "Contact not found");
  }
}

export async function listPhoneNumbers(
  userId: string,
  customerId: string,
  contactId: string,
) {
  await ensureContactOwnership(userId, customerId, contactId);
  return prisma.phoneNumber.findMany({
    where: { contactId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getPhoneNumber(
  userId: string,
  customerId: string,
  contactId: string,
  phoneNumberId: string,
) {
  await ensureContactOwnership(userId, customerId, contactId);
  const phone = await prisma.phoneNumber.findFirst({
    where: { id: phoneNumberId, contactId },
  });
  if (!phone) {
    throw new AppError(404, "PHONE_NUMBER_NOT_FOUND", "Phone number not found");
  }
  return phone;
}

export async function createPhoneNumber(
  userId: string,
  customerId: string,
  contactId: string,
  data: CreatePhoneNumberInput,
) {
  await ensureContactOwnership(userId, customerId, contactId);
  return prisma.phoneNumber.create({
    data: { ...data, contactId },
  });
}

export async function updatePhoneNumber(
  userId: string,
  customerId: string,
  contactId: string,
  phoneNumberId: string,
  data: UpdatePhoneNumberInput,
) {
  await ensureContactOwnership(userId, customerId, contactId);
  const phone = await prisma.phoneNumber.findFirst({
    where: { id: phoneNumberId, contactId },
  });
  if (!phone) {
    throw new AppError(404, "PHONE_NUMBER_NOT_FOUND", "Phone number not found");
  }
  return prisma.phoneNumber.update({ where: { id: phoneNumberId }, data });
}

export async function deletePhoneNumber(
  userId: string,
  customerId: string,
  contactId: string,
  phoneNumberId: string,
) {
  await ensureContactOwnership(userId, customerId, contactId);
  const phone = await prisma.phoneNumber.findFirst({
    where: { id: phoneNumberId, contactId },
  });
  if (!phone) {
    throw new AppError(404, "PHONE_NUMBER_NOT_FOUND", "Phone number not found");
  }
  await prisma.phoneNumber.delete({ where: { id: phoneNumberId } });
}
