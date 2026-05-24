import { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { logger } from "../lib/logger.js";
import { emitNotification } from "../services/notification.service.js";
import { evaluateFilters } from "./filter.js";
import { resolveEntity } from "./entityResolver.js";
import type { WorkflowAction, WorkflowTrigger } from "@crm/shared";

const CURSOR_NAME = "event_outbox";
const EVENT_POLL_MS = 1_000;
const SCHEDULE_POLL_MS = 5_000;
const EVENT_BATCH = 100;
const SCHEDULE_BATCH = 50;

let stopping = false;

export async function startWorker() {
  logger.info({}, "workflow worker starting");
  void runEventLoop();
  void runScheduleLoop();
}

export function stopWorker() {
  stopping = true;
}

// ---------------------------------------------------------------------------
// Event outbox poller
// ---------------------------------------------------------------------------

async function getCursor(): Promise<number> {
  const existing = await prisma.workflowCursor.findUnique({
    where: { name: CURSOR_NAME },
  });
  if (existing) return existing.sequence;
  const max = await prisma.event.aggregate({ _max: { sequence: true } });
  const seq = max._max.sequence ?? 0;
  await prisma.workflowCursor.create({
    data: { name: CURSOR_NAME, sequence: seq },
  });
  return seq;
}

async function setCursor(sequence: number) {
  await prisma.workflowCursor.update({
    where: { name: CURSOR_NAME },
    data: { sequence },
  });
}

async function runEventLoop() {
  while (!stopping) {
    try {
      const processed = await processEventBatch();
      if (processed === 0) {
        await sleep(EVENT_POLL_MS);
      }
    } catch (err) {
      logger.error({ err }, "workflow event loop error");
      await sleep(EVENT_POLL_MS * 2);
    }
  }
}

async function processEventBatch(): Promise<number> {
  const cursor = await getCursor();
  const events = await prisma.event.findMany({
    where: { sequence: { gt: cursor } },
    orderBy: { sequence: "asc" },
    take: EVENT_BATCH,
  });
  if (events.length === 0) return 0;

  for (const event of events) {
    try {
      await processEvent(event);
    } catch (err) {
      logger.error(
        { err, eventId: event.id, sequence: event.sequence },
        "workflow processing failed for event; skipping",
      );
    }
    await setCursor(event.sequence);
  }
  return events.length;
}

type EventRow = Awaited<ReturnType<typeof prisma.event.findMany>>[number];

async function processEvent(event: EventRow) {
  // Workflows are scoped per org. Load only enabled, non-deleted ones.
  const workflows = await prisma.workflow.findMany({
    where: {
      organizationId: event.organizationId,
      enabled: true,
      deletedAt: null,
    },
  });
  if (workflows.length === 0) return;

  // Lazily resolve the entity if any workflow asks for it.
  let entity: Record<string, unknown> | null | undefined;
  async function getEntity() {
    if (entity !== undefined) return entity;
    entity = await resolveEntity(event.entityType, event.entityId);
    return entity;
  }

  for (const workflow of workflows) {
    const trigger = workflow.trigger as unknown as WorkflowTrigger;
    if (!matchesTrigger(event, trigger, await maybeResolveForTrigger(getEntity, trigger))) {
      continue;
    }
    const needsEntity = (trigger.filters ?? []).some((f) =>
      f.path.startsWith("entity."),
    );
    const ent = needsEntity ? await getEntity() : null;
    const ok = evaluateFilters(trigger.filters ?? [], {
      metadata: (event.metadata as Record<string, unknown> | null) ?? null,
      entity: ent ?? null,
    });
    if (!ok) continue;

    try {
      await executeAction(workflow, event, ent ?? (await getEntity()));
    } catch (err) {
      logger.error(
        { err, workflowId: workflow.id, eventId: event.id },
        "workflow action execution failed",
      );
    }
  }
}

// For synthetic actions (CLOSED, CLOSED_WON, CLOSED_LOST) we need the deal
// stage *before* deciding whether the trigger matches at all, so resolve up
// front when the trigger asks for one of those.
async function maybeResolveForTrigger(
  getEntity: () => Promise<Record<string, unknown> | null | undefined>,
  trigger: WorkflowTrigger,
): Promise<Record<string, unknown> | null> {
  if (
    trigger.action === "CLOSED" ||
    trigger.action === "CLOSED_WON" ||
    trigger.action === "CLOSED_LOST"
  ) {
    const e = await getEntity();
    return e ?? null;
  }
  return null;
}

function matchesTrigger(
  event: EventRow,
  trigger: WorkflowTrigger,
  resolvedForTrigger: Record<string, unknown> | null,
): boolean {
  if (event.entityType !== trigger.entityType) return false;

  // Synthetic deal-close actions: STAGE_CHANGED to a won/lost stage.
  if (trigger.action === "CLOSED_WON") {
    return (
      event.action === "STAGE_CHANGED" &&
      event.entityType === "DEAL" &&
      isWonStage(resolvedForTrigger)
    );
  }
  if (trigger.action === "CLOSED_LOST") {
    return (
      event.action === "STAGE_CHANGED" &&
      event.entityType === "DEAL" &&
      isLostStage(resolvedForTrigger)
    );
  }
  if (trigger.action === "CLOSED") {
    return (
      event.action === "STAGE_CHANGED" &&
      event.entityType === "DEAL" &&
      (isWonStage(resolvedForTrigger) || isLostStage(resolvedForTrigger))
    );
  }
  return event.action === trigger.action;
}

function isWonStage(entity: Record<string, unknown> | null): boolean {
  const stage = entity?.stage as { isWon?: boolean } | undefined;
  return stage?.isWon === true;
}
function isLostStage(entity: Record<string, unknown> | null): boolean {
  const stage = entity?.stage as { isLost?: boolean } | undefined;
  return stage?.isLost === true;
}

// ---------------------------------------------------------------------------
// Action executor
// ---------------------------------------------------------------------------

async function executeAction(
  workflow: { id: string; organizationId: string; userId: string; name: string; action: unknown },
  event: EventRow,
  entity: Record<string, unknown> | null,
) {
  const action = workflow.action as unknown as WorkflowAction;
  switch (action.type) {
    case "notify": {
      await emitNotification({
        organizationId: workflow.organizationId,
        userId: action.userId ?? workflow.userId,
        workflowId: workflow.id,
        title: interpolate(action.title, event, entity),
        body: action.body ? interpolate(action.body, event, entity) : null,
        link: action.link ? interpolate(action.link, event, entity) : buildDefaultLink(event),
        metadata: {
          workflowName: workflow.name,
          eventId: event.id,
          entityType: event.entityType,
          entityId: event.entityId,
        },
      });
      return;
    }
    case "create_task": {
      const dueDate = action.dueInDays !== undefined
        ? new Date(Date.now() + action.dueInDays * 24 * 60 * 60 * 1000)
        : null;
      // Link to triggering entity when sensible.
      const link = action.linkToEntity === false ? {} : entityLinkForTask(event);
      await prisma.task.create({
        data: {
          organizationId: workflow.organizationId,
          createdById: workflow.userId,
          assigneeId: action.assigneeId ?? workflow.userId,
          title: interpolate(action.title, event, entity),
          description: action.description
            ? interpolate(action.description, event, entity)
            : null,
          dueDate,
          ...link,
        },
      });
      return;
    }
    default: {
      const _exhaustive: never = action;
      void _exhaustive;
      logger.warn(
        { workflowId: workflow.id, action },
        "unknown workflow action type",
      );
    }
  }
}

function entityLinkForTask(
  event: EventRow,
): Partial<Pick<Prisma.TaskUncheckedCreateInput, "dealId" | "companyId" | "contactId">> {
  switch (event.entityType) {
    case "DEAL":
      return { dealId: event.entityId, companyId: event.companyId ?? undefined };
    case "COMPANY":
      return { companyId: event.entityId };
    case "CONTACT":
      return { contactId: event.entityId, companyId: event.companyId ?? undefined };
    default:
      return {};
  }
}

function buildDefaultLink(event: EventRow): string | null {
  switch (event.entityType) {
    case "DEAL":
      return event.companyId
        ? `/companies/${event.companyId}/deals/${event.entityId}`
        : null;
    case "COMPANY":
      return `/companies/${event.entityId}`;
    case "CONTACT":
      return event.companyId
        ? `/companies/${event.companyId}/contacts/${event.entityId}`
        : null;
    default:
      return null;
  }
}

// {{path.to.field}} interpolation against {metadata, entity, event}.
function interpolate(
  template: string,
  event: EventRow,
  entity: Record<string, unknown> | null,
): string {
  const scope = {
    metadata: (event.metadata as Record<string, unknown> | null) ?? {},
    entity: entity ?? {},
    event: {
      action: event.action,
      entityType: event.entityType,
      entityId: event.entityId,
    },
  };
  return template.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, path: string) => {
    const v = path.split(".").reduce<unknown>((cur, p) => {
      if (cur === null || cur === undefined || typeof cur !== "object") return undefined;
      return (cur as Record<string, unknown>)[p];
    }, scope);
    if (v === undefined || v === null) return "";
    return String(v);
  });
}

