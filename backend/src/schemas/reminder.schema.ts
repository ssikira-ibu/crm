import { z } from "zod";

export const createReminderSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  dueDate: z.coerce.date(),
  isCompleted: z.boolean().optional(),
});

export const updateReminderSchema = createReminderSchema.partial();

export const reminderQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  completed: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  dueBefore: z.coerce.date().optional(),
});
