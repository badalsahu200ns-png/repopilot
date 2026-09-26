import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedGitHubTokenForUser, verifyRepositoryAccess } from "@/lib/github/client";

const ConnectRepoSchema = z.object({
  github_url:   z.string().url(),
  github_owner: z.string().min(1),
  github_repo:  z.string().min(1),
});

// POST /api/repositories — Connect a new repository
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Connect your GitHub account to access repositories." } }, { status: 401 });
    }

    const body = await req.json();
    const parsed = ConnectRepoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({
        error: { code: "VALIDATION_ERROR", message: "Invalid input", details: parsed.error.flatten() }
      }, { status: 400 });
    }

    const { github_url, github_owner, github_repo } = parsed.data;
    const oauthToken = await getAuthenticatedGitHubTokenForUser(user.id);

    if (!oauthToken) {
      return NextResponse.json({
        error: {
          code: "GITHUB_NOT_CONNECTED",
          message: "Connect your GitHub account to access repositories.",
        },
      }, { status: 401 });
    }

    const accessCheck = await verifyRepositoryAccess(oauthToken, github_owner, github_repo);
    if (!accessCheck.ok) {
      return NextResponse.json({
        error: {
          code: accessCheck.status === 404 ? "REPO_NOT_FOUND" : accessCheck.status === 401 || accessCheck.status === 403 ? "REPO_NOT_ACCESSIBLE" : "GITHUB_PERMISSION_ERROR",
          message: accessCheck.message,
        }
      }, { status: accessCheck.status === 404 ? 404 : 422 });
    }

    const ghData = accessCheck.repo as { name?: string; description?: string | null; default_branch?: string; language?: string | null };

    // Check for duplicate
    const { data: existing } = await supabase
      .from("repositories")
      .select("id")
      .eq("user_id", user.id)
      .eq("github_owner", github_owner)
      .eq("github_repo", github_repo)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ data: existing }, { status: 200 });
    }

    // Insert repository
    const { data: repo, error: insertError } = await supabase
      .from("repositories")
      .insert({
        user_id:        user.id,
        github_url:     github_url,
        github_owner:   github_owner,
        github_repo:    github_repo,
        name:           ghData.name ?? github_repo,
        description:    ghData.description ?? null,
        default_branch: ghData.default_branch ?? "main",
        language:       ghData.language ?? null,
        analysis_status: "pending",
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({ data: repo }, { status: 201 });
  } catch (error: unknown) {
    console.error("[POST /api/repositories]", error);
    return NextResponse.json({
      error: { code: "INTERNAL_ERROR", message: "Failed to connect repository" }
    }, { status: 500 });
  }
}

// GET /api/repositories — List user's repositories
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
    }

    const { data: repos, error } = await supabase
      .from("repositories")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ data: repos });
  } catch (error: unknown) {
    console.error("[GET /api/repositories]", error);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Failed to fetch repositories" } }, { status: 500 });
  }
}
