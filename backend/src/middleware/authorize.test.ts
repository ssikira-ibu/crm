import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { requireRole } from "./authorize.ts";

function makeCtx(role: string) {
  return {
    state: { user: { role } },
  };
}

describe("requireRole middleware", () => {
  it("calls next when user has required role", async () => {
    const middleware = requireRole("ADMIN");
    let called = false;
    await middleware(makeCtx("ADMIN") as any, async () => { called = true; });
    assert.ok(called);
  });

  it("calls next when user has one of multiple allowed roles", async () => {
    const middleware = requireRole("ADMIN", "MANAGER");
    let called = false;
    await middleware(makeCtx("MANAGER") as any, async () => { called = true; });
    assert.ok(called);
  });

  it("throws 403 when user role is not allowed", async () => {
    const middleware = requireRole("ADMIN");
    await assert.rejects(
      () => middleware(makeCtx("SALESPERSON") as any, async () => {}),
      (err: any) => {
        assert.equal(err.statusCode, 403);
        assert.equal(err.code, "FORBIDDEN");
        return true;
      },
    );
  });

  it("throws 403 for SALESPERSON when only ADMIN and MANAGER allowed", async () => {
    const middleware = requireRole("ADMIN", "MANAGER");
    await assert.rejects(
      () => middleware(makeCtx("SALESPERSON") as any, async () => {}),
      (err: any) => {
        assert.equal(err.statusCode, 403);
        return true;
      },
    );
  });
});
