import { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import { ensureCustomerAccess } from "./customer.service.js";
import { recordEvent } from "./event.service.js";
import type { OrgContext, ReminderQueryParams, CreateReminderInput, UpdateReminderInput } from "@crm/shared";

export async function listReminders(
  ctx: OrgContext,
  customerId: string,
  params: ReminderQueryParams,
) {
  await ensureCustomerAccess(ctx, customerId);
  const { page, limit, completed, dueBefore } = params;
  const where: Prisma.ReminderWhereInput = { customerId };

  if (completed !== undefined) {
    where.dateCompleted = completed ? { not: null } : null;
  }
  if (dueBefore) {
    where.dueDate = { lte: dueBefore };
  }

  const [data, total] = await Promise.all([
    prisma.reminder.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { dueDate: "asc" },
    }),
    prisma.reminder.count({ where }),
  ]);

  return {
    data,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function getReminder(
  ctx: OrgContext,
  customerId: string,
  reminderId: string,
) {
  await ensureCustomerAccess(ctx, customerId);
  const reminder = await prisma.reminder.findFirst({
    where: { id: reminderId, customerId },
  });
  if (!reminder) {
    throw new AppError(404, "REMINDER_NOT_FOUND", "Reminder not found");
  }
  return reminder;
}

export async function createReminder(
  ctx: OrgContext,
  customerId: string,
  data: CreateReminderInput,
) {
  await ensureCustomerAccess(ctx, customerId);
  const reminder = await prisma.reminder.create({
    data: { ...data, customerId },
  });
  await recordEvent({
    ctx, customerId, entityType: "REMINDER", entityId: reminder.id,
    action: "CREATED",
    metadata: { title: reminder.title },
  });
  return reminder;
}

export async function updateReminder(
  ctx: OrgContext,
  customerId: string,
  reminderId: string,
  data: UpdateReminderInput,
) {
  await ensureCustomerAccess(ctx, customerId);
  const reminder = await prisma.reminder.findFirst({
    where: { id: reminderId, customerId },
  });
  if (!reminder) {
    throw new AppError(404, "REMINDER_NOT_FOUND", "Reminder not found");
  }
  const updated = await prisma.reminder.update({ where: { id: reminderId }, data });
  if (data.dateCompleted && !reminder.dateCompleted) {
    await recordEvent({
      ctx, customerId, entityType: "REMINDER", entityId: reminderId,
      action: "COMPLETED",
      metadata: { title: reminder.title },
    });
  }
  return updated;
}

export async function deleteReminder(
  ctx: OrgContext,
  customerId: string,
  reminderId: string,
) {
  await ensureCustomerAccess(ctx, customerId);
  const reminder = await prisma.reminder.findFirst({
    where: { id: reminderId, customerId },
  });
  if (!reminder) {
    throw new AppError(404, "REMINDER_NOT_FOUND", "Reminder not found");
  }
  await prisma.reminder.delete({ where: { id: reminderId } });
}
