import Router from "@koa/router";
import { prisma } from "../lib/prisma.js";
import { validate } from "../middleware/validate.js";
import { requireRole } from "../middleware/authorize.js";
import { createInviteSchema, updateMemberRoleSchema } from "@crm/shared";
import type { AppState } from "../types/index.js";
import { AppError } from "../middleware/errorHandler.js";

const router = new Router<AppState>();

router.get("/organization/members", async (ctx) => {
  const members = await prisma.organizationMember.findMany({
    where: { organizationId: ctx.state.user.organizationId },
    orderBy: { createdAt: "asc" },
  });
  ctx.body = { data: members };
});

router.patch(
  "/organization/members/:memberId",
  requireRole("ADMIN"),
  validate(updateMemberRoleSchema, "body"),
  async (ctx) => {
    const { memberId } = ctx.params;
    const { role } = ctx.state.body as { role: string };
    const { organizationId } = ctx.state.user;

    const member = await prisma.organizationMember.findFirst({
      where: { id: memberId, organizationId },
    });
    if (!member) {
      throw new AppError(404, "MEMBER_NOT_FOUND", "Member not found");
    }

    if (member.role === "ADMIN" && role !== "ADMIN") {
      const adminCount = await prisma.organizationMember.count({
        where: { organizationId, role: "ADMIN" },
      });
      if (adminCount <= 1) {
        throw new AppError(400, "LAST_ADMIN", "Cannot demote the last admin");
      }
    }

    const updated = await prisma.organizationMember.update({
      where: { id: memberId },
      data: { role: role as "ADMIN" | "MANAGER" | "SALESPERSON" },
    });
    ctx.body = { data: updated };
  },
);

router.delete(
  "/organization/members/:memberId",
  requireRole("ADMIN"),
  async (ctx) => {
    const { memberId } = ctx.params;
    const { organizationId, uid: userId } = ctx.state.user;

    const member = await prisma.organizationMember.findFirst({
      where: { id: memberId, organizationId },
    });
    if (!member) {
      throw new AppError(404, "MEMBER_NOT_FOUND", "Member not found");
    }
    if (member.userId === userId) {
      throw new AppError(400, "CANNOT_REMOVE_SELF", "Cannot remove yourself");
    }

    await prisma.organizationMember.delete({ where: { id: memberId } });
    ctx.status = 204;
  },
);

router.get("/organization/invites", requireRole("ADMIN"), async (ctx) => {
  const invites = await prisma.invite.findMany({
    where: { organizationId: ctx.state.user.organizationId, status: "PENDING" },
    orderBy: { createdAt: "desc" },
  });
  ctx.body = { data: invites };
});

router.post(
  "/organization/invites",
  requireRole("ADMIN"),
  validate(createInviteSchema, "body"),
  async (ctx) => {
    const { email, role } = ctx.state.body as { email: string; role: string };
    const { organizationId, uid: userId } = ctx.state.user;

    const existingMember = await prisma.organizationMember.findFirst({
      where: { organizationId, email },
    });
    if (existingMember) {
      throw new AppError(409, "ALREADY_MEMBER", "This email is already a member");
    }

    const existingInvite = await prisma.invite.findFirst({
      where: { organizationId, email, status: "PENDING" },
    });
    if (existingInvite) {
      throw new AppError(409, "ALREADY_INVITED", "An invite for this email is already pending");
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invite = await prisma.invite.create({
      data: {
        organizationId,
        email,
        role: role as "ADMIN" | "MANAGER" | "SALESPERSON",
        invitedBy: userId,
        expiresAt,
      },
    });
    ctx.status = 201;
    ctx.body = { data: invite };
  },
);

router.delete(
  "/organization/invites/:inviteId",
  requireRole("ADMIN"),
  async (ctx) => {
    const { inviteId } = ctx.params;
    const { organizationId } = ctx.state.user;

    const invite = await prisma.invite.findFirst({
      where: { id: inviteId, organizationId, status: "PENDING" },
    });
    if (!invite) {
      throw new AppError(404, "INVITE_NOT_FOUND", "Invite not found");
    }

    await prisma.invite.update({
      where: { id: inviteId },
      data: { status: "REVOKED" },
    });
    ctx.status = 204;
  },
);

export default router;
