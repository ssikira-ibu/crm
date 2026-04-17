"use server";

import { serverApi } from "@/lib/api-server";
import type { DealCreate, DealListParams, DealUpdate } from "@/lib/types";

export async function listDeals(
  customerId: string,
  params?: DealListParams,
) {
  return serverApi.deals.list(customerId, params);
}

export async function getDeal(customerId: string, dealId: string) {
  return serverApi.deals.get(customerId, dealId);
}

export async function createDeal(customerId: string, input: DealCreate) {
  return serverApi.deals.create(customerId, input);
}

export async function updateDeal(
  customerId: string,
  dealId: string,
  input: DealUpdate,
) {
  return serverApi.deals.update(customerId, dealId, input);
}

export async function removeDeal(customerId: string, dealId: string) {
  return serverApi.deals.remove(customerId, dealId);
}
