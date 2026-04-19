import Router from "@koa/router";
import * as eventService from "../services/event.service.js";
import { ensureCustomerAccess } from "../services/customer.service.js";
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

router.get("/customers/:customerId/events", async (ctx) => {
  const orgCtx = getOrgContext(ctx.state.user);
  await ensureCustomerAccess(orgCtx, ctx.params.customerId);
  const limit = Math.min(Number(ctx.query.limit) || 50, 100);
  const cursor = ctx.query.cursor as string | undefined;
  const data = await eventService.listCustomerEvents(
    orgCtx,
    ctx.params.customerId,
    limit,
    cursor,
  );
  ctx.body = { data };
});

export default router;
