"use server";

import { serverApi } from "@/lib/api-server";

export async function getMe() {
  return serverApi.me.get();
}
