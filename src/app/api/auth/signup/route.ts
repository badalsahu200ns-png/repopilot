import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { hashPassword } from "@/lib/auth/password";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { getLocalDb, saveLocalDb, generateId } from "@/lib/db/localDb";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { createServerClient } from "@supabase/ssr";

const SignupSchema = z.object({
  name: z.string().optional(),
  fullName: z.string().optional(),
  email: z.string().email("Please provide a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
  confirmPassword: z.string().optional(),
}).refine(data => {
  const n = data.name || data.fullName;
  return typeof n === "string" && n.trim().length >= 2;
}, {
  message: "Full name must be at least 2 characters",
  path: ["name"],
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = SignupSchema.safeParse(body);

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return NextResponse.json({
        error: {
          code: "VALIDATION_ERROR",
          message: issue ? `${issue.message}` : "Invalid registration data",
          details: parsed.error.flatten(),
        },
      }, { status: 400 });
    }

    const { email: rawEmail, password, confirmPassword } = parsed.data;
    const name = (parsed.data.name || parsed.data.fullName || "").trim();

    if (confirmPassword && password !== confirmPassword) {
      return NextResponse.json({
        error: {
          code: "PASSWORD_MISMATCH",
          message: "Passwords do not match. Please verify both password entries.",
        },
      }, { status: 400 });
    }

    const normalizedEmail = rawEmail.trim().toLowerCase();

    // 1. If Supabase is configured with real credentials, attempt Supabase signup
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
                cookiesToSet.forEach(({ name, value, options }) =>
                  cookieStore.set(name, value, options)
                );
              },
            },
          }
        );

        const { data: supaData, error: supaErr } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: { data: { name } },
        });

        if (supaErr) {
          if (supaErr.message.toLowerCase().includes("already registered")) {
            return NextResponse.json({
              error: {
                code: "EMAIL_ALREADY_REGISTERED",
                message: "An account with this email already exists. Try signing in instead.",
              },
            }, { status: 409 });
          }
          throw supaErr;
        }

        if (supaData.user) {
          const token = await createSessionToken({
            id: supaData.user.id,
            email: normalizedEmail,
            name,
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
              user: { id: supaData.user.id, email: normalizedEmail, name },
              redirect: "/onboarding",
            },
            message: "Account created successfully",
          }, { status: 201 });
        }
      } catch (err: unknown) {
        console.warn("[Signup] Supabase cloud signup failed, using local development store:", err);
      }
    }

    // 2. Local development store registration
    const db = getLocalDb();
    const existing = db.users.find((u) => u.email === normalizedEmail);

    if (existing) {
      return NextResponse.json({
        error: {
          code: "EMAIL_ALREADY_REGISTERED",
          message: "An account with this email already exists. Try signing in instead.",
        },
      }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const newUser = {
      id: generateId(),
      email: normalizedEmail,
      name: name.trim(),
      password_hash: passwordHash,
      created_at: new Date().toISOString(),
    };

    db.users.push(newUser);
    saveLocalDb();

    // Create session token and set cookie
    const token = await createSessionToken({
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
    });

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return NextResponse.json({
      data: {
        user: { id: newUser.id, email: newUser.email, name: newUser.name },
        redirect: "/onboarding",
      },
      message: "Account created successfully",
    }, { status: 201 });
  } catch (error: unknown) {
    console.error("[POST /api/auth/signup] Error:", error);
    return NextResponse.json({
      error: {
        code: "SERVER_ERROR",
        message: "An error occurred during account creation. Please try again.",
      },
    }, { status: 500 });
  }
}
