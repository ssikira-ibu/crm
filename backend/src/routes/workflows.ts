import Router from "@koa/router";
import { validate } from "../middleware/validate.js";
import {
  createWorkflowSchema,
  updateWorkflowSchema,
  workflowQuerySchema,
  type CreateWorkflowInput,
  type UpdateWorkflowInput,
} from "@crm/shared";
import * as workflowService from "../services/workflow.service.js";
import { getOrgContext } from "../lib/orgContext.js";
import type { AppState } from "../types/index.js";

const router = new Router<AppState>();

router.get(
  "/workflows",
  validate(workflowQuerySchema, "query"),
  async (ctx) => {
    const query = ctx.state.query as { enabled?: boolean };
    const data = await workflowService.listWorkflows(
      getOrgContext(ctx.state.user),
      { enabled: query.enabled },
    );
    ctx.body = { data };
  },
);

router.post(
  "/workflows",
  validate(createWorkflowSchema, "body"),
  async (ctx) => {
    const workflow = await workflowService.createWorkflow(
      getOrgContext(ctx.state.user),
      ctx.state.body as CreateWorkflowInput,
    );
    ctx.status = 201;
    ctx.body = { data: workflow };
  },
);

router.get("/workflows/:id", async (ctx) => {
  const workflow = await workflowService.getWorkflow(
    getOrgContext(ctx.state.user),
    ctx.params.id,
  );
  ctx.body = { data: workflow };
});

router.patch(
  "/workflows/:id",
  validate(updateWorkflowSchema, "body"),
  async (ctx) => {
    const workflow = await workflowService.updateWorkflow(
      getOrgContext(ctx.state.user),
      ctx.params.id,
      ctx.state.body as UpdateWorkflowInput,
    );
    ctx.body = { data: workflow };
  },
);

router.delete("/workflows/:id", async (ctx) => {
  await workflowService.deleteWorkflow(
    getOrgContext(ctx.state.user),
    ctx.params.id,
  );
  ctx.status = 204;
});

export default router;
