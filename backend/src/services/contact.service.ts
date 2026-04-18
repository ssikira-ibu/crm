import { prisma } from "../lib/prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import { ensureCustomerOwnership } from "./customer.service.js";
import { recordEvent } from "./event.service.js";
import type { CreateContactInput, UpdateContactInput } from "@crm/shared";

export async function listContacts(userId: string, customerId: string) {
  await ensureCustomerOwnership(userId, customerId);
  return prisma.contact.findMany({
    where: { customerId },
    include: { phoneNumbers: true },
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
    include: { phoneNumbers: true },
  });
  if (!contact) {
    throw new AppError(404, "CONTACT_NOT_FOUND", "Contact not found");
  }
  return contact;
}

export async function createContact(
  userId: string,
  customerId: string,
  data: CreateContactInput,
) {
  await ensureCustomerOwnership(userId, customerId);
  const contact = await prisma.contact.create({
    data: { ...data, customerId },
    include: { phoneNumbers: true },
  });
  await recordEvent({
    userId, customerId, entityType: "CONTACT", entityId: contact.id,
    action: "CREATED",
    metadata: { name: `${contact.firstName} ${contact.lastName}`, email: contact.email },
  });
  return contact;
}

export async function updateContact(
  userId: string,
  customerId: string,
  contactId: string,
  data: UpdateContactInput,
) {
  await ensureCustomerOwnership(userId, customerId);
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, customerId },
  });
  if (!contact) {
    throw new AppError(404, "CONTACT_NOT_FOUND", "Contact not found");
  }
  return prisma.contact.update({
    where: { id: contactId },
    data,
    include: { phoneNumbers: true },
  });
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
  await recordEvent({
    userId, customerId, entityType: "CONTACT", entityId: contactId,
    action: "DELETED",
    metadata: { name: `${contact.firstName} ${contact.lastName}` },
  });
}
