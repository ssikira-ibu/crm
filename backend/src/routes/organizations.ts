import Router from "@koa/router";
import { prisma } from "../lib/prisma.js";
import { validate } from "../middleware/validate.js";
import { createOrganizationSchema } from "@crm/shared";
import type { AuthOnlyState } from "../types/index.js";

const router = new Router<AuthOnlyState>();

router.post("/organizations", validate(createOrganizationSchema, "body"), async (ctx) => {
  const { uid } = ctx.state.user;
  const { name } = ctx.state.body as { name: string };

  const existing = await prisma.organizationMember.findFirst({
    where: { userId: uid },
  });
  if (existing) {
    ctx.status = 409;
    ctx.body = { error: { code: "ALREADY_IN_ORG", message: "User already belongs to an organization" } };
    return;
  }

  const org = await prisma.$transaction(async (tx) => {
    const org = await tx.organization.create({
      data: {
        name,
        members: {
          create: {
            userId: uid,
            role: "ADMIN",
          },
        },
      },
      include: { _count: { select: { members: true } } },
    });

    await tx.pipeline.create({
      data: {
        organizationId: org.id,
        name: "Sales Pipeline",
        isDefault: true,
        position: 0,
        stages: {
          create: [
            { name: "Lead In", position: 0, probability: 10 },
            { name: "Qualified", position: 1, probability: 25 },
            { name: "Proposal", position: 2, probability: 50 },
            { name: "Negotiation", position: 3, probability: 75 },
            { name: "Won", position: 4, probability: 100, isWon: true },
            { name: "Lost", position: 5, probability: 0, isLost: true },
          ],
        },
      },
    });

    return org;
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
