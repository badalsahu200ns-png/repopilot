import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  GITHUB_STATE_COOKIE_NAME,
  createOAuthState,
  getGithubCallbackUrl,
  getGithubScopes,
  hasGithubConfig,
} from "@/lib/auth/github";

export async function GET() {
  if (!hasGithubConfig()) {
    return NextResponse.json({
      error: {
        code: "GITHUB_NOT_CONFIGURED",
        message: "GitHub authentication is not configured for this environment.",
      },
    }, { status: 500 });
  }

  const state = createOAuthState();
  const cookieStore = await cookies();

  cookieStore.set(GITHUB_STATE_COOKIE_NAME, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });

  const githubAuthUrl = new URL("https://github.com/login/oauth/authorize");
  githubAuthUrl.searchParams.set("client_id", process.env.GITHUB_CLIENT_ID!);
  githubAuthUrl.searchParams.set("redirect_uri", getGithubCallbackUrl());
  githubAuthUrl.searchParams.set("scope", getGithubScopes());
  githubAuthUrl.searchParams.set("state", state);

  return NextResponse.redirect(githubAuthUrl.toString());
}
