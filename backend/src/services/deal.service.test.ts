import { describe, it, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { makeOrgContext, makePrismaMock } from "../test-helpers.ts";

const prismaMock = makePrismaMock();
const recordEventMock = mock.fn(() => Promise.resolve());

mock.module("../lib/prisma.js", { namedExports: { prisma: prismaMock } });
mock.module("./event.service.js", { namedExports: { recordEvent: recordEventMock } });
mock.module("./customer.service.js", {
  namedExports: {
    ensureCustomerAccess: mock.fn(() => Promise.resolve()),
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
    recordEventMock.mock.resetCalls();
  });

  describe("listDeals", () => {
    it("returns paginated results for a customer", async () => {
      const deals = [{ id: "d1", title: "Big Deal" }];
      prismaMock.deal.findMany = mock.fn(() => Promise.resolve(deals));
      prismaMock.deal.count = mock.fn(() => Promise.resolve(1));

      const result = await listDeals(makeOrgContext(), "cust-1", { page: 1, limit: 20 });

      assert.deepEqual(result.data, deals);
      assert.equal(result.meta.total, 1);
    });

    it("filters by status when provided", async () => {
      prismaMock.deal.findMany = mock.fn(() => Promise.resolve([]));
      prismaMock.deal.count = mock.fn(() => Promise.resolve(0));

      await listDeals(makeOrgContext(), "cust-1", { page: 1, limit: 20, status: "WON" });

      const call = (prismaMock.deal.findMany as ReturnType<typeof mock.fn>).mock.calls[0];
      assert.equal(call.arguments[0].where.status, "WON");
    });

    it("scopes query to customerId", async () => {
      prismaMock.deal.findMany = mock.fn(() => Promise.resolve([]));
      prismaMock.deal.count = mock.fn(() => Promise.resolve(0));

      await listDeals(makeOrgContext(), "cust-1", { page: 1, limit: 20 });

      const call = (prismaMock.deal.findMany as ReturnType<typeof mock.fn>).mock.calls[0];
      assert.equal(call.arguments[0].where.customerId, "cust-1");
    });
  });

  describe("getDeal", () => {
    it("returns the deal when found", async () => {
      const deal = { id: "d1", title: "Big Deal", customerId: "cust-1" };
      prismaMock.deal.findFirst = mock.fn(() => Promise.resolve(deal));

      const result = await getDeal(makeOrgContext(), "cust-1", "d1");
      assert.equal(result, deal);
    });

    it("throws 404 when deal not found", async () => {
      prismaMock.deal.findFirst = mock.fn(() => Promise.resolve(null));

      await assert.rejects(
        () => getDeal(makeOrgContext(), "cust-1", "nonexistent"),
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
      const deal = { id: "d1", title: "New Deal", value: 5000, status: "OPEN", customerId: "cust-1" };
      prismaMock.deal.create = mock.fn(() => Promise.resolve(deal));

      const result = await createDeal(makeOrgContext(), "cust-1", { title: "New Deal", value: 5000 } as any);

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
        () => updateDeal(makeOrgContext(), "cust-1", "d1", { title: "X" } as any),
        (err: any) => {
          assert.equal(err.statusCode, 404);
          return true;
        },
      );
    });

    it("records STATUS_CHANGED event when status changes", async () => {
      const old = { id: "d1", title: "Deal", value: 1000, status: "OPEN", customerId: "cust-1" };
      const updated = { ...old, status: "WON" };
      prismaMock.deal.findFirst = mock.fn(() => Promise.resolve(old));
      prismaMock.deal.update = mock.fn(() => Promise.resolve(updated));

      await updateDeal(makeOrgContext(), "cust-1", "d1", { status: "WON" } as any);

      assert.equal(recordEventMock.mock.callCount(), 1);
      const eventCall = recordEventMock.mock.calls[0].arguments[0];
      assert.equal(eventCall.action, "STATUS_CHANGED");
      assert.equal(eventCall.metadata.old, "OPEN");
      assert.equal(eventCall.metadata.new, "WON");
    });

    it("does not record event when status unchanged", async () => {
      const old = { id: "d1", title: "Deal", value: 1000, status: "OPEN", customerId: "cust-1" };
      const updated = { ...old, title: "Renamed" };
      prismaMock.deal.findFirst = mock.fn(() => Promise.resolve(old));
      prismaMock.deal.update = mock.fn(() => Promise.resolve(updated));

      await updateDeal(makeOrgContext(), "cust-1", "d1", { title: "Renamed" } as any);

      assert.equal(recordEventMock.mock.callCount(), 0);
    });
  });

  describe("deleteDeal", () => {
    it("throws 404 when deal not found", async () => {
      prismaMock.deal.findFirst = mock.fn(() => Promise.resolve(null));

      await assert.rejects(
        () => deleteDeal(makeOrgContext(), "cust-1", "bad"),
        (err: any) => {
          assert.equal(err.statusCode, 404);
          return true;
        },
      );
    });

    it("deletes deal and records event", async () => {
      const deal = { id: "d1", title: "Deal", value: 2000, customerId: "cust-1" };
      prismaMock.deal.findFirst = mock.fn(() => Promise.resolve(deal));
      prismaMock.deal.delete = mock.fn(() => Promise.resolve({}));

      await deleteDeal(makeOrgContext(), "cust-1", "d1");

      assert.equal((prismaMock.deal.delete as ReturnType<typeof mock.fn>).mock.callCount(), 1);
      assert.equal(recordEventMock.mock.callCount(), 1);
      assert.equal(recordEventMock.mock.calls[0].arguments[0].action, "DELETED");
    });
  });
});
