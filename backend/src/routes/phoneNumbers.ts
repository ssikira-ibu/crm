import Router from "@koa/router";
import { validate } from "../middleware/validate.js";
import {
  createPhoneNumberSchema,
  updatePhoneNumberSchema,
} from "@crm/shared";
import type { CreatePhoneNumberInput, UpdatePhoneNumberInput } from "@crm/shared";
import * as phoneNumberService from "../services/phoneNumber.service.js";
import { getOrgContext } from "../lib/orgContext.js";
import type { AppState } from "../types/index.js";

const router = new Router<AppState>();

router.get(
  "/customers/:customerId/contacts/:contactId/phone-numbers",
  async (ctx) => {
    const phoneNumbers = await phoneNumberService.listPhoneNumbers(
      getOrgContext(ctx.state.user),
      ctx.params.customerId,
      ctx.params.contactId,
    );
    ctx.body = { data: phoneNumbers };
  },
);

router.post(
  "/customers/:customerId/contacts/:contactId/phone-numbers",
  validate(createPhoneNumberSchema, "body"),
  async (ctx) => {
    const phoneNumber = await phoneNumberService.createPhoneNumber(
      getOrgContext(ctx.state.user),
      ctx.params.customerId,
      ctx.params.contactId,
      ctx.state.body as CreatePhoneNumberInput,
    );
    ctx.status = 201;
    ctx.body = { data: phoneNumber };
  },
);

router.get(
  "/customers/:customerId/contacts/:contactId/phone-numbers/:phoneNumberId",
  async (ctx) => {
    const phoneNumber = await phoneNumberService.getPhoneNumber(
      getOrgContext(ctx.state.user),
      ctx.params.customerId,
      ctx.params.contactId,
      ctx.params.phoneNumberId,
    );
    ctx.body = { data: phoneNumber };
  },
);

router.patch(
  "/customers/:customerId/contacts/:contactId/phone-numbers/:phoneNumberId",
  validate(updatePhoneNumberSchema, "body"),
  async (ctx) => {
    const phoneNumber = await phoneNumberService.updatePhoneNumber(
      getOrgContext(ctx.state.user),
      ctx.params.customerId,
      ctx.params.contactId,
      ctx.params.phoneNumberId,
      ctx.state.body as UpdatePhoneNumberInput,
    );
    ctx.body = { data: phoneNumber };
  },
);

router.delete(
  "/customers/:customerId/contacts/:contactId/phone-numbers/:phoneNumberId",
  async (ctx) => {
    await phoneNumberService.deletePhoneNumber(
      getOrgContext(ctx.state.user),
      ctx.params.customerId,
      ctx.params.contactId,
      ctx.params.phoneNumberId,
    );
    ctx.status = 204;
  },
);

export default router;
