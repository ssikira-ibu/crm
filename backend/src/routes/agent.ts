import Router from "@koa/router";
import {
  appendAgentConversationSchema,
  createAgentActionSchema,
  createAgentConversationSchema,
} from "@crm/shared";
import type {
  AppendAgentConversationInput,
  CreateAgentActionInput,
  CreateAgentConversationInput,
} from "@crm/shared";
import { validate } from "../middleware/validate.js";
import { getOrgContext } from "../lib/orgContext.js";
import type { AppState } from "../types/index.js";
import * as agentService from "../services/agent.service.js";

const router = new Router<AppState>();

router.get("/agent/conversations", async (ctx) => {
  const data = await agentService.listConversations(getOrgContext(ctx.state.user));
  ctx.body = { data };
});

router.post(
  "/agent/conversations",
  validate(createAgentConversationSchema, "body"),
  async (ctx) => {
    const data = await agentService.createConversation(
      getOrgContext(ctx.state.user),
      ctx.state.body as CreateAgentConversationInput,
    );
    ctx.status = 201;
    ctx.body = { data };
  },
);

router.get("/agent/conversations/:conversationId", async (ctx) => {
  const data = await agentService.getConversation(
    getOrgContext(ctx.state.user),
    ctx.params.conversationId,
  );
  ctx.body = { data };
});

router.delete("/agent/conversations/:conversationId", async (ctx) => {
  await agentService.deleteConversation(
    getOrgContext(ctx.state.user),
    ctx.params.conversationId,
  );
  ctx.status = 204;
});

router.post(
  "/agent/conversations/:conversationId/messages",
  validate(appendAgentConversationSchema, "body"),
  async (ctx) => {
    await agentService.appendConversation(
      getOrgContext(ctx.state.user),
      ctx.params.conversationId,
      ctx.state.body as AppendAgentConversationInput,
    );
    ctx.status = 204;
  },
);

router.post(
  "/agent/actions",
  validate(createAgentActionSchema, "body"),
  async (ctx) => {
    const data = await agentService.createPendingAction(
      getOrgContext(ctx.state.user),
      ctx.state.body as CreateAgentActionInput,
    );
    ctx.status = 201;
    ctx.body = { data };
  },
);

router.post("/agent/actions/:actionId/approve", async (ctx) => {
  const data = await agentService.approveAction(
    getOrgContext(ctx.state.user),
    ctx.params.actionId,
  );
  ctx.body = { data };
});

router.post("/agent/actions/:actionId/reject", async (ctx) => {
  const data = await agentService.rejectAction(
    getOrgContext(ctx.state.user),
    ctx.params.actionId,
  );
  ctx.body = { data };
});

export default router;
