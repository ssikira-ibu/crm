import Router from "@koa/router";
import { validate } from "../middleware/validate.js";
import {
  createDealSchema,
  updateDealSchema,
  dealQuerySchema,
} from "@crm/shared";
import type { CreateDealInput, UpdateDealInput, DealQueryParams } from "@crm/shared";
import * as dealService from "../services/deal.service.js";
import type { AppState } from "../types/index.js";

const router = new Router<AppState>();

router.get(
  "/customers/:customerId/deals",
  validate(dealQuerySchema, "query"),
  async (ctx) => {
    const result = await dealService.listDeals(
      ctx.state.user.uid,
      ctx.params.customerId,
      ctx.state.query as DealQueryParams,
    );
    ctx.body = result;
  },
);

router.post(
  "/customers/:customerId/deals",
  validate(createDealSchema, "body"),
  async (ctx) => {
    const deal = await dealService.createDeal(
      ctx.state.user.uid,
      ctx.params.customerId,
      ctx.state.body as CreateDealInput,
    );
    ctx.status = 201;
    ctx.body = { data: deal };
  },
);

router.get("/customers/:customerId/deals/:dealId", async (ctx) => {
  const deal = await dealService.getDeal(
    ctx.state.user.uid,
    ctx.params.customerId,
    ctx.params.dealId,
  );
  ctx.body = { data: deal };
});

router.patch(
  "/customers/:customerId/deals/:dealId",
  validate(updateDealSchema, "body"),
  async (ctx) => {
    const deal = await dealService.updateDeal(
      ctx.state.user.uid,
      ctx.params.customerId,
      ctx.params.dealId,
      ctx.state.body as UpdateDealInput,
    );
    ctx.body = { data: deal };
  },
);

router.delete("/customers/:customerId/deals/:dealId", async (ctx) => {
  await dealService.deleteDeal(
    ctx.state.user.uid,
    ctx.params.customerId,
    ctx.params.dealId,
  );
  ctx.status = 204;
});

export default router;
