import { getAdminAuth } from "@/lib/firebase-admin";
import { createSession, deleteSession } from "@/lib/session";
import { allowedAccountMessage, isAllowedAccountEmail } from "@/lib/allowed-email";

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
    if (!isAllowedAccountEmail(decoded.email)) {
      await deleteSession();
      return Response.json(
        { error: allowedAccountMessage() },
        { status: 403 },
      );
    }

    const displayName =
      typeof decoded.name === "string" && decoded.name.trim()
        ? decoded.name.trim()
        : null;

    await createSession(decoded.uid, decoded.email ?? "", displayName);

    return Response.json({ ok: true });
  } catch (err) {
    console.error("Failed to create session", err);
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
