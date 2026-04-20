import type { Middleware } from "koa";
import { logger } from "../lib/logger.js";

export const requestLogger: Middleware = async (ctx, next) => {
  const start = Date.now();
  await next();
  const duration = Date.now() - start;
  logger.info(
    { method: ctx.method, path: ctx.path, status: ctx.status, duration },
    "request",
  );
};
