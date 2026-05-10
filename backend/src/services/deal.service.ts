import { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import { ensureCompanyAccess } from "./company.service.js";
import { recordEvent } from "./event.service.js";
import type { OrgContext, DealQueryParams, CreateDealInput, UpdateDealInput } from "@crm/shared";

function serializeDeal<T extends { value: unknown }>(deal: T): T & { value: number } {
  return { ...deal, value: Number(deal.value) };
}

function serializeDeals<T extends { value: unknown }>(deals: T[]): (T & { value: number })[] {
  return deals.map(serializeDeal);
}

export async function listDeals(
  ctx: OrgContext,
  companyId: string,
  params: DealQueryParams,
) {
  await ensureCompanyAccess(ctx, companyId);
  const { page, limit, pipelineId, stageId } = params;
  const where: Prisma.DealWhereInput = { companyId };

  if (pipelineId) {
    where.pipelineId = pipelineId;
  }
  if (stageId) {
    where.stageId = stageId;
  }

  const [data, total] = await Promise.all([
    prisma.deal.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { stage: true },
    }),
    prisma.deal.count({ where }),
  ]);

  return {
    data: serializeDeals(data),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function getDeal(
  ctx: OrgContext,
  companyId: string,
  dealId: string,
) {
  await ensureCompanyAccess(ctx, companyId);
  const deal = await prisma.deal.findFirst({
    where: { id: dealId, companyId },
    include: { stage: true },
  });
  if (!deal) {
    throw new AppError(404, "DEAL_NOT_FOUND", "Deal not found");
  }
  return serializeDeal(deal);
}

export async function createDeal(
  ctx: OrgContext,
  companyId: string,
  data: CreateDealInput,
) {
  await ensureCompanyAccess(ctx, companyId);

  // If no pipelineId provided, use the org's default pipeline
  let pipelineId = data.pipelineId;
  if (!pipelineId) {
    const defaultPipeline = await prisma.pipeline.findFirst({
      where: { organizationId: ctx.organizationId, isDefault: true },
      select: { id: true },
    });
    if (!defaultPipeline) {
      throw new AppError(400, "NO_DEFAULT_PIPELINE", "No default pipeline found. Please specify a pipeline.");
    }
    pipelineId = defaultPipeline.id;
  }

  // Verify the stage belongs to the pipeline
  const stage = await prisma.pipelineStage.findFirst({
    where: { id: data.stageId, pipelineId },
  });
  if (!stage) {
    throw new AppError(400, "INVALID_STAGE", "Stage does not belong to the specified pipeline");
  }

  const deal = await prisma.deal.create({
    data: {
      title: data.title,
      description: data.description,
      value: data.value,
      expectedCloseDate: data.expectedCloseDate,
      contactId: data.contactId,
      companyId,
      organizationId: ctx.organizationId,
      ownerId: ctx.userId,
      pipelineId,
      stageId: data.stageId,
      closedAt: (stage.isWon || stage.isLost) ? new Date() : null,
    },
    include: { stage: true },
  });
  await recordEvent({
    ctx, companyId, entityType: "DEAL", entityId: deal.id,
    action: "CREATED",
    metadata: { title: deal.title, value: Number(deal.value) },
  });
  return serializeDeal(deal);
}

export async function updateDeal(
  ctx: OrgContext,
  companyId: string,
  dealId: string,
  data: UpdateDealInput,
) {
  await ensureCompanyAccess(ctx, companyId);
  const old = await prisma.deal.findFirst({
    where: { id: dealId, companyId },
    include: { stage: true },
  });
  if (!old) {
    throw new AppError(404, "DEAL_NOT_FOUND", "Deal not found");
  }

  const updateData: Prisma.DealUpdateInput = {
    title: data.title,
    description: data.description,
    value: data.value,
    expectedCloseDate: data.expectedCloseDate,
  };

  if (data.contactId !== undefined) {
    updateData.contact = data.contactId
      ? { connect: { id: data.contactId } }
      : { disconnect: true };
  }

  if (data.stageId && data.stageId !== old.stageId) {
    const newStage = await prisma.pipelineStage.findFirst({
      where: { id: data.stageId, pipelineId: old.pipelineId },
    });
    if (!newStage) {
      throw new AppError(400, "INVALID_STAGE", "Stage does not belong to the deal's pipeline");
    }
    updateData.stage = { connect: { id: data.stageId } };

    // Handle closedAt based on stage type
    if (newStage.isWon || newStage.isLost) {
      updateData.closedAt = new Date();
    } else {
      updateData.closedAt = null;
    }
  }

  // Remove undefined keys so Prisma doesn't try to set them
  for (const key of Object.keys(updateData) as (keyof typeof updateData)[]) {
    if (updateData[key] === undefined) {
      delete updateData[key];
    }
  }

  const deal = await prisma.deal.update({
    where: { id: dealId },
    data: updateData,
    include: { stage: true },
  });

  if (data.stageId && data.stageId !== old.stageId) {
    await recordEvent({
      ctx, companyId, entityType: "DEAL", entityId: dealId,
      action: "STAGE_CHANGED",
      metadata: {
        title: deal.title,
        value: Number(deal.value),
        oldStageId: old.stageId,
        newStageId: data.stageId,
        oldStageName: old.stage.name,
        newStageName: deal.stage.name,
      },
    });
  }

  return serializeDeal(deal);
}

export async function deleteDeal(
  ctx: OrgContext,
  companyId: string,
  dealId: string,
) {
  await ensureCompanyAccess(ctx, companyId);
  const deal = await prisma.deal.findFirst({
    where: { id: dealId, companyId },
  });
  if (!deal) {
    throw new AppError(404, "DEAL_NOT_FOUND", "Deal not found");
  }
  await prisma.deal.delete({ where: { id: dealId } });
  await recordEvent({
    ctx, companyId, entityType: "DEAL", entityId: dealId,
    action: "DELETED",
    metadata: { title: deal.title, value: Number(deal.value) },
  });
}

export async function getDealsOverview(ctx: OrgContext) {
  const companyWhere: Prisma.CompanyWhereInput = {
    organizationId: ctx.organizationId,
  };
  if (ctx.role === "SALESPERSON") {
    companyWhere.ownerId = ctx.userId;
  }

  const companyIds = (
    await prisma.company.findMany({ where: companyWhere, select: { id: true } })
  ).map((c) => c.id);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [deals, wonThisMonth, wonLastMonth] = await Promise.all([
    prisma.deal.findMany({
      where: { companyId: { in: companyIds } },
      include: {
        stage: true,
        company: { select: { id: true, name: true, status: true } },
        owner: { select: { id: true, displayName: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.deal.findMany({
      where: {
        companyId: { in: companyIds },
        stage: { isWon: true },
        closedAt: { gte: monthStart },
      },
      select: { value: true },
    }),
    prisma.deal.findMany({
      where: {
        companyId: { in: companyIds },
        stage: { isWon: true },
        closedAt: { gte: prevMonthStart, lt: monthStart },
      },
      select: { value: true },
    }),
  ]);

  const serialized = serializeDeals(deals);

  const open = serialized.filter((d) => !d.stage?.isWon && !d.stage?.isLost);
  const won = serialized.filter((d) => d.stage?.isWon);
  const lost = serialized.filter((d) => d.stage?.isLost);

  const pipelineValue = open.reduce((s, d) => s + d.value, 0);
  const weightedForecast = open.reduce(
    (s, d) => s + d.value * ((d.stage?.probability ?? 0) / 100),
    0,
  );
  const wonThisMonthValue = wonThisMonth.reduce((s, d) => s + Number(d.value), 0);
  const wonLastMonthValue = wonLastMonth.reduce((s, d) => s + Number(d.value), 0);
  const winRate =
    won.length + lost.length > 0
      ? Math.round((won.length / (won.length + lost.length)) * 100)
      : 0;

  const stageMap = new Map<string, { stage: typeof serialized[0]["stage"]; value: number; count: number }>();
  for (const d of open) {
    const existing = stageMap.get(d.stageId);
    if (existing) {
      existing.value += d.value;
      existing.count += 1;
    } else {
      stageMap.set(d.stageId, { stage: d.stage, value: d.value, count: 1 });
    }
  }
  const stageSummary = Array.from(stageMap.values())
    .sort((a, b) => (a.stage?.position ?? 0) - (b.stage?.position ?? 0))
    .map((s) => ({
      id: s.stage!.id,
      name: s.stage!.name,
      position: s.stage!.position,
      probability: s.stage!.probability,
      value: s.value,
      count: s.count,
    }));

  return {
    deals: serialized,
    metrics: {
      pipelineValue,
      weightedForecast,
      wonThisMonth: wonThisMonthValue,
      wonLastMonth: wonLastMonthValue,
      winRate,
      totalDeals: serialized.length,
      openCount: open.length,
      wonCount: won.length,
      lostCount: lost.length,
    },
    stageSummary,
  };
}
