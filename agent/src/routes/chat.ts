import Router from "@koa/router";
import { randomUUID } from "node:crypto";
import { PassThrough } from "node:stream";
import { agentChatMessageSchema, type AgentProviderMessage, type AgentSSEEvent } from "@crm/shared";
import { config } from "../config.js";
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
  return { provider: new AnthropicProvider(config.ANTHROPIC_API_KEY!), providerType: "anthropic" };
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

  let conversationId: string;
  let history: AgentProviderMessage[] = [];
  if (existingConversationId) {
    const existing = await backendClient.getAgentConversation(existingConversationId);
    if (!existing.data) {
      throw new AppError(404, "NOT_FOUND", "Conversation not found");
    }
    conversationId = existing.data.id;
    history = existing.data.providerMessages;
  } else {
    conversationId = randomUUID();
    await backendClient.createAgentConversation({
      id: conversationId,
      title: message.slice(0, 100),
    });
  }

  const conversationClient = createBackendClient({
    uid,
    email,
    conversationId,
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
          history,
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

      await conversationClient.appendAgentConversation(conversationId, {
        messages: result.messages,
        providerMessages: result.providerMessages,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
      });

      sendSSE(stream, {
        type: "done",
        conversationId,
        messages: result.messages,
        providerMessages: result.providerMessages,
        tokenUsage: { input: result.inputTokens, output: result.outputTokens },
      });
    } catch (err) {
      if (abortController.signal.aborted) return;
      logger.error({ err, conversationId }, "Agent loop error");
      sendSSE(stream, { type: "error", message: "An error occurred while processing your request." });
    } finally {
      stream.end();
    }
  })();
});

conversationRouter.get("/conversations", async (ctx) => {
  const { uid, email } = ctx.state.user;
  const backendClient = createBackendClient({ uid, email });
  ctx.body = await backendClient.listAgentConversations();
});

conversationRouter.get("/conversations/:id", async (ctx) => {
  const { uid, email } = ctx.state.user;
  const backendClient = createBackendClient({ uid, email });
  ctx.body = await backendClient.getAgentConversation(ctx.params.id);
});

conversationRouter.delete("/conversations/:id", async (ctx) => {
  const { uid, email } = ctx.state.user;
  const backendClient = createBackendClient({ uid, email });
  await backendClient.deleteAgentConversation(ctx.params.id);
  ctx.status = 204;
});

conversationRouter.post("/actions/:id/approve", async (ctx) => {
  const { uid, email } = ctx.state.user;
  const backendClient = createBackendClient({ uid, email });
  ctx.body = await backendClient.approveAgentAction(ctx.params.id);
});

conversationRouter.post("/actions/:id/reject", async (ctx) => {
  const { uid, email } = ctx.state.user;
  const backendClient = createBackendClient({ uid, email });
  ctx.body = await backendClient.rejectAgentAction(ctx.params.id);
});
