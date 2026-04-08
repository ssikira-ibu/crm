import { z } from "zod";

export const createCustomerSchema = z.object({
  companyName: z.string().min(1).max(255).optional(),
  industry: z.string().max(255).optional(),
  website: z.string().url().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "LEAD", "PROSPECT"]).optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export const customerQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(["ACTIVE", "INACTIVE", "LEAD", "PROSPECT"]).optional(),
  search: z.string().optional(),
});
