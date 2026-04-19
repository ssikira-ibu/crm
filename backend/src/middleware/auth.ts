import type { Middleware } from "koa";
import { jwtVerify } from "jose";
import { config } from "../config.js";
import { prisma } from "../lib/prisma.js";
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

export const orgMiddleware: Middleware = async (ctx, next) => {
  const { uid } = ctx.state.user;

  const member = await prisma.organizationMember.findFirst({
    where: { userId: uid },
    select: { organizationId: true, role: true },
  });

  if (!member) {
    throw new AppError(403, "NO_ORG_MEMBERSHIP", "User is not a member of any organization");
  }

  ctx.state.user.organizationId = member.organizationId;
  ctx.state.user.role = member.role;

  await next();
};
