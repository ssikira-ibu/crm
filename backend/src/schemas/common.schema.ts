import { z } from "zod";

export const uuidParam = z.object({
  customerId: z.string().uuid(),
});

export const uuidWithChildParam = (childKey: string) =>
  z.object({
    customerId: z.string().uuid(),
    [childKey]: z.string().uuid(),
  });

export const paginationQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
