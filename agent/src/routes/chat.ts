import Router from "@koa/router";
import { PassThrough } from "node:stream";
import Anthropic from "@anthropic-ai/sdk";
import { agentChatMessageSchema, type AgentSSEEvent } from "@crm/shared";
import { config } from "../config.js";
import { createBackendClient } from "../lib/backend-client.js";
import { buildAgentContext } from "../agent/context.js";
import { buildSystemPrompt } from "../agent/system-prompt.js";
import { runAgentLoop } from "../agent/loop.js";
import { AppError } from "../middleware/errorHandler.js";
import { logger } from "../lib/logger.js";

const anthropic = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });

function sendSSE(stream: PassThrough, event: AgentSSEEvent): void {
  stream.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
}

async function startSSEStream(ctx: import("koa").Context): Promise<{
  stream: PassThrough;
  abortController: AbortController;
}> {
  const stream = new PassThrough();
  ctx.type = "text/event-stream";
  ctx.set("Cache-Control", "no-cache");
  ctx.set("Connection", "keep-alive");
  ctx.set("X-Accel-Buffering", "no");
  ctx.body = stream;

  const abortController = new AbortController();
  ctx.req.on("close", () => abortController.abort());
  return { stream, abortController };
}

export const chatRouter = new Router();
export const conversationRouter = new Router();

chatRouter.post("/chat", async (ctx) => {
  const { uid, email } = ctx.state.user;

  const parsed = agentChatMessageSchema.safeParse(ctx.request.body);
  if (!parsed.success) {
    throw new AppError(400, "VALIDATION_ERROR", "Invalid request body", parsed.error.issues);
  }
  const { message, conversationId: existingConversationId } = parsed.data;

  // Use a conversation-scoped client so every backend call carries the
  // agent actor claim.
  let conversationId: string;
  let history: import("@crm/shared").AgentProviderMessage[] = [];

  // First, build (or fetch) context with a non-conversation client (still
  // tagged as agent — see auth.ts).
  const bootstrapClient = createBackendClient({ uid, email });

  let agentContext;
  try {
    agentContext = await buildAgentContext(uid, email, bootstrapClient);
  } catch (err) {
    logger.error({ err }, "failed to build agent context");
    throw new AppError(500, "CONTEXT_ERROR", "Failed to initialize agent context");
  }

  if (existingConversationId) {
    const existing = await bootstrapClient.getAgentConversation(existingConversationId);
    if (!existing.data) {
      throw new AppError(404, "NOT_FOUND", "Conversation not found");
    }
    conversationId = existing.data.id;
    history = existing.data.providerMessages;
  } else {
    const created = await bootstrapClient.createAgentConversation({
      title: message.slice(0, 100),
    });
    conversationId = created.data.id;
  }

  const conversationClient = createBackendClient({ uid, email, conversationId });
  const systemPrompt = buildSystemPrompt(agentContext);

  const { stream, abortController } = await startSSEStream(ctx);

  (async () => {
    try {
      const result = await runAgentLoop({
        client: anthropic,
        model: config.DEFAULT_MODEL,
        maxOutputTokens: config.MAX_OUTPUT_TOKENS,
        systemPrompt,
        history,
        userMessage: message,
        conversationId,
        backendClient: conversationClient,
        maxTurns: config.MAX_TURNS,
        abortSignal: abortController.signal,
        emit: (event) => sendSSE(stream, event),
      });

      sendSSE(stream, {
        type: "done",
        conversationId,
        tokenUsage: { input: result.inputTokens, output: result.outputTokens },
      });
    } catch (err) {
      if (abortController.signal.aborted) return;
      logger.error({ err, conversationId }, "agent loop error");
      sendSSE(stream, { type: "error", message: "An error occurred while processing your request." });
    } finally {
      stream.end();
    }
  })();
});

/**
 * Resume a conversation after the user has approved or rejected a pending
 * action. The approval/reject endpoint has already appended the tool_result
 * to history, so we just need to run another loop iteration without a new
 * user message.
 */
chatRouter.post("/resume", async (ctx) => {
  const { uid, email } = ctx.state.user;
  const body = ctx.request.body as { conversationId?: string } | undefined;
  if (!body?.conversationId) {
    throw new AppError(400, "VALIDATION_ERROR", "conversationId is required");
  }
  const conversationId = body.conversationId;

  const bootstrapClient = createBackendClient({ uid, email });

  let agentContext;
  try {
    agentContext = await buildAgentContext(uid, email, bootstrapClient);
  } catch (err) {
    logger.error({ err }, "failed to build agent context");
    throw new AppError(500, "CONTEXT_ERROR", "Failed to initialize agent context");
  }

  const existing = await bootstrapClient.getAgentConversation(conversationId);
  if (!existing.data) {
    throw new AppError(404, "NOT_FOUND", "Conversation not found");
  }

  const conversationClient = createBackendClient({ uid, email, conversationId });
  const systemPrompt = buildSystemPrompt(agentContext);

  const { stream, abortController } = await startSSEStream(ctx);

  (async () => {
    try {
      const result = await runAgentLoop({
        client: anthropic,
        model: config.DEFAULT_MODEL,
        maxOutputTokens: config.MAX_OUTPUT_TOKENS,
        systemPrompt,
        history: existing.data.providerMessages,
        userMessage: undefined,
        conversationId,
        backendClient: conversationClient,
        maxTurns: config.MAX_TURNS,
        abortSignal: abortController.signal,
        emit: (event) => sendSSE(stream, event),
      });

      sendSSE(stream, {
        type: "done",
        conversationId,
        tokenUsage: { input: result.inputTokens, output: result.outputTokens },
      });
    } catch (err) {
      if (abortController.signal.aborted) return;
      logger.error({ err, conversationId }, "agent resume error");
      sendSSE(stream, { type: "error", message: "An error occurred while processing your request." });
    } finally {
      stream.end();
    }
  })();
});

conversationRouter.get("/conversations", async (ctx) => {
  const { uid, email } = ctx.state.user;
  const client = createBackendClient({ uid, email });
  ctx.body = await client.listAgentConversations();
});

conversationRouter.get("/conversations/:id", async (ctx) => {
  const { uid, email } = ctx.state.user;
  const client = createBackendClient({ uid, email, conversationId: ctx.params.id });
  ctx.body = await client.getAgentConversation(ctx.params.id);
});

conversationRouter.delete("/conversations/:id", async (ctx) => {
  const { uid, email } = ctx.state.user;
  const client = createBackendClient({ uid, email, conversationId: ctx.params.id });
  await client.deleteAgentConversation(ctx.params.id);
  ctx.status = 204;
});

conversationRouter.post("/actions/:id/approve", async (ctx) => {
  const { uid, email } = ctx.state.user;
  const client = createBackendClient({ uid, email });
  ctx.body = await client.approveAgentAction(ctx.params.id);
});

conversationRouter.post("/actions/:id/reject", async (ctx) => {
  const { uid, email } = ctx.state.user;
  const client = createBackendClient({ uid, email });
  ctx.body = await client.rejectAgentAction(ctx.params.id);
});
