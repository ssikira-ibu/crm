import { z } from "zod";
import { ACTIVITY_TYPES } from "../enums.js";

export const createActivitySchema = z.object({
  type: z.enum(ACTIVITY_TYPES),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  date: z.coerce.date(),
  contactId: z.string().uuid().optional(),
  dealId: z.string().uuid().optional(),
});

export type CreateActivityInput = z.infer<typeof createActivitySchema>;

export const updateActivitySchema = createActivitySchema.partial();

export type UpdateActivityInput = z.infer<typeof updateActivitySchema>;

export const activityQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  type: z.enum(ACTIVITY_TYPES).optional(),
});

export type ActivityQueryParams = z.infer<typeof activityQuerySchema>;
