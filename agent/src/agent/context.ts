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

/**
 * Tiny insertion-ordered LRU. Sized for ~thousand active users — context is
 * cheap to rebuild (one /me + one /pipelines call), so we don't need anything
 * larger.
 */
class LRU<K, V> {
  private readonly max: number;
  private readonly ttlMs: number;
  private readonly map = new Map<K, { value: V; expiresAt: number }>();

  constructor(max: number, ttlMs: number) {
    this.max = max;
    this.ttlMs = ttlMs;
  }

  get(key: K): V | undefined {
    const entry = this.map.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.map.delete(key);
      return undefined;
    }
    // Refresh insertion order — most-recently-used.
    this.map.delete(key);
    this.map.set(key, entry);
    return entry.value;
  }

  set(key: K, value: V): void {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, { value, expiresAt: Date.now() + this.ttlMs });
    while (this.map.size > this.max) {
      const oldest = this.map.keys().next().value;
      if (oldest === undefined) break;
      this.map.delete(oldest);
    }
  }
}

const contextCache = new LRU<string, AgentContext>(1000, 5 * 60 * 1000);

export async function buildAgentContext(
  uid: string,
  email: string,
  client: BackendClient,
): Promise<AgentContext> {
  // The user's org membership is part of the cache key — if a user is in
  // multiple orgs (today they can't be, but the schema allows it), we want
  // to scope by both. /me only returns one membership today, so this is
  // effectively keyed on uid.
  const cached = contextCache.get(uid);
  if (cached) return cached;

  const [meRes, pipelinesRes] = await Promise.all([
    client.getMe() as Promise<{
      data: {
        uid: string;
        email: string;
        displayName: string | null;
        organization: { id: string; name: string; role: string } | null;
      };
    }>,
    client.listPipelines() as Promise<{
      data: Array<{
        id: string;
        name: string;
        isDefault: boolean;
        stages?: Array<{
          id: string;
          name: string;
          position: number;
          probability: number;
          isWon: boolean;
          isLost: boolean;
        }>;
      }>;
    }>,
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

  contextCache.set(uid, ctx);
  logger.debug({ uid, org: ctx.orgName }, "built agent context");
  return ctx;
}
