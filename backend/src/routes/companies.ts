import Router from "@koa/router";
import { validate } from "../middleware/validate.js";
import {
  createCompanySchema,
  updateCompanySchema,
  companyQuerySchema,
} from "@crm/shared";
import type { CreateCompanyInput, UpdateCompanyInput, CompanyQueryParams } from "@crm/shared";
import * as companyService from "../services/company.service.js";
import { getOrgContext } from "../lib/orgContext.js";
import type { AppState } from "../types/index.js";

const router = new Router<AppState>();

// GET /companies
router.get("/companies", validate(companyQuerySchema, "query"), async (ctx) => {
  const result = await companyService.listCompanies(
    getOrgContext(ctx.state.user),
    ctx.state.query as CompanyQueryParams,
  );
  ctx.body = result;
});

// POST /companies
router.post("/companies", validate(createCompanySchema, "body"), async (ctx) => {
  const company = await companyService.createCompany(
    getOrgContext(ctx.state.user),
    ctx.state.body as CreateCompanyInput,
  );
  ctx.status = 201;
  ctx.body = { data: company };
});

// GET /companies/:companyId
router.get("/companies/:companyId", async (ctx) => {
  const company = await companyService.getCompany(
    getOrgContext(ctx.state.user),
    ctx.params.companyId,
  );
  ctx.body = { data: company };
});

// PATCH /companies/:companyId
router.patch(
  "/companies/:companyId",
  validate(updateCompanySchema, "body"),
  async (ctx) => {
    const company = await companyService.updateCompany(
      getOrgContext(ctx.state.user),
      ctx.params.companyId,
      ctx.state.body as UpdateCompanyInput,
    );
    ctx.body = { data: company };
  },
);

// DELETE /companies/:companyId
router.delete("/companies/:companyId", async (ctx) => {
  await companyService.deleteCompany(
    getOrgContext(ctx.state.user),
    ctx.params.companyId,
  );
  ctx.status = 204;
});

export default router;
