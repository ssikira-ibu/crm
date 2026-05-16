import { z } from "zod";

export const createPipelineSchema = z.object({
  name: z.string().min(1).max(255),
  isDefault: z.boolean().optional(),
  position: z.number().int().nonnegative().optional(),
});

export type CreatePipelineInput = z.infer<typeof createPipelineSchema>;

export const updatePipelineSchema = createPipelineSchema.partial();

export type UpdatePipelineInput = z.infer<typeof updatePipelineSchema>;

const pipelineStageFields = z.object({
  name: z.string().min(1).max(255),
  position: z.number().int().nonnegative().optional(),
  probability: z.number().int().min(0).max(100).optional(),
  isWon: z.boolean().optional(),
  isLost: z.boolean().optional(),
});

const noWonAndLost = (data: { isWon?: boolean; isLost?: boolean }) =>
  !(data.isWon && data.isLost);
const wonLostMessage = { message: "A stage cannot be both won and lost", path: ["isLost"] };

export const createPipelineStageSchema = pipelineStageFields.refine(noWonAndLost, wonLostMessage);

export type CreatePipelineStageInput = z.infer<typeof createPipelineStageSchema>;

export const updatePipelineStageSchema = pipelineStageFields.partial().refine(noWonAndLost, wonLostMessage);

export type UpdatePipelineStageInput = z.infer<typeof updatePipelineStageSchema>;
