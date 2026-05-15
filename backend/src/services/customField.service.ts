import { prisma } from "../lib/prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import type {
  OrgContext,
  CreateCustomFieldDefinitionInput,
  UpdateCustomFieldDefinitionInput,
  CustomFieldEntity,
} from "@crm/shared";

export async function listDefinitions(ctx: OrgContext, entityType?: CustomFieldEntity) {
  return prisma.customFieldDefinition.findMany({
    where: {
      organizationId: ctx.organizationId,
      ...(entityType ? { entityType } : {}),
    },
    orderBy: { position: "asc" },
  });
}

export async function createDefinition(
  ctx: OrgContext,
  data: CreateCustomFieldDefinitionInput,
) {
  return prisma.customFieldDefinition.create({
    data: {
      ...data,
      organizationId: ctx.organizationId,
    },
  });
}

export async function updateDefinition(
  ctx: OrgContext,
  id: string,
  data: UpdateCustomFieldDefinitionInput,
) {
  const def = await prisma.customFieldDefinition.findFirst({
    where: { id, organizationId: ctx.organizationId },
  });
  if (!def) {
    throw new AppError(404, "CUSTOM_FIELD_NOT_FOUND", "Custom field definition not found");
  }
  return prisma.customFieldDefinition.update({
    where: { id },
    data,
  });
}

export async function deleteDefinition(ctx: OrgContext, id: string) {
  const def = await prisma.customFieldDefinition.findFirst({
    where: { id, organizationId: ctx.organizationId },
  });
  if (!def) {
    throw new AppError(404, "CUSTOM_FIELD_NOT_FOUND", "Custom field definition not found");
  }
  await prisma.customFieldDefinition.delete({ where: { id } });
}

export async function getValues(
  ctx: OrgContext,
  entityType: CustomFieldEntity,
  entityId: string,
) {
  return prisma.customFieldValue.findMany({
    where: {
      entityId,
      definition: {
        organizationId: ctx.organizationId,
        entityType,
        deletedAt: null,
      },
    },
    include: {
      definition: true,
    },
  });
}

export async function setValue(
  ctx: OrgContext,
  definitionId: string,
  entityId: string,
  value: string,
) {
  const def = await prisma.customFieldDefinition.findFirst({
    where: { id: definitionId, organizationId: ctx.organizationId },
  });
  if (!def) {
    throw new AppError(404, "CUSTOM_FIELD_NOT_FOUND", "Custom field definition not found");
  }

  // For SELECT fields, validate the value is in the options array
  if (def.fieldType === "SELECT") {
    const options = (def.options as string[]) ?? [];
    if (!options.includes(value)) {
      throw new AppError(400, "INVALID_OPTION", `Value must be one of: ${options.join(", ")}`);
    }
  }

  const existing = await prisma.customFieldValue.findFirst({
    where: { definitionId, entityId },
    select: { id: true },
  });

  if (existing) {
    return prisma.customFieldValue.update({
      where: { id: existing.id },
      data: { value },
      include: { definition: true },
    });
  }

  return prisma.customFieldValue.create({
    data: { definitionId, entityId, value },
    include: { definition: true },
  });
}

export async function deleteValue(
  ctx: OrgContext,
  definitionId: string,
  entityId: string,
) {
  const def = await prisma.customFieldDefinition.findFirst({
    where: { id: definitionId, organizationId: ctx.organizationId },
  });
  if (!def) {
    throw new AppError(404, "CUSTOM_FIELD_NOT_FOUND", "Custom field definition not found");
  }
  await prisma.customFieldValue.deleteMany({
    where: { definitionId, entityId },
  });
}
