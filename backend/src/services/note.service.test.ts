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

const { listNotes, getNote, createNote, updateNote, deleteNote } = await import(
  "./note.service.ts"
);

describe("note.service", () => {
  beforeEach(() => {
    prismaMock.note.findMany = mock.fn(() => Promise.resolve([]));
    prismaMock.note.findFirst = mock.fn(() => Promise.resolve(null));
    prismaMock.note.create = mock.fn(() => Promise.resolve({}));
    prismaMock.note.update = mock.fn(() => Promise.resolve({}));
    prismaMock.note.delete = mock.fn(() => Promise.resolve({}));
    prismaMock.deal.findFirst = mock.fn(() => Promise.resolve(null));
    recordEventMock.mock.resetCalls();
    ensureCompanyAccessMock.mock.resetCalls();
  });

  describe("listNotes", () => {
    it("scopes by company and orders by createdAt desc", async () => {
      prismaMock.note.findMany = mock.fn(() => Promise.resolve([{ id: "n1" }]));
      const result = await listNotes(makeOrgContext(), "comp-1");
      assert.equal(ensureCompanyAccessMock.mock.callCount(), 1);
      assert.deepEqual(result, [{ id: "n1" }]);
      const call = (prismaMock.note.findMany as ReturnType<typeof mock.fn>).mock.calls[0];
      assert.equal(call.arguments[0].where.companyId, "comp-1");
      assert.deepEqual(call.arguments[0].orderBy, { createdAt: "desc" });
    });
  });

  describe("getNote", () => {
    it("throws 404 when not found", async () => {
      await assert.rejects(
        () => getNote(makeOrgContext(), "comp-1", "missing"),
        (err: any) => {
          assert.equal(err.statusCode, 404);
          assert.equal(err.code, "NOTE_NOT_FOUND");
          return true;
        },
      );
    });

    it("returns the note when found", async () => {
      const note = { id: "n1", title: "Hi", companyId: "comp-1" };
      prismaMock.note.findFirst = mock.fn(() => Promise.resolve(note));
      const result = await getNote(makeOrgContext(), "comp-1", "n1");
      assert.equal(result, note);
    });
  });

  describe("createNote", () => {
    it("creates note and records CREATED event", async () => {
      const note = { id: "n1", title: "Hi", companyId: "comp-1" };
      prismaMock.note.create = mock.fn(() => Promise.resolve(note));

      const result = await createNote(makeOrgContext(), "comp-1", {
        title: "Hi",
        body: "Body",
      } as any);

      assert.equal(result, note);
      assert.equal(recordEventMock.mock.callCount(), 1);
      const event = recordEventMock.mock.calls[0].arguments[0];
      assert.equal(event.action, "CREATED");
      assert.equal(event.entityType, "NOTE");
      assert.equal(event.metadata.title, "Hi");
    });

    it("rejects when dealId does not belong to company", async () => {
      prismaMock.deal.findFirst = mock.fn(() => Promise.resolve(null));
      await assert.rejects(
        () =>
          createNote(makeOrgContext(), "comp-1", {
            title: "Hi",
            body: "Body",
            dealId: "deal-x",
          } as any),
        (err: any) => {
          assert.equal(err.statusCode, 400);
          assert.equal(err.code, "INVALID_DEAL");
          return true;
        },
      );
      assert.equal((prismaMock.note.create as ReturnType<typeof mock.fn>).mock.callCount(), 0);
    });
  });

  describe("updateNote", () => {
    it("throws 404 when not found", async () => {
      prismaMock.note.findFirst = mock.fn(() => Promise.resolve(null));
      await assert.rejects(
        () => updateNote(makeOrgContext(), "comp-1", "missing", { title: "X" } as any),
        (err: any) => {
          assert.equal(err.statusCode, 404);
          return true;
        },
      );
    });

    it("updates note when found", async () => {
      const existing = { id: "n1", title: "Old", companyId: "comp-1" };
      prismaMock.note.findFirst = mock.fn(() => Promise.resolve(existing));
      prismaMock.note.update = mock.fn(() =>
        Promise.resolve({ ...existing, title: "New" }),
      );
      const result = await updateNote(makeOrgContext(), "comp-1", "n1", {
        title: "New",
      } as any);
      assert.equal(result.title, "New");
    });
  });

  describe("deleteNote", () => {
    it("throws 404 when not found", async () => {
      prismaMock.note.findFirst = mock.fn(() => Promise.resolve(null));
      await assert.rejects(
        () => deleteNote(makeOrgContext(), "comp-1", "missing"),
        (err: any) => {
          assert.equal(err.statusCode, 404);
          return true;
        },
      );
    });

    it("deletes the note", async () => {
      prismaMock.note.findFirst = mock.fn(() =>
        Promise.resolve({ id: "n1", title: "x", companyId: "comp-1" }),
      );
      await deleteNote(makeOrgContext(), "comp-1", "n1");
      assert.equal((prismaMock.note.delete as ReturnType<typeof mock.fn>).mock.callCount(), 1);
    });
  });
});
