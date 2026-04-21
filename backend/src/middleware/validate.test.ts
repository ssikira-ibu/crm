import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { validate } from "./validate.ts";

function makeCtx(source: string, data: unknown) {
  const ctx: any = {
    state: {},
    request: { body: undefined },
    query: {},
    params: {},
  };
  if (source === "body") ctx.request.body = data;
  else if (source === "query") ctx.query = data;
  else ctx.params = data;
  return ctx;
}

describe("validate middleware", () => {
  const schema = z.object({ name: z.string(), age: z.number() });

  it("parses valid body and stores on state", async () => {
    const ctx = makeCtx("body", { name: "Alice", age: 30 });
    const middleware = validate(schema, "body");

    let called = false;
    await middleware(ctx, async () => { called = true; });

    assert.ok(called);
    assert.deepEqual(ctx.state.body, { name: "Alice", age: 30 });
  });

  it("parses valid query and stores on state", async () => {
    const ctx = makeCtx("query", { name: "Bob", age: 25 });
    const middleware = validate(schema, "query");

    await middleware(ctx, async () => {});

    assert.deepEqual(ctx.state.query, { name: "Bob", age: 25 });
  });

  it("parses valid params and stores on state", async () => {
    const ctx = makeCtx("params", { name: "Charlie", age: 40 });
    const middleware = validate(schema, "params");

    await middleware(ctx, async () => {});

    assert.deepEqual(ctx.state.params, { name: "Charlie", age: 40 });
  });

  it("throws 400 AppError on invalid data", async () => {
    const ctx = makeCtx("body", { name: 123 });
    const middleware = validate(schema, "body");

    await assert.rejects(
      () => middleware(ctx, async () => {}),
      (err: any) => {
        assert.equal(err.statusCode, 400);
        assert.equal(err.code, "VALIDATION_ERROR");
        assert.ok(Array.isArray(err.details));
        return true;
      },
    );
  });

  it("strips unknown fields via zod default behavior", async () => {
    const ctx = makeCtx("body", { name: "Alice", age: 30, extra: "field" });
    const middleware = validate(schema, "body");

    await middleware(ctx, async () => {});

    assert.equal((ctx.state.body as any).extra, undefined);
  });
});
