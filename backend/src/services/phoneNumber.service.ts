import { prisma } from "../lib/prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import { ensureCustomerAccess } from "./customer.service.js";
import type { OrgContext, CreatePhoneNumberInput, UpdatePhoneNumberInput } from "@crm/shared";

async function ensureContactOwnership(
  ctx: OrgContext,
  customerId: string,
  contactId: string,
) {
  await ensureCustomerAccess(ctx, customerId);
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, customerId },
    select: { id: true },
  });
  if (!contact) {
    throw new AppError(404, "CONTACT_NOT_FOUND", "Contact not found");
  }
}

export async function listPhoneNumbers(
  ctx: OrgContext,
  customerId: string,
  contactId: string,
) {
  await ensureContactOwnership(ctx, customerId, contactId);
  return prisma.phoneNumber.findMany({
    where: { contactId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getPhoneNumber(
  ctx: OrgContext,
  customerId: string,
  contactId: string,
  phoneNumberId: string,
) {
  await ensureContactOwnership(ctx, customerId, contactId);
  const phone = await prisma.phoneNumber.findFirst({
    where: { id: phoneNumberId, contactId },
  });
  if (!phone) {
    throw new AppError(404, "PHONE_NUMBER_NOT_FOUND", "Phone number not found");
  }
  return phone;
}

export async function createPhoneNumber(
  ctx: OrgContext,
  customerId: string,
  contactId: string,
  data: CreatePhoneNumberInput,
) {
  await ensureContactOwnership(ctx, customerId, contactId);
  return prisma.phoneNumber.create({
    data: { ...data, contactId },
  });
}

export async function updatePhoneNumber(
  ctx: OrgContext,
  customerId: string,
  contactId: string,
  phoneNumberId: string,
  data: UpdatePhoneNumberInput,
) {
  await ensureContactOwnership(ctx, customerId, contactId);
  const phone = await prisma.phoneNumber.findFirst({
    where: { id: phoneNumberId, contactId },
  });
  if (!phone) {
    throw new AppError(404, "PHONE_NUMBER_NOT_FOUND", "Phone number not found");
  }
  return prisma.phoneNumber.update({ where: { id: phoneNumberId }, data });
}

export async function deletePhoneNumber(
  ctx: OrgContext,
  customerId: string,
  contactId: string,
  phoneNumberId: string,
) {
  await ensureContactOwnership(ctx, customerId, contactId);
  const phone = await prisma.phoneNumber.findFirst({
    where: { id: phoneNumberId, contactId },
  });
  if (!phone) {
    throw new AppError(404, "PHONE_NUMBER_NOT_FOUND", "Phone number not found");
  }
  await prisma.phoneNumber.delete({ where: { id: phoneNumberId } });
}
