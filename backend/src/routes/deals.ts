import Router from "@koa/router";
import { validate } from "../middleware/validate.js";
import {
  createDealSchema,
  updateDealSchema,
  dealQuerySchema,
} from "@crm/shared";
import type { CreateDealInput, UpdateDealInput, DealQueryParams } from "@crm/shared";
import * as dealService from "../services/deal.service.js";
import { getOrgContext } from "../lib/orgContext.js";
import type { AppState } from "../types/index.js";

const router = new Router<AppState>();

router.get("/deals/overview", async (ctx) => {
  const data = await dealService.getDealsOverview(getOrgContext(ctx.state.user));
  ctx.body = { data };
});

router.get("/deals/:dealId", async (ctx) => {
  const data = await dealService.getDealDetail(getOrgContext(ctx.state.user), ctx.params.dealId);
  ctx.body = { data };
});

router.get(
  "/companies/:companyId/deals",
  validate(dealQuerySchema, "query"),
  async (ctx) => {
    const result = await dealService.listDeals(
      getOrgContext(ctx.state.user),
      ctx.params.companyId,
      ctx.state.query as DealQueryParams,
    );
    ctx.body = result;
  },
);

router.post(
  "/companies/:companyId/deals",
  validate(createDealSchema, "body"),
  async (ctx) => {
    const deal = await dealService.createDeal(
      getOrgContext(ctx.state.user),
      ctx.params.companyId,
      ctx.state.body as CreateDealInput,
    );
    ctx.status = 201;
    ctx.body = { data: deal };
  },
);

router.get("/companies/:companyId/deals/:dealId", async (ctx) => {
  const deal = await dealService.getDeal(
    getOrgContext(ctx.state.user),
    ctx.params.companyId,
    ctx.params.dealId,
  );
  ctx.body = { data: deal };
});

router.patch(
  "/companies/:companyId/deals/:dealId",
  validate(updateDealSchema, "body"),
  async (ctx) => {
    const deal = await dealService.updateDeal(
      getOrgContext(ctx.state.user),
      ctx.params.companyId,
      ctx.params.dealId,
      ctx.state.body as UpdateDealInput,
    );
    ctx.body = { data: deal };
  },
);

router.delete("/companies/:companyId/deals/:dealId", async (ctx) => {
  await dealService.deleteDeal(
    getOrgContext(ctx.state.user),
    ctx.params.companyId,
    ctx.params.dealId,
  );
  ctx.status = 204;
});

export default router;
