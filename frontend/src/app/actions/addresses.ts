"use server";

import { serverApi } from "@/lib/api-server";
import type { AddressCreate, AddressUpdate } from "@/lib/types";

export async function listAddresses(customerId: string) {
  return serverApi.addresses.list(customerId);
}

export async function getAddress(customerId: string, addressId: string) {
  return serverApi.addresses.get(customerId, addressId);
}

export async function createAddress(
  customerId: string,
  input: AddressCreate,
) {
  return serverApi.addresses.create(customerId, input);
}

export async function updateAddress(
  customerId: string,
  addressId: string,
  input: AddressUpdate,
) {
  return serverApi.addresses.update(customerId, addressId, input);
}

export async function removeAddress(customerId: string, addressId: string) {
  return serverApi.addresses.remove(customerId, addressId);
}
