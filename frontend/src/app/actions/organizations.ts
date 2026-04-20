"use server";

import { serverApi } from "@/lib/api-server";
import type { OrganizationCreate, OrgRole } from "@/lib/types";

export async function createOrganization(input: OrganizationCreate) {
  return serverApi.organizations.create(input);
}

export async function listMembers() {
  return serverApi.organizations.members();
}

export async function updateMemberRole(memberId: string, role: OrgRole) {
  return serverApi.organizations.updateMemberRole(memberId, role);
}

export async function removeMember(memberId: string) {
  return serverApi.organizations.removeMember(memberId);
}
