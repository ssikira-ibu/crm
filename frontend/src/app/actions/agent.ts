"use server";

import { getSession } from "@/lib/session";
import { createS2SToken } from "@/lib/api-server";
import { serverEnv } from "@/lib/env";
import type { AgentConversation, AgentConversationDetail, Single } from "@crm/shared";

const AGENT_URL = serverEnv.AGENT_URL.replace(/\/$/, "");

async function agentFetch<T>(path: string, method = "GET"): Promise<T> {
  const session = await getSession();
  if (!session) throw new Error("No active session");

  const token = await createS2SToken(session.uid, session.email);
  const res = await fetch(`${AGENT_URL}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (res.status === 204) return undefined as T;

  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message ?? "Agent request failed");
  return json as T;
}

export async function listConversations() {
  return agentFetch<{ data: AgentConversation[] }>("/conversations");
}

export async function getConversation(id: string) {
  return agentFetch<Single<AgentConversationDetail>>(`/conversations/${id}`);
}

export async function deleteConversation(id: string) {
  return agentFetch<void>(`/conversations/${id}`, "DELETE");
}
