import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { generateDataSourcesMarkdown } from "@/lib/compliance/service";
import { ComplianceState, INITIAL_COMPLIANCE_STATE } from "@/types/compliance";

// POST /api/compliance/datasources — Generate and save DATA_SOURCES.md to repository root
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const state: ComplianceState = body.state || INITIAL_COMPLIANCE_STATE;

    const mdContent = generateDataSourcesMarkdown(state);

    // Save to repopilot root or workspace root
    const targetPath = path.join(process.cwd(), "DATA_SOURCES.md");
    fs.writeFileSync(targetPath, mdContent, "utf-8");

    return NextResponse.json({
      data: {
        success: true,
        path: "DATA_SOURCES.md",
        content: mdContent,
      },
    });
  } catch (error) {
    console.error("[POST /api/compliance/datasources]", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to generate DATA_SOURCES.md" } },
      { status: 500 }
    );
  }
}
