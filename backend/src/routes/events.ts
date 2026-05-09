import Router from "@koa/router";
import * as eventService from "../services/event.service.js";
import { ensureCompanyAccess } from "../services/company.service.js";
import { getOrgContext } from "../lib/orgContext.js";
import type { AppState } from "../types/index.js";

const router = new Router<AppState>();

router.get("/events", async (ctx) => {
  const limit = Math.min(Number(ctx.query.limit) || 50, 100);
  const cursor = ctx.query.cursor as string | undefined;
  const data = await eventService.listGlobalEvents(
    getOrgContext(ctx.state.user),
    limit,
    cursor,
  );
  ctx.body = { data };
});

router.get("/companies/:companyId/events", async (ctx) => {
  const orgCtx = getOrgContext(ctx.state.user);
  await ensureCompanyAccess(orgCtx, ctx.params.companyId);
  const limit = Math.min(Number(ctx.query.limit) || 50, 100);
  const cursor = ctx.query.cursor as string | undefined;
  const data = await eventService.listCompanyEvents(
    orgCtx,
    ctx.params.companyId,
    limit,
    cursor,
  );
  ctx.body = { data };
});

export default router;
