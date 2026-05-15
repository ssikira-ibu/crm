import { describe, it, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { makeOrgContext, makePrismaMock } from "../test-helpers.ts";

const prismaMock = makePrismaMock();

mock.module("../lib/prisma.js", { namedExports: { prisma: prismaMock } });
mock.module("./event.service.js", {
  namedExports: { recordEvent: mock.fn(() => Promise.resolve()) },
});

const { listCompanies, getCompany, createCompany, updateCompany, deleteCompany, ensureCompanyAccess } =
  await import("./company.service.ts");

describe("company.service", () => {
  beforeEach(() => {
    Object.values(prismaMock).forEach((model) => {
      if (typeof model === "object" && model !== null) {
        Object.values(model).forEach((fn) => {
          if (typeof fn === "function" && "mock" in fn) {
            (fn as ReturnType<typeof mock.fn>).mock.resetCalls();
          }
        });
      }
    });
    prismaMock.company.findMany = mock.fn(() => Promise.resolve([]));
    prismaMock.company.findFirst = mock.fn(() => Promise.resolve(null));
    prismaMock.company.count = mock.fn(() => Promise.resolve(0));
    prismaMock.company.create = mock.fn(() => Promise.resolve({}));
    prismaMock.company.update = mock.fn(() => Promise.resolve({}));
    prismaMock.company.delete = mock.fn(() => Promise.resolve({}));
  });

  describe("listCompanies", () => {
    it("returns paginated results", async () => {
      const companies = [{ id: "c1", name: "Acme" }];
      prismaMock.company.findMany = mock.fn(() => Promise.resolve(companies));
      prismaMock.company.count = mock.fn(() => Promise.resolve(1));

      const ctx = makeOrgContext();
      const result = await listCompanies(ctx, { page: 1, limit: 20 });

      assert.deepEqual(result.data, companies);
      assert.equal(result.meta.total, 1);
      assert.equal(result.meta.page, 1);
      assert.equal(result.meta.totalPages, 1);
    });

    it("calculates totalPages correctly", async () => {
      prismaMock.company.findMany = mock.fn(() => Promise.resolve([]));
      prismaMock.company.count = mock.fn(() => Promise.resolve(45));

      const result = await listCompanies(makeOrgContext(), { page: 1, limit: 20 });
      assert.equal(result.meta.totalPages, 3);
    });

    it("filters by status when provided", async () => {
      prismaMock.company.findMany = mock.fn(() => Promise.resolve([]));
      prismaMock.company.count = mock.fn(() => Promise.resolve(0));

      await listCompanies(makeOrgContext(), { page: 1, limit: 20, status: "ACTIVE" });

      const call = (prismaMock.company.findMany as ReturnType<typeof mock.fn>).mock.calls[0];
      assert.equal(call.arguments[0].where.status, "ACTIVE");
    });

    it("filters by search term across name and industry", async () => {
      prismaMock.company.findMany = mock.fn(() => Promise.resolve([]));
      prismaMock.company.count = mock.fn(() => Promise.resolve(0));

      await listCompanies(makeOrgContext(), { page: 1, limit: 20, search: "tech" });

      const call = (prismaMock.company.findMany as ReturnType<typeof mock.fn>).mock.calls[0];
      assert.equal(call.arguments[0].where.OR.length, 2);
      assert.equal(call.arguments[0].where.OR[0].name.contains, "tech");
      assert.equal(call.arguments[0].where.OR[1].industry.contains, "tech");
    });

    it("restricts salesperson to their own companies", async () => {
      prismaMock.company.findMany = mock.fn(() => Promise.resolve([]));
      prismaMock.company.count = mock.fn(() => Promise.resolve(0));

      const ctx = makeOrgContext({ role: "SALESPERSON", userId: "sp-1" });
      await listCompanies(ctx, { page: 1, limit: 20 });

      const call = (prismaMock.company.findMany as ReturnType<typeof mock.fn>).mock.calls[0];
      assert.equal(call.arguments[0].where.ownerId, "sp-1");
    });

    it("does not restrict admin to own companies", async () => {
      prismaMock.company.findMany = mock.fn(() => Promise.resolve([]));
      prismaMock.company.count = mock.fn(() => Promise.resolve(0));

      await listCompanies(makeOrgContext({ role: "ADMIN" }), { page: 1, limit: 20 });

      const call = (prismaMock.company.findMany as ReturnType<typeof mock.fn>).mock.calls[0];
      assert.equal(call.arguments[0].where.ownerId, undefined);
    });

    it("applies correct skip for pagination", async () => {
      prismaMock.company.findMany = mock.fn(() => Promise.resolve([]));
      prismaMock.company.count = mock.fn(() => Promise.resolve(0));

      await listCompanies(makeOrgContext(), { page: 3, limit: 10 });

      const call = (prismaMock.company.findMany as ReturnType<typeof mock.fn>).mock.calls[0];
      assert.equal(call.arguments[0].skip, 20);
      assert.equal(call.arguments[0].take, 10);
    });
  });

  describe("getCompany", () => {
    it("returns company with tags flattened", async () => {
      const company = {
        id: "c1",
        name: "Acme",
        contacts: [],
        addresses: [],
        deals: [],
        activities: [],
        notes: [],
        tasks: [],
        tags: [{ tag: { id: "t1", name: "VIP" } }],
      };
      prismaMock.company.findFirst = mock.fn(() => Promise.resolve(company));

      const result = await getCompany(makeOrgContext(), "c1");
      assert.deepEqual(result.tags, [{ id: "t1", name: "VIP" }]);
      assert.equal((result as any).contacts, company.contacts);
    });

    it("filters soft-deleted nested records from detail includes", async () => {
      prismaMock.company.findFirst = mock.fn(() =>
        Promise.resolve({
          id: "c1",
          name: "Acme",
          contacts: [],
          addresses: [],
          deals: [],
          activities: [],
          notes: [],
          tasks: [],
          tags: [],
        }),
      );

      await getCompany(makeOrgContext(), "c1");

      const call = (prismaMock.company.findFirst as ReturnType<typeof mock.fn>).mock.calls[0];
      const include = call.arguments[0].include;
      assert.deepEqual(include.contacts.where, { deletedAt: null });
      assert.deepEqual(include.contacts.include.phoneNumbers.where, { deletedAt: null });
      assert.deepEqual(include.addresses.where, { deletedAt: null });
      assert.deepEqual(include.deals.where, { deletedAt: null });
      assert.deepEqual(include.activities.where, { deletedAt: null });
      assert.deepEqual(include.notes.where, { deletedAt: null });
      assert.deepEqual(include.tasks.where, { deletedAt: null });
      assert.deepEqual(include.tags.where, { tag: { deletedAt: null } });
    });

    it("throws 404 when company not found", async () => {
      prismaMock.company.findFirst = mock.fn(() => Promise.resolve(null));

      await assert.rejects(
        () => getCompany(makeOrgContext(), "nonexistent"),
        (err: any) => {
          assert.equal(err.statusCode, 404);
          assert.equal(err.code, "COMPANY_NOT_FOUND");
          return true;
        },
      );
    });
  });

  describe("createCompany", () => {
    it("sets organizationId and ownerId from context", async () => {
      const created = { id: "c1", name: "New Co", organizationId: "org-1", ownerId: "user-1" };
      prismaMock.company.create = mock.fn(() => Promise.resolve(created));

      const ctx = makeOrgContext({ organizationId: "org-1", userId: "user-1" });
      const result = await createCompany(ctx, { name: "New Co" } as any);

      const call = (prismaMock.company.create as ReturnType<typeof mock.fn>).mock.calls[0];
      assert.equal(call.arguments[0].data.organizationId, "org-1");
      assert.equal(call.arguments[0].data.ownerId, "user-1");
      assert.equal(result, created);
    });
  });

  describe("updateCompany", () => {
    it("throws 404 when company does not exist", async () => {
      prismaMock.company.findFirst = mock.fn(() => Promise.resolve(null));

      await assert.rejects(
        () => updateCompany(makeOrgContext(), "nonexistent", { name: "X" } as any),
        (err: any) => {
          assert.equal(err.statusCode, 404);
          return true;
        },
      );
    });

    it("updates company and returns result", async () => {
      const old = { id: "c1", status: "LEAD", name: "Old" };
      const updated = { id: "c1", status: "LEAD", name: "New" };
      prismaMock.company.findFirst = mock.fn(() => Promise.resolve(old));
      prismaMock.company.update = mock.fn(() => Promise.resolve(updated));

      const result = await updateCompany(makeOrgContext(), "c1", { name: "New" } as any);
      assert.equal(result, updated);
    });
  });

  describe("deleteCompany", () => {
    it("throws 404 when company not found", async () => {
      prismaMock.company.findFirst = mock.fn(() => Promise.resolve(null));

      await assert.rejects(
        () => deleteCompany(makeOrgContext(), "nonexistent"),
        (err: any) => {
          assert.equal(err.statusCode, 404);
          return true;
        },
      );
    });

    it("deletes the company when access is confirmed", async () => {
      prismaMock.company.findFirst = mock.fn(() => Promise.resolve({ id: "c1" }));
      prismaMock.company.delete = mock.fn(() => Promise.resolve({}));

      await deleteCompany(makeOrgContext(), "c1");

      const call = (prismaMock.company.delete as ReturnType<typeof mock.fn>).mock.calls[0];
      assert.equal(call.arguments[0].where.id, "c1");
    });
  });

  describe("ensureCompanyAccess", () => {
    it("throws 404 when company not found in org scope", async () => {
      prismaMock.company.findFirst = mock.fn(() => Promise.resolve(null));

      await assert.rejects(
        () => ensureCompanyAccess(makeOrgContext(), "bad-id"),
        (err: any) => {
          assert.equal(err.statusCode, 404);
          return true;
        },
      );
    });

    it("resolves when company exists", async () => {
      prismaMock.company.findFirst = mock.fn(() => Promise.resolve({ id: "c1" }));

      await ensureCompanyAccess(makeOrgContext(), "c1");
    });
  });
});
