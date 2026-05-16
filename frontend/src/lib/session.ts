import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { serverEnv } from "./env";

const encodedKey = new TextEncoder().encode(serverEnv.SESSION_SECRET);
const COOKIE_NAME = "session";
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 1 day

export type SessionPayload = {
  uid: string;
  email: string;
  displayName?: string | null;
  expiresAt: string;
};

async function encrypt(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1d")
    .sign(encodedKey);
}

async function decrypt(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, encodedKey, {
      algorithms: ["HS256"],
    });
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

async function setCookie(token: string, expiresAt: Date) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    sameSite: "strict",
    path: "/",
  });
}

export async function createSession(
  uid: string,
  email: string,
  displayName?: string | null,
) {
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const token = await encrypt({
    uid,
    email,
    displayName: displayName ?? null,
    expiresAt: expiresAt.toISOString(),
  });
  await setCookie(token, expiresAt);
}

export async function getSession(): Promise<{
  uid: string;
  email: string;
  displayName: string | null;
} | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = await decrypt(token);
  if (!payload) return null;

  const expiresAt = new Date(payload.expiresAt);
  if (expiresAt < new Date()) return null;

  return {
    uid: payload.uid,
    email: payload.email,
    displayName: payload.displayName ?? null,
  };
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
