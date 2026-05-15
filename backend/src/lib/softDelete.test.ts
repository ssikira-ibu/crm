import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import {
  createSoftDeleteExtension,
  isSoftDeleteModel,
  scopeActive,
} from "./softDelete.ts";

function getOperations(basePrisma: unknown = {}) {
  return createSoftDeleteExtension(basePrisma).query.$allModels;
}

describe("softDelete extension", () => {
  it("recognizes models with deletedAt support", () => {
    assert.equal(isSoftDeleteModel("Company"), true);
    assert.equal(isSoftDeleteModel("CustomFieldValue"), true);
    assert.equal(isSoftDeleteModel("User"), false);
    assert.equal(isSoftDeleteModel(undefined), false);
  });

  it("adds an active-record scope without losing existing where clauses", () => {
    assert.deepEqual(
      scopeActive({ where: { organizationId: "org-1", status: "ACTIVE" }, take: 10 }),
      {
        where: { organizationId: "org-1", status: "ACTIVE", deletedAt: null },
        take: 10,
      },
    );
  });

  it("overrides explicit deletedAt filters for protected read operations", async () => {
    const query = mock.fn((args) => Promise.resolve(args));
    const args = { where: { organizationId: "org-1", deletedAt: { not: null } } };

    await getOperations().findMany({ model: "Company", args, query });

    assert.deepEqual(query.mock.calls[0].arguments[0], {
      where: { organizationId: "org-1", deletedAt: null },
    });
  });

  it("does not add deletedAt to models without soft-delete support", async () => {
    const query = mock.fn((args) => Promise.resolve(args));
    const args = { where: { email: "user@example.com" } };

    await getOperations().findMany({ model: "User", args, query });

    assert.equal(query.mock.calls[0].arguments[0], args);
  });

  it("rewrites delete into an update that sets deletedAt", async () => {
    const update = mock.fn((args) => Promise.resolve(args));
    const query = mock.fn(() => Promise.resolve("hard-delete"));
    const operations = getOperations({ company: { update } });

    const result = await operations.delete({
      model: "Company",
      args: { where: { id: "c1" } },
      query,
    });

    assert.equal(query.mock.callCount(), 0);
    assert.equal(update.mock.callCount(), 1);
    assert.deepEqual(result.where, { id: "c1" });
    assert.ok(result.data.deletedAt instanceof Date);
  });

  it("rewrites deleteMany into an active-scoped updateMany", async () => {
    const updateMany = mock.fn((args) => Promise.resolve(args));
    const operations = getOperations({ task: { updateMany } });

    const result = await operations.deleteMany({
      model: "Task",
      args: { where: { organizationId: "org-1" } },
      query: mock.fn(),
    });

    assert.deepEqual(result.where, {
      organizationId: "org-1",
      deletedAt: null,
    });
    assert.ok(result.data.deletedAt instanceof Date);
  });

  it("passes delete through for models without soft-delete support", async () => {
    const query = mock.fn((args) => Promise.resolve({ hardDeleted: args.where.id }));
    const operations = getOperations();

    const result = await operations.delete({
      model: "User",
      args: { where: { id: "u1" } },
      query,
    });

    assert.deepEqual(result, { hardDeleted: "u1" });
    assert.equal(query.mock.callCount(), 1);
  });
});