// ---------------------------------------------------------------------------
// Scheduled actions loop (placeholder — full execution paths can be added
// later as new scheduled action types are introduced).
// ---------------------------------------------------------------------------

async function runScheduleLoop() {
  while (!stopping) {
    try {
      const ran = await processSchedules();
      if (ran === 0) {
        await sleep(SCHEDULE_POLL_MS);
      }
    } catch (err) {
      logger.error({ err }, "schedule loop error");
      await sleep(SCHEDULE_POLL_MS * 2);
    }
  }
}

async function processSchedules(): Promise<number> {
  // Claim a batch by atomically updating PENDING -> RUNNING.
  const claimed = await prisma.$transaction(async (tx) => {
    const due = await tx.scheduledAction.findMany({
      where: { status: "PENDING", runAt: { lte: new Date() } },
      orderBy: { runAt: "asc" },
      take: SCHEDULE_BATCH,
    });
    if (due.length === 0) return [];
    await tx.scheduledAction.updateMany({
      where: { id: { in: due.map((d) => d.id) } },
      data: { status: "RUNNING", attempts: { increment: 1 } },
    });
    return due;
  });

  for (const job of claimed) {
    try {
      await runScheduledJob(job);
      await prisma.scheduledAction.update({
        where: { id: job.id },
        data: { status: "DONE" },
      });
    } catch (err) {
      logger.error({ err, jobId: job.id }, "scheduled action failed");
      await prisma.scheduledAction.update({
        where: { id: job.id },
        data: {
          status: "FAILED",
          lastError: err instanceof Error ? err.message : String(err),
        },
      });
    }
  }
  return claimed.length;
}

async function runScheduledJob(job: {
  id: string;
  organizationId: string;
  payload: unknown;
}) {
  const payload = job.payload as {
    type: string;
    userId?: string;
    title?: string;
    body?: string;
    link?: string;
  };
  if (payload.type === "notify") {
    await emitNotification({
      organizationId: job.organizationId,
      userId: payload.userId ?? "",
      title: payload.title ?? "Reminder",
      body: payload.body ?? null,
      link: payload.link ?? null,
    });
    return;
  }
  throw new Error(`Unknown scheduled action type: ${payload.type}`);
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}
