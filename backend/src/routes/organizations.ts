import Router from "@koa/router";
import { prisma } from "../lib/prisma.js";
import { validate } from "../middleware/validate.js";
import { createOrganizationSchema } from "@crm/shared";
import type { AuthOnlyState } from "../types/index.js";

const router = new Router<AuthOnlyState>();

router.post("/organizations", validate(createOrganizationSchema, "body"), async (ctx) => {
  const { uid, email } = ctx.state.user;
  const { name } = ctx.state.body as { name: string };

  const existing = await prisma.organizationMember.findFirst({
    where: { userId: uid },
  });
  if (existing) {
    ctx.status = 409;
    ctx.body = { error: { code: "ALREADY_IN_ORG", message: "User already belongs to an organization" } };
    return;
  }

  const org = await prisma.organization.create({
    data: {
      name,
      members: {
        create: {
          userId: uid,
          email,
          role: "ADMIN",
        },
      },
    },
    include: { _count: { select: { members: true } } },
  });

  ctx.status = 201;
  ctx.body = {
    data: {
      id: org.id,
      name: org.name,
      createdAt: org.createdAt.toISOString(),
      updatedAt: org.updatedAt.toISOString(),
      role: "ADMIN",
      memberCount: org._count.members,
    },
  };
});

export default router;
