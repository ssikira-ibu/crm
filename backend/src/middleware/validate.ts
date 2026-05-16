import type { Middleware } from "koa";
import { z } from "zod";
import { AppError } from "./errorHandler.js";

type Source = "body" | "query" | "params";
type ParsableSchema = { parse: (data: unknown) => unknown };

export function validate(schema: ParsableSchema, source: Source): Middleware {
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
      ctx.state[source] = parsed;
    } catch (err) {
      if (err instanceof z.ZodError) {
        throw new AppError(400, "VALIDATION_ERROR", "Invalid request data", err.issues);
      }
      throw err;
    }

    await next();
  };
}
