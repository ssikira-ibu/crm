import { prisma } from "../lib/prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import { ensureCompanyAccess } from "./company.service.js";
import type { OrgContext, CreateAddressInput, UpdateAddressInput } from "@crm/shared";

export async function listAddresses(ctx: OrgContext, companyId: string) {
  await ensureCompanyAccess(ctx, companyId);
  return prisma.address.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getAddress(
  ctx: OrgContext,
  companyId: string,
  addressId: string,
) {
  await ensureCompanyAccess(ctx, companyId);
  const address = await prisma.address.findFirst({
    where: { id: addressId, companyId },
  });
  if (!address) {
    throw new AppError(404, "ADDRESS_NOT_FOUND", "Address not found");
  }
  return address;
}

export async function createAddress(
  ctx: OrgContext,
  companyId: string,
  data: CreateAddressInput,
) {
  await ensureCompanyAccess(ctx, companyId);
  return prisma.address.create({
    data: { ...data, companyId },
  });
}

export async function updateAddress(
  ctx: OrgContext,
  companyId: string,
  addressId: string,
  data: UpdateAddressInput,
) {
  await ensureCompanyAccess(ctx, companyId);
  const address = await prisma.address.findFirst({
    where: { id: addressId, companyId },
  });
  if (!address) {
    throw new AppError(404, "ADDRESS_NOT_FOUND", "Address not found");
  }
  return prisma.address.update({ where: { id: addressId }, data });
}

export async function deleteAddress(
  ctx: OrgContext,
  companyId: string,
  addressId: string,
) {
  await ensureCompanyAccess(ctx, companyId);
  const address = await prisma.address.findFirst({
    where: { id: addressId, companyId },
  });
  if (!address) {
    throw new AppError(404, "ADDRESS_NOT_FOUND", "Address not found");
  }
  await prisma.address.delete({ where: { id: addressId } });
}
