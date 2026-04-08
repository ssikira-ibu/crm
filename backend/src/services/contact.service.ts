import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import { ensureCustomerOwnership } from "./customer.service.js";

export async function listContacts(userId: string, customerId: string) {
  await ensureCustomerOwnership(userId, customerId);
  return prisma.contact.findMany({
    where: { customerId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getContact(
  userId: string,
  customerId: string,
  contactId: string,
) {
  await ensureCustomerOwnership(userId, customerId);
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, customerId },
  });
  if (!contact) {
    throw new AppError(404, "CONTACT_NOT_FOUND", "Contact not found");
  }
  return contact;
}

export async function createContact(
  userId: string,
  customerId: string,
  data: Omit<Prisma.ContactUncheckedCreateInput, "customerId">,
) {
  await ensureCustomerOwnership(userId, customerId);
  return prisma.contact.create({
    data: { ...data, customerId },
  });
}

export async function updateContact(
  userId: string,
  customerId: string,
  contactId: string,
  data: Prisma.ContactUpdateInput,
) {
  await ensureCustomerOwnership(userId, customerId);
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, customerId },
  });
  if (!contact) {
    throw new AppError(404, "CONTACT_NOT_FOUND", "Contact not found");
  }
  return prisma.contact.update({ where: { id: contactId }, data });
}

export async function deleteContact(
  userId: string,
  customerId: string,
  contactId: string,
) {
  await ensureCustomerOwnership(userId, customerId);
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, customerId },
  });
  if (!contact) {
    throw new AppError(404, "CONTACT_NOT_FOUND", "Contact not found");
  }
  await prisma.contact.delete({ where: { id: contactId } });
}
