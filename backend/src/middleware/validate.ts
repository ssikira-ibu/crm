import type { Middleware } from "koa";
import { ZodSchema, ZodError } from "zod";
import { AppError } from "./errorHandler.js";

type Source = "body" | "query" | "params";

export function validate(schema: ZodSchema, source: Source): Middleware {
  return async (ctx, next) => {
    let data: unknown;
    if (source === "body") {
      data = ctx.request.body;
    } else if (source === "query") {
      data = ctx.query;
    } else {
      data = ctx.params;
    }

    try {
      const parsed = schema.parse(data);
      if (source === "body") {
        ctx.request.body = parsed;
      } else if (source === "query") {
        ctx.state.query = parsed;
      } else {
        ctx.state.params = parsed;
      }
    } catch (err) {
      if (err instanceof ZodError) {
        throw new AppError(400, "VALIDATION_ERROR", "Invalid request data", err.issues);
      }
      throw err;
    }

    await next();
  };
}
