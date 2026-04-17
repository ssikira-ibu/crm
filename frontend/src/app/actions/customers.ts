"use server";

import { serverApi } from "@/lib/api-server";
import type {
  CustomerCreate,
  CustomerListParams,
  CustomerUpdate,
} from "@/lib/types";

export async function listCustomers(params?: CustomerListParams) {
  return serverApi.customers.list(params);
}

export async function getCustomer(id: string) {
  return serverApi.customers.get(id);
}

export async function createCustomer(input: CustomerCreate) {
  return serverApi.customers.create(input);
}

export async function updateCustomer(id: string, input: CustomerUpdate) {
  return serverApi.customers.update(id, input);
}

export async function removeCustomer(id: string) {
  return serverApi.customers.remove(id);
}
