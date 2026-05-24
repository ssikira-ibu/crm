import { getSession } from "@/lib/session";
import { createS2SToken } from "@/lib/api-server";

const API_URL =
  (process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );

export async function GET() {
  const session = await getSession();
  if (!session) {
    return Response.json(
      { error: { code: "UNAUTHORIZED", message: "No active session" } },
      { status: 401 },
    );
  }
  const token = await createS2SToken(session.uid, session.email);

  const upstream = await fetch(`${API_URL}/api/notifications/stream`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!upstream.ok) {
    return new Response(await upstream.text(), { status: upstream.status });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
