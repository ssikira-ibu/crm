"use server";

import { serverApi } from "@/lib/api-server";
import type { InviteCreate } from "@/lib/types";

export async function createInvite(input: InviteCreate) {
  return serverApi.invites.create(input);
}

export async function listInvites() {
  return serverApi.invites.list();
}

export async function revokeInvite(inviteId: string) {
  return serverApi.invites.revoke(inviteId);
}

export async function getInviteByToken(token: string) {
  return serverApi.invites.getByToken(token);
}

export async function acceptInvite(token: string) {
  return serverApi.invites.accept(token);
}
