import { prisma } from "../lib/prisma.js";

export async function getDashboard(userId: string) {
  const customerIds = await prisma.customer.findMany({
    where: { userId },
    select: { id: true },
  });
  const ids = customerIds.map((c) => c.id);

  const [reminders, recentNotes, recentActivities, statusCounts, dealAgg] =
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
      prisma.customer.groupBy({
        by: ["status"],
        where: { userId },
        _count: true,
      }),
      prisma.deal.aggregate({
        where: { customerId: { in: ids }, status: "OPEN" },
        _sum: { value: true },
        _count: true,
      }),
    ]);

  const stats = {
    total: statusCounts.reduce((sum, s) => sum + s._count, 0),
    byStatus: Object.fromEntries(
      statusCounts.map((s) => [s.status, s._count]),
    ),
    openDealsValue: Number(dealAgg._sum.value ?? 0),
    openDealsCount: dealAgg._count,
  };

  return { reminders, recentNotes, recentActivities, stats };
}
