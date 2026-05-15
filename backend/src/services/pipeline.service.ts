import { prisma } from "../lib/prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import type {
  OrgContext,
  CreatePipelineInput,
  UpdatePipelineInput,
  CreatePipelineStageInput,
  UpdatePipelineStageInput,
} from "@crm/shared";

export async function listPipelines(ctx: OrgContext) {
  return prisma.pipeline.findMany({
    where: { organizationId: ctx.organizationId },
    include: {
      stages: { where: { deletedAt: null }, orderBy: { position: "asc" } },
    },
    orderBy: { position: "asc" },
  });
}

export async function getPipeline(ctx: OrgContext, id: string) {
  const pipeline = await prisma.pipeline.findFirst({
    where: { id, organizationId: ctx.organizationId },
    include: {
      stages: { where: { deletedAt: null }, orderBy: { position: "asc" } },
    },
  });
  if (!pipeline) {
    throw new AppError(404, "PIPELINE_NOT_FOUND", "Pipeline not found");
  }
  return pipeline;
}

export async function createPipeline(ctx: OrgContext, data: CreatePipelineInput) {
  if (data.isDefault) {
    await prisma.pipeline.updateMany({
      where: { organizationId: ctx.organizationId, isDefault: true },
      data: { isDefault: false },
    });
  }
  return prisma.pipeline.create({
    data: {
      ...data,
      organizationId: ctx.organizationId,
    },
    include: {
      stages: { where: { deletedAt: null }, orderBy: { position: "asc" } },
    },
  });
}

export async function updatePipeline(
  ctx: OrgContext,
  id: string,
  data: UpdatePipelineInput,
) {
  const pipeline = await prisma.pipeline.findFirst({
    where: { id, organizationId: ctx.organizationId },
  });
  if (!pipeline) {
    throw new AppError(404, "PIPELINE_NOT_FOUND", "Pipeline not found");
  }

  if (data.isDefault) {
    await prisma.pipeline.updateMany({
      where: { organizationId: ctx.organizationId, isDefault: true },
      data: { isDefault: false },
    });
  }

  return prisma.pipeline.update({
    where: { id },
    data,
    include: {
      stages: { where: { deletedAt: null }, orderBy: { position: "asc" } },
    },
  });
}

export async function deletePipeline(ctx: OrgContext, id: string) {
  const pipeline = await prisma.pipeline.findFirst({
    where: { id, organizationId: ctx.organizationId },
  });
  if (!pipeline) {
    throw new AppError(404, "PIPELINE_NOT_FOUND", "Pipeline not found");
  }
  await prisma.pipeline.delete({ where: { id } });
}

export async function createStage(
  ctx: OrgContext,
  pipelineId: string,
  data: CreatePipelineStageInput,
) {
  const pipeline = await prisma.pipeline.findFirst({
    where: { id: pipelineId, organizationId: ctx.organizationId },
  });
  if (!pipeline) {
    throw new AppError(404, "PIPELINE_NOT_FOUND", "Pipeline not found");
  }
  return prisma.pipelineStage.create({
    data: { ...data, pipelineId },
  });
}

export async function updateStage(
  ctx: OrgContext,
  pipelineId: string,
  stageId: string,
  data: UpdatePipelineStageInput,
) {
  const pipeline = await prisma.pipeline.findFirst({
    where: { id: pipelineId, organizationId: ctx.organizationId },
  });
  if (!pipeline) {
    throw new AppError(404, "PIPELINE_NOT_FOUND", "Pipeline not found");
  }
  const stage = await prisma.pipelineStage.findFirst({
    where: { id: stageId, pipelineId },
  });
  if (!stage) {
    throw new AppError(404, "STAGE_NOT_FOUND", "Pipeline stage not found");
  }
  return prisma.pipelineStage.update({
    where: { id: stageId },
    data,
  });
}

export async function deleteStage(
  ctx: OrgContext,
  pipelineId: string,
  stageId: string,
) {
  const pipeline = await prisma.pipeline.findFirst({
    where: { id: pipelineId, organizationId: ctx.organizationId },
  });
  if (!pipeline) {
    throw new AppError(404, "PIPELINE_NOT_FOUND", "Pipeline not found");
  }
  const stage = await prisma.pipelineStage.findFirst({
    where: { id: stageId, pipelineId },
  });
  if (!stage) {
    throw new AppError(404, "STAGE_NOT_FOUND", "Pipeline stage not found");
  }
  await prisma.pipelineStage.delete({ where: { id: stageId } });
}
