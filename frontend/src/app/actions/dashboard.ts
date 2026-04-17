"use server";

import { serverApi } from "@/lib/api-server";

export async function getDashboard() {
  return serverApi.dashboard.get();
}
