import { z } from "zod";

export const createReminderSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  dueDate: z.coerce.date(),
  dateCompleted: z.coerce.date().nullable().optional(),
});

export type CreateReminderInput = z.infer<typeof createReminderSchema>;

export const updateReminderSchema = createReminderSchema.partial();

export type UpdateReminderInput = z.infer<typeof updateReminderSchema>;

export const reminderQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  completed: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  dueBefore: z.coerce.date().optional(),
});

export type ReminderQueryParams = z.infer<typeof reminderQuerySchema>;
