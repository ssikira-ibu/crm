"use server";

import { serverApi } from "@/lib/api-server";

export async function getGlobalEvents(params?: {
  limit?: number;
  cursor?: string;
}) {
  return serverApi.events.global(params);
}

export async function getCompanyEvents(
  companyId: string,
  params?: { limit?: number; cursor?: string },
) {
  return serverApi.events.forCompany(companyId, params);
}
