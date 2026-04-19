import Router from "@koa/router";
import { validate } from "../middleware/validate.js";
import {
  createActivitySchema,
  updateActivitySchema,
  activityQuerySchema,
} from "@crm/shared";
import type { CreateActivityInput, UpdateActivityInput, ActivityQueryParams } from "@crm/shared";
import * as activityService from "../services/activity.service.js";
import { getOrgContext } from "../lib/orgContext.js";
import type { AppState } from "../types/index.js";

const router = new Router<AppState>();

router.get(
  "/customers/:customerId/activities",
  validate(activityQuerySchema, "query"),
  async (ctx) => {
    const result = await activityService.listActivities(
      getOrgContext(ctx.state.user),
      ctx.params.customerId,
      ctx.state.query as ActivityQueryParams,
    );
    ctx.body = result;
  },
);

router.post(
  "/customers/:customerId/activities",
  validate(createActivitySchema, "body"),
  async (ctx) => {
    const activity = await activityService.createActivity(
      getOrgContext(ctx.state.user),
      ctx.params.customerId,
      ctx.state.body as CreateActivityInput,
    );
    ctx.status = 201;
    ctx.body = { data: activity };
  },
);

router.get(
  "/customers/:customerId/activities/:activityId",
  async (ctx) => {
    const activity = await activityService.getActivity(
      getOrgContext(ctx.state.user),
      ctx.params.customerId,
      ctx.params.activityId,
    );
    ctx.body = { data: activity };
  },
);

router.patch(
  "/customers/:customerId/activities/:activityId",
  validate(updateActivitySchema, "body"),
  async (ctx) => {
    const activity = await activityService.updateActivity(
      getOrgContext(ctx.state.user),
      ctx.params.customerId,
      ctx.params.activityId,
      ctx.state.body as UpdateActivityInput,
    );
    ctx.body = { data: activity };
  },
);

router.delete(
  "/customers/:customerId/activities/:activityId",
  async (ctx) => {
    await activityService.deleteActivity(
      getOrgContext(ctx.state.user),
      ctx.params.customerId,
      ctx.params.activityId,
    );
    ctx.status = 204;
  },
);

export default router;
