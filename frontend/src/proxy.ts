import { NextResponse, type NextRequest } from "next/server";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// Defense-in-depth CSRF guard for custom API routes. Server Actions already
// enforce an Origin/Host match internally; this covers route handlers under
// /api/* that don't get that check.
export function proxy(request: NextRequest) {
  if (SAFE_METHODS.has(request.method)) return NextResponse.next();

  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return new NextResponse("Forbidden", { status: 403 });
  }

  if (originHost !== host) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
