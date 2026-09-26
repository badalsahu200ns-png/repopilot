import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { scanBobSessionsFolder } from "@/lib/compliance/service";

// POST /api/compliance/scan — Scan repository root for bob_sessions/ and PNGs
export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
    }

    // Check if user has an active repository in database
    const { data: repo } = await supabase
      .from("repositories")
      .select("github_owner, github_repo")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const scanResult = await scanBobSessionsFolder({
      owner: repo?.github_owner,
      repo: repo?.github_repo,
      userId: user.id,
    });

    return NextResponse.json({ data: scanResult });
  } catch (error) {
    console.error("[POST /api/compliance/scan]", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to scan repository" } },
      { status: 500 }
    );
  }
}
