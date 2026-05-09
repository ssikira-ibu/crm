import { z } from "zod";
import { COMPANY_STATUSES } from "../enums.js";

export const createCompanySchema = z.object({
  name: z.string().min(1).max(255),
  industry: z.string().max(255).optional(),
  website: z.string().url().optional(),
  phone: z.string().max(50).optional(),
  email: z.string().email().optional(),
  status: z.enum(COMPANY_STATUSES).optional(),
});

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;

export const updateCompanySchema = createCompanySchema.partial();

export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;

export const companyQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(COMPANY_STATUSES).optional(),
  search: z.string().optional(),
});

export type CompanyQueryParams = z.infer<typeof companyQuerySchema>;
