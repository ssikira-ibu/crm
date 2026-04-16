import Router from "@koa/router";
import { validate } from "../middleware/validate.js";
import {
  createReminderSchema,
  updateReminderSchema,
  reminderQuerySchema,
} from "@crm/shared";
import type { CreateReminderInput, UpdateReminderInput, ReminderQueryParams } from "@crm/shared";
import * as reminderService from "../services/reminder.service.js";
import type { AppState } from "../types/index.js";

const router = new Router<AppState>();

// GET /customers/:customerId/reminders
router.get(
  "/customers/:customerId/reminders",
  validate(reminderQuerySchema, "query"),
  async (ctx) => {
    const result = await reminderService.listReminders(
      ctx.state.user.uid,
      ctx.params.customerId,
      ctx.state.query as ReminderQueryParams,
    );
    ctx.body = result;
  },
);

// POST /customers/:customerId/reminders
router.post(
  "/customers/:customerId/reminders",
  validate(createReminderSchema, "body"),
  async (ctx) => {
    const reminder = await reminderService.createReminder(
      ctx.state.user.uid,
      ctx.params.customerId,
      ctx.state.body as CreateReminderInput,
    );
    ctx.status = 201;
    ctx.body = { data: reminder };
  },
);

// GET /customers/:customerId/reminders/:reminderId
router.get(
  "/customers/:customerId/reminders/:reminderId",
  async (ctx) => {
    const reminder = await reminderService.getReminder(
      ctx.state.user.uid,
      ctx.params.customerId,
      ctx.params.reminderId,
    );
    ctx.body = { data: reminder };
  },
);

// PATCH /customers/:customerId/reminders/:reminderId
router.patch(
  "/customers/:customerId/reminders/:reminderId",
  validate(updateReminderSchema, "body"),
  async (ctx) => {
    const reminder = await reminderService.updateReminder(
      ctx.state.user.uid,
      ctx.params.customerId,
      ctx.params.reminderId,
      ctx.state.body as UpdateReminderInput,
    );
    ctx.body = { data: reminder };
  },
);

// DELETE /customers/:customerId/reminders/:reminderId
router.delete(
  "/customers/:customerId/reminders/:reminderId",
  async (ctx) => {
    await reminderService.deleteReminder(
      ctx.state.user.uid,
      ctx.params.customerId,
      ctx.params.reminderId,
    );
    ctx.status = 204;
  },
);

export default router;
