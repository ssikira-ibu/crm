import { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import type { OrgContext } from "@crm/shared";

export async function getDashboard(ctx: OrgContext) {
  const customerWhere: Prisma.CustomerWhereInput = {
    organizationId: ctx.organizationId,
  };
  if (ctx.role === "SALESPERSON") {
    customerWhere.ownerId = ctx.userId;
  }

  const customerIds = await prisma.customer.findMany({
    where: customerWhere,
    select: { id: true },
  });
  const ids = customerIds.map((c) => c.id);

  const [reminders, recentNotes, recentActivities, deals, statusCounts, dealAgg] =
    await Promise.all([
      prisma.reminder.findMany({
        where: { customerId: { in: ids }, dateCompleted: null },
        include: {
          customer: {
            select: { id: true, companyName: true, status: true },
          },
        },
        orderBy: { dueDate: "asc" },
        take: 50,
      }),
      prisma.note.findMany({
        where: { customerId: { in: ids } },
        include: {
          customer: { select: { id: true, companyName: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: 10,
      }),
      prisma.activity.findMany({
        where: { customerId: { in: ids } },
        include: {
          customer: { select: { id: true, companyName: true } },
        },
        orderBy: { date: "desc" },
        take: 10,
      }),
      prisma.deal.findMany({
        where: { customerId: { in: ids } },
        include: {
          customer: {
            select: { id: true, companyName: true, status: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.customer.groupBy({
        by: ["status"],
        where: customerWhere,
        _count: { _all: true },
      }),
      prisma.deal.aggregate({
        where: { customerId: { in: ids }, status: "OPEN" },
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

  return { reminders, recentNotes, recentActivities, deals, stats };
}
