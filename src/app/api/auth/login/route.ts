import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { verifyPassword } from "@/lib/auth/password";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { getLocalDb } from "@/lib/db/localDb";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { createServerClient } from "@supabase/ssr";

const LoginSchema = z.object({
  email: z.string().trim().email("Please provide a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = LoginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Please enter a valid email and password.",
        },
      }, { status: 400 });
    }

    const { email: rawEmail, password } = parsed.data;
    const normalizedEmail = rawEmail.trim().toLowerCase();

    if (isSupabaseConfigured()) {
      try {
        const cookieStore = await cookies();
        const supabase = createServerClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          {
            cookies: {
              getAll() { return cookieStore.getAll(); },
              setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
                cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
              },
            },
          }
        );

        const { data: supaData, error: supaErr } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

        if (!supaErr && supaData.user) {
          const token = await createSessionToken({
            id: supaData.user.id,
            email: normalizedEmail,
            name: supaData.user.user_metadata?.name || normalizedEmail.split("@")[0],
          });

          cookieStore.set(SESSION_COOKIE_NAME, token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24 * 7,
          });

          return NextResponse.json({
            data: {
              user: {
                id: supaData.user.id,
                email: normalizedEmail,
                name: supaData.user.user_metadata?.name || normalizedEmail.split("@")[0],
              },
              redirect: "/dashboard",
            },
          });
        }

        if (supaErr?.message?.toLowerCase().includes("invalid login")) {
          return NextResponse.json({
            error: {
              code: "INVALID_CREDENTIALS",
              message: "Email or password is incorrect. Please try again.",
            },
          }, { status: 401 });
        }

        if (supaErr?.message?.toLowerCase().includes("not found") || supaErr?.message?.toLowerCase().includes("user not found")) {
          return NextResponse.json({
            error: {
              code: "USER_NOT_FOUND",
              message: "No RepoPilot account was found with this email. Create an account to continue.",
            },
          }, { status: 404 });
        }
      } catch (err) {
        console.warn("[Login] Supabase cloud login failed, falling back to local database auth:", err);
      }
    }

    const db = getLocalDb();
    const user = db.users.find((entry) => entry.email.toLowerCase() === normalizedEmail);

    if (!user) {
      return NextResponse.json({
        error: {
          code: "USER_NOT_FOUND",
          message: "No RepoPilot account was found with this email. Create an account to continue.",
        },
      }, { status: 404 });
    }

    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return NextResponse.json({
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Email or password is incorrect. Please try again.",
        },
      }, { status: 401 });
    }

    const token = await createSessionToken({
      id: user.id,
      email: user.email,
      name: user.name,
    });

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return NextResponse.json({
      data: {
        user: { id: user.id, email: user.email, name: user.name },
        redirect: "/dashboard",
      },
    }, { status: 200 });
  } catch (error: unknown) {
    console.error("[POST /api/auth/login] Error:", error);
    return NextResponse.json({
      error: {
        code: "SERVER_ERROR",
        message: "Something went wrong while signing you in. Please try again.",
      },
    }, { status: 500 });
  }
}
