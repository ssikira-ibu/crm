import { prisma } from "../lib/prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import { ensureCompanyAccess } from "./company.service.js";
import { recordEvent } from "./event.service.js";
import type { OrgContext, CreateContactInput, UpdateContactInput } from "@crm/shared";

export async function listContacts(ctx: OrgContext, companyId: string) {
  await ensureCompanyAccess(ctx, companyId);
  return prisma.contact.findMany({
    where: { companyId },
    include: { phoneNumbers: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getContact(
  ctx: OrgContext,
  companyId: string,
  contactId: string,
) {
  await ensureCompanyAccess(ctx, companyId);
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, companyId },
    include: { phoneNumbers: true },
  });
  if (!contact) {
    throw new AppError(404, "CONTACT_NOT_FOUND", "Contact not found");
  }
  return contact;
}

export async function createContact(
  ctx: OrgContext,
  companyId: string,
  data: CreateContactInput,
) {
  await ensureCompanyAccess(ctx, companyId);
  const contact = await prisma.contact.create({
    data: { ...data, companyId },
    include: { phoneNumbers: true },
  });
  await recordEvent({
    ctx, companyId, entityType: "CONTACT", entityId: contact.id,
    action: "CREATED",
    metadata: { name: `${contact.firstName} ${contact.lastName}`, email: contact.email },
  });
  return contact;
}

export async function updateContact(
  ctx: OrgContext,
  companyId: string,
  contactId: string,
  data: UpdateContactInput,
) {
  await ensureCompanyAccess(ctx, companyId);
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, companyId },
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
  companyId: string,
  contactId: string,
) {
  await ensureCompanyAccess(ctx, companyId);
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, companyId },
  });
  if (!contact) {
    throw new AppError(404, "CONTACT_NOT_FOUND", "Contact not found");
  }
  await prisma.contact.delete({ where: { id: contactId } });
  await recordEvent({
    ctx, companyId, entityType: "CONTACT", entityId: contactId,
    action: "DELETED",
    metadata: { name: `${contact.firstName} ${contact.lastName}` },
  });
}
