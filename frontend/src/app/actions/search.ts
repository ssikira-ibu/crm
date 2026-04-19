"use server";

import { serverApi } from "@/lib/api-server";

export async function searchAll(q: string, limit?: number) {
  return serverApi.search.query({ q, limit });
}
