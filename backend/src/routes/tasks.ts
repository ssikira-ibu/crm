import Router from "@koa/router";
import { validate } from "../middleware/validate.js";
import {
  createTaskSchema,
  updateTaskSchema,
  taskQuerySchema,
} from "@crm/shared";
import type { CreateTaskInput, UpdateTaskInput, TaskQueryParams } from "@crm/shared";
import * as taskService from "../services/task.service.js";
import { getOrgContext } from "../lib/orgContext.js";
import type { AppState } from "../types/index.js";

const router = new Router<AppState>();

// ---------------------------------------------------------------------------
// Org-level task routes
// ---------------------------------------------------------------------------

// GET /tasks
router.get(
  "/tasks",
  validate(taskQuerySchema, "query"),
  async (ctx) => {
    const result = await taskService.listTasks(
      getOrgContext(ctx.state.user),
      ctx.state.query as TaskQueryParams,
    );
    ctx.body = result;
  },
);

// POST /tasks (org-level task, no company)
router.post(
  "/tasks",
  validate(createTaskSchema, "body"),
  async (ctx) => {
    const task = await taskService.createTask(
      getOrgContext(ctx.state.user),
      ctx.state.body as CreateTaskInput,
    );
    ctx.status = 201;
    ctx.body = { data: task };
  },
);

// GET /tasks/:taskId
router.get(
  "/tasks/:taskId",
  async (ctx) => {
    const task = await taskService.getTask(
      getOrgContext(ctx.state.user),
      ctx.params.taskId,
    );
    ctx.body = { data: task };
  },
);

// PATCH /tasks/:taskId
router.patch(
  "/tasks/:taskId",
  validate(updateTaskSchema, "body"),
  async (ctx) => {
    const task = await taskService.updateTask(
      getOrgContext(ctx.state.user),
      ctx.params.taskId,
      ctx.state.body as UpdateTaskInput,
    );
    ctx.body = { data: task };
  },
);

// DELETE /tasks/:taskId
router.delete(
  "/tasks/:taskId",
  async (ctx) => {
    await taskService.deleteTask(
      getOrgContext(ctx.state.user),
      ctx.params.taskId,
    );
    ctx.status = 204;
  },
);

// ---------------------------------------------------------------------------
// Company-scoped task routes
// ---------------------------------------------------------------------------

// GET /companies/:companyId/tasks
router.get(
  "/companies/:companyId/tasks",
  validate(taskQuerySchema, "query"),
  async (ctx) => {
    const result = await taskService.listTasks(
      getOrgContext(ctx.state.user),
      ctx.state.query as TaskQueryParams,
      ctx.params.companyId,
    );
    ctx.body = result;
  },
);

// POST /companies/:companyId/tasks
router.post(
  "/companies/:companyId/tasks",
  validate(createTaskSchema, "body"),
  async (ctx) => {
    const task = await taskService.createTask(
      getOrgContext(ctx.state.user),
      ctx.state.body as CreateTaskInput,
      ctx.params.companyId,
    );
    ctx.status = 201;
    ctx.body = { data: task };
  },
);

// GET /companies/:companyId/tasks/:taskId
router.get(
  "/companies/:companyId/tasks/:taskId",
  async (ctx) => {
    const task = await taskService.getTask(
      getOrgContext(ctx.state.user),
      ctx.params.taskId,
      ctx.params.companyId,
    );
    ctx.body = { data: task };
  },
);

// PATCH /companies/:companyId/tasks/:taskId
router.patch(
  "/companies/:companyId/tasks/:taskId",
  validate(updateTaskSchema, "body"),
  async (ctx) => {
    const task = await taskService.updateTask(
      getOrgContext(ctx.state.user),
      ctx.params.taskId,
      ctx.state.body as UpdateTaskInput,
      ctx.params.companyId,
    );
    ctx.body = { data: task };
  },
);

// DELETE /companies/:companyId/tasks/:taskId
router.delete(
  "/companies/:companyId/tasks/:taskId",
  async (ctx) => {
    await taskService.deleteTask(
      getOrgContext(ctx.state.user),
      ctx.params.taskId,
      ctx.params.companyId,
    );
    ctx.status = 204;
  },
);

export default router;
