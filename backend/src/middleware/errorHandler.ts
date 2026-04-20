import type { Middleware } from "koa";
import { logger } from "../lib/logger.js";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export const errorHandler: Middleware = async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    if (err instanceof AppError) {
      ctx.status = err.statusCode;
      ctx.body = {
        error: {
          code: err.code,
          message: err.message,
          ...(err.details ? { details: err.details } : {}),
        },
      };
    } else {
      logger.error({ err, method: ctx.method, path: ctx.path }, "Unhandled error");
      ctx.status = 500;
      ctx.body = {
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
        },
      };
    }
  }
};
