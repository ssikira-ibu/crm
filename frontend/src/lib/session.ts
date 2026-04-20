import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const SESSION_SECRET = process.env.SESSION_SECRET!;
const encodedKey = new TextEncoder().encode(SESSION_SECRET);
const COOKIE_NAME = "session";
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 1 day
const REFRESH_THRESHOLD_MS = SESSION_TTL_MS / 2; // refresh when < 12 hours remain

export type SessionPayload = {
  uid: string;
  email: string;
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

export async function createSession(uid: string, email: string) {
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const token = await encrypt({
    uid,
    email,
    expiresAt: expiresAt.toISOString(),
  });
  await setCookie(token, expiresAt);
}

export async function getSession(): Promise<{
  uid: string;
  email: string;
} | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = await decrypt(token);
  if (!payload) return null;

  const expiresAt = new Date(payload.expiresAt);
  if (expiresAt < new Date()) return null;

  const remaining = expiresAt.getTime() - Date.now();
  if (remaining < REFRESH_THRESHOLD_MS) {
    const newExpiresAt = new Date(Date.now() + SESSION_TTL_MS);
    const newToken = await encrypt({
      uid: payload.uid,
      email: payload.email,
      expiresAt: newExpiresAt.toISOString(),
    });
    await setCookie(newToken, newExpiresAt);
  }

  return { uid: payload.uid, email: payload.email };
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
