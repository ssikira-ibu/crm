import type { Middleware } from "koa";
import { jwtVerify } from "jose";
import { config } from "../config.js";
import { prisma } from "../lib/prisma.js";
import { AppError } from "./errorHandler.js";
import { upsertUser } from "../services/user.service.js";
import type { ActorInfo } from "../types/index.js";

const encodedKey = new TextEncoder().encode(config.S2S_JWT_SECRET);

// Simple in-memory cache of known UIDs to avoid upserting on every request
const knownUids = new Set<string>();

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
      actor: (payload.actor as ActorInfo) ?? null,
    };
  } catch {
    throw new AppError(401, "UNAUTHORIZED", "Invalid or expired token");
  }

  // Fire-and-forget upsert — only if not seen in this process lifetime
  const { uid, email } = ctx.state.user;
  if (!knownUids.has(uid)) {
    knownUids.add(uid);
    upsertUser(uid, email).catch(() => {
      // If it fails, remove from cache so we retry next time
      knownUids.delete(uid);
    });
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
