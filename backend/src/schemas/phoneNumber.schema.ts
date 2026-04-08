import { z } from "zod";

export const createPhoneNumberSchema = z.object({
  label: z.enum(["WORK", "MOBILE", "HOME", "FAX", "OTHER"]).optional(),
  number: z.string().min(1).max(30),
  extension: z.string().max(10).optional(),
  isPrimary: z.boolean().optional(),
});

export const updatePhoneNumberSchema = createPhoneNumberSchema.partial();
