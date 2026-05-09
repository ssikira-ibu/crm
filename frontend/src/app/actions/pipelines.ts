"use server";

import { serverApi } from "@/lib/api-server";

export async function listPipelines() {
  return serverApi.pipelines.list();
}

export async function getPipeline(id: string) {
  return serverApi.pipelines.get(id);
}
