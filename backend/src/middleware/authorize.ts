import type { Middleware } from "koa";
import type { OrgRole } from "@crm/shared";
import { AppError } from "./errorHandler.js";

export function requireRole(...roles: OrgRole[]): Middleware {
  return async (ctx, next) => {
    const { role } = ctx.state.user;
    if (!roles.includes(role)) {
      throw new AppError(403, "FORBIDDEN", "You do not have permission to perform this action");
    }
    await next();
  };
}
