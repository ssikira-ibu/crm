import ratelimit from "koa-ratelimit";
import { Redis } from "ioredis";
import { config } from "../config.js";

// All traffic to the Koa API flows through the BFF (single IP), so IP-based
// limiting would penalize every user whenever one is active. Instead, key
// limits on the authenticated user's uid. This middleware assumes authMiddleware
// has already populated ctx.state.user; upstream (Cloudflare) handles the
// IP-level defense for unauthenticated traffic.
const memoryDb = new Map();

const driverOpts = config.REDIS_URL
  ? { driver: "redis" as const, db: new Redis(config.REDIS_URL) }
  : { driver: "memory" as const, db: memoryDb };

export const userRateLimit = ratelimit({
  ...driverOpts,
  duration: 60_000,
  max: 600,
  id: (ctx) => ctx.state.user?.uid ?? ctx.ip,
  disableHeader: false,
});
