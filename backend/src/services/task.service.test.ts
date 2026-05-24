import { describe, it, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { makeOrgContext, makePrismaMock } from "../test-helpers.ts";

const prismaMock = makePrismaMock();
const recordEventMock = mock.fn(() => Promise.resolve());
const ensureCompanyAccessMock = mock.fn(() => Promise.resolve());

mock.module("../lib/prisma.js", { namedExports: { prisma: prismaMock } });
mock.module("./event.service.js", { namedExports: { recordEvent: recordEventMock } });
mock.module("./company.service.js", {
  namedExports: { ensureCompanyAccess: ensureCompanyAccessMock },
});

const { listTasks, getTask, createTask, updateTask, deleteTask } = await import(
  "./task.service.ts"
);

const baseParams = { page: 1, limit: 20 } as any;

describe("task.service", () => {
  beforeEach(() => {
    prismaMock.task.findMany = mock.fn(() => Promise.resolve([]));
    prismaMock.task.findFirst = mock.fn(() => Promise.resolve(null));
    prismaMock.task.create = mock.fn(() => Promise.resolve({}));
    prismaMock.task.update = mock.fn(() => Promise.resolve({}));
    prismaMock.task.delete = mock.fn(() => Promise.resolve({}));
    prismaMock.task.count = mock.fn(() => Promise.resolve(0));
    prismaMock.deal.findFirst = mock.fn(() => Promise.resolve({ id: "deal-1" }));
    prismaMock.$transaction = ((arr: any[]) => Promise.all(arr)) as any;
    recordEventMock.mock.resetCalls();
    ensureCompanyAccessMock.mock.resetCalls();
  });

  describe("listTasks", () => {
    it("scopes by organizationId when no companyId provided", async () => {
      await listTasks(makeOrgContext(), baseParams);
      const call = (prismaMock.task.findMany as ReturnType<typeof mock.fn>).mock.calls[0];
      assert.equal(call.arguments[0].where.organizationId, "org-1");
      // ADMIN: no role-based AND filter
      assert.equal(call.arguments[0].where.AND, undefined);
    });

    it("restricts SALESPERSON to owned companies and their own standalone tasks", async () => {
      await listTasks(makeOrgContext({ role: "SALESPERSON", userId: "user-2" }), baseParams);
      const call = (prismaMock.task.findMany as ReturnType<typeof mock.fn>).mock.calls[0];
      const and = call.arguments[0].where.AND;
      assert.ok(Array.isArray(and));
      const or = and[0].OR;
      assert.equal(or.length, 3);
      assert.equal(or[0].company.ownerId, "user-2");
    });

    it("translates completed=true to status=DONE filter", async () => {
      await listTasks(makeOrgContext(), { ...baseParams, completed: true });
      const call = (prismaMock.task.findMany as ReturnType<typeof mock.fn>).mock.calls[0];
      assert.equal(call.arguments[0].where.status, "DONE");
    });

    it("translates completed=false to status not DONE", async () => {
      await listTasks(makeOrgContext(), { ...baseParams, completed: false });
      const call = (prismaMock.task.findMany as ReturnType<typeof mock.fn>).mock.calls[0];
      assert.deepEqual(call.arguments[0].where.status, { not: "DONE" });
    });

    it("ensures company access when companyId scope provided", async () => {
      await listTasks(makeOrgContext(), baseParams, "comp-1");
      assert.equal(ensureCompanyAccessMock.mock.callCount(), 1);
      const call = (prismaMock.task.findMany as ReturnType<typeof mock.fn>).mock.calls[0];
      assert.equal(call.arguments[0].where.companyId, "comp-1");
    });
  });

  describe("getTask", () => {
    it("throws 404 when not found", async () => {
      await assert.rejects(
        () => getTask(makeOrgContext(), "missing"),
        (err: any) => {
          assert.equal(err.statusCode, 404);
          assert.equal(err.code, "TASK_NOT_FOUND");
          return true;
        },
      );
    });

    it("returns the task when found", async () => {
      const task = { id: "t1", title: "x" };
      prismaMock.task.findFirst = mock.fn(() => Promise.resolve(task));
      const result = await getTask(makeOrgContext(), "t1");
      assert.equal(result, task);
    });
  });

  describe("createTask", () => {
    it("sets completedAt when created with status DONE", async () => {
      prismaMock.task.create = mock.fn(() =>
        Promise.resolve({ id: "t1", title: "x", status: "DONE" }),
      );
      await createTask(makeOrgContext(), {
        title: "x",
        status: "DONE",
        priority: "MEDIUM",
      } as any);
      const call = (prismaMock.task.create as ReturnType<typeof mock.fn>).mock.calls[0];
      assert.ok(call.arguments[0].data.completedAt instanceof Date);
      assert.equal(call.arguments[0].data.createdById, "user-1");
      assert.equal(call.arguments[0].data.organizationId, "org-1");
    });

    it("leaves completedAt null when status is not DONE", async () => {
      prismaMock.task.create = mock.fn(() => Promise.resolve({ id: "t1", title: "x" }));
      await createTask(makeOrgContext(), {
        title: "x",
        status: "TODO",
        priority: "MEDIUM",
      } as any);
      const call = (prismaMock.task.create as ReturnType<typeof mock.fn>).mock.calls[0];
      assert.equal(call.arguments[0].data.completedAt, null);
    });

    it("records CREATED event", async () => {
      prismaMock.task.create = mock.fn(() => Promise.resolve({ id: "t1", title: "hi" }));
      await createTask(makeOrgContext(), { title: "hi", priority: "MEDIUM" } as any);
      assert.equal(recordEventMock.mock.callCount(), 1);
      const ev = recordEventMock.mock.calls[0].arguments[0];
      assert.equal(ev.action, "CREATED");
      assert.equal(ev.entityType, "TASK");
    });

    it("rejects when dealId is not accessible", async () => {
      prismaMock.deal.findFirst = mock.fn(() => Promise.resolve(null));
      await assert.rejects(
        () =>
          createTask(makeOrgContext(), {
            title: "x",
            priority: "MEDIUM",
            dealId: "deal-x",
          } as any),
        (err: any) => {
          assert.equal(err.statusCode, 400);
          assert.equal(err.code, "INVALID_DEAL");
          return true;
        },
      );
    });
  });

  describe("updateTask", () => {
    it("blocks unapproved agent actors", async () => {
      const ctx = makeOrgContext({
        actor: { type: "agent", conversationId: "c1" },
      });
      await assert.rejects(
        () => updateTask(ctx, "t1", { title: "x" } as any),
        (err: any) => {
          assert.equal(err.statusCode, 403);
          assert.equal(err.code, "AGENT_APPROVAL_REQUIRED");
          return true;
        },
      );
    });

    it("allows approved agent actors (toolCallId set)", async () => {
      prismaMock.task.findFirst = mock.fn(() =>
        Promise.resolve({ id: "t1", title: "x", status: "TODO" }),
      );
      prismaMock.task.update = mock.fn(() =>
        Promise.resolve({ id: "t1", title: "y", status: "TODO" }),
      );
      const ctx = makeOrgContext({
        actor: { type: "agent", conversationId: "c1", toolCallId: "tc1" },
      });
      await updateTask(ctx, "t1", { title: "y" } as any);
      assert.equal((prismaMock.task.update as ReturnType<typeof mock.fn>).mock.callCount(), 1);
    });

    it("throws 404 when task not found", async () => {
      prismaMock.task.findFirst = mock.fn(() => Promise.resolve(null));
      await assert.rejects(
        () => updateTask(makeOrgContext(), "missing", { title: "x" } as any),
        (err: any) => {
          assert.equal(err.statusCode, 404);
          return true;
        },
      );
    });

    it("sets completedAt when transitioning to DONE and records COMPLETED event", async () => {
      prismaMock.task.findFirst = mock.fn(() =>
        Promise.resolve({ id: "t1", title: "x", status: "TODO", companyId: "comp-1" }),
      );
      prismaMock.task.update = mock.fn(() =>
        Promise.resolve({ id: "t1", title: "x", status: "DONE" }),
      );
      await updateTask(makeOrgContext(), "t1", { status: "DONE" } as any);
      const upd = (prismaMock.task.update as ReturnType<typeof mock.fn>).mock.calls[0];
      assert.ok(upd.arguments[0].data.completedAt instanceof Date);
      assert.equal(recordEventMock.mock.callCount(), 1);
      assert.equal(recordEventMock.mock.calls[0].arguments[0].action, "COMPLETED");
    });

    it("clears completedAt when transitioning out of DONE", async () => {
      prismaMock.task.findFirst = mock.fn(() =>
        Promise.resolve({ id: "t1", title: "x", status: "DONE" }),
      );
      prismaMock.task.update = mock.fn(() =>
        Promise.resolve({ id: "t1", title: "x", status: "TODO" }),
      );
      await updateTask(makeOrgContext(), "t1", { status: "TODO" } as any);
      const upd = (prismaMock.task.update as ReturnType<typeof mock.fn>).mock.calls[0];
      assert.equal(upd.arguments[0].data.completedAt, null);
      // No COMPLETED event when leaving DONE
      assert.equal(recordEventMock.mock.callCount(), 0);
    });

    it("does not re-record COMPLETED when already DONE", async () => {
      prismaMock.task.findFirst = mock.fn(() =>
        Promise.resolve({ id: "t1", title: "x", status: "DONE" }),
      );
      prismaMock.task.update = mock.fn(() =>
        Promise.resolve({ id: "t1", title: "x", status: "DONE" }),
      );
      await updateTask(makeOrgContext(), "t1", { status: "DONE", title: "y" } as any);
      assert.equal(recordEventMock.mock.callCount(), 0);
    });
  });

  describe("deleteTask", () => {
    it("throws 404 when not found", async () => {
      prismaMock.task.findFirst = mock.fn(() => Promise.resolve(null));
      await assert.rejects(
        () => deleteTask(makeOrgContext(), "missing"),
        (err: any) => {
          assert.equal(err.statusCode, 404);
          return true;
        },
      );
    });

    it("deletes the task", async () => {
      prismaMock.task.findFirst = mock.fn(() => Promise.resolve({ id: "t1" }));
      await deleteTask(makeOrgContext(), "t1");
      assert.equal((prismaMock.task.delete as ReturnType<typeof mock.fn>).mock.callCount(), 1);
    });
  });
});
