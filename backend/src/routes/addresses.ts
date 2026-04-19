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

// GET /customers/:customerId/addresses
router.get("/customers/:customerId/addresses", async (ctx) => {
  const addresses = await addressService.listAddresses(
    getOrgContext(ctx.state.user),
    ctx.params.customerId,
  );
  ctx.body = { data: addresses };
});

// POST /customers/:customerId/addresses
router.post(
  "/customers/:customerId/addresses",
  validate(createAddressSchema, "body"),
  async (ctx) => {
    const address = await addressService.createAddress(
      getOrgContext(ctx.state.user),
      ctx.params.customerId,
      ctx.state.body as CreateAddressInput,
    );
    ctx.status = 201;
    ctx.body = { data: address };
  },
);

// GET /customers/:customerId/addresses/:addressId
router.get("/customers/:customerId/addresses/:addressId", async (ctx) => {
  const address = await addressService.getAddress(
    getOrgContext(ctx.state.user),
    ctx.params.customerId,
    ctx.params.addressId,
  );
  ctx.body = { data: address };
});

// PATCH /customers/:customerId/addresses/:addressId
router.patch(
  "/customers/:customerId/addresses/:addressId",
  validate(updateAddressSchema, "body"),
  async (ctx) => {
    const address = await addressService.updateAddress(
      getOrgContext(ctx.state.user),
      ctx.params.customerId,
      ctx.params.addressId,
      ctx.state.body as UpdateAddressInput,
    );
    ctx.body = { data: address };
  },
);

// DELETE /customers/:customerId/addresses/:addressId
router.delete(
  "/customers/:customerId/addresses/:addressId",
  async (ctx) => {
    await addressService.deleteAddress(
      getOrgContext(ctx.state.user),
      ctx.params.customerId,
      ctx.params.addressId,
    );
    ctx.status = 204;
  },
);

export default router;
