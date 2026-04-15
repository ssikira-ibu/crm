import { z } from "zod";

export const createNoteSchema = z.object({
  title: z.string().min(1).max(255),
  body: z.string().min(1),
  contactId: z.string().uuid().optional(),
  dealId: z.string().uuid().optional(),
});

export type CreateNoteInput = z.infer<typeof createNoteSchema>;

export const updateNoteSchema = createNoteSchema.partial();

export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
