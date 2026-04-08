import Router from "@koa/router";
import { validate } from "../middleware/validate.js";
import {
  createPhoneNumberSchema,
  updatePhoneNumberSchema,
} from "../schemas/phoneNumber.schema.js";
import * as phoneNumberService from "../services/phoneNumber.service.js";
import type { AppState } from "../types/index.js";

const router = new Router<AppState>();

// GET /customers/:customerId/phone-numbers
router.get("/customers/:customerId/phone-numbers", async (ctx) => {
  const phoneNumbers = await phoneNumberService.listPhoneNumbers(
    ctx.state.user.uid,
    ctx.params.customerId,
  );
  ctx.body = { data: phoneNumbers };
});

// POST /customers/:customerId/phone-numbers
router.post(
  "/customers/:customerId/phone-numbers",
  validate(createPhoneNumberSchema, "body"),
  async (ctx) => {
    const phoneNumber = await phoneNumberService.createPhoneNumber(
      ctx.state.user.uid,
      ctx.params.customerId,
      ctx.request.body,
    );
    ctx.status = 201;
    ctx.body = { data: phoneNumber };
  },
);

// GET /customers/:customerId/phone-numbers/:phoneNumberId
router.get(
  "/customers/:customerId/phone-numbers/:phoneNumberId",
  async (ctx) => {
    const phoneNumber = await phoneNumberService.getPhoneNumber(
      ctx.state.user.uid,
      ctx.params.customerId,
      ctx.params.phoneNumberId,
    );
    ctx.body = { data: phoneNumber };
  },
);

// PUT /customers/:customerId/phone-numbers/:phoneNumberId
router.put(
  "/customers/:customerId/phone-numbers/:phoneNumberId",
  validate(updatePhoneNumberSchema, "body"),
  async (ctx) => {
    const phoneNumber = await phoneNumberService.updatePhoneNumber(
      ctx.state.user.uid,
      ctx.params.customerId,
      ctx.params.phoneNumberId,
      ctx.request.body,
    );
    ctx.body = { data: phoneNumber };
  },
);

// DELETE /customers/:customerId/phone-numbers/:phoneNumberId
router.delete(
  "/customers/:customerId/phone-numbers/:phoneNumberId",
  async (ctx) => {
    await phoneNumberService.deletePhoneNumber(
      ctx.state.user.uid,
      ctx.params.customerId,
      ctx.params.phoneNumberId,
    );
    ctx.status = 204;
  },
);

export default router;
