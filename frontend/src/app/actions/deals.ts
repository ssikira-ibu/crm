"use server";

import { serverApi } from "@/lib/api-server";
import type { DealCreate, DealListParams, DealUpdate } from "@/lib/types";

export async function getDealsOverview() {
  return serverApi.deals.overview();
}

export async function listDeals(
  companyId: string,
  params?: DealListParams,
) {
  return serverApi.deals.list(companyId, params);
}

export async function getDeal(companyId: string, dealId: string) {
  return serverApi.deals.get(companyId, dealId);
}

export async function createDeal(companyId: string, input: DealCreate) {
  return serverApi.deals.create(companyId, input);
}

export async function updateDeal(
  companyId: string,
  dealId: string,
  input: DealUpdate,
) {
  return serverApi.deals.update(companyId, dealId, input);
}

export async function removeDeal(companyId: string, dealId: string) {
  return serverApi.deals.remove(companyId, dealId);
}
