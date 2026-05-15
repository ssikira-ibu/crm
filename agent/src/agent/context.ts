import type { BackendClient } from "../lib/backend-client.js";
import { logger } from "../lib/logger.js";

export interface AgentContext {
  uid: string;
  email: string;
  userName: string;
  userRole: string;
  orgName: string;
  organizationId: string;
  pipelines: Array<{
    id: string;
    name: string;
    isDefault: boolean;
    stages: Array<{
      id: string;
      name: string;
      position: number;
      probability: number;
      isWon: boolean;
      isLost: boolean;
    }>;
  }>;
}

const contextCache = new Map<string, { ctx: AgentContext; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function buildAgentContext(
  uid: string,
  email: string,
  client: BackendClient,
): Promise<AgentContext> {
  const cached = contextCache.get(uid);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.ctx;
  }

  const [meRes, pipelinesRes] = await Promise.all([
    client.getMe() as Promise<{ data: { uid: string; email: string; displayName: string | null; organization: { id: string; name: string; role: string } | null } }>,
    client.listPipelines() as Promise<{ data: Array<{ id: string; name: string; isDefault: boolean; stages?: Array<{ id: string; name: string; position: number; probability: number; isWon: boolean; isLost: boolean }> }> }>,
  ]);

  const me = meRes.data;
  const pipelines = pipelinesRes.data;

  if (!me.organization) {
    throw new Error("User has no organization");
  }

  const ctx: AgentContext = {
    uid: me.uid,
    email: me.email,
    userName: me.displayName ?? me.email,
    userRole: me.organization.role,
    orgName: me.organization.name,
    organizationId: me.organization.id,
    pipelines: pipelines.map((p) => ({
      id: p.id,
      name: p.name,
      isDefault: p.isDefault,
      stages: (p.stages ?? [])
        .sort((a, b) => a.position - b.position)
        .map((s) => ({
          id: s.id,
          name: s.name,
          position: s.position,
          probability: s.probability,
          isWon: s.isWon,
          isLost: s.isLost,
        })),
    })),
  };

  contextCache.set(uid, { ctx, expiresAt: Date.now() + CACHE_TTL_MS });
  logger.debug({ uid, org: ctx.orgName }, "Built agent context");

  return ctx;
}
