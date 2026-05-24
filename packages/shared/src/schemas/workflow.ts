import { z } from "zod";

// ---------------------------------------------------------------------------
// Trigger schema
// ---------------------------------------------------------------------------
//
// A trigger fires when an Event row is written whose (entityType, action)
// matches the trigger, AND every filter passes. Filters compare against
// either the event's metadata or a small projection of the entity itself
// (currently: deal stage flags).

export const TRIGGER_ENTITY_TYPES = [
  "DEAL",
  "COMPANY",
  "CONTACT",
  "TASK",
  "ACTIVITY",
  "NOTE",
  "TAG",
] as const;

export const TRIGGER_ACTIONS = [
  "CREATED",
  "UPDATED",
  "DELETED",
  "STATUS_CHANGED",
  "STAGE_CHANGED",
  "COMPLETED",
  "TAGGED",
  "UNTAGGED",
  "CLOSED_WON",
  "CLOSED_LOST",
  "CLOSED",
] as const;

export const filterSchema = z.object({
  // Dotted path into the evaluation context. Supported roots:
  //   metadata.*       — event.metadata fields
  //   entity.*         — the resolved entity (e.g. entity.id, entity.amount, entity.stage.isWon)
  path: z.string().min(1),
  op: z.enum(["eq", "ne", "in", "gt", "lt", "gte", "lte", "exists"]),
  value: z.unknown().optional(),
});

export const triggerSchema = z.object({
  entityType: z.enum(TRIGGER_ENTITY_TYPES),
  action: z.enum(TRIGGER_ACTIONS),
  filters: z.array(filterSchema).default([]),
});

// ---------------------------------------------------------------------------
// Action schema
// ---------------------------------------------------------------------------

export const notifyActionSchema = z.object({
  type: z.literal("notify"),
  // If omitted, notifies the workflow's owning user.
  userId: z.string().optional(),
  title: z.string().min(1).max(255),
  body: z.string().optional(),
  // Optional click-through link (relative path in the app).
  link: z.string().optional(),
});

export const createTaskActionSchema = z.object({
  type: z.literal("create_task"),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  // Days from now; resolved at execution time.
  dueInDays: z.number().int().min(0).max(365).optional(),
  assigneeId: z.string().optional(),
  // If true and the triggering entity is a deal/contact/company, link the task to it.
  linkToEntity: z.boolean().default(true),
});

export const actionSchema = z.discriminatedUnion("type", [
  notifyActionSchema,
  createTaskActionSchema,
]);

// ---------------------------------------------------------------------------
// CRUD schemas
// ---------------------------------------------------------------------------

export const createWorkflowSchema = z.object({
  name: z.string().min(1).max(255),
  enabled: z.boolean().default(true),
  trigger: triggerSchema,
  action: actionSchema,
});

export const updateWorkflowSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  enabled: z.boolean().optional(),
  trigger: triggerSchema.optional(),
  action: actionSchema.optional(),
});

export const workflowQuerySchema = z.object({
  enabled: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
});

export type WorkflowTrigger = z.infer<typeof triggerSchema>;
export type WorkflowAction = z.infer<typeof actionSchema>;
export type WorkflowFilter = z.infer<typeof filterSchema>;
export type CreateWorkflowInput = z.infer<typeof createWorkflowSchema>;
export type UpdateWorkflowInput = z.infer<typeof updateWorkflowSchema>;
