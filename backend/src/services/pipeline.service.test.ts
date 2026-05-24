import { describe, it, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { makeOrgContext, makePrismaMock } from "../test-helpers.ts";

const prismaMock = makePrismaMock();

mock.module("../lib/prisma.js", { namedExports: { prisma: prismaMock } });

const {
  listPipelines,
  getPipeline,
  createPipeline,
  updatePipeline,
  deletePipeline,
  createStage,
  updateStage,
  deleteStage,
} = await import("./pipeline.service.ts");

describe("pipeline.service", () => {
  beforeEach(() => {
    prismaMock.pipeline.findMany = mock.fn(() => Promise.resolve([]));
    prismaMock.pipeline.findFirst = mock.fn(() => Promise.resolve(null));
    prismaMock.pipeline.create = mock.fn(() => Promise.resolve({}));
    prismaMock.pipeline.update = mock.fn(() => Promise.resolve({}));
    prismaMock.pipeline.updateMany = mock.fn(() => Promise.resolve({ count: 0 }));
    prismaMock.pipeline.delete = mock.fn(() => Promise.resolve({}));
    prismaMock.pipelineStage.findFirst = mock.fn(() => Promise.resolve(null));
    prismaMock.pipelineStage.create = mock.fn(() => Promise.resolve({}));
    prismaMock.pipelineStage.update = mock.fn(() => Promise.resolve({}));
    prismaMock.pipelineStage.delete = mock.fn(() => Promise.resolve({}));
    prismaMock.deal.count = mock.fn(() => Promise.resolve(0));
  });

  describe("listPipelines", () => {
    it("scopes to organizationId and filters soft-deleted stages", async () => {
      await listPipelines(makeOrgContext());
      const call = (prismaMock.pipeline.findMany as ReturnType<typeof mock.fn>).mock.calls[0];
      assert.equal(call.arguments[0].where.organizationId, "org-1");
      assert.deepEqual(call.arguments[0].include.stages.where, { deletedAt: null });
    });
  });

  describe("getPipeline", () => {
    it("throws 404 when not found", async () => {
      await assert.rejects(
        () => getPipeline(makeOrgContext(), "missing"),
        (err: any) => {
          assert.equal(err.statusCode, 404);
          assert.equal(err.code, "PIPELINE_NOT_FOUND");
          return true;
        },
      );
    });
  });

  describe("createPipeline", () => {
    it("creates without resetting defaults when isDefault=false", async () => {
      prismaMock.pipeline.create = mock.fn(() => Promise.resolve({ id: "p1" }));
      await createPipeline(makeOrgContext(), {
        name: "Sales",
        position: 0,
        isDefault: false,
      } as any);
      assert.equal((prismaMock.pipeline.updateMany as ReturnType<typeof mock.fn>).mock.callCount(), 0);
    });

    it("clears existing default when isDefault=true", async () => {
      prismaMock.pipeline.create = mock.fn(() => Promise.resolve({ id: "p1" }));
      await createPipeline(makeOrgContext(), {
        name: "Sales",
        position: 0,
        isDefault: true,
      } as any);
      const call = (prismaMock.pipeline.updateMany as ReturnType<typeof mock.fn>).mock.calls[0];
      assert.equal(call.arguments[0].where.organizationId, "org-1");
      assert.equal(call.arguments[0].where.isDefault, true);
      assert.equal(call.arguments[0].data.isDefault, false);
    });
  });

  describe("updatePipeline", () => {
    it("throws 404 when not found", async () => {
      await assert.rejects(
        () => updatePipeline(makeOrgContext(), "missing", { name: "X" } as any),
        (err: any) => {
          assert.equal(err.statusCode, 404);
          return true;
        },
      );
    });

    it("clears other defaults when promoting to default", async () => {
      prismaMock.pipeline.findFirst = mock.fn(() => Promise.resolve({ id: "p1" }));
      prismaMock.pipeline.update = mock.fn(() => Promise.resolve({ id: "p1" }));
      await updatePipeline(makeOrgContext(), "p1", { isDefault: true } as any);
      assert.equal((prismaMock.pipeline.updateMany as ReturnType<typeof mock.fn>).mock.callCount(), 1);
    });
  });

  describe("deletePipeline", () => {
    it("throws 404 when not found", async () => {
      await assert.rejects(
        () => deletePipeline(makeOrgContext(), "missing"),
        (err: any) => {
          assert.equal(err.statusCode, 404);
          return true;
        },
      );
    });
  });

  describe("createStage", () => {
    it("throws 404 when pipeline not found", async () => {
      await assert.rejects(
        () => createStage(makeOrgContext(), "missing", { name: "S" } as any),
        (err: any) => {
          assert.equal(err.statusCode, 404);
          return true;
        },
      );
    });

    it("creates stage scoped to pipelineId", async () => {
      prismaMock.pipeline.findFirst = mock.fn(() => Promise.resolve({ id: "p1" }));
      prismaMock.pipelineStage.create = mock.fn(() => Promise.resolve({ id: "s1" }));
      await createStage(makeOrgContext(), "p1", { name: "S", position: 0 } as any);
      const call = (prismaMock.pipelineStage.create as ReturnType<typeof mock.fn>).mock.calls[0];
      assert.equal(call.arguments[0].data.pipelineId, "p1");
    });
  });

  describe("updateStage", () => {
    it("throws 404 when pipeline missing", async () => {
      await assert.rejects(
        () => updateStage(makeOrgContext(), "missing", "s1", { name: "X" } as any),
        (err: any) => {
          assert.equal(err.statusCode, 404);
          assert.equal(err.code, "PIPELINE_NOT_FOUND");
          return true;
        },
      );
    });

    it("throws 404 when stage missing", async () => {
      prismaMock.pipeline.findFirst = mock.fn(() => Promise.resolve({ id: "p1" }));
      await assert.rejects(
        () => updateStage(makeOrgContext(), "p1", "missing", { name: "X" } as any),
        (err: any) => {
          assert.equal(err.statusCode, 404);
          assert.equal(err.code, "STAGE_NOT_FOUND");
          return true;
        },
      );
    });

    it("rejects stages marked both won and lost", async () => {
      prismaMock.pipeline.findFirst = mock.fn(() => Promise.resolve({ id: "p1" }));
      prismaMock.pipelineStage.findFirst = mock.fn(() => Promise.resolve({ id: "s1" }));
      await assert.rejects(
        () => updateStage(makeOrgContext(), "p1", "s1", { isWon: true, isLost: true } as any),
        (err: any) => {
          assert.equal(err.statusCode, 400);
          assert.equal(err.code, "INVALID_STAGE_TYPE");
          return true;
        },
      );
    });
  });

  describe("deleteStage", () => {
    it("rejects deletion when stage has active deals", async () => {
      prismaMock.pipeline.findFirst = mock.fn(() => Promise.resolve({ id: "p1" }));
      prismaMock.pipelineStage.findFirst = mock.fn(() => Promise.resolve({ id: "s1" }));
      prismaMock.deal.count = mock.fn(() => Promise.resolve(3));
      await assert.rejects(
        () => deleteStage(makeOrgContext(), "p1", "s1"),
        (err: any) => {
          assert.equal(err.statusCode, 409);
          assert.equal(err.code, "STAGE_HAS_DEALS");
          return true;
        },
      );
      assert.equal((prismaMock.pipelineStage.delete as ReturnType<typeof mock.fn>).mock.callCount(), 0);
    });

    it("deletes when no deals remain", async () => {
      prismaMock.pipeline.findFirst = mock.fn(() => Promise.resolve({ id: "p1" }));
      prismaMock.pipelineStage.findFirst = mock.fn(() => Promise.resolve({ id: "s1" }));
      prismaMock.deal.count = mock.fn(() => Promise.resolve(0));
      await deleteStage(makeOrgContext(), "p1", "s1");
      assert.equal((prismaMock.pipelineStage.delete as ReturnType<typeof mock.fn>).mock.callCount(), 1);
    });
  });
});
