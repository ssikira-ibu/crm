import ratelimit from "koa-ratelimit";

const db = new Map();

export const globalRateLimit = ratelimit({
  driver: "memory",
  db,
  duration: 60_000,
  max: 100,
  id: (ctx) => ctx.ip,
  disableHeader: false,
});

export const authRateLimit = ratelimit({
  driver: "memory",
  db,
  duration: 60_000,
  max: 20,
  id: (ctx) => ctx.ip,
  disableHeader: false,
});
