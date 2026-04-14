import { prisma } from "../lib/prisma.js";

export async function getDashboard(userId: string) {
  const customerIds = await prisma.customer.findMany({
    where: { userId },
    select: { id: true },
  });
  const ids = customerIds.map((c) => c.id);

  const [reminders, recentNotes, statusCounts] = await Promise.all([
    prisma.reminder.findMany({
      where: { customerId: { in: ids }, dateCompleted: null },
      include: { customer: { select: { id: true, companyName: true, status: true } } },
      orderBy: { dueDate: "asc" },
      take: 50,
    }),
    prisma.note.findMany({
      where: { customerId: { in: ids } },
      include: { customer: { select: { id: true, companyName: true } } },
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),
    prisma.customer.groupBy({
      by: ["status"],
      where: { userId },
      _count: true,
    }),
  ]);

  const stats = {
    total: statusCounts.reduce((sum, s) => sum + s._count, 0),
    byStatus: Object.fromEntries(statusCounts.map((s) => [s.status, s._count])),
  };

  return { reminders, recentNotes, stats };
}
