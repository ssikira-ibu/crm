import type { Middleware } from "koa";
import { logger } from "../lib/logger.js";

export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const errorHandler: Middleware = async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    if (err instanceof AppError) {
      ctx.status = err.status;
      ctx.body = {
        error: {
          code: err.code,
          message: err.message,
          ...(err.details ? { details: err.details } : {}),
        },
      };
      return;
    }

    logger.error(err, "Unhandled error");
    ctx.status = 500;
    ctx.body = {
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    };
  }
};
