import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { ComplianceState, INITIAL_COMPLIANCE_STATE } from "@/types/compliance";
import {
  evaluateComplianceRequirements,
  scanBobSessionsFolder,
} from "@/lib/compliance/service";

/**
 * GET /api/compliance/requirements
 *
 * Returns the evaluated requirement list with verificationSource labels.
 * Read-only: does not modify state or database.
 * Authentication required.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
    }

    // Load saved compliance state
    const { data: record } = await supabase
      .from("compliance_records")
      .select("*")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    const state: ComplianceState =
      record && record.state
        ? (record.state as unknown as ComplianceState)
        : { ...INITIAL_COMPLIANCE_STATE };

    // Always re-scan bob_sessions — the server filesystem is the authoritative source
    const scanResult = await scanBobSessionsFolder({ userId: user.id });
    state.bobSessions = {
      folderDetected: scanResult.folderDetected,
      folderPath: scanResult.folderPath,
      pngCount: scanResult.pngCount,
      pngFiles: scanResult.pngFiles,
      status: scanResult.status,
      checkedAt: new Date().toISOString(),
      scanMessage: scanResult.scanMessage,
    };

    const evaluation = evaluateComplianceRequirements(state);

    return NextResponse.json({ data: evaluation });
  } catch (error) {
    console.error("[GET /api/compliance/requirements]", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to evaluate requirements" } },
      { status: 500 }
    );
  }
}
