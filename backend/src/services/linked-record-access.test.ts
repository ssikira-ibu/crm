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

const { createActivity } = await import("./activity.service.ts");
const { createNote } = await import("./note.service.ts");
const { createTask } = await import("./task.service.ts");

describe("linked record deal access", () => {
  beforeEach(() => {
    prismaMock.deal.findFirst = mock.fn(() => Promise.resolve(null));
    prismaMock.activity.create = mock.fn(() => Promise.resolve({}));
    prismaMock.note.create = mock.fn(() => Promise.resolve({}));
    prismaMock.task.create = mock.fn(() => Promise.resolve({}));
    recordEventMock.mock.resetCalls();
  });

  it("rejects an activity linked to a deal outside the company", async () => {
    await assert.rejects(
      () => createActivity(makeOrgContext(), "comp-1", {
        type: "CALL",
        title: "Intro call",
        date: new Date(),
        dealId: "deal-2",
      }),
      (err: any) => {
        assert.equal(err.statusCode, 400);
        assert.equal(err.code, "INVALID_DEAL");
        return true;
      },
    );
    assert.equal((prismaMock.activity.create as ReturnType<typeof mock.fn>).mock.callCount(), 0);
  });

  it("rejects a note linked to a deal outside the company", async () => {
    await assert.rejects(
      () => createNote(makeOrgContext(), "comp-1", {
        title: "Proposal",
        body: "Needs legal review",
        dealId: "deal-2",
      }),
      (err: any) => {
        assert.equal(err.statusCode, 400);
        assert.equal(err.code, "INVALID_DEAL");
        return true;
      },
    );
    assert.equal((prismaMock.note.create as ReturnType<typeof mock.fn>).mock.callCount(), 0);
  });

  it("rejects a salesperson task linked to an inaccessible deal", async () => {
    await assert.rejects(
      () => createTask(makeOrgContext({ role: "SALESPERSON" }), {
        title: "Follow up",
        dealId: "deal-2",
      }, "comp-1"),
      (err: any) => {
        assert.equal(err.statusCode, 400);
        assert.equal(err.code, "INVALID_DEAL");
        return true;
      },
    );
    assert.equal((prismaMock.task.create as ReturnType<typeof mock.fn>).mock.callCount(), 0);
  });
});
