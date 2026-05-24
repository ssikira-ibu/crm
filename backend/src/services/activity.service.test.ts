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

const {
  listActivities,
  getActivity,
  createActivity,
  updateActivity,
  deleteActivity,
} = await import("./activity.service.ts");

describe("activity.service", () => {
  beforeEach(() => {
    prismaMock.activity.findMany = mock.fn(() => Promise.resolve([]));
    prismaMock.activity.findFirst = mock.fn(() => Promise.resolve(null));
    prismaMock.activity.create = mock.fn(() => Promise.resolve({}));
    prismaMock.activity.update = mock.fn(() => Promise.resolve({}));
    prismaMock.activity.delete = mock.fn(() => Promise.resolve({}));
    prismaMock.activity.count = mock.fn(() => Promise.resolve(0));
    prismaMock.deal.findFirst = mock.fn(() => Promise.resolve(null));
    prismaMock.$transaction = ((arr: any[]) => Promise.all(arr)) as any;
    recordEventMock.mock.resetCalls();
    ensureCompanyAccessMock.mock.resetCalls();
  });

  describe("listActivities", () => {
    it("checks company access and returns paginated data", async () => {
      prismaMock.activity.findMany = mock.fn(() =>
        Promise.resolve([{ id: "a1", title: "Call" }]),
      );
      prismaMock.activity.count = mock.fn(() => Promise.resolve(1));

      const result = await listActivities(makeOrgContext(), "comp-1", {
        page: 1,
        limit: 20,
      } as any);

      assert.equal(ensureCompanyAccessMock.mock.callCount(), 1);
      assert.equal(result.data.length, 1);
      assert.deepEqual(result.meta, { page: 1, limit: 20, total: 1, totalPages: 1 });
    });

    it("filters by activity type when provided", async () => {
      prismaMock.activity.findMany = mock.fn(() => Promise.resolve([]));
      prismaMock.activity.count = mock.fn(() => Promise.resolve(0));

      await listActivities(makeOrgContext(), "comp-1", {
        page: 1,
        limit: 20,
        type: "CALL",
      } as any);

      const call = (prismaMock.activity.findMany as ReturnType<typeof mock.fn>).mock.calls[0];
      assert.equal(call.arguments[0].where.type, "CALL");
      assert.equal(call.arguments[0].where.companyId, "comp-1");
    });
  });

  describe("getActivity", () => {
    it("returns the activity when found", async () => {
      const activity = { id: "a1", title: "Call", companyId: "comp-1" };
      prismaMock.activity.findFirst = mock.fn(() => Promise.resolve(activity));
      const result = await getActivity(makeOrgContext(), "comp-1", "a1");
      assert.equal(result, activity);
    });

    it("throws 404 when not found", async () => {
      prismaMock.activity.findFirst = mock.fn(() => Promise.resolve(null));
      await assert.rejects(
        () => getActivity(makeOrgContext(), "comp-1", "missing"),
        (err: any) => {
          assert.equal(err.statusCode, 404);
          assert.equal(err.code, "ACTIVITY_NOT_FOUND");
          return true;
        },
      );
    });
  });

  describe("createActivity", () => {
    it("creates activity, scopes to company, and records event", async () => {
      const activity = { id: "a1", title: "Call", type: "CALL", companyId: "comp-1" };
      prismaMock.activity.create = mock.fn(() => Promise.resolve(activity));

      const result = await createActivity(makeOrgContext(), "comp-1", {
        title: "Call",
        type: "CALL",
        date: new Date().toISOString(),
      } as any);

      assert.equal(result, activity);
      const createCall = (prismaMock.activity.create as ReturnType<typeof mock.fn>).mock.calls[0];
      assert.equal(createCall.arguments[0].data.companyId, "comp-1");

      assert.equal(recordEventMock.mock.callCount(), 1);
      const event = recordEventMock.mock.calls[0].arguments[0];
      assert.equal(event.action, "CREATED");
      assert.equal(event.entityType, "ACTIVITY");
      assert.equal(event.metadata.title, "Call");
      assert.equal(event.metadata.type, "CALL");
    });

    it("rejects when dealId does not belong to company", async () => {
      prismaMock.deal.findFirst = mock.fn(() => Promise.resolve(null));

      await assert.rejects(
        () =>
          createActivity(makeOrgContext(), "comp-1", {
            title: "Call",
            type: "CALL",
            date: new Date().toISOString(),
            dealId: "deal-x",
          } as any),
        (err: any) => {
          assert.equal(err.statusCode, 400);
          assert.equal(err.code, "INVALID_DEAL");
          return true;
        },
      );

      assert.equal((prismaMock.activity.create as ReturnType<typeof mock.fn>).mock.callCount(), 0);
    });

    it("accepts a dealId that belongs to the company", async () => {
      prismaMock.deal.findFirst = mock.fn(() => Promise.resolve({ id: "deal-1" }));
      prismaMock.activity.create = mock.fn(() => Promise.resolve({ id: "a1", title: "T", type: "CALL" }));

      await createActivity(makeOrgContext(), "comp-1", {
        title: "T",
        type: "CALL",
        date: new Date().toISOString(),
        dealId: "deal-1",
      } as any);

      const dealCall = (prismaMock.deal.findFirst as ReturnType<typeof mock.fn>).mock.calls[0];
      assert.equal(dealCall.arguments[0].where.id, "deal-1");
      assert.equal(dealCall.arguments[0].where.companyId, "comp-1");
      assert.equal(dealCall.arguments[0].where.organizationId, "org-1");
    });
  });

  describe("updateActivity", () => {
    it("throws 404 when not found", async () => {
      prismaMock.activity.findFirst = mock.fn(() => Promise.resolve(null));
      await assert.rejects(
        () => updateActivity(makeOrgContext(), "comp-1", "missing", { title: "X" } as any),
        (err: any) => {
          assert.equal(err.statusCode, 404);
          return true;
        },
      );
    });

    it("updates and returns the activity", async () => {
      const existing = { id: "a1", title: "Old", companyId: "comp-1" };
      const updated = { ...existing, title: "New" };
      prismaMock.activity.findFirst = mock.fn(() => Promise.resolve(existing));
      prismaMock.activity.update = mock.fn(() => Promise.resolve(updated));

      const result = await updateActivity(makeOrgContext(), "comp-1", "a1", {
        title: "New",
      } as any);
      assert.equal(result.title, "New");
    });
  });

  describe("deleteActivity", () => {
    it("throws 404 when not found", async () => {
      prismaMock.activity.findFirst = mock.fn(() => Promise.resolve(null));
      await assert.rejects(
        () => deleteActivity(makeOrgContext(), "comp-1", "missing"),
        (err: any) => {
          assert.equal(err.statusCode, 404);
          return true;
        },
      );
    });

    it("deletes the activity", async () => {
      prismaMock.activity.findFirst = mock.fn(() =>
        Promise.resolve({ id: "a1", title: "x", companyId: "comp-1" }),
      );
      prismaMock.activity.delete = mock.fn(() => Promise.resolve({}));
      await deleteActivity(makeOrgContext(), "comp-1", "a1");
      assert.equal((prismaMock.activity.delete as ReturnType<typeof mock.fn>).mock.callCount(), 1);
    });
  });
});
