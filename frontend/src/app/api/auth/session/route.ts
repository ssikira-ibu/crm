import { getAdminAuth } from "@/lib/firebase-admin";
import { createSession, deleteSession } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const { idToken } = (await request.json()) as { idToken: string };
    if (!idToken) {
      return Response.json(
        { error: "Missing idToken" },
        { status: 400 },
      );
    }

    const decoded = await getAdminAuth().verifyIdToken(idToken);
    await createSession(decoded.uid, decoded.email ?? "");

    return Response.json({ ok: true });
  } catch {
    return Response.json(
      { error: "Invalid or expired token" },
      { status: 401 },
    );
  }
}

export async function DELETE() {
  await deleteSession();
  return Response.json({ ok: true });
}
