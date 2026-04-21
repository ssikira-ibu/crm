import { describe, it, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { makeOrgContext, makePrismaMock } from "../test-helpers.ts";

const prismaMock = makePrismaMock();

mock.module("../lib/prisma.js", { namedExports: { prisma: prismaMock } });
mock.module("./event.service.js", {
  namedExports: { recordEvent: mock.fn(() => Promise.resolve()) },
});

const { listCustomers, getCustomer, createCustomer, updateCustomer, deleteCustomer, ensureCustomerAccess } =
  await import("./customer.service.ts");

describe("customer.service", () => {
  beforeEach(() => {
    Object.values(prismaMock).forEach((model) => {
      Object.values(model).forEach((fn) => {
        if (typeof fn === "function" && "mock" in fn) {
          (fn as ReturnType<typeof mock.fn>).mock.resetCalls();
        }
      });
    });
    prismaMock.customer.findMany = mock.fn(() => Promise.resolve([]));
    prismaMock.customer.findFirst = mock.fn(() => Promise.resolve(null));
    prismaMock.customer.count = mock.fn(() => Promise.resolve(0));
    prismaMock.customer.create = mock.fn(() => Promise.resolve({}));
    prismaMock.customer.update = mock.fn(() => Promise.resolve({}));
    prismaMock.customer.delete = mock.fn(() => Promise.resolve({}));
  });

  describe("listCustomers", () => {
    it("returns paginated results", async () => {
      const customers = [{ id: "c1", companyName: "Acme" }];
      prismaMock.customer.findMany = mock.fn(() => Promise.resolve(customers));
      prismaMock.customer.count = mock.fn(() => Promise.resolve(1));

      const ctx = makeOrgContext();
      const result = await listCustomers(ctx, { page: 1, limit: 20 });

      assert.deepEqual(result.data, customers);
      assert.equal(result.meta.total, 1);
      assert.equal(result.meta.page, 1);
      assert.equal(result.meta.totalPages, 1);
    });

    it("calculates totalPages correctly", async () => {
      prismaMock.customer.findMany = mock.fn(() => Promise.resolve([]));
      prismaMock.customer.count = mock.fn(() => Promise.resolve(45));

      const result = await listCustomers(makeOrgContext(), { page: 1, limit: 20 });
      assert.equal(result.meta.totalPages, 3);
    });

    it("filters by status when provided", async () => {
      prismaMock.customer.findMany = mock.fn(() => Promise.resolve([]));
      prismaMock.customer.count = mock.fn(() => Promise.resolve(0));

      await listCustomers(makeOrgContext(), { page: 1, limit: 20, status: "ACTIVE" });

      const call = (prismaMock.customer.findMany as ReturnType<typeof mock.fn>).mock.calls[0];
      assert.equal(call.arguments[0].where.status, "ACTIVE");
    });

    it("filters by search term across companyName and industry", async () => {
      prismaMock.customer.findMany = mock.fn(() => Promise.resolve([]));
      prismaMock.customer.count = mock.fn(() => Promise.resolve(0));

      await listCustomers(makeOrgContext(), { page: 1, limit: 20, search: "tech" });

      const call = (prismaMock.customer.findMany as ReturnType<typeof mock.fn>).mock.calls[0];
      assert.equal(call.arguments[0].where.OR.length, 2);
      assert.equal(call.arguments[0].where.OR[0].companyName.contains, "tech");
      assert.equal(call.arguments[0].where.OR[1].industry.contains, "tech");
    });

    it("restricts salesperson to their own customers", async () => {
      prismaMock.customer.findMany = mock.fn(() => Promise.resolve([]));
      prismaMock.customer.count = mock.fn(() => Promise.resolve(0));

      const ctx = makeOrgContext({ role: "SALESPERSON", userId: "sp-1" });
      await listCustomers(ctx, { page: 1, limit: 20 });

      const call = (prismaMock.customer.findMany as ReturnType<typeof mock.fn>).mock.calls[0];
      assert.equal(call.arguments[0].where.ownerId, "sp-1");
    });

    it("does not restrict admin to own customers", async () => {
      prismaMock.customer.findMany = mock.fn(() => Promise.resolve([]));
      prismaMock.customer.count = mock.fn(() => Promise.resolve(0));

      await listCustomers(makeOrgContext({ role: "ADMIN" }), { page: 1, limit: 20 });

      const call = (prismaMock.customer.findMany as ReturnType<typeof mock.fn>).mock.calls[0];
      assert.equal(call.arguments[0].where.ownerId, undefined);
    });

    it("applies correct skip for pagination", async () => {
      prismaMock.customer.findMany = mock.fn(() => Promise.resolve([]));
      prismaMock.customer.count = mock.fn(() => Promise.resolve(0));

      await listCustomers(makeOrgContext(), { page: 3, limit: 10 });

      const call = (prismaMock.customer.findMany as ReturnType<typeof mock.fn>).mock.calls[0];
      assert.equal(call.arguments[0].skip, 20);
      assert.equal(call.arguments[0].take, 10);
    });
  });

  describe("getCustomer", () => {
    it("returns customer with tags flattened", async () => {
      const customer = {
        id: "c1",
        companyName: "Acme",
        contacts: [],
        addresses: [],
        deals: [],
        activities: [],
        notes: [],
        reminders: [],
        tags: [{ tag: { id: "t1", name: "VIP" } }],
      };
      prismaMock.customer.findFirst = mock.fn(() => Promise.resolve(customer));

      const result = await getCustomer(makeOrgContext(), "c1");
      assert.deepEqual(result.tags, [{ id: "t1", name: "VIP" }]);
      assert.equal((result as any).contacts, customer.contacts);
    });

    it("throws 404 when customer not found", async () => {
      prismaMock.customer.findFirst = mock.fn(() => Promise.resolve(null));

      await assert.rejects(
        () => getCustomer(makeOrgContext(), "nonexistent"),
        (err: any) => {
          assert.equal(err.statusCode, 404);
          assert.equal(err.code, "CUSTOMER_NOT_FOUND");
          return true;
        },
      );
    });
  });

  describe("createCustomer", () => {
    it("sets organizationId and ownerId from context", async () => {
      const created = { id: "c1", companyName: "New Co", organizationId: "org-1", ownerId: "user-1" };
      prismaMock.customer.create = mock.fn(() => Promise.resolve(created));

      const ctx = makeOrgContext({ organizationId: "org-1", userId: "user-1" });
      const result = await createCustomer(ctx, { companyName: "New Co" } as any);

      const call = (prismaMock.customer.create as ReturnType<typeof mock.fn>).mock.calls[0];
      assert.equal(call.arguments[0].data.organizationId, "org-1");
      assert.equal(call.arguments[0].data.ownerId, "user-1");
      assert.equal(result, created);
    });
  });

  describe("updateCustomer", () => {
    it("throws 404 when customer does not exist", async () => {
      prismaMock.customer.findFirst = mock.fn(() => Promise.resolve(null));

      await assert.rejects(
        () => updateCustomer(makeOrgContext(), "nonexistent", { companyName: "X" } as any),
        (err: any) => {
          assert.equal(err.statusCode, 404);
          return true;
        },
      );
    });

    it("updates customer and returns result", async () => {
      const old = { id: "c1", status: "LEAD", companyName: "Old" };
      const updated = { id: "c1", status: "LEAD", companyName: "New" };
      prismaMock.customer.findFirst = mock.fn(() => Promise.resolve(old));
      prismaMock.customer.update = mock.fn(() => Promise.resolve(updated));

      const result = await updateCustomer(makeOrgContext(), "c1", { companyName: "New" } as any);
      assert.equal(result, updated);
    });
  });

  describe("deleteCustomer", () => {
    it("throws 404 when customer not found", async () => {
      prismaMock.customer.findFirst = mock.fn(() => Promise.resolve(null));

      await assert.rejects(
        () => deleteCustomer(makeOrgContext(), "nonexistent"),
        (err: any) => {
          assert.equal(err.statusCode, 404);
          return true;
        },
      );
    });

    it("deletes the customer when access is confirmed", async () => {
      prismaMock.customer.findFirst = mock.fn(() => Promise.resolve({ id: "c1" }));
      prismaMock.customer.delete = mock.fn(() => Promise.resolve({}));

      await deleteCustomer(makeOrgContext(), "c1");

      const call = (prismaMock.customer.delete as ReturnType<typeof mock.fn>).mock.calls[0];
      assert.equal(call.arguments[0].where.id, "c1");
    });
  });

  describe("ensureCustomerAccess", () => {
    it("throws 404 when customer not found in org scope", async () => {
      prismaMock.customer.findFirst = mock.fn(() => Promise.resolve(null));

      await assert.rejects(
        () => ensureCustomerAccess(makeOrgContext(), "bad-id"),
        (err: any) => {
          assert.equal(err.statusCode, 404);
          return true;
        },
      );
    });

    it("resolves when customer exists", async () => {
      prismaMock.customer.findFirst = mock.fn(() => Promise.resolve({ id: "c1" }));

      await ensureCustomerAccess(makeOrgContext(), "c1");
    });
  });
});
