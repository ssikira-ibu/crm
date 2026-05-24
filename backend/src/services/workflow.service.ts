import { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import type {
  OrgContext,
  CreateWorkflowInput,
  UpdateWorkflowInput,
} from "@crm/shared";

export async function listWorkflows(
  ctx: OrgContext,
  filter?: { enabled?: boolean },
) {
  return prisma.workflow.findMany({
    where: {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      deletedAt: null,
      ...(filter?.enabled !== undefined ? { enabled: filter.enabled } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getWorkflow(ctx: OrgContext, id: string) {
  const workflow = await prisma.workflow.findFirst({
    where: {
      id,
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      deletedAt: null,
    },
  });
  if (!workflow) {
    throw new AppError(404, "WORKFLOW_NOT_FOUND", "Workflow not found");
  }
  return workflow;
}

export async function createWorkflow(
  ctx: OrgContext,
  input: CreateWorkflowInput,
) {
  return prisma.workflow.create({
    data: {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      name: input.name,
      enabled: input.enabled,
      trigger: input.trigger as unknown as Prisma.InputJsonValue,
      action: input.action as unknown as Prisma.InputJsonValue,
    },
  });
}

export async function updateWorkflow(
  ctx: OrgContext,
  id: string,
  input: UpdateWorkflowInput,
) {
  await getWorkflow(ctx, id);
  return prisma.workflow.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
      ...(input.trigger !== undefined
        ? { trigger: input.trigger as unknown as Prisma.InputJsonValue }
        : {}),
      ...(input.action !== undefined
        ? { action: input.action as unknown as Prisma.InputJsonValue }
        : {}),
    },
  });
}

export async function deleteWorkflow(ctx: OrgContext, id: string) {
  await getWorkflow(ctx, id);
  await prisma.workflow.update({
    where: { id },
    data: { deletedAt: new Date(), enabled: false },
  });
}
