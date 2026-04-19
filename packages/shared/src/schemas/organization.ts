import { z } from "zod";
import { ORG_ROLES } from "../enums.js";

export const createOrganizationSchema = z.object({
  name: z.string().min(1).max(255),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;

export const createInviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(ORG_ROLES),
});

export type CreateInviteInput = z.infer<typeof createInviteSchema>;

export const updateMemberRoleSchema = z.object({
  role: z.enum(ORG_ROLES),
});

export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
