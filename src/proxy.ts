import { NextResponse, type NextRequest } from "next/server";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });
  const path = request.nextUrl.pathname;

  // 1. Check for local session cookie
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  let user: { userId: string; email: string } | null = null;

  if (sessionCookie) {
    const payload = await verifySessionToken(sessionCookie);
    if (payload) {
      user = { userId: payload.userId, email: payload.email };
    }
  }

  // 2. Redirect authenticated users away from auth pages
  if (user && (path === "/login" || path === "/register")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // 3. Protect app routes
  const protectedPrefixes = [
    "/dashboard",
    "/repositories",
    "/tasks",
    "/ask",
    "/onboarding",
    "/verification",
    "/settings",
    "/activity",
  ];

  if (!user && protectedPrefixes.some((prefix) => path.startsWith(prefix))) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", path);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/|auth/).*)",
  ],
};

export default proxy;
