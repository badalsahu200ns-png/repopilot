import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (sessionCookie) {
    const payload = await verifySessionToken(sessionCookie);
    if (payload) {
      return NextResponse.json({
        data: {
          user: {
            id: payload.userId,
            email: payload.email,
            name: payload.name,
          },
        },
      });
    }
  }

  // Fallback to Supabase client
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      return NextResponse.json({
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.user_metadata?.name || user.email?.split("@")[0],
          },
        },
      });
    }
  } catch {
    // Ignore
  }

  return NextResponse.json({
    error: {
      code: "UNAUTHORIZED",
      message: "Not authenticated",
    },
  }, { status: 401 });
}
