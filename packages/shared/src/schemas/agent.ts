import { z } from "zod";

export const agentChatMessageSchema = z.object({
  message: z.string().min(1).max(2000),
  conversationId: z.string().optional(),
});

export type AgentChatMessageInput = z.infer<typeof agentChatMessageSchema>;
