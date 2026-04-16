import { prisma } from "../lib/prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import { ensureCustomerOwnership } from "./customer.service.js";
import type { CreateTagInput, UpdateTagInput } from "@crm/shared";

export async function listTags(userId: string) {
  return prisma.tag.findMany({
    where: { userId },
    orderBy: { name: "asc" },
  });
}

export async function createTag(userId: string, data: CreateTagInput) {
  return prisma.tag.create({
    data: { ...data, userId },
  });
}

export async function updateTag(
  userId: string,
  tagId: string,
  data: UpdateTagInput,
) {
  const tag = await prisma.tag.findFirst({
    where: { id: tagId, userId },
  });
  if (!tag) {
    throw new AppError(404, "TAG_NOT_FOUND", "Tag not found");
  }
  return prisma.tag.update({ where: { id: tagId }, data });
}

export async function deleteTag(userId: string, tagId: string) {
  const tag = await prisma.tag.findFirst({
    where: { id: tagId, userId },
  });
  if (!tag) {
    throw new AppError(404, "TAG_NOT_FOUND", "Tag not found");
  }
  await prisma.tag.delete({ where: { id: tagId } });
}

export async function addTagToCustomer(
  userId: string,
  customerId: string,
  tagId: string,
) {
  await ensureCustomerOwnership(userId, customerId);
  const tag = await prisma.tag.findFirst({
    where: { id: tagId, userId },
  });
  if (!tag) {
    throw new AppError(404, "TAG_NOT_FOUND", "Tag not found");
  }
  await prisma.customerTag.upsert({
    where: { customerId_tagId: { customerId, tagId } },
    create: { customerId, tagId },
    update: {},
  });
}

export async function removeTagFromCustomer(
  userId: string,
  customerId: string,
  tagId: string,
) {
  await ensureCustomerOwnership(userId, customerId);
  await prisma.customerTag.deleteMany({
    where: { customerId, tagId },
  });
}
