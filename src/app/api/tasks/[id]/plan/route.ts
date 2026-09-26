import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

const SavePlanSchema = z.object({
  steps:        z.array(z.record(z.string(), z.unknown())),
  generated_by: z.enum(["repopilot", "bob"] as const).default("repopilot"),
  bob_plan_id:  z.string().optional(),
});

// POST /api/tasks/:id/plan — Save IBM Bob plan for a task
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });

    // Verify task ownership
    const { data: task } = await supabase
      .from("tasks")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (!task) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Task not found" } }, { status: 404 });

    const body = await req.json();
    const parsed = SavePlanSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", details: parsed.error.flatten() } }, { status: 400 });
    }

    const { data: plan, error } = await supabase
      .from("task_plans")
      .insert({
        task_id:      id,
        steps:        parsed.data.steps as Json,
        generated_by: parsed.data.generated_by,
        bob_plan_id:  parsed.data.bob_plan_id ?? null,
      })
      .select()
      .single();

    if (error) throw error;

    // Update task status to "planned"
    await supabase
      .from("tasks")
      .update({ status: "planned" })
      .eq("id", id);

    return NextResponse.json({ data: plan }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/tasks/:id/plan]", error);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Failed to save plan" } }, { status: 500 });
  }
}

// GET /api/tasks/:id/plan — Get current plan for a task
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });

    // Verify ownership via task
    const { data: task } = await supabase
      .from("tasks")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (!task) return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 });

    const { data: plan, error } = await supabase
      .from("task_plans")
      .select("*")
      .eq("task_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({ data: plan });
  } catch (error) {
    console.error("[GET /api/tasks/:id/plan]", error);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Failed to fetch plan" } }, { status: 500 });
  }
}
