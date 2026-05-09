import Router from "@koa/router";
import { validate } from "../middleware/validate.js";
import {
  createAddressSchema,
  updateAddressSchema,
} from "@crm/shared";
import type { CreateAddressInput, UpdateAddressInput } from "@crm/shared";
import * as addressService from "../services/address.service.js";
import { getOrgContext } from "../lib/orgContext.js";
import type { AppState } from "../types/index.js";

const router = new Router<AppState>();

// GET /companies/:companyId/addresses
router.get("/companies/:companyId/addresses", async (ctx) => {
  const addresses = await addressService.listAddresses(
    getOrgContext(ctx.state.user),
    ctx.params.companyId,
  );
  ctx.body = { data: addresses };
});

// POST /companies/:companyId/addresses
router.post(
  "/companies/:companyId/addresses",
  validate(createAddressSchema, "body"),
  async (ctx) => {
    const address = await addressService.createAddress(
      getOrgContext(ctx.state.user),
      ctx.params.companyId,
      ctx.state.body as CreateAddressInput,
    );
    ctx.status = 201;
    ctx.body = { data: address };
  },
);

// GET /companies/:companyId/addresses/:addressId
router.get("/companies/:companyId/addresses/:addressId", async (ctx) => {
  const address = await addressService.getAddress(
    getOrgContext(ctx.state.user),
    ctx.params.companyId,
    ctx.params.addressId,
  );
  ctx.body = { data: address };
});

// PATCH /companies/:companyId/addresses/:addressId
router.patch(
  "/companies/:companyId/addresses/:addressId",
  validate(updateAddressSchema, "body"),
  async (ctx) => {
    const address = await addressService.updateAddress(
      getOrgContext(ctx.state.user),
      ctx.params.companyId,
      ctx.params.addressId,
      ctx.state.body as UpdateAddressInput,
    );
    ctx.body = { data: address };
  },
);

// DELETE /companies/:companyId/addresses/:addressId
router.delete(
  "/companies/:companyId/addresses/:addressId",
  async (ctx) => {
    await addressService.deleteAddress(
      getOrgContext(ctx.state.user),
      ctx.params.companyId,
      ctx.params.addressId,
    );
    ctx.status = 204;
  },
);

export default router;
