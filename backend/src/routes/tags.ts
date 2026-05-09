import Router from "@koa/router";
import { validate } from "../middleware/validate.js";
import { createTagSchema, updateTagSchema } from "@crm/shared";
import type { CreateTagInput, UpdateTagInput } from "@crm/shared";
import * as tagService from "../services/tag.service.js";
import { getOrgContext } from "../lib/orgContext.js";
import type { AppState } from "../types/index.js";

const router = new Router<AppState>();

router.get("/tags", async (ctx) => {
  const tags = await tagService.listTags(getOrgContext(ctx.state.user));
  ctx.body = { data: tags };
});

router.post("/tags", validate(createTagSchema, "body"), async (ctx) => {
  const tag = await tagService.createTag(
    getOrgContext(ctx.state.user),
    ctx.state.body as CreateTagInput,
  );
  ctx.status = 201;
  ctx.body = { data: tag };
});

router.patch(
  "/tags/:tagId",
  validate(updateTagSchema, "body"),
  async (ctx) => {
    const tag = await tagService.updateTag(
      getOrgContext(ctx.state.user),
      ctx.params.tagId,
      ctx.state.body as UpdateTagInput,
    );
    ctx.body = { data: tag };
  },
);

router.delete("/tags/:tagId", async (ctx) => {
  await tagService.deleteTag(getOrgContext(ctx.state.user), ctx.params.tagId);
  ctx.status = 204;
});

router.put(
  "/companies/:companyId/tags/:tagId",
  async (ctx) => {
    await tagService.addTagToCompany(
      getOrgContext(ctx.state.user),
      ctx.params.companyId,
      ctx.params.tagId,
    );
    ctx.status = 204;
  },
);

router.delete(
  "/companies/:companyId/tags/:tagId",
  async (ctx) => {
    await tagService.removeTagFromCompany(
      getOrgContext(ctx.state.user),
      ctx.params.companyId,
      ctx.params.tagId,
    );
    ctx.status = 204;
  },
);

export default router;
