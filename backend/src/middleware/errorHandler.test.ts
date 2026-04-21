import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";

mock.module("../lib/logger.js", {
  namedExports: { logger: { error: mock.fn() } },
});

const { AppError, errorHandler } = await import("./errorHandler.ts");

function makeCtx(overrides = {}) {
  return {
    status: 200,
    body: undefined as unknown,
    method: "GET",
    path: "/test",
    ...overrides,
  };
}

describe("AppError", () => {
  it("stores statusCode, code, and message", () => {
    const err = new AppError(400, "BAD_REQUEST", "Invalid input");
    assert.equal(err.statusCode, 400);
    assert.equal(err.code, "BAD_REQUEST");
    assert.equal(err.message, "Invalid input");
  });

  it("stores optional details", () => {
    const details = [{ field: "name", message: "required" }];
    const err = new AppError(400, "VALIDATION_ERROR", "Bad data", details);
    assert.deepEqual(err.details, details);
  });

  it("is an instance of Error", () => {
    const err = new AppError(500, "X", "msg");
    assert.ok(err instanceof Error);
  });
});

describe("errorHandler middleware", () => {
  it("passes through when next succeeds", async () => {
    const ctx = makeCtx();
    await errorHandler(ctx as any, async () => {
      ctx.status = 200;
      ctx.body = { ok: true };
    });
    assert.equal(ctx.status, 200);
    assert.deepEqual(ctx.body, { ok: true });
  });

  it("formats AppError as structured JSON", async () => {
    const ctx = makeCtx();
    await errorHandler(ctx as any, async () => {
      throw new AppError(422, "UNPROCESSABLE", "Cannot process");
    });
    assert.equal(ctx.status, 422);
    assert.deepEqual(ctx.body, {
      error: { code: "UNPROCESSABLE", message: "Cannot process" },
    });
  });

  it("includes details in AppError response when present", async () => {
    const ctx = makeCtx();
    const details = { field: "email" };
    await errorHandler(ctx as any, async () => {
      throw new AppError(400, "VALIDATION_ERROR", "Invalid", details);
    });
    assert.deepEqual((ctx.body as any).error.details, details);
  });

  it("returns 500 for unknown errors", async () => {
    const ctx = makeCtx();
    await errorHandler(ctx as any, async () => {
      throw new Error("unexpected");
    });
    assert.equal(ctx.status, 500);
    assert.equal((ctx.body as any).error.code, "INTERNAL_ERROR");
  });

  it("does not leak error details for unknown errors", async () => {
    const ctx = makeCtx();
    await errorHandler(ctx as any, async () => {
      throw new Error("secret db connection string");
    });
    assert.equal((ctx.body as any).error.message, "An unexpected error occurred");
  });
});
