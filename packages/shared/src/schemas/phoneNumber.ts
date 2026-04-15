import { z } from "zod";
import { PHONE_LABELS } from "../enums.js";

export const createPhoneNumberSchema = z.object({
  label: z.enum(PHONE_LABELS).optional(),
  number: z.string().min(1).max(30),
  extension: z.string().max(10).optional(),
  isPrimary: z.boolean().optional(),
});

export type CreatePhoneNumberInput = z.infer<typeof createPhoneNumberSchema>;

export const updatePhoneNumberSchema = createPhoneNumberSchema.partial();

export type UpdatePhoneNumberInput = z.infer<typeof updatePhoneNumberSchema>;
