import { z } from "zod";

export const createContactSchema = z.object({
  firstName: z.string().min(1).max(255),
  lastName: z.string().min(1).max(255),
  email: z.string().email().optional(),
  jobTitle: z.string().max(255).optional(),
  isPrimary: z.boolean().optional(),
});

export const updateContactSchema = createContactSchema.partial();
