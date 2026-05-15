import { getSession } from "@/lib/session";
import { createS2SToken } from "@/lib/api-server";
import { serverEnv } from "@/lib/env";

const AGENT_URL = serverEnv.AGENT_URL.replace(/\/$/, "");

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return Response.json(
      { error: { code: "UNAUTHORIZED", message: "No active session" } },
      { status: 401 },
    );
  }

  const token = await createS2SToken(session.uid, session.email);

  const agentRes = await fetch(`${AGENT_URL}/chat`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: await request.text(),
  });

  if (!agentRes.ok && !agentRes.headers.get("content-type")?.includes("text/event-stream")) {
    const text = await agentRes.text();
    return new Response(text, {
      status: agentRes.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(agentRes.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
