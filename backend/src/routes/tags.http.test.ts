import { describe, it, mock, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { makePrismaMock } from "../test-helpers.ts";
import {
  startTestServer,
  signTestToken,
  mockOrgMembership,
  mockNoMembership,
  apiRequest,
  type TestServer,
} from "../test/http.ts";

const prismaMock = makePrismaMock();

mock.module("../lib/prisma.js", { namedExports: { prisma: prismaMock } });

const { default: app } = await import("../app.ts");

let server: TestServer;
let token: string;

before(async () => {
  server = await startTestServer(app);
  token = await signTestToken();
});

after(async () => {
  await server.close();
});

beforeEach(() => {
  // Reset every model method we touch in this file
  prismaMock.tag.findMany = mock.fn(() => Promise.resolve([]));
  prismaMock.tag.findFirst = mock.fn(() => Promise.resolve(null));
  prismaMock.tag.create = mock.fn(() => Promise.resolve({}));
  prismaMock.tag.update = mock.fn(() => Promise.resolve({}));
  prismaMock.tag.delete = mock.fn(() => Promise.resolve({}));
  prismaMock.company.findFirst = mock.fn(() => Promise.resolve(null));
  prismaMock.companyTag.upsert = mock.fn(() => Promise.resolve({}));
  prismaMock.companyTag.deleteMany = mock.fn(() => Promise.resolve({ count: 0 }));
  prismaMock.event.create = mock.fn(() => Promise.resolve({}));
  prismaMock.user.upsert = mock.fn(() => Promise.resolve({}));
  mockOrgMembership(prismaMock);
});

describe("tags routes — auth & org membership", () => {
  it("401s with no Authorization header", async () => {
    const res = await apiRequest(server, "/api/tags");
    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, "UNAUTHORIZED");
  });

  it("401s with a malformed token", async () => {
    const res = await apiRequest(server, "/api/tags", { token: "not-a-jwt" });
    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, "UNAUTHORIZED");
  });

  it("401s with an expired token", async () => {
    const expired = await signTestToken({ expiresIn: "-10s" });
    const res = await apiRequest(server, "/api/tags", { token: expired });
    assert.equal(res.status, 401);
  });

  it("403s when the user has no organization membership", async () => {
    mockNoMembership(prismaMock);
    const res = await apiRequest(server, "/api/tags", { token });
    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, "NO_ORG_MEMBERSHIP");
  });
});

describe("GET /api/tags", () => {
  it("returns tags wrapped in { data }", async () => {
    prismaMock.tag.findMany = mock.fn(() =>
      Promise.resolve([{ id: "tg1", name: "VIP", color: null }]),
    );
    const res = await apiRequest(server, "/api/tags", { token });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.length, 1);
    assert.equal(res.body.data[0].name, "VIP");
  });

  it("scopes prisma query to the caller's organization", async () => {
    await apiRequest(server, "/api/tags", { token });
    const call = (prismaMock.tag.findMany as ReturnType<typeof mock.fn>).mock.calls[0];
    assert.equal(call.arguments[0].where.organizationId, "org-1");
  });
});

