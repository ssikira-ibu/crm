import { SignJWT } from "jose";
import { config } from "../config.js";

const encodedKey = new TextEncoder().encode(config.S2S_JWT_SECRET);

export async function createDelegatedToken(
  uid: string,
  email: string,
  conversationId?: string,
): Promise<string> {
  return new SignJWT({
    uid,
    email,
    actor: { type: "agent" as const, conversationId },
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("60s")
    .sign(encodedKey);
}
