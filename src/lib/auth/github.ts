import crypto from "crypto";

export const GITHUB_STATE_COOKIE_NAME = "github_oauth_state";

export function getAppBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

export function getGithubCallbackUrl(): string {
  return process.env.GITHUB_CALLBACK_URL || `${getAppBaseUrl()}/api/auth/github/callback`;
}

export function getGithubScopes(): string {
  return "read:user,user:email,repo";
}

export function hasGithubConfig(): boolean {
  return Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);
}

export function createOAuthState(): string {
  return crypto.randomBytes(16).toString("hex");
}
