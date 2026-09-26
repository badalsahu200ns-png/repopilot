import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { getLocalDb, saveLocalDb, generateId } from "@/lib/db/localDb";
import { GITHUB_STATE_COOKIE_NAME, getGithubCallbackUrl, hasGithubConfig } from "@/lib/auth/github";
import { hashPassword } from "@/lib/auth/password";

async function exchangeCodeForToken(code: string) {
  if (!hasGithubConfig()) {
    throw new Error("GitHub OAuth is not configured.");
  }

  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": "RepoPilot/2.0",
    },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: getGithubCallbackUrl(),
    }),
  });

  if (!tokenRes.ok) {
    const errorText = await tokenRes.text();
    throw new Error(`GitHub token exchange failed: ${errorText}`);
  }

  const tokenData = (await tokenRes.json()) as {
    access_token?: string;
    token_type?: string;
    scope?: string;
    error?: string;
    error_description?: string;
  };

  if (tokenData.error || !tokenData.access_token) {
    throw new Error(tokenData.error_description || tokenData.error || "GitHub OAuth token exchange failed.");
  }

  return tokenData.access_token;
}

async function fetchGitHubProfile(accessToken: string) {
  const profileRes = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "RepoPilot/2.0",
    },
  });

  if (!profileRes.ok) {
    throw new Error("Unable to load GitHub profile.");
  }

  const profile = (await profileRes.json()) as {
    id?: number;
    login?: string;
    name?: string | null;
    email?: string | null;
    avatar_url?: string | null;
  };

  return profile;
}

async function fetchGitHubEmails(accessToken: string) {
  const mailRes = await fetch("https://api.github.com/user/emails", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "RepoPilot/2.0",
    },
  });

  if (!mailRes.ok) {
    return null;
  }

  const emails = (await mailRes.json()) as Array<{ email?: string; primary?: boolean; verified?: boolean }>;
  return emails.find((entry) => entry.primary && entry.verified)?.email || emails.find((entry) => entry.verified)?.email || null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const returnedState = searchParams.get("state");
  const cookieStore = await cookies();
  const expectedState = cookieStore.get(GITHUB_STATE_COOKIE_NAME)?.value;
  const appBase = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (!code || !returnedState || !expectedState || returnedState !== expectedState) {
    return NextResponse.redirect(`${appBase}/login?error=oauth_state_invalid`);
  }

  cookieStore.delete(GITHUB_STATE_COOKIE_NAME);

  try {
    const accessToken = await exchangeCodeForToken(code);
    const profile = await fetchGitHubProfile(accessToken);
    const primaryEmail = (await fetchGitHubEmails(accessToken)) || profile.email || `${profile.login ?? "github-user"}@users.noreply.github.com`;

    const db = getLocalDb();
    let user = db.users.find((entry) => entry.github_user_id === String(profile.id));

    if (!user && primaryEmail) {
      user = db.users.find((entry) => entry.email.toLowerCase() === primaryEmail.toLowerCase());
    }

    if (!user) {
      const fallbackPassword = await hashPassword(`github:${profile.id}:${crypto.randomUUID()}`);
      user = {
        id: generateId(),
        email: primaryEmail,
        name: profile.name || profile.login || "GitHub User",
        password_hash: fallbackPassword,
        auth_provider: "github",
        github_user_id: String(profile.id),
        avatar_url: profile.avatar_url || null,
        github_access_token: accessToken,
        created_at: new Date().toISOString(),
      };
      db.users.push(user);
    } else {
      user.name = user.name || profile.name || profile.login || "GitHub User";
      user.email = primaryEmail;
      user.auth_provider = "github";
      user.github_user_id = user.github_user_id || String(profile.id);
      user.avatar_url = profile.avatar_url || user.avatar_url || null;
      user.github_access_token = accessToken;
    }

    saveLocalDb();

    const token = await createSessionToken({
      id: user.id,
      email: user.email,
      name: user.name,
    });

    cookieStore.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return NextResponse.redirect(`${appBase}/dashboard`);
  } catch (error) {
    console.error("[GitHub OAuth callback] Error:", error);
    return NextResponse.redirect(`${appBase}/login?error=oauth_failed`);
  }
}
