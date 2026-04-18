"use server";

import { serverApi } from "@/lib/api-server";

export async function getGlobalEvents(params?: {
  limit?: number;
  cursor?: string;
}) {
  return serverApi.events.global(params);
}

export async function getCustomerEvents(
  customerId: string,
  params?: { limit?: number; cursor?: string },
) {
  return serverApi.events.forCustomer(customerId, params);
}
