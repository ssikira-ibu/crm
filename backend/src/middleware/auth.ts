import type { Middleware } from "koa";
import { jwtVerify } from "jose";
import { config } from "../config.js";
import { AppError } from "./errorHandler.js";

const encodedKey = new TextEncoder().encode(config.S2S_JWT_SECRET);

export const authMiddleware: Middleware = async (ctx, next) => {
  const header = ctx.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    throw new AppError(401, "UNAUTHORIZED", "Missing or invalid authorization header");
  }

  const token = header.slice(7);
  try {
    const { payload } = await jwtVerify(token, encodedKey, {
      algorithms: ["HS256"],
    });
    ctx.state.user = {
      uid: payload.uid as string,
      email: (payload.email as string) ?? "",
    };
  } catch {
    throw new AppError(401, "UNAUTHORIZED", "Invalid or expired token");
  }

  await next();
};
