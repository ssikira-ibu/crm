import { prisma } from "../lib/prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import { ensureCustomerAccess } from "./customer.service.js";
import { recordEvent } from "./event.service.js";
import type { OrgContext, CreateContactInput, UpdateContactInput } from "@crm/shared";

export async function listContacts(ctx: OrgContext, customerId: string) {
  await ensureCustomerAccess(ctx, customerId);
  return prisma.contact.findMany({
    where: { customerId },
    include: { phoneNumbers: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getContact(
  ctx: OrgContext,
  customerId: string,
  contactId: string,
) {
  await ensureCustomerAccess(ctx, customerId);
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
  ctx: OrgContext,
  customerId: string,
  data: CreateContactInput,
) {
  await ensureCustomerAccess(ctx, customerId);
  const contact = await prisma.contact.create({
    data: { ...data, customerId },
    include: { phoneNumbers: true },
  });
  await recordEvent({
    ctx, customerId, entityType: "CONTACT", entityId: contact.id,
    action: "CREATED",
    metadata: { name: `${contact.firstName} ${contact.lastName}`, email: contact.email },
  });
  return contact;
}

export async function updateContact(
  ctx: OrgContext,
  customerId: string,
  contactId: string,
  data: UpdateContactInput,
) {
  await ensureCustomerAccess(ctx, customerId);
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
  ctx: OrgContext,
  customerId: string,
  contactId: string,
) {
  await ensureCustomerAccess(ctx, customerId);
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, customerId },
  });
  if (!contact) {
    throw new AppError(404, "CONTACT_NOT_FOUND", "Contact not found");
  }
  await prisma.contact.delete({ where: { id: contactId } });
  await recordEvent({
    ctx, customerId, entityType: "CONTACT", entityId: contactId,
    action: "DELETED",
    metadata: { name: `${contact.firstName} ${contact.lastName}` },
  });
}
