import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  ComplianceState,
  INITIAL_COMPLIANCE_STATE,
} from "@/types/compliance";
import {
  evaluateComplianceRequirements,
  scanBobSessionsFolder,
} from "@/lib/compliance/service";

// ── Zod validation schema for POST /api/compliance ───────────────────────────

const ComplianceStatusSchema = z.enum(["verified", "needs_attention", "not_verified"]);

const BobIdeSchema = z.object({
  used:           z.boolean().nullable(),
  version:        z.string().max(50),
  dateOfUsage:    z.string().max(20),
  tasksCompleted: z.string().max(500),
  notes:          z.string().max(2000),
  status:         ComplianceStatusSchema,
});

const BobSessionsSchema = z.object({
  folderDetected: z.boolean(),
  folderPath:     z.string().max(500).optional(),
  pngCount:       z.number().int().min(0),
  pngFiles:       z.array(z.string().max(255)),
  status:         ComplianceStatusSchema,
  checkedAt:      z.string().optional(),
  scanMessage:    z.string().optional(),
});

const BobScreenshotEvidenceSchema = z.object({
  id:          z.string().max(100),
  taskName:    z.string().min(1).max(300),
  filename:    z.string().max(255).refine((f) => f.toLowerCase().endsWith(".png"), {
    message: "Filename must end with .png",
  }),
  description: z.string().max(1000),
  date:        z.string().max(20),
  notes:       z.string().max(1000).optional(),
  fileSize:    z.number().int().min(0).optional(),
  url:         z.string().max(500).optional(),
});

const BobScreenshotsSchema = z.object({
  items:  z.array(BobScreenshotEvidenceSchema),
  status: ComplianceStatusSchema,
});

const DataSourceRecordSchema = z.object({
  id:         z.string().max(100),
  source:     z.string().min(1).max(500),
  type:       z.string().max(100),
  permission: z.string().max(500),
  usedFor:    z.string().min(1).max(500),
  verified:   z.boolean(),
});

const DataComplianceChecklistSchema = z.object({
  noConfidentialData:        z.boolean(),
  noPersonalData:            z.boolean(),
  noUnauthorizedSocialData:  z.boolean(),
  ownershipVerified:         z.boolean(),
  publicSourcesChecked:      z.boolean(),
  sourcesDocumented:         z.boolean(),
});

const DataComplianceSchema = z.object({
  checklist: DataComplianceChecklistSchema,
  sources:   z.array(DataSourceRecordSchema),
  status:    ComplianceStatusSchema,
  notes:     z.string().max(2000).optional(),
});

const BobcoinSchema = z.object({
  // Allocation is always 40 — do not allow users to change the official budget.
  allocation: z.literal(40),
  used: z.number().int().min(0).nullable(),
  remaining: z.number().int().nullable(),
  status: ComplianceStatusSchema,
  notes: z.string().max(1000).optional(),
}).transform((data) => ({
  ...data,
  allocation: 40,
  // Always recompute remaining server-side to prevent inconsistency.
  remaining: data.used !== null ? 40 - data.used : null,
}));

const IbmidSchema = z.object({
  ibmidEmail:     z.string().max(254),
  hackathonEmail: z.string().max(254),
  status:         ComplianceStatusSchema,
  matchStatus:    z.enum(["verified", "mismatch", "not_verified"]),
  notes:          z.string().max(1000).optional(),
});

const BobVersionRequirementSchema = z.object({
  minimumVersion:    z.string().max(20).optional(),
  supportedVersions: z.array(z.string().max(20)).optional(),
  notes:             z.string().max(500).optional(),
});

const BobVersionSchema = z.object({
  installedVersion: z.string().max(50),
  requirement:      BobVersionRequirementSchema,
  status:           ComplianceStatusSchema,
  notes:            z.string().max(1000).optional(),
});

const ComplianceStateSchema = z.object({
  bobIde:         BobIdeSchema,
  bobSessions:    BobSessionsSchema,
  bobScreenshots: BobScreenshotsSchema,
  dataCompliance: DataComplianceSchema,
  bobcoins:       BobcoinSchema,
  ibmid:          IbmidSchema,
  bobVersion:     BobVersionSchema,
  lastUpdated:    z.string().optional(),
});

// GET /api/compliance — Get current user compliance state with automatic disk scan
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
    }

    // Try loading existing record from database
    const { data: record } = await supabase
      .from("compliance_records")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const savedState: ComplianceState =
      record && record.state
        ? (record.state as unknown as ComplianceState)
        : { ...INITIAL_COMPLIANCE_STATE };

    savedState.bobcoins = {
      ...savedState.bobcoins,
      allocation: 40,
      remaining:
        savedState.bobcoins.used !== null ? 40 - savedState.bobcoins.used : savedState.bobcoins.remaining,
    };

    // Run active scan of bob_sessions directory
    const scanResult = await scanBobSessionsFolder({ userId: user.id });

    // Update bobSessions in state with real filesystem status
    savedState.bobSessions = {
      folderDetected: scanResult.folderDetected,
      folderPath: scanResult.folderPath,
      pngCount: scanResult.pngCount,
      pngFiles: scanResult.pngFiles,
      status: scanResult.status,
      checkedAt: new Date().toISOString(),
      scanMessage: scanResult.scanMessage,
    };

    // If hackathon email was empty, default to user's logged in email as convenience hint
    if (!savedState.ibmid.hackathonEmail && user.email) {
      savedState.ibmid.hackathonEmail = user.email;
    }

    const evaluation = evaluateComplianceRequirements(savedState);

    return NextResponse.json({
      data: {
        state: savedState,
        evaluation,
      },
    });
  } catch (error) {
    console.error("[GET /api/compliance]", error);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Failed to load compliance state" } }, { status: 500 });
  }
}

// POST /api/compliance — Save updated compliance state
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

    if (!body.state) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "State is required" } },
        { status: 400 }
      );
    }

    const parsed = ComplianceStateSchema.safeParse(body.state);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid compliance state",
            details: parsed.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const incomingState: ComplianceState = parsed.data as ComplianceState;
    incomingState.bobcoins = {
      ...incomingState.bobcoins,
      allocation: 40,
      remaining:
        incomingState.bobcoins.used !== null ? 40 - incomingState.bobcoins.used : null,
    };

    // Always re-check bob_sessions folder to prevent falsification of filesystem state
    const scanResult = await scanBobSessionsFolder({ userId: user.id });
    incomingState.bobSessions = {
      folderDetected: scanResult.folderDetected,
      folderPath: scanResult.folderPath,
      pngCount: scanResult.pngCount,
      pngFiles: scanResult.pngFiles,
      status: scanResult.status,
      checkedAt: new Date().toISOString(),
      scanMessage: scanResult.scanMessage,
    };

    incomingState.lastUpdated = new Date().toISOString();

    const evaluation = evaluateComplianceRequirements(incomingState);

    // Upsert into compliance_records
    const { data: existing } = await supabase
      .from("compliance_records")
      .select("id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("compliance_records")
        .update({
          state: incomingState as unknown as Json,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("compliance_records").insert({
        user_id: user.id,
        state: incomingState as unknown as Json,
      });
    }

    return NextResponse.json({
      data: {
        state: incomingState,
        evaluation,
      },
    });
  } catch (error) {
    console.error("[POST /api/compliance]", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to save compliance state" } },
      { status: 500 }
    );
  }
}
