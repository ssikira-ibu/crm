import { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import type { OrgContext } from "@crm/shared";

export async function getDashboard(ctx: OrgContext) {
  const companyWhere: Prisma.CompanyWhereInput = {
    organizationId: ctx.organizationId,
  };
  if (ctx.role === "SALESPERSON") {
    companyWhere.ownerId = ctx.userId;
  }

  const companyIds = await prisma.company.findMany({
    where: companyWhere,
    select: { id: true },
  });
  const ids = companyIds.map((c) => c.id);

  const [tasks, recentNotes, recentActivities, deals, statusCounts, dealAgg] =
    await Promise.all([
      prisma.task.findMany({
        where: {
          organizationId: ctx.organizationId,
          status: { not: "DONE" },
          ...(ctx.role === "SALESPERSON"
            ? {
                OR: [
                  { companyId: { in: ids } },
                  { companyId: null, assigneeId: ctx.userId },
                  { companyId: null, createdById: ctx.userId },
                ],
              }
            : {}),
        },
        include: {
          company: {
            select: { id: true, name: true, status: true },
          },
        },
        orderBy: { dueDate: "asc" },
        take: 50,
      }),
      prisma.note.findMany({
        where: { companyId: { in: ids } },
        include: {
          company: { select: { id: true, name: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: 10,
      }),
      prisma.activity.findMany({
        where: { companyId: { in: ids } },
        include: {
          company: { select: { id: true, name: true } },
        },
        orderBy: { date: "desc" },
        take: 10,
      }),
      prisma.deal.findMany({
        where: { companyId: { in: ids } },
        include: {
          stage: true,
          company: {
            select: { id: true, name: true, status: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.company.groupBy({
        by: ["status"],
        where: companyWhere,
        _count: { _all: true },
      }),
      prisma.deal.aggregate({
        where: {
          companyId: { in: ids },
          stage: { isWon: false, isLost: false },
        },
        _sum: { value: true },
        _count: true,
      }),
    ]);

  const stats = {
    total: statusCounts.reduce((sum, s) => sum + s._count._all, 0),
    byStatus: Object.fromEntries(
      statusCounts.map((s) => [s.status, s._count._all]),
    ),
    openDealsValue: Number(dealAgg._sum.value ?? 0),
    openDealsCount: dealAgg._count,
  };

  return { tasks, recentNotes, recentActivities, deals, stats };
}
