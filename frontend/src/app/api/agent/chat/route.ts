import { getSession } from "@/lib/session";
import { createS2SToken } from "@/lib/api-server";
import { serverEnv } from "@/lib/env";

const AGENT_URL = serverEnv.AGENT_URL.replace(/\/$/, "");

// Upstream timeout for the initial response. The SSE body itself may stream
// indefinitely; this caps how long we wait for the agent to respond at all.
const UPSTREAM_TIMEOUT_MS = 30_000;

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return Response.json(
      { error: { code: "UNAUTHORIZED", message: "No active session" } },
      { status: 401 },
    );
  }

  const token = await createS2SToken(session.uid, session.email);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  let agentRes: Response;
  try {
    agentRes = await fetch(`${AGENT_URL}/chat`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: await request.text(),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    if ((err as Error).name === "AbortError") {
      return Response.json(
        { error: { code: "AGENT_TIMEOUT", message: "Agent did not respond in time" } },
        { status: 504 },
      );
    }
    throw err;
  }
  clearTimeout(timeout);

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
