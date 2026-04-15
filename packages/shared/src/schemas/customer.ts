import { z } from "zod";
import { CUSTOMER_STATUSES } from "../enums.js";

export const createCustomerSchema = z.object({
  companyName: z.string().min(1).max(255).optional(),
  industry: z.string().max(255).optional(),
  website: z.string().url().optional(),
  status: z.enum(CUSTOMER_STATUSES).optional(),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;

export const updateCustomerSchema = createCustomerSchema.partial();

export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;

export const customerQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(CUSTOMER_STATUSES).optional(),
  search: z.string().optional(),
});

export type CustomerQueryParams = z.infer<typeof customerQuerySchema>;
