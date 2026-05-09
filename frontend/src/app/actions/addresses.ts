"use server";

import { serverApi } from "@/lib/api-server";
import type { AddressCreate, AddressUpdate } from "@/lib/types";

export async function listAddresses(companyId: string) {
  return serverApi.addresses.list(companyId);
}

export async function getAddress(companyId: string, addressId: string) {
  return serverApi.addresses.get(companyId, addressId);
}

export async function createAddress(
  companyId: string,
  input: AddressCreate,
) {
  return serverApi.addresses.create(companyId, input);
}

export async function updateAddress(
  companyId: string,
  addressId: string,
  input: AddressUpdate,
) {
  return serverApi.addresses.update(companyId, addressId, input);
}

export async function removeAddress(companyId: string, addressId: string) {
  return serverApi.addresses.remove(companyId, addressId);
}
