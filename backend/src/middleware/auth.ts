import type { Middleware } from "koa";
import { auth } from "../lib/firebase.js";
import { AppError } from "./errorHandler.js";

export const authMiddleware: Middleware = async (ctx, next) => {
  const header = ctx.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    throw new AppError(401, "UNAUTHORIZED", "Missing or invalid authorization header");
  }

  const token = header.slice(7);
  try {
    const decoded = await auth.verifyIdToken(token);
    ctx.state.user = {
      uid: decoded.uid,
      email: decoded.email ?? "",
    };
  } catch {
    throw new AppError(401, "UNAUTHORIZED", "Invalid or expired token");
  }

  await next();
};
