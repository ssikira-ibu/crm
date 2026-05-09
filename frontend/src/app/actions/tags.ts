"use server";

import { serverApi } from "@/lib/api-server";
import type { TagCreate, TagUpdate } from "@/lib/types";

export async function listTags() {
  return serverApi.tags.list();
}

export async function createTag(input: TagCreate) {
  return serverApi.tags.create(input);
}

export async function updateTag(tagId: string, input: TagUpdate) {
  return serverApi.tags.update(tagId, input);
}

export async function removeTag(tagId: string) {
  return serverApi.tags.remove(tagId);
}

export async function addTagToCompany(
  companyId: string,
  tagId: string,
) {
  return serverApi.tags.addToCompany(companyId, tagId);
}

export async function removeTagFromCompany(
  companyId: string,
  tagId: string,
) {
  return serverApi.tags.removeFromCompany(companyId, tagId);
}
