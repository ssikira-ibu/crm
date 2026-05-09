import { describe, it, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { makeOrgContext, makePrismaMock } from "../test-helpers.ts";

const prismaMock = makePrismaMock();
const recordEventMock = mock.fn(() => Promise.resolve());

mock.module("../lib/prisma.js", { namedExports: { prisma: prismaMock } });
mock.module("./event.service.js", { namedExports: { recordEvent: recordEventMock } });
mock.module("./company.service.js", {
  namedExports: {
    ensureCompanyAccess: mock.fn(() => Promise.resolve()),
  },
});

const { listDeals, getDeal, createDeal, updateDeal, deleteDeal } =
  await import("./deal.service.ts");

describe("deal.service", () => {
  beforeEach(() => {
    prismaMock.deal.findMany = mock.fn(() => Promise.resolve([]));
    prismaMock.deal.findFirst = mock.fn(() => Promise.resolve(null));
    prismaMock.deal.count = mock.fn(() => Promise.resolve(0));
    prismaMock.deal.create = mock.fn(() => Promise.resolve({}));
    prismaMock.deal.update = mock.fn(() => Promise.resolve({}));
    prismaMock.deal.delete = mock.fn(() => Promise.resolve({}));
    prismaMock.pipeline.findFirst = mock.fn(() => Promise.resolve({ id: "pip-1" }));
    prismaMock.pipelineStage.findFirst = mock.fn(() =>
      Promise.resolve({ id: "stage-1", name: "New", isWon: false, isLost: false }),
    );
    recordEventMock.mock.resetCalls();
  });

  describe("listDeals", () => {
    it("returns paginated results for a company", async () => {
      const deals = [{ id: "d1", title: "Big Deal" }];
      prismaMock.deal.findMany = mock.fn(() => Promise.resolve(deals));
      prismaMock.deal.count = mock.fn(() => Promise.resolve(1));

      const result = await listDeals(makeOrgContext(), "comp-1", { page: 1, limit: 20 });

      assert.deepEqual(result.data, deals);
      assert.equal(result.meta.total, 1);
    });

    it("filters by pipelineId when provided", async () => {
      prismaMock.deal.findMany = mock.fn(() => Promise.resolve([]));
      prismaMock.deal.count = mock.fn(() => Promise.resolve(0));

      await listDeals(makeOrgContext(), "comp-1", { page: 1, limit: 20, pipelineId: "pip-1" });

      const call = (prismaMock.deal.findMany as ReturnType<typeof mock.fn>).mock.calls[0];
      assert.equal(call.arguments[0].where.pipelineId, "pip-1");
    });

    it("scopes query to companyId", async () => {
      prismaMock.deal.findMany = mock.fn(() => Promise.resolve([]));
      prismaMock.deal.count = mock.fn(() => Promise.resolve(0));

      await listDeals(makeOrgContext(), "comp-1", { page: 1, limit: 20 });

      const call = (prismaMock.deal.findMany as ReturnType<typeof mock.fn>).mock.calls[0];
      assert.equal(call.arguments[0].where.companyId, "comp-1");
    });
  });

  describe("getDeal", () => {
    it("returns the deal when found", async () => {
      const deal = { id: "d1", title: "Big Deal", companyId: "comp-1", stage: {} };
      prismaMock.deal.findFirst = mock.fn(() => Promise.resolve(deal));

      const result = await getDeal(makeOrgContext(), "comp-1", "d1");
      assert.equal(result, deal);
    });

    it("throws 404 when deal not found", async () => {
      prismaMock.deal.findFirst = mock.fn(() => Promise.resolve(null));

      await assert.rejects(
        () => getDeal(makeOrgContext(), "comp-1", "nonexistent"),
        (err: any) => {
          assert.equal(err.statusCode, 404);
          assert.equal(err.code, "DEAL_NOT_FOUND");
          return true;
        },
      );
    });
  });

  describe("createDeal", () => {
    it("creates deal and records event", async () => {
      const deal = { id: "d1", title: "New Deal", value: 5000, companyId: "comp-1", stage: {} };
      prismaMock.deal.create = mock.fn(() => Promise.resolve(deal));

      const result = await createDeal(makeOrgContext(), "comp-1", {
        title: "New Deal",
        value: 5000,
        stageId: "stage-1",
      } as any);

      assert.equal(result, deal);
      assert.equal(recordEventMock.mock.callCount(), 1);
      const eventCall = recordEventMock.mock.calls[0].arguments[0];
      assert.equal(eventCall.action, "CREATED");
      assert.equal(eventCall.entityType, "DEAL");
    });
  });

  describe("updateDeal", () => {
    it("throws 404 when deal not found", async () => {
      prismaMock.deal.findFirst = mock.fn(() => Promise.resolve(null));

      await assert.rejects(
        () => updateDeal(makeOrgContext(), "comp-1", "d1", { title: "X" } as any),
        (err: any) => {
          assert.equal(err.statusCode, 404);
          return true;
        },
      );
    });

    it("records STAGE_CHANGED event when stageId changes", async () => {
      const oldStage = { id: "stage-1", name: "New", isWon: false, isLost: false };
      const newStage = { id: "stage-2", name: "Negotiation", isWon: false, isLost: false };
      const old = { id: "d1", title: "Deal", value: 1000, companyId: "comp-1", stageId: "stage-1", pipelineId: "pip-1", stage: oldStage };
      const updated = { ...old, stageId: "stage-2", stage: newStage };
      prismaMock.deal.findFirst = mock.fn(() => Promise.resolve(old));
      prismaMock.deal.update = mock.fn(() => Promise.resolve(updated));
      prismaMock.pipelineStage.findFirst = mock.fn(() => Promise.resolve(newStage));

      await updateDeal(makeOrgContext(), "comp-1", "d1", { stageId: "stage-2" } as any);

      assert.equal(recordEventMock.mock.callCount(), 1);
      const eventCall = recordEventMock.mock.calls[0].arguments[0];
      assert.equal(eventCall.action, "STAGE_CHANGED");
      assert.equal(eventCall.metadata.oldStageId, "stage-1");
      assert.equal(eventCall.metadata.newStageId, "stage-2");
    });

    it("does not record event when stageId unchanged", async () => {
      const stage = { id: "stage-1", name: "New", isWon: false, isLost: false };
      const old = { id: "d1", title: "Deal", value: 1000, companyId: "comp-1", stageId: "stage-1", pipelineId: "pip-1", stage };
      const updated = { ...old, title: "Renamed" };
      prismaMock.deal.findFirst = mock.fn(() => Promise.resolve(old));
      prismaMock.deal.update = mock.fn(() => Promise.resolve(updated));

      await updateDeal(makeOrgContext(), "comp-1", "d1", { title: "Renamed" } as any);

      assert.equal(recordEventMock.mock.callCount(), 0);
    });
  });

  describe("deleteDeal", () => {
    it("throws 404 when deal not found", async () => {
      prismaMock.deal.findFirst = mock.fn(() => Promise.resolve(null));

      await assert.rejects(
        () => deleteDeal(makeOrgContext(), "comp-1", "bad"),
        (err: any) => {
          assert.equal(err.statusCode, 404);
          return true;
        },
      );
    });

    it("deletes deal and records event", async () => {
      const deal = { id: "d1", title: "Deal", value: 2000, companyId: "comp-1" };
      prismaMock.deal.findFirst = mock.fn(() => Promise.resolve(deal));
      prismaMock.deal.delete = mock.fn(() => Promise.resolve({}));

      await deleteDeal(makeOrgContext(), "comp-1", "d1");

      assert.equal((prismaMock.deal.delete as ReturnType<typeof mock.fn>).mock.callCount(), 1);
      assert.equal(recordEventMock.mock.callCount(), 1);
      assert.equal(recordEventMock.mock.calls[0].arguments[0].action, "DELETED");
    });
  });
});
