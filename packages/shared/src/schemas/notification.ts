import { z } from "zod";

export const notificationQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(20),
  unreadOnly: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  cursor: z.string().optional(),
});

export type NotificationQueryParams = z.infer<typeof notificationQuerySchema>;
