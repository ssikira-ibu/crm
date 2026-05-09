import { z } from "zod";

export const createDealSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  value: z.number().nonnegative(),
  expectedCloseDate: z.coerce.date().optional(),
  contactId: z.string().uuid().optional(),
  pipelineId: z.string().uuid().optional(),
  stageId: z.string().uuid(),
});

export type CreateDealInput = z.infer<typeof createDealSchema>;

export const updateDealSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  value: z.number().nonnegative().optional(),
  expectedCloseDate: z.coerce.date().optional(),
  contactId: z.string().uuid().nullable().optional(),
  stageId: z.string().uuid().optional(),
});

export type UpdateDealInput = z.infer<typeof updateDealSchema>;

export const dealQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  pipelineId: z.string().uuid().optional(),
  stageId: z.string().uuid().optional(),
});

export type DealQueryParams = z.infer<typeof dealQuerySchema>;
