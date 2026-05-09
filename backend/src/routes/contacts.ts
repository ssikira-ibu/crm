import Router from "@koa/router";
import { validate } from "../middleware/validate.js";
import {
  createContactSchema,
  updateContactSchema,
} from "@crm/shared";
import type { CreateContactInput, UpdateContactInput } from "@crm/shared";
import * as contactService from "../services/contact.service.js";
import { getOrgContext } from "../lib/orgContext.js";
import type { AppState } from "../types/index.js";

const router = new Router<AppState>();

// GET /companies/:companyId/contacts
router.get("/companies/:companyId/contacts", async (ctx) => {
  const contacts = await contactService.listContacts(
    getOrgContext(ctx.state.user),
    ctx.params.companyId,
  );
  ctx.body = { data: contacts };
});

// POST /companies/:companyId/contacts
router.post(
  "/companies/:companyId/contacts",
  validate(createContactSchema, "body"),
  async (ctx) => {
    const contact = await contactService.createContact(
      getOrgContext(ctx.state.user),
      ctx.params.companyId,
      ctx.state.body as CreateContactInput,
    );
    ctx.status = 201;
    ctx.body = { data: contact };
  },
);

// GET /companies/:companyId/contacts/:contactId
router.get("/companies/:companyId/contacts/:contactId", async (ctx) => {
  const contact = await contactService.getContact(
    getOrgContext(ctx.state.user),
    ctx.params.companyId,
    ctx.params.contactId,
  );
  ctx.body = { data: contact };
});

// PATCH /companies/:companyId/contacts/:contactId
router.patch(
  "/companies/:companyId/contacts/:contactId",
  validate(updateContactSchema, "body"),
  async (ctx) => {
    const contact = await contactService.updateContact(
      getOrgContext(ctx.state.user),
      ctx.params.companyId,
      ctx.params.contactId,
      ctx.state.body as UpdateContactInput,
    );
    ctx.body = { data: contact };
  },
);

// DELETE /companies/:companyId/contacts/:contactId
router.delete(
  "/companies/:companyId/contacts/:contactId",
  async (ctx) => {
    await contactService.deleteContact(
      getOrgContext(ctx.state.user),
      ctx.params.companyId,
      ctx.params.contactId,
    );
    ctx.status = 204;
  },
);

export default router;
