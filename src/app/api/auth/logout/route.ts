import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { createServerClient } from "@supabase/ssr";

export async function POST() {
  const cookieStore = await cookies();

  // Clear local session cookie
  cookieStore.delete(SESSION_COOKIE_NAME);

  // If Supabase is configured, sign out from Supabase as well
  if (isSupabaseConfigured()) {
    try {
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() { return cookieStore.getAll(); },
            setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            },
          },
        }
      );
      await supabase.auth.signOut();
    } catch {
      // Ignore
    }
  }

  return NextResponse.json({
    data: { success: true, redirect: "/login" },
    message: "Logged out successfully",
  }, { status: 200 });
}
