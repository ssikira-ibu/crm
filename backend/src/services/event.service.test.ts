import { describe, it, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { makeOrgContext, makePrismaMock } from "../test-helpers.ts";

const prismaMock = makePrismaMock();

mock.module("../lib/prisma.js", { namedExports: { prisma: prismaMock } });

const { recordEvent, listGlobalEvents, listCompanyEvents } = await import(
  "./event.service.ts"
);

describe("event.service", () => {
  beforeEach(() => {
    prismaMock.event.create = mock.fn(() => Promise.resolve({}));
    prismaMock.event.findMany = mock.fn(() => Promise.resolve([]));
  });

  describe("recordEvent", () => {
    it("persists all required fields with default user source", async () => {
      await recordEvent({
        ctx: makeOrgContext(),
        companyId: "comp-1",
        entityType: "COMPANY",
        entityId: "comp-1",
        action: "CREATED",
        metadata: { name: "Acme" },
      });

      const call = (prismaMock.event.create as ReturnType<typeof mock.fn>).mock.calls[0];
      const data = call.arguments[0].data;
      assert.equal(data.organizationId, "org-1");
      assert.equal(data.actorId, "user-1");
      assert.equal(data.companyId, "comp-1");
      assert.equal(data.entityType, "COMPANY");
      assert.equal(data.entityId, "comp-1");
      assert.equal(data.action, "CREATED");
      assert.equal(data.source, "user");
      assert.deepEqual(data.metadata, { name: "Acme" });
    });

    it("defaults companyId to null when not provided", async () => {
      await recordEvent({
        ctx: makeOrgContext(),
        entityType: "TASK",
        entityId: "t1",
        action: "CREATED",
      });
      const call = (prismaMock.event.create as ReturnType<typeof mock.fn>).mock.calls[0];
      assert.equal(call.arguments[0].data.companyId, null);
    });

    it("uses agent source and injects agent metadata when actor is agent", async () => {
      const ctx = makeOrgContext({
        actor: { type: "agent", conversationId: "conv-1", toolCallId: "tc-1" },
      });
      await recordEvent({
        ctx,
        entityType: "TASK",
        entityId: "t1",
        action: "UPDATED",
        metadata: { changed: "title" },
      });
      const data = (prismaMock.event.create as ReturnType<typeof mock.fn>).mock.calls[0].arguments[0].data;
      assert.equal(data.source, "agent");
      assert.equal((data.metadata as any).agentConversationId, "conv-1");
      assert.equal((data.metadata as any).agentToolCallId, "tc-1");
      assert.equal((data.metadata as any).changed, "title");
    });

    it("respects explicit source override", async () => {
      await recordEvent({
        ctx: makeOrgContext(),
        entityType: "TASK",
        entityId: "t1",
        action: "CREATED",
        source: "seed",
      });
      const data = (prismaMock.event.create as ReturnType<typeof mock.fn>).mock.calls[0].arguments[0].data;
      assert.equal(data.source, "seed");
    });
  });

  describe("listGlobalEvents", () => {
    it("scopes ADMIN queries to org and non-deleted/null companies", async () => {
      await listGlobalEvents(makeOrgContext());
      const where = (prismaMock.event.findMany as ReturnType<typeof mock.fn>).mock.calls[0].arguments[0].where;
      assert.equal(where.organizationId, "org-1");
      assert.ok(Array.isArray(where.OR));
    });

    it("restricts SALESPERSON queries to owned companies", async () => {
      await listGlobalEvents(makeOrgContext({ role: "SALESPERSON", userId: "user-2" }));
      const where = (prismaMock.event.findMany as ReturnType<typeof mock.fn>).mock.calls[0].arguments[0].where;
      assert.equal(where.company.ownerId, "user-2");
    });

    it("applies cursor filter when provided", async () => {
      await listGlobalEvents(makeOrgContext(), 50, "42");
      const where = (prismaMock.event.findMany as ReturnType<typeof mock.fn>).mock.calls[0].arguments[0].where;
      assert.deepEqual(where.sequence, { lt: 42 });
    });
  });

  describe("listCompanyEvents", () => {
    it("scopes to companyId, org, and excludes soft-deleted companies", async () => {
      await listCompanyEvents(makeOrgContext(), "comp-1");
      const where = (prismaMock.event.findMany as ReturnType<typeof mock.fn>).mock.calls[0].arguments[0].where;
      assert.equal(where.companyId, "comp-1");
      assert.equal(where.organizationId, "org-1");
      assert.deepEqual(where.company, { deletedAt: null });
    });
  });
});
