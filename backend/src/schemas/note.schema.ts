import { z } from "zod";

export const createNoteSchema = z.object({
  title: z.string().min(1).max(255),
  body: z.string().min(1),
});

export const updateNoteSchema = createNoteSchema.partial();
