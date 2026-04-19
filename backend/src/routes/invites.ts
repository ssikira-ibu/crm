import Router from "@koa/router";
import { prisma } from "../lib/prisma.js";
import type { AuthOnlyState } from "../types/index.js";

const router = new Router<AuthOnlyState>();

router.get("/invites/token/:token", async (ctx) => {
  const invite = await prisma.invite.findUnique({
    where: { token: ctx.params.token },
    include: { organization: { select: { id: true, name: true } } },
  });

  if (!invite || invite.status !== "PENDING" || invite.expiresAt < new Date()) {
    ctx.status = 404;
    ctx.body = { error: { code: "INVITE_NOT_FOUND", message: "Invite not found or expired" } };
    return;
  }

  ctx.body = {
    data: {
      id: invite.id,
      email: invite.email,
      role: invite.role,
      organization: invite.organization,
      expiresAt: invite.expiresAt.toISOString(),
    },
  };
});

router.post("/invites/token/:token/accept", async (ctx) => {
  const { uid, email } = ctx.state.user;

  const invite = await prisma.invite.findUnique({
    where: { token: ctx.params.token },
  });

  if (!invite || invite.status !== "PENDING" || invite.expiresAt < new Date()) {
    ctx.status = 404;
    ctx.body = { error: { code: "INVITE_NOT_FOUND", message: "Invite not found or expired" } };
    return;
  }

  const existing = await prisma.organizationMember.findFirst({
    where: { userId: uid },
  });
  if (existing) {
    ctx.status = 409;
    ctx.body = { error: { code: "ALREADY_IN_ORG", message: "User already belongs to an organization" } };
    return;
  }

  await prisma.$transaction([
    prisma.organizationMember.create({
      data: {
        organizationId: invite.organizationId,
        userId: uid,
        email,
        role: invite.role,
      },
    }),
    prisma.invite.update({
      where: { id: invite.id },
      data: { status: "ACCEPTED" },
    }),
  ]);

  ctx.body = { data: { organizationId: invite.organizationId } };
});

export default router;
