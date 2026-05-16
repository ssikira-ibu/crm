import Router from "@koa/router";
import { validate } from "../middleware/validate.js";
import {
  createPipelineSchema,
  updatePipelineSchema,
  createPipelineStageSchema,
  updatePipelineStageSchema,
} from "@crm/shared";
import type {
  CreatePipelineInput,
  UpdatePipelineInput,
  CreatePipelineStageInput,
  UpdatePipelineStageInput,
} from "@crm/shared";
import * as pipelineService from "../services/pipeline.service.js";
import { getOrgContext } from "../lib/orgContext.js";
import { requireRole } from "../middleware/authorize.js";
import type { AppState } from "../types/index.js";

const router = new Router<AppState>();

// ---------------------------------------------------------------------------
// Pipelines
// ---------------------------------------------------------------------------

router.get("/pipelines", async (ctx) => {
  const pipelines = await pipelineService.listPipelines(
    getOrgContext(ctx.state.user),
  );
  ctx.body = { data: pipelines };
});

router.post(
  "/pipelines",
  requireRole("ADMIN", "MANAGER"),
  validate(createPipelineSchema, "body"),
  async (ctx) => {
    const pipeline = await pipelineService.createPipeline(
      getOrgContext(ctx.state.user),
      ctx.state.body as CreatePipelineInput,
    );
    ctx.status = 201;
    ctx.body = { data: pipeline };
  },
);

router.get("/pipelines/:pipelineId", async (ctx) => {
  const pipeline = await pipelineService.getPipeline(
    getOrgContext(ctx.state.user),
    ctx.params.pipelineId,
  );
  ctx.body = { data: pipeline };
});

router.patch(
  "/pipelines/:pipelineId",
  requireRole("ADMIN", "MANAGER"),
  validate(updatePipelineSchema, "body"),
  async (ctx) => {
    const pipeline = await pipelineService.updatePipeline(
      getOrgContext(ctx.state.user),
      ctx.params.pipelineId,
      ctx.state.body as UpdatePipelineInput,
    );
    ctx.body = { data: pipeline };
  },
);

router.delete(
  "/pipelines/:pipelineId",
  requireRole("ADMIN", "MANAGER"),
  async (ctx) => {
    await pipelineService.deletePipeline(
      getOrgContext(ctx.state.user),
      ctx.params.pipelineId,
    );
    ctx.status = 204;
  },
);

// ---------------------------------------------------------------------------
// Pipeline Stages
// ---------------------------------------------------------------------------

router.post(
  "/pipelines/:pipelineId/stages",
  requireRole("ADMIN", "MANAGER"),
  validate(createPipelineStageSchema, "body"),
  async (ctx) => {
    const stage = await pipelineService.createStage(
      getOrgContext(ctx.state.user),
      ctx.params.pipelineId,
      ctx.state.body as CreatePipelineStageInput,
    );
    ctx.status = 201;
    ctx.body = { data: stage };
  },
);

router.patch(
  "/pipelines/:pipelineId/stages/:stageId",
  requireRole("ADMIN", "MANAGER"),
  validate(updatePipelineStageSchema, "body"),
  async (ctx) => {
    const stage = await pipelineService.updateStage(
      getOrgContext(ctx.state.user),
      ctx.params.pipelineId,
      ctx.params.stageId,
      ctx.state.body as UpdatePipelineStageInput,
    );
    ctx.body = { data: stage };
  },
);

router.delete(
  "/pipelines/:pipelineId/stages/:stageId",
  requireRole("ADMIN", "MANAGER"),
  async (ctx) => {
    await pipelineService.deleteStage(
      getOrgContext(ctx.state.user),
      ctx.params.pipelineId,
      ctx.params.stageId,
    );
    ctx.status = 204;
  },
);

export default router;
