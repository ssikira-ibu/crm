import { z } from "zod";
import { CUSTOM_FIELD_TYPES, CUSTOM_FIELD_ENTITIES } from "../enums.js";

export const createCustomFieldDefinitionSchema = z.object({
  entityType: z.enum(CUSTOM_FIELD_ENTITIES),
  name: z.string().min(1).max(255),
  fieldKey: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z][a-z0-9_]*$/, "Field key must be lowercase alphanumeric with underscores"),
  fieldType: z.enum(CUSTOM_FIELD_TYPES),
  options: z.array(z.string()).optional(),
  isRequired: z.boolean().optional(),
  position: z.number().int().nonnegative().optional(),
});

export type CreateCustomFieldDefinitionInput = z.infer<typeof createCustomFieldDefinitionSchema>;

export const updateCustomFieldDefinitionSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  options: z.array(z.string()).optional(),
  isRequired: z.boolean().optional(),
  position: z.number().int().nonnegative().optional(),
});

export type UpdateCustomFieldDefinitionInput = z.infer<typeof updateCustomFieldDefinitionSchema>;

export const setCustomFieldValueSchema = z.object({
  value: z.string(),
});

export type SetCustomFieldValueInput = z.infer<typeof setCustomFieldValueSchema>;
