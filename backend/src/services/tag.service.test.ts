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
  listTags,
  createTag,
  updateTag,
  deleteTag,
  addTagToCompany,
  removeTagFromCompany,
} = await import("./tag.service.ts");

describe("tag.service", () => {
  beforeEach(() => {
    prismaMock.tag.findMany = mock.fn(() => Promise.resolve([]));
    prismaMock.tag.findFirst = mock.fn(() => Promise.resolve(null));
    prismaMock.tag.create = mock.fn(() => Promise.resolve({}));
    prismaMock.tag.update = mock.fn(() => Promise.resolve({}));
    prismaMock.tag.delete = mock.fn(() => Promise.resolve({}));
    prismaMock.companyTag.upsert = mock.fn(() => Promise.resolve({}));
    prismaMock.companyTag.deleteMany = mock.fn(() => Promise.resolve({ count: 0 }));
    recordEventMock.mock.resetCalls();
    ensureCompanyAccessMock.mock.resetCalls();
  });

  describe("listTags", () => {
    it("scopes to org and orders alphabetically", async () => {
      await listTags(makeOrgContext());
      const call = (prismaMock.tag.findMany as ReturnType<typeof mock.fn>).mock.calls[0];
      assert.equal(call.arguments[0].where.organizationId, "org-1");
      assert.deepEqual(call.arguments[0].orderBy, { name: "asc" });
    });
  });

  describe("createTag", () => {
    it("attaches organizationId on create", async () => {
      prismaMock.tag.create = mock.fn(() => Promise.resolve({ id: "tg1" }));
      await createTag(makeOrgContext(), { name: "VIP", color: "#ff0000" } as any);
      const call = (prismaMock.tag.create as ReturnType<typeof mock.fn>).mock.calls[0];
      assert.equal(call.arguments[0].data.organizationId, "org-1");
      assert.equal(call.arguments[0].data.name, "VIP");
    });
  });

  describe("updateTag", () => {
    it("throws 404 when not found", async () => {
      await assert.rejects(
        () => updateTag(makeOrgContext(), "missing", { name: "X" } as any),
        (err: any) => {
          assert.equal(err.statusCode, 404);
          assert.equal(err.code, "TAG_NOT_FOUND");
          return true;
        },
      );
    });

    it("updates the tag when found", async () => {
      prismaMock.tag.findFirst = mock.fn(() => Promise.resolve({ id: "tg1" }));
      prismaMock.tag.update = mock.fn(() => Promise.resolve({ id: "tg1", name: "New" }));
      const result = await updateTag(makeOrgContext(), "tg1", { name: "New" } as any);
      assert.equal(result.name, "New");
    });
  });

  describe("deleteTag", () => {
    it("throws 404 when not found", async () => {
      await assert.rejects(
        () => deleteTag(makeOrgContext(), "missing"),
        (err: any) => {
          assert.equal(err.statusCode, 404);
          return true;
        },
      );
    });

    it("deletes the tag", async () => {
      prismaMock.tag.findFirst = mock.fn(() => Promise.resolve({ id: "tg1" }));
      await deleteTag(makeOrgContext(), "tg1");
      assert.equal((prismaMock.tag.delete as ReturnType<typeof mock.fn>).mock.callCount(), 1);
    });
  });

  describe("addTagToCompany", () => {
    it("blocks unapproved agent actors", async () => {
      const ctx = makeOrgContext({
        actor: { type: "agent", conversationId: "c1" },
      });
      await assert.rejects(
        () => addTagToCompany(ctx, "comp-1", "tg1"),
        (err: any) => {
          assert.equal(err.statusCode, 403);
          assert.equal(err.code, "AGENT_APPROVAL_REQUIRED");
          return true;
        },
      );
    });

    it("throws 404 when tag missing", async () => {
      prismaMock.tag.findFirst = mock.fn(() => Promise.resolve(null));
      await assert.rejects(
        () => addTagToCompany(makeOrgContext(), "comp-1", "missing"),
        (err: any) => {
          assert.equal(err.statusCode, 404);
          assert.equal(err.code, "TAG_NOT_FOUND");
          return true;
        },
      );
    });

    it("upserts companyTag and records TAGGED event", async () => {
      prismaMock.tag.findFirst = mock.fn(() =>
        Promise.resolve({ id: "tg1", name: "VIP", color: "#fff" }),
      );
      await addTagToCompany(makeOrgContext(), "comp-1", "tg1");
      assert.equal(ensureCompanyAccessMock.mock.callCount(), 1);
      assert.equal((prismaMock.companyTag.upsert as ReturnType<typeof mock.fn>).mock.callCount(), 1);
      assert.equal(recordEventMock.mock.callCount(), 1);
      const ev = recordEventMock.mock.calls[0].arguments[0];
      assert.equal(ev.action, "TAGGED");
      assert.equal(ev.entityType, "TAG");
      assert.equal(ev.metadata.name, "VIP");
    });
  });

  describe("removeTagFromCompany", () => {
    it("blocks unapproved agent actors", async () => {
      const ctx = makeOrgContext({
        actor: { type: "agent", conversationId: "c1" },
      });
      await assert.rejects(
        () => removeTagFromCompany(ctx, "comp-1", "tg1"),
        (err: any) => {
          assert.equal(err.statusCode, 403);
          return true;
        },
      );
    });

    it("still deletes the link even when tag no longer exists, without recording event", async () => {
      prismaMock.tag.findFirst = mock.fn(() => Promise.resolve(null));
      await removeTagFromCompany(makeOrgContext(), "comp-1", "tg1");
      assert.equal((prismaMock.companyTag.deleteMany as ReturnType<typeof mock.fn>).mock.callCount(), 1);
      assert.equal(recordEventMock.mock.callCount(), 0);
    });

    it("records UNTAGGED event when tag exists", async () => {
      prismaMock.tag.findFirst = mock.fn(() => Promise.resolve({ id: "tg1", name: "VIP" }));
      await removeTagFromCompany(makeOrgContext(), "comp-1", "tg1");
      assert.equal(recordEventMock.mock.callCount(), 1);
      const ev = recordEventMock.mock.calls[0].arguments[0];
      assert.equal(ev.action, "UNTAGGED");
      assert.equal(ev.metadata.name, "VIP");
    });
  });
});
