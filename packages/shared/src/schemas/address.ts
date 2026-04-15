import { z } from "zod";
import { ADDRESS_LABELS } from "../enums.js";

export const createAddressSchema = z.object({
  label: z.enum(ADDRESS_LABELS).optional(),
  street1: z.string().min(1).max(255),
  street2: z.string().max(255).optional(),
  city: z.string().min(1).max(255),
  state: z.string().min(1).max(255),
  zipCode: z.string().min(1).max(20),
  country: z.string().max(100).optional(),
});

export type CreateAddressInput = z.infer<typeof createAddressSchema>;

export const updateAddressSchema = createAddressSchema.partial();

export type UpdateAddressInput = z.infer<typeof updateAddressSchema>;
