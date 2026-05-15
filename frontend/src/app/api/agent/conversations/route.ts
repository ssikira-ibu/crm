import { getSession } from "@/lib/session";
import { createS2SToken } from "@/lib/api-server";
import { serverEnv } from "@/lib/env";

const AGENT_URL = serverEnv.AGENT_URL.replace(/\/$/, "");

async function agentRequest(path: string, method = "GET"): Promise<Response> {
  const session = await getSession();
  if (!session) {
    return Response.json(
      { error: { code: "UNAUTHORIZED", message: "No active session" } },
      { status: 401 },
    );
  }

  const token = await createS2SToken(session.uid, session.email);
  const res = await fetch(`${AGENT_URL}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}` },
  });

  const text = await res.text();
  return new Response(text, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function GET() {
  return agentRequest("/conversations");
}
