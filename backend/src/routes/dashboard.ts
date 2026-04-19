import Router from "@koa/router";
import * as dashboardService from "../services/dashboard.service.js";
import { getOrgContext } from "../lib/orgContext.js";
import type { AppState } from "../types/index.js";

const router = new Router<AppState>();

router.get("/dashboard", async (ctx) => {
  const data = await dashboardService.getDashboard(getOrgContext(ctx.state.user));
  ctx.body = { data };
});

export default router;
