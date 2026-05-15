import { z } from "zod";

export const agentChatMessageSchema = z.object({
  message: z.string().min(1).max(2000),
  conversationId: z.string().uuid().optional(),
});

export type AgentChatMessageInput = z.infer<typeof agentChatMessageSchema>;

export const createAgentConversationSchema = z.object({
  title: z.string().max(100).nullable().optional(),
});

export const appendAgentConversationSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string(),
    toolCalls: z.array(z.object({
      id: z.string(),
      name: z.string(),
      input: z.record(z.string(), z.unknown()),
    })).optional(),
    createdAt: z.string(),
  })),
  providerMessages: z.array(z.discriminatedUnion("role", [
    z.object({ role: z.literal("user"), content: z.string() }),
    z.object({
      role: z.literal("assistant"),
      content: z.string(),
      toolCalls: z.array(z.object({
        id: z.string(),
        name: z.string(),
        input: z.record(z.string(), z.unknown()),
      })).optional(),
      thinkingBlocks: z.array(z.object({
        thinking: z.string(),
        signature: z.string(),
      })).optional(),
      redactedThinkingBlocks: z.array(z.object({
        data: z.string(),
      })).optional(),
    }),
    z.object({
      role: z.literal("tool"),
      toolUseId: z.string(),
      content: z.string(),
      isError: z.boolean(),
    }),
  ])),
  inputTokens: z.number().int().nonnegative().default(0),
  outputTokens: z.number().int().nonnegative().default(0),
});

export const createAgentActionSchema = z.object({
  conversationId: z.string().uuid(),
  toolCallId: z.string(),
  toolName: z.string(),
  risk: z.enum(["write", "destructive", "external"]),
  summary: z.string().min(1).max(500),
  input: z.record(z.string(), z.unknown()),
  expiresAt: z.string().datetime(),
});

export type CreateAgentConversationInput = z.infer<typeof createAgentConversationSchema>;
export type AppendAgentConversationInput = z.infer<typeof appendAgentConversationSchema>;
export type CreateAgentActionInput = z.infer<typeof createAgentActionSchema>;
