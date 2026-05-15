import { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import { recordEvent } from "./event.service.js";
import type { OrgContext, CompanyQueryParams, CreateCompanyInput, UpdateCompanyInput } from "@crm/shared";

function companyWhere(ctx: OrgContext): Prisma.CompanyWhereInput {
  const where: Prisma.CompanyWhereInput = {
    organizationId: ctx.organizationId,
  };
  if (ctx.role === "SALESPERSON") {
    where.ownerId = ctx.userId;
  }
  return where;
}

export async function listCompanies(ctx: OrgContext, params: CompanyQueryParams) {
  const { page, limit, status, search } = params;
  const where: Prisma.CompanyWhereInput = companyWhere(ctx);

  if (status) {
    where.status = status;
  }
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { industry: { contains: search, mode: "insensitive" } },
    ];
  }

  const [data, total] = await prisma.$transaction([
    prisma.company.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            contacts: { where: { deletedAt: null } },
            tasks: { where: { deletedAt: null } },
            notes: { where: { deletedAt: null } },
            deals: { where: { deletedAt: null } },
            activities: { where: { deletedAt: null } },
          },
        },
      },
    }),
    prisma.company.count({ where }),
  ]);

  return {
    data,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function getCompany(ctx: OrgContext, companyId: string) {
  const company = await prisma.company.findFirst({
    where: { id: companyId, ...companyWhere(ctx) },
    include: {
      contacts: {
        where: { deletedAt: null },
        include: { phoneNumbers: { where: { deletedAt: null } } },
      },
      addresses: { where: { deletedAt: null } },
      deals: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        include: { stage: true },
      },
      activities: { where: { deletedAt: null }, orderBy: { date: "desc" } },
      notes: { where: { deletedAt: null }, orderBy: { createdAt: "desc" } },
      tasks: { where: { deletedAt: null }, orderBy: { dueDate: "asc" } },
      tags: { where: { tag: { deletedAt: null } }, include: { tag: true } },
    },
  });
  if (!company) {
    throw new AppError(404, "COMPANY_NOT_FOUND", "Company not found");
  }
  const { tags: companyTags, ...rest } = company;
  return { ...rest, tags: companyTags.map((ct) => ct.tag) };
}

export async function createCompany(
  ctx: OrgContext,
  data: CreateCompanyInput,
) {
  return prisma.company.create({
    data: { ...data, organizationId: ctx.organizationId, ownerId: ctx.userId },
  });
}

export async function updateCompany(
  ctx: OrgContext,
  companyId: string,
  data: UpdateCompanyInput,
) {
  const old = await prisma.company.findFirst({ where: { id: companyId, ...companyWhere(ctx) } });
  if (!old) {
    throw new AppError(404, "COMPANY_NOT_FOUND", "Company not found");
  }
  const company = await prisma.company.update({
    where: { id: companyId },
    data,
  });
  if (data.status && data.status !== old.status) {
    await recordEvent({
      ctx, companyId, entityType: "COMPANY", entityId: companyId,
      action: "STATUS_CHANGED",
      metadata: { old: old.status, new: company.status, name: company.name },
    });
  }
  return company;
}

export async function deleteCompany(ctx: OrgContext, companyId: string) {
  await ensureCompanyAccess(ctx, companyId);
  await prisma.company.delete({ where: { id: companyId } });
}

export async function ensureCompanyAccess(
  ctx: OrgContext,
  companyId: string,
) {
  const company = await prisma.company.findFirst({
    where: { id: companyId, ...companyWhere(ctx) },
    select: { id: true },
  });
  if (!company) {
    throw new AppError(404, "COMPANY_NOT_FOUND", "Company not found");
  }
}
