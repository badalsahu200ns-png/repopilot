import { getLocalDb } from "@/lib/db/localDb";

export type GitHubScopeStatus = {
  ok: boolean;
  status: number;
  message: string;
};

export async function getAuthenticatedGitHubTokenForUser(userId: string): Promise<string | null> {
  const db = getLocalDb();
  const user = db.users.find((entry) => entry.id === userId);
  return user?.github_access_token || null;
}

export function getGitHubApiHeaders(accessToken?: string): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "RepoPilot/2.0",
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  return headers;
}

export async function getGitHubUserProfile(accessToken: string) {
  const res = await fetch("https://api.github.com/user", {
    headers: getGitHubApiHeaders(accessToken),
  });

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new Error("Your GitHub connection has expired or was revoked. Reconnect GitHub to continue.");
    }

    throw new Error("Unable to load GitHub profile.");
  }

  return res.json() as Promise<{ id?: number; login?: string; name?: string | null; email?: string | null }>; 
}

export async function verifyRepositoryAccess(accessToken: string, owner: string, repo: string): Promise<GitHubScopeStatus & { repo?: unknown }> {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers: getGitHubApiHeaders(accessToken),
  });

  if (res.status === 404) {
    return {
      ok: false,
      status: 404,
      message: "You don't currently have access to this repository through GitHub.",
    };
  }

  if (res.status === 401 || res.status === 403) {
    return {
      ok: false,
      status: res.status,
      message: "RepoPilot doesn't have the GitHub permissions required to read this repository.",
    };
  }

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      message: "GitHub API returned an error while checking repository access.",
    };
  }

  const repoData = await res.json();
  return {
    ok: true,
    status: 200,
    message: "Repository access confirmed.",
    repo: repoData,
  };
}
