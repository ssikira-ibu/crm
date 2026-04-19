import { prisma } from "../lib/prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import { ensureCustomerAccess } from "./customer.service.js";
import { recordEvent } from "./event.service.js";
import type { OrgContext, CreateTagInput, UpdateTagInput } from "@crm/shared";

export async function listTags(ctx: OrgContext) {
  return prisma.tag.findMany({
    where: { organizationId: ctx.organizationId },
    orderBy: { name: "asc" },
  });
}

export async function createTag(ctx: OrgContext, data: CreateTagInput) {
  return prisma.tag.create({
    data: { ...data, organizationId: ctx.organizationId },
  });
}

export async function updateTag(
  ctx: OrgContext,
  tagId: string,
  data: UpdateTagInput,
) {
  const tag = await prisma.tag.findFirst({
    where: { id: tagId, organizationId: ctx.organizationId },
  });
  if (!tag) {
    throw new AppError(404, "TAG_NOT_FOUND", "Tag not found");
  }
  return prisma.tag.update({ where: { id: tagId }, data });
}

export async function deleteTag(ctx: OrgContext, tagId: string) {
  const tag = await prisma.tag.findFirst({
    where: { id: tagId, organizationId: ctx.organizationId },
  });
  if (!tag) {
    throw new AppError(404, "TAG_NOT_FOUND", "Tag not found");
  }
  await prisma.tag.delete({ where: { id: tagId } });
}

export async function addTagToCustomer(
  ctx: OrgContext,
  customerId: string,
  tagId: string,
) {
  await ensureCustomerAccess(ctx, customerId);
  const tag = await prisma.tag.findFirst({
    where: { id: tagId, organizationId: ctx.organizationId },
  });
  if (!tag) {
    throw new AppError(404, "TAG_NOT_FOUND", "Tag not found");
  }
  await prisma.customerTag.upsert({
    where: { customerId_tagId: { customerId, tagId } },
    create: { customerId, tagId },
    update: {},
  });
  await recordEvent({
    ctx, customerId, entityType: "TAG", entityId: tagId,
    action: "TAGGED",
    metadata: { name: tag.name, color: tag.color },
  });
}

export async function removeTagFromCustomer(
  ctx: OrgContext,
  customerId: string,
  tagId: string,
) {
  await ensureCustomerAccess(ctx, customerId);
  const tag = await prisma.tag.findFirst({ where: { id: tagId, organizationId: ctx.organizationId } });
  await prisma.customerTag.deleteMany({
    where: { customerId, tagId },
  });
  if (tag) {
    await recordEvent({
      ctx, customerId, entityType: "TAG", entityId: tagId,
      action: "UNTAGGED",
      metadata: { name: tag.name },
    });
  }
}
