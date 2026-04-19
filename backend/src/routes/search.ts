import Router from "@koa/router";
import { validate } from "../middleware/validate.js";
import { searchQuerySchema } from "@crm/shared";
import type { SearchQueryParams } from "@crm/shared";
import * as searchService from "../services/search.service.js";
import type { AppState } from "../types/index.js";

const router = new Router<AppState>();

router.get("/search", validate(searchQuerySchema, "query"), async (ctx) => {
  const result = await searchService.search(
    ctx.state.user.uid,
    ctx.state.query as SearchQueryParams,
  );
  ctx.body = { data: result };
});

export default router;
