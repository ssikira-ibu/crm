import Router from "@koa/router";
import { randomUUID } from "node:crypto";
import { PassThrough } from "node:stream";
import { agentChatMessageSchema, type AgentSSEEvent } from "@crm/shared";
import { config } from "../config.js";
import { db } from "../db/client.js";
import type { ConversationRecord } from "../db/schema.js";
import { createBackendClient } from "../lib/backend-client.js";
import { buildAgentContext } from "../agent/context.js";
import { buildSystemPrompt } from "../agent/system-prompt.js";
import { runAgentLoop } from "../agent/loop.js";
import { AnthropicProvider } from "../providers/anthropic.js";
import { OpenAIProvider } from "../providers/openai.js";
import type { Provider } from "../providers/types.js";
import { AppError } from "../middleware/errorHandler.js";
import { logger } from "../lib/logger.js";

function getProvider(): { provider: Provider; providerType: "anthropic" | "openai" } {
  if (config.DEFAULT_PROVIDER === "openai") {
    if (!config.OPENAI_API_KEY) {
      throw new AppError(500, "PROVIDER_ERROR", "OpenAI API key not configured");
    }
    return { provider: new OpenAIProvider(config.OPENAI_API_KEY), providerType: "openai" };
  }
  return { provider: new AnthropicProvider(config.ANTHROPIC_API_KEY), providerType: "anthropic" };
}

function sendSSE(stream: PassThrough, event: AgentSSEEvent): void {
  stream.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
}

export const chatRouter = new Router();
export const conversationRouter = new Router();

chatRouter.post("/chat", async (ctx) => {
  const { uid, email } = ctx.state.user;

  const parseResult = agentChatMessageSchema.safeParse(ctx.request.body);
  if (!parseResult.success) {
    throw new AppError(400, "VALIDATION_ERROR", "Invalid request body", parseResult.error.issues);
  }
  const { message, conversationId: existingConversationId } = parseResult.data;

  const backendClient = createBackendClient({ uid, email });

  let agentContext;
  try {
    agentContext = await buildAgentContext(uid, email, backendClient);
  } catch (err) {
    logger.error({ err }, "Failed to build agent context");
    throw new AppError(500, "CONTEXT_ERROR", "Failed to initialize agent context");
  }

  let conversation: ConversationRecord;
  if (existingConversationId) {
    const existing = db.getConversation(existingConversationId);
    if (!existing || existing.userId !== uid) {
      throw new AppError(404, "NOT_FOUND", "Conversation not found");
    }
    conversation = existing;
  } else {
    conversation = {
      id: randomUUID(),
      userId: uid,
      organizationId: agentContext.organizationId,
      title: null,
      messages: [],
      tokenUsage: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  const conversationClient = createBackendClient({
    uid,
    email,
    conversationId: conversation.id,
  });

  const systemPrompt = buildSystemPrompt(agentContext);
  const { provider, providerType } = getProvider();

  const stream = new PassThrough();
  ctx.type = "text/event-stream";
  ctx.set("Cache-Control", "no-cache");
  ctx.set("Connection", "keep-alive");
  ctx.set("X-Accel-Buffering", "no");
  ctx.body = stream;

  const abortController = new AbortController();
  ctx.req.on("close", () => abortController.abort());

  (async () => {
    try {
      const result = await runAgentLoop(
        {
          userMessage: message,
          history: conversation.messages,
          systemPrompt,
          provider,
          providerType,
          model: config.DEFAULT_MODEL,
          backendClient: conversationClient,
          maxTurns: config.MAX_TURNS,
          maxToolCalls: config.MAX_TOOL_CALLS,
          abortSignal: abortController.signal,
        },
        (event) => sendSSE(stream, event),
      );

      conversation.messages = [...conversation.messages, ...result.messages];
      conversation.tokenUsage += result.inputTokens + result.outputTokens;
      conversation.updatedAt = new Date().toISOString();

      if (!conversation.title && result.messages.length > 0) {
        conversation.title = message.slice(0, 100);
      }

      db.upsertConversation(conversation);

      sendSSE(stream, { type: "done", conversationId: conversation.id });
    } catch (err) {
      if (abortController.signal.aborted) return;
      logger.error({ err, conversationId: conversation.id }, "Agent loop error");
      sendSSE(stream, { type: "error", message: "An error occurred while processing your request." });
    } finally {
      stream.end();
    }
  })();
});

conversationRouter.get("/conversations", async (ctx) => {
  const { uid } = ctx.state.user;

  const backendClient = createBackendClient({ uid, email: ctx.state.user.email });
  let orgId: string;
  try {
    const agentCtx = await buildAgentContext(uid, ctx.state.user.email, backendClient);
    orgId = agentCtx.organizationId;
  } catch {
    throw new AppError(500, "CONTEXT_ERROR", "Failed to resolve organization");
  }

  const conversations = db.listConversations(uid, orgId);
  ctx.body = {
    data: conversations.map((c) => ({
      id: c.id,
      title: c.title,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    })),
  };
});

conversationRouter.get("/conversations/:id", async (ctx) => {
  const { uid } = ctx.state.user;
  const conversation = db.getConversation(ctx.params.id);

  if (!conversation || conversation.userId !== uid) {
    throw new AppError(404, "NOT_FOUND", "Conversation not found");
  }

  ctx.body = {
    data: {
      id: conversation.id,
      title: conversation.title,
      messages: conversation.messages,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    },
  };
});

conversationRouter.delete("/conversations/:id", async (ctx) => {
  const { uid } = ctx.state.user;
  const conversation = db.getConversation(ctx.params.id);

  if (!conversation || conversation.userId !== uid) {
    throw new AppError(404, "NOT_FOUND", "Conversation not found");
  }

  db.deleteConversation(ctx.params.id);
  ctx.status = 204;
});
