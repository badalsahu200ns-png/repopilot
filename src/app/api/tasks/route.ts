import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const CreateTaskSchema = z.object({
  title:         z.string().min(1).max(200),
  description:   z.string().optional().default(""),
  repository_id: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });

    const body = await req.json();
    const parsed = CreateTaskSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", details: parsed.error.flatten() } }, { status: 400 });
    }

    // Verify repo ownership
    const { data: repo } = await supabase.from("repositories").select("id").eq("id", parsed.data.repository_id).eq("user_id", user.id).single();
    if (!repo) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Repository not found or not accessible" } }, { status: 404 });

    const { data: task, error } = await supabase.from("tasks").insert({
      user_id:       user.id,
      repository_id: parsed.data.repository_id,
      title:         parsed.data.title,
      description:   parsed.data.description,
      status:        "created",
    }).select().single();

    if (error) throw error;
    return NextResponse.json({ data: task }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/tasks]", error);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR" } }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });

    const { data: tasks, error } = await supabase
      .from("tasks")
      .select("*, repositories(github_owner, github_repo)")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ data: tasks });
  } catch (error) {
    console.error("[GET /api/tasks]", error);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR" } }, { status: 500 });
  }
}
