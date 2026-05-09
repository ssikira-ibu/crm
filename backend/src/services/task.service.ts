import { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import { ensureCompanyAccess } from "./company.service.js";
import { recordEvent } from "./event.service.js";
import type { OrgContext, TaskQueryParams, CreateTaskInput, UpdateTaskInput } from "@crm/shared";

function taskWhere(ctx: OrgContext): Prisma.TaskWhereInput {
  const where: Prisma.TaskWhereInput = { organizationId: ctx.organizationId };
  if (ctx.role === "SALESPERSON") {
    where.OR = [
      { company: { ownerId: ctx.userId } },
      { companyId: null, assigneeId: ctx.userId },
      { companyId: null, createdById: ctx.userId },
    ];
  }
  return where;
}

export async function listTasks(
  ctx: OrgContext,
  params: TaskQueryParams,
  companyId?: string,
) {
  if (companyId) {
    await ensureCompanyAccess(ctx, companyId);
  }

  const { page, limit, status, priority, assigneeId, completed, dueBefore } = params;
  const where: Prisma.TaskWhereInput = companyId
    ? { companyId, organizationId: ctx.organizationId }
    : taskWhere(ctx);

  if (status) {
    where.status = status;
  }
  if (priority) {
    where.priority = priority;
  }
  if (assigneeId) {
    where.assigneeId = assigneeId;
  }
  if (completed !== undefined) {
    where.status = completed ? "DONE" : { not: "DONE" };
  }
  if (dueBefore) {
    where.dueDate = { lte: dueBefore };
  }

  const [data, total] = await Promise.all([
    prisma.task.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { dueDate: "asc" },
      include: {
        company: { select: { id: true, name: true, status: true } },
      },
    }),
    prisma.task.count({ where }),
  ]);

  return {
    data,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function getTask(
  ctx: OrgContext,
  taskId: string,
  companyId?: string,
) {
  if (companyId) {
    await ensureCompanyAccess(ctx, companyId);
  }

  const where: Prisma.TaskWhereInput = companyId
    ? { id: taskId, companyId, organizationId: ctx.organizationId }
    : { id: taskId, ...taskWhere(ctx) };

  const task = await prisma.task.findFirst({
    where,
    include: {
      company: { select: { id: true, name: true, status: true } },
    },
  });
  if (!task) {
    throw new AppError(404, "TASK_NOT_FOUND", "Task not found");
  }
  return task;
}

export async function createTask(
  ctx: OrgContext,
  data: CreateTaskInput,
  companyId?: string,
) {
  if (companyId) {
    await ensureCompanyAccess(ctx, companyId);
  }

  const task = await prisma.task.create({
    data: {
      ...data,
      organizationId: ctx.organizationId,
      companyId: companyId ?? null,
      createdById: ctx.userId,
      completedAt: data.status === "DONE" ? new Date() : null,
    },
    include: {
      company: { select: { id: true, name: true, status: true } },
    },
  });
  await recordEvent({
    ctx, companyId, entityType: "TASK", entityId: task.id,
    action: "CREATED",
    metadata: { title: task.title },
  });
  return task;
}

export async function updateTask(
  ctx: OrgContext,
  taskId: string,
  data: UpdateTaskInput,
  companyId?: string,
) {
  if (companyId) {
    await ensureCompanyAccess(ctx, companyId);
  }

  const where: Prisma.TaskWhereInput = companyId
    ? { id: taskId, companyId, organizationId: ctx.organizationId }
    : { id: taskId, ...taskWhere(ctx) };

  const old = await prisma.task.findFirst({ where });
  if (!old) {
    throw new AppError(404, "TASK_NOT_FOUND", "Task not found");
  }

  const updateData: Prisma.TaskUpdateInput = { ...data };

  // Handle completedAt based on status changes
  if (data.status) {
    if (data.status === "DONE" && old.status !== "DONE") {
      updateData.completedAt = new Date();
    } else if (data.status !== "DONE" && old.status === "DONE") {
      updateData.completedAt = null;
    }
  }

  const task = await prisma.task.update({
    where: { id: taskId },
    data: updateData,
    include: {
      company: { select: { id: true, name: true, status: true } },
    },
  });

  if (data.status && data.status === "DONE" && old.status !== "DONE") {
    await recordEvent({
      ctx, companyId: companyId ?? old.companyId ?? undefined,
      entityType: "TASK", entityId: taskId,
      action: "COMPLETED",
      metadata: { title: old.title },
    });
  }

  return task;
}

export async function deleteTask(
  ctx: OrgContext,
  taskId: string,
  companyId?: string,
) {
  if (companyId) {
    await ensureCompanyAccess(ctx, companyId);
  }

  const where: Prisma.TaskWhereInput = companyId
    ? { id: taskId, companyId, organizationId: ctx.organizationId }
    : { id: taskId, ...taskWhere(ctx) };

  const task = await prisma.task.findFirst({ where });
  if (!task) {
    throw new AppError(404, "TASK_NOT_FOUND", "Task not found");
  }
  await prisma.task.delete({ where: { id: taskId } });
}
