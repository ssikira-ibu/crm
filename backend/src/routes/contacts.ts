import Router from "@koa/router";
import { validate } from "../middleware/validate.js";
import {
  createContactSchema,
  updateContactSchema,
} from "../schemas/contact.schema.js";
import * as contactService from "../services/contact.service.js";
import type { AppState } from "../types/index.js";

const router = new Router<AppState>();

// GET /customers/:customerId/contacts
router.get("/customers/:customerId/contacts", async (ctx) => {
  const contacts = await contactService.listContacts(
    ctx.state.user.uid,
    ctx.params.customerId,
  );
  ctx.body = { data: contacts };
});

// POST /customers/:customerId/contacts
router.post(
  "/customers/:customerId/contacts",
  validate(createContactSchema, "body"),
  async (ctx) => {
    const contact = await contactService.createContact(
      ctx.state.user.uid,
      ctx.params.customerId,
      ctx.request.body,
    );
    ctx.status = 201;
    ctx.body = { data: contact };
  },
);

// GET /customers/:customerId/contacts/:contactId
router.get("/customers/:customerId/contacts/:contactId", async (ctx) => {
  const contact = await contactService.getContact(
    ctx.state.user.uid,
    ctx.params.customerId,
    ctx.params.contactId,
  );
  ctx.body = { data: contact };
});

// PUT /customers/:customerId/contacts/:contactId
router.put(
  "/customers/:customerId/contacts/:contactId",
  validate(updateContactSchema, "body"),
  async (ctx) => {
    const contact = await contactService.updateContact(
      ctx.state.user.uid,
      ctx.params.customerId,
      ctx.params.contactId,
      ctx.request.body,
    );
    ctx.body = { data: contact };
  },
);

// DELETE /customers/:customerId/contacts/:contactId
router.delete(
  "/customers/:customerId/contacts/:contactId",
  async (ctx) => {
    await contactService.deleteContact(
      ctx.state.user.uid,
      ctx.params.customerId,
      ctx.params.contactId,
    );
    ctx.status = 204;
  },
);

export default router;
