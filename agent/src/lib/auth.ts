import { SignJWT } from "jose";
import { config } from "../config.js";

const encodedKey = new TextEncoder().encode(config.S2S_JWT_SECRET);

/**
 * Mint a short-lived S2S JWT for a backend call made on behalf of `uid`.
 *
 * Every token minted by the agent service carries an `actor.type = "agent"`
 * claim, even when no specific conversation is in scope (e.g. when listing
 * conversations or bootstrapping context). The backend uses this claim to
 * (a) record the agent as the actor in the event log, and (b) reject
 * agent-originated calls on endpoints that only a human user should hit.
 */
export async function createDelegatedToken(
  uid: string,
  email: string,
  conversationId?: string,
): Promise<string> {
  const actor: Record<string, unknown> = { type: "agent" };
  if (conversationId) actor.conversationId = conversationId;

  return new SignJWT({ uid, email, actor })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("60s")
    .sign(encodedKey);
}