describe("POST /api/tags", () => {
  it("creates a tag and returns 201", async () => {
    prismaMock.tag.create = mock.fn(() =>
      Promise.resolve({ id: "tg1", name: "VIP", color: "#ff0000" }),
    );
    const res = await apiRequest(server, "/api/tags", {
      method: "POST",
      token,
      body: { name: "VIP", color: "#ff0000" },
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.name, "VIP");
  });

  it("400s on a body that fails schema validation", async () => {
    const res = await apiRequest(server, "/api/tags", {
      method: "POST",
      token,
      body: { name: 123 },
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, "VALIDATION_ERROR");
  });

  it("400s when the request body is missing", async () => {
    const res = await apiRequest(server, "/api/tags", {
      method: "POST",
      token,
    });
    assert.equal(res.status, 400);
  });
});

describe("PATCH /api/tags/:tagId", () => {
  it("404s when the tag does not exist", async () => {
    prismaMock.tag.findFirst = mock.fn(() => Promise.resolve(null));
    const res = await apiRequest(server, "/api/tags/missing", {
      method: "PATCH",
      token,
      body: { name: "X" },
    });
    assert.equal(res.status, 404);
    assert.equal(res.body.error.code, "TAG_NOT_FOUND");
  });

  it("updates and returns the tag", async () => {
    prismaMock.tag.findFirst = mock.fn(() => Promise.resolve({ id: "tg1" }));
    prismaMock.tag.update = mock.fn(() =>
      Promise.resolve({ id: "tg1", name: "Renamed" }),
    );
    const res = await apiRequest(server, "/api/tags/tg1", {
      method: "PATCH",
      token,
      body: { name: "Renamed" },
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.name, "Renamed");
  });
});

describe("DELETE /api/tags/:tagId", () => {
  it("returns 204 on success", async () => {
    prismaMock.tag.findFirst = mock.fn(() => Promise.resolve({ id: "tg1" }));
    const res = await apiRequest(server, "/api/tags/tg1", {
      method: "DELETE",
      token,
    });
    assert.equal(res.status, 204);
  });

  it("404s when the tag does not exist", async () => {
    const res = await apiRequest(server, "/api/tags/missing", {
      method: "DELETE",
      token,
    });
    assert.equal(res.status, 404);
  });
});

describe("PUT /api/companies/:companyId/tags/:tagId — attach", () => {
  it("204s and writes a TAGGED event when company and tag exist", async () => {
    prismaMock.company.findFirst = mock.fn(() => Promise.resolve({ id: "comp-1" }));
    prismaMock.tag.findFirst = mock.fn(() =>
      Promise.resolve({ id: "tg1", name: "VIP", color: null }),
    );
    const res = await apiRequest(server, "/api/companies/comp-1/tags/tg1", {
      method: "PUT",
      token,
    });
    assert.equal(res.status, 204);
    assert.equal((prismaMock.companyTag.upsert as ReturnType<typeof mock.fn>).mock.callCount(), 1);
    assert.equal((prismaMock.event.create as ReturnType<typeof mock.fn>).mock.callCount(), 1);
    const event = (prismaMock.event.create as ReturnType<typeof mock.fn>).mock.calls[0].arguments[0].data;
    assert.equal(event.action, "TAGGED");
    assert.equal(event.entityType, "TAG");
  });

  it("404s when the company is not accessible", async () => {
    prismaMock.company.findFirst = mock.fn(() => Promise.resolve(null));
    const res = await apiRequest(server, "/api/companies/comp-x/tags/tg1", {
      method: "PUT",
      token,
    });
    assert.equal(res.status, 404);
  });

  it("403s when an agent caller has no toolCallId (approval gate)", async () => {
    prismaMock.company.findFirst = mock.fn(() => Promise.resolve({ id: "comp-1" }));
    prismaMock.tag.findFirst = mock.fn(() => Promise.resolve({ id: "tg1", name: "VIP" }));
    const agentToken = await signTestToken({
      actor: { type: "agent", conversationId: "conv-1" },
    });
    const res = await apiRequest(server, "/api/companies/comp-1/tags/tg1", {
      method: "PUT",
      token: agentToken,
    });
    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, "AGENT_APPROVAL_REQUIRED");
    assert.equal((prismaMock.companyTag.upsert as ReturnType<typeof mock.fn>).mock.callCount(), 0);
  });
});

describe("role policy for tag mutations", () => {
  it("SALESPERSON can create a tag", async () => {
    mockOrgMembership(prismaMock, { role: "SALESPERSON" });
    prismaMock.tag.create = mock.fn(() =>
      Promise.resolve({ id: "tg1", name: "Lead" }),
    );
    const res = await apiRequest(server, "/api/tags", {
      method: "POST",
      token,
      body: { name: "Lead" },
    });
    assert.equal(res.status, 201);
  });

  it("SALESPERSON cannot rename a tag (403)", async () => {
    mockOrgMembership(prismaMock, { role: "SALESPERSON" });
    const res = await apiRequest(server, "/api/tags/tg1", {
      method: "PATCH",
      token,
      body: { name: "Renamed" },
    });
    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, "FORBIDDEN");
    assert.equal((prismaMock.tag.update as ReturnType<typeof mock.fn>).mock.callCount(), 0);
  });

  it("SALESPERSON cannot delete a tag (403)", async () => {
    mockOrgMembership(prismaMock, { role: "SALESPERSON" });
    const res = await apiRequest(server, "/api/tags/tg1", {
      method: "DELETE",
      token,
    });
    assert.equal(res.status, 403);
    assert.equal((prismaMock.tag.delete as ReturnType<typeof mock.fn>).mock.callCount(), 0);
  });

  it("MANAGER can rename a tag", async () => {
    mockOrgMembership(prismaMock, { role: "MANAGER" });
    prismaMock.tag.findFirst = mock.fn(() => Promise.resolve({ id: "tg1" }));
    prismaMock.tag.update = mock.fn(() =>
      Promise.resolve({ id: "tg1", name: "Renamed" }),
    );
    const res = await apiRequest(server, "/api/tags/tg1", {
      method: "PATCH",
      token,
      body: { name: "Renamed" },
    });
    assert.equal(res.status, 200);
  });
});

describe("DELETE /api/companies/:companyId/tags/:tagId — detach", () => {
  it("204s and writes an UNTAGGED event", async () => {
    prismaMock.company.findFirst = mock.fn(() => Promise.resolve({ id: "comp-1" }));
    prismaMock.tag.findFirst = mock.fn(() =>
      Promise.resolve({ id: "tg1", name: "VIP" }),
    );
    const res = await apiRequest(server, "/api/companies/comp-1/tags/tg1", {
      method: "DELETE",
      token,
    });
    assert.equal(res.status, 204);
    assert.equal((prismaMock.companyTag.deleteMany as ReturnType<typeof mock.fn>).mock.callCount(), 1);
    const event = (prismaMock.event.create as ReturnType<typeof mock.fn>).mock.calls[0].arguments[0].data;
    assert.equal(event.action, "UNTAGGED");
  });
});
