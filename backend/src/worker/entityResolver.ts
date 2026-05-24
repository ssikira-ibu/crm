import { prisma } from "../lib/prisma.js";

// For a given event, fetch a small projection of the underlying entity so
// that workflow filters can reference fields beyond the raw event metadata
// (e.g. `entity.stage.isWon`, `entity.amount`).

export async function resolveEntity(
  entityType: string,
  entityId: string,
): Promise<Record<string, unknown> | null> {
  switch (entityType) {
    case "DEAL": {
      const deal = await prisma.deal.findUnique({
        where: { id: entityId },
        include: { stage: true },
      });
      if (!deal) return null;
      return {
        id: deal.id,
        title: deal.title,
        value: deal.value ? Number(deal.value) : null,
        companyId: deal.companyId,
        ownerId: deal.ownerId,
        closedAt: deal.closedAt,
        stage: deal.stage
          ? {
              id: deal.stage.id,
              name: deal.stage.name,
              isWon: deal.stage.isWon,
              isLost: deal.stage.isLost,
            }
          : null,
      };
    }
    case "COMPANY": {
      const company = await prisma.company.findUnique({
        where: { id: entityId },
      });
      if (!company) return null;
      return {
        id: company.id,
        name: company.name,
        status: company.status,
        ownerId: company.ownerId,
      };
    }
    case "TASK": {
      const task = await prisma.task.findUnique({ where: { id: entityId } });
      if (!task) return null;
      return {
        id: task.id,
        title: task.title,
        status: task.status,
        priority: task.priority,
        assigneeId: task.assigneeId,
        dealId: task.dealId,
        companyId: task.companyId,
      };
    }
    case "CONTACT": {
      const contact = await prisma.contact.findUnique({
        where: { id: entityId },
      });
      if (!contact) return null;
      return {
        id: contact.id,
        firstName: contact.firstName,
        lastName: contact.lastName,
        companyId: contact.companyId,
        ownerId: contact.ownerId,
      };
    }
    default:
      return null;
  }
}
