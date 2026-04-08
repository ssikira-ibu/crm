import Router from "@koa/router";
import { validate } from "../middleware/validate.js";
import {
  createReminderSchema,
  updateReminderSchema,
  reminderQuerySchema,
} from "../schemas/reminder.schema.js";
import type { ReminderQueryParams } from "../schemas/reminder.schema.js";
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
      ctx.request.body,
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

// PUT /customers/:customerId/reminders/:reminderId
router.put(
  "/customers/:customerId/reminders/:reminderId",
  validate(updateReminderSchema, "body"),
  async (ctx) => {
    const reminder = await reminderService.updateReminder(
      ctx.state.user.uid,
      ctx.params.customerId,
      ctx.params.reminderId,
      ctx.request.body,
    );
    ctx.body = { data: reminder };
  },
);

// PATCH /customers/:customerId/reminders/:reminderId/complete
router.patch(
  "/customers/:customerId/reminders/:reminderId/complete",
  async (ctx) => {
    const reminder = await reminderService.completeReminder(
      ctx.state.user.uid,
      ctx.params.customerId,
      ctx.params.reminderId,
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
