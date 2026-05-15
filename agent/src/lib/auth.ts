import { SignJWT } from "jose";
import { config } from "../config.js";

const encodedKey = new TextEncoder().encode(config.S2S_JWT_SECRET);

export async function createDelegatedToken(
  uid: string,
  email: string,
  conversationId?: string,
): Promise<string> {
  const payload: Record<string, unknown> = {
    uid,
    email,
  };
  if (conversationId) {
    payload.actor = { type: "agent", conversationId };
  }

  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("60s")
    .sign(encodedKey);
}
