import { z } from "zod";

export const searchQuerySchema = z.object({
  q: z.string().min(1).max(200),
  limit: z.coerce.number().int().positive().max(20).default(5),
});

export type SearchQueryParams = z.infer<typeof searchQuerySchema>;
