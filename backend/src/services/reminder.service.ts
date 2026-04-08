import { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import { ensureCustomerOwnership } from "./customer.service.js";
import type { ReminderQueryParams, CreateReminderInput, UpdateReminderInput } from "../schemas/reminder.schema.js";

export async function listReminders(
  userId: string,
  customerId: string,
  params: ReminderQueryParams,
) {
  await ensureCustomerOwnership(userId, customerId);
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
  userId: string,
  customerId: string,
  reminderId: string,
) {
  await ensureCustomerOwnership(userId, customerId);
  const reminder = await prisma.reminder.findFirst({
    where: { id: reminderId, customerId },
  });
  if (!reminder) {
    throw new AppError(404, "REMINDER_NOT_FOUND", "Reminder not found");
  }
  return reminder;
}

export async function createReminder(
  userId: string,
  customerId: string,
  data: CreateReminderInput,
) {
  await ensureCustomerOwnership(userId, customerId);
  return prisma.reminder.create({
    data: { ...data, customerId },
  });
}

export async function updateReminder(
  userId: string,
  customerId: string,
  reminderId: string,
  data: UpdateReminderInput,
) {
  await ensureCustomerOwnership(userId, customerId);
  const reminder = await prisma.reminder.findFirst({
    where: { id: reminderId, customerId },
  });
  if (!reminder) {
    throw new AppError(404, "REMINDER_NOT_FOUND", "Reminder not found");
  }
  return prisma.reminder.update({ where: { id: reminderId }, data });
}

export async function deleteReminder(
  userId: string,
  customerId: string,
  reminderId: string,
) {
  await ensureCustomerOwnership(userId, customerId);
  const reminder = await prisma.reminder.findFirst({
    where: { id: reminderId, customerId },
  });
  if (!reminder) {
    throw new AppError(404, "REMINDER_NOT_FOUND", "Reminder not found");
  }
  await prisma.reminder.delete({ where: { id: reminderId } });
}
