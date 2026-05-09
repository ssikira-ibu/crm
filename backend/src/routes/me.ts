import Router from "@koa/router";
import { prisma } from "../lib/prisma.js";
import type { AuthOnlyState } from "../types/index.js";

const router = new Router<AuthOnlyState>();

router.get("/me", async (ctx) => {
  const { uid, email } = ctx.state.user;

  const member = await prisma.organizationMember.findFirst({
    where: { userId: uid },
    include: {
      user: true,
      organization: {
        include: { _count: { select: { members: true } } },
      },
    },
  });

  ctx.body = {
    data: {
      uid,
      email,
      displayName: member?.user?.displayName ?? null,
      organization: member
        ? {
            id: member.organization.id,
            name: member.organization.name,
            createdAt: member.organization.createdAt.toISOString(),
            updatedAt: member.organization.updatedAt.toISOString(),
            role: member.role,
            memberCount: member.organization._count.members,
          }
        : null,
    },
  };
});

export default router;
