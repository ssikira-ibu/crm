import { z } from "zod";
import { DEAL_STATUSES } from "../enums.js";

export const createDealSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  value: z.number().nonnegative(),
  status: z.enum(DEAL_STATUSES).optional(),
  expectedCloseDate: z.coerce.date().optional(),
  contactId: z.string().uuid().optional(),
});

export type CreateDealInput = z.infer<typeof createDealSchema>;

export const updateDealSchema = createDealSchema.partial();

export type UpdateDealInput = z.infer<typeof updateDealSchema>;

export const dealQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(DEAL_STATUSES).optional(),
});

export type DealQueryParams = z.infer<typeof dealQuerySchema>;
