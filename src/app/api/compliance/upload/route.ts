import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { saveBobSessionScreenshot, scanBobSessionsFolder } from "@/lib/compliance/service";
import { BobScreenshotEvidence } from "@/types/compliance";

// POST /api/compliance/upload — Upload Bob IDE session summary PNG screenshot
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const taskName = (formData.get("taskName") as string) || "";
    const description = (formData.get("description") as string) || "";
    const notes = (formData.get("notes") as string) || "";
    const date = (formData.get("date") as string) || new Date().toISOString().split("T")[0];

    if (!file) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "File is required." } },
        { status: 400 }
      );
    }

    if (!taskName.trim()) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Associated Bob task name is required." } },
        { status: 400 }
      );
    }

    // Validate filename and extension
    if (!file.name.toLowerCase().endsWith(".png")) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Only PNG format (*.png) is permitted for Bob IDE screenshots." } },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Save screenshot to bob_sessions folder
    const saveResult = await saveBobSessionScreenshot(buffer, file.name);

    if (!saveResult.success) {
      return NextResponse.json(
        { error: { code: "UPLOAD_FAILED", message: saveResult.error || "Failed to save screenshot" } },
        { status: 400 }
      );
    }

    const evidenceItem: BobScreenshotEvidence = {
      id: `screenshot-${Date.now()}`,
      taskName: taskName.trim(),
      filename: saveResult.filename,
      description: description.trim(),
      date,
      notes: notes.trim() || undefined,
      fileSize: buffer.length,
      url: `/bob_sessions/${saveResult.filename}`,
    };

    // Re-scan repository
    const scanResult = await scanBobSessionsFolder({ userId: user.id });

    return NextResponse.json({
      data: {
        item: evidenceItem,
        scan: scanResult,
      },
    });
  } catch (error) {
    console.error("[POST /api/compliance/upload]", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Screenshot upload failed" } },
      { status: 500 }
    );
  }
}
