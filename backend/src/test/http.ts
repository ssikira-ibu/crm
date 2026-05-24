import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { SignJWT } from "jose";
import type Koa from "koa";
import { config } from "../config.js";
import { makePrismaMock } from "../test-helpers.ts";
import type { OrgRole } from "@crm/shared";

const secret = new TextEncoder().encode(config.S2S_JWT_SECRET);

export type TestServer = {
  url: string;
  close: () => Promise<void>;
};

export async function startTestServer(app: Koa): Promise<TestServer> {
  const server: Server = createServer(app.callback());
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  const port = (server.address() as AddressInfo).port;
  return {
    url: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve())),
      ),
  };
}

export type TestTokenOpts = {
  uid?: string;
  email?: string;
  displayName?: string | null;
  actor?: { type: "agent"; conversationId: string; toolCallId?: string };
  expiresIn?: string;
};

export async function signTestToken(opts: TestTokenOpts = {}): Promise<string> {
  const payload: Record<string, unknown> = {
    uid: opts.uid ?? "user-1",
    email: opts.email ?? "test@example.com",
    displayName: opts.displayName ?? null,
  };
  if (opts.actor) payload.actor = opts.actor;

  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(opts.expiresIn ?? "60s")
    .sign(secret);
}

export type MembershipOpts = {
  organizationId?: string;
  role?: OrgRole;
};

/**
 * Stubs `prisma.organizationMember.findFirst` so orgMiddleware succeeds.
 * Call before each test that hits an org-scoped route.
 */
export function mockOrgMembership(
  prismaMock: ReturnType<typeof makePrismaMock>,
  opts: MembershipOpts = {},
): void {
  prismaMock.organizationMember.findFirst = (() =>
    Promise.resolve({
      organizationId: opts.organizationId ?? "org-1",
      role: opts.role ?? "ADMIN",
    })) as any;
}

/**
 * Stubs membership lookup to behave as if the user has no org. Used to
 * exercise the 403 NO_ORG_MEMBERSHIP path.
 */
export function mockNoMembership(
  prismaMock: ReturnType<typeof makePrismaMock>,
): void {
  prismaMock.organizationMember.findFirst = (() => Promise.resolve(null)) as any;
}

export type RequestOpts = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  token?: string;
  body?: unknown;
  headers?: Record<string, string>;
};

export async function apiRequest(
  server: TestServer,
  path: string,
  opts: RequestOpts = {},
): Promise<{ status: number; body: any; headers: Headers }> {
  const headers: Record<string, string> = { ...(opts.headers ?? {}) };
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";

  const res = await fetch(`${server.url}${path}`, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  return { status: res.status, body, headers: res.headers };
}
