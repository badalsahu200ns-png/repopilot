import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { ComplianceState, INITIAL_COMPLIANCE_STATE } from "@/types/compliance";
import {
  generateComplianceReport,
  evaluateComplianceRequirements,
  scanBobSessionsFolder,
} from "@/lib/compliance/service";

// GET /api/compliance/export?format=markdown|json
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const format = searchParams.get("format") || "markdown";

    // Load saved state
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

    // Fresh scan of bob_sessions
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

    if (format === "json") {
      const evaluation = evaluateComplianceRequirements(state);
      // Clean JSON containing only compliance evidence (no auth tokens or credentials)
      const exportJson = {
        project: "RepoPilot 2.0",
        hackathon: "IBM Bob 2.0 Hackathon",
        exportedAt: new Date().toISOString(),
        submissionReady: evaluation.readyToSubmit,
        unresolvedActions: evaluation.unresolvedIssues,
        counts: evaluation.counts,
        requirements: evaluation.items.map((item) => ({
          id: item.id,
          title: item.title,
          status: item.status,
          requirement: item.description,
          evidence: item.evidence || [],
          notes: item.notes || null,
        })),
        details: {
          bobIde: {
            used: state.bobIde.used,
            version: state.bobIde.version,
            dateOfUsage: state.bobIde.dateOfUsage,
            tasksCompleted: state.bobIde.tasksCompleted,
          },
          bobSessions: {
            detected: state.bobSessions.folderDetected,
            folderPath: state.bobSessions.folderPath,
            pngCount: state.bobSessions.pngCount,
            pngFiles: state.bobSessions.pngFiles,
          },
          bobScreenshots: state.bobScreenshots.items.map((s) => ({
            taskName: s.taskName,
            filename: s.filename,
            date: s.date,
            description: s.description,
          })),
          dataCompliance: {
            checklist: state.dataCompliance.checklist,
            sources: state.dataCompliance.sources,
          },
          bobcoins: {
            allocation: state.bobcoins.allocation,
            used: state.bobcoins.used,
            remaining: state.bobcoins.remaining,
          },
          ibmid: {
            ibmidEmail: state.ibmid.ibmidEmail,
            hackathonEmail: state.ibmid.hackathonEmail,
            matchStatus: state.ibmid.matchStatus,
          },
          bobVersion: {
            installedVersion: state.bobVersion.installedVersion,
            supportedVersions: state.bobVersion.requirement.supportedVersions,
          },
        },
      };

      return new NextResponse(JSON.stringify(exportJson, null, 2), {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": 'attachment; filename="ibm-bob-2.0-compliance-report.json"',
        },
      });
    }

    // Markdown export
    const markdown = generateComplianceReport(state);
    return new NextResponse(markdown, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": 'attachment; filename="HACKATHON_COMPLIANCE_REPORT.md"',
      },
    });
  } catch (error) {
    console.error("[GET /api/compliance/export]", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to export compliance report" } },
      { status: 500 }
    );
  }
}
