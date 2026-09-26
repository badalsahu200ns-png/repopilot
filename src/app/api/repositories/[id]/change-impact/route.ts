import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

const ChangeImpactSchema = z.object({
  change_request: z.string().min(3).max(2000),
});

// POST /api/repositories/:id/change-impact
// Generates a Change Impact Analysis for a natural-language change request
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });

    const { data: repo } = await supabase
      .from("repositories")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (!repo) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Repository not found" } }, { status: 404 });
    if (repo.analysis_status !== "completed") {
      return NextResponse.json({
        error: { code: "NOT_ANALYZED", message: "Repository must be fully analyzed before running change impact analysis." }
      }, { status: 422 });
    }

    const body = await req.json();
    const parsed = ChangeImpactSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", details: parsed.error.flatten() } }, { status: 400 });
    }

    // Fetch snapshot + files for context
    const { data: snapshot } = await supabase
      .from("repository_snapshots")
      .select("*")
      .eq("repository_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: files } = await supabase
      .from("repository_files")
      .select("path, language, is_test, is_doc")
      .eq("repository_id", id)
      .limit(300);

    const impact = await analyzeChangeImpact(
      parsed.data.change_request,
      repo,
      snapshot,
      files ?? []
    );

    return NextResponse.json({ data: impact });
  } catch (error) {
    console.error("[POST /api/repositories/:id/change-impact]", error);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Change impact analysis failed" } }, { status: 500 });
  }
}

type FileRecord = { path: string; language: string | null; is_test: boolean; is_doc: boolean };

async function analyzeChangeImpact(
  changeRequest: string,
  repo: Record<string, unknown>,
  snapshot: Record<string, unknown> | null,
  files: FileRecord[]
) {
  const GEMINI_KEY = process.env.GEMINI_API_KEY;

  const arch = snapshot?.architecture as { overview?: string; layers?: { name: string; description: string }[] } | null;
  const techStack = snapshot?.tech_stack as { frameworks?: { name: string }[] } | null;

  const repoContext = `
Repository: ${repo.github_owner}/${repo.github_repo}
Description: ${repo.description ?? "No description"}
Language: ${repo.language ?? "Unknown"}
Branch: ${repo.default_branch ?? "main"}
Files: ${(snapshot as { file_count?: number } | null)?.file_count ?? files.length} total
Architecture: ${arch?.overview ?? "Unknown"}
Layers: ${arch?.layers?.map((l) => l.name).join(", ") ?? "Unknown"}
Frameworks: ${techStack?.frameworks?.map((f) => f.name).join(", ") ?? "Unknown"}
Key files: ${files.slice(0, 80).map((f) => f.path).join(", ")}
Test files: ${files.filter((f) => f.is_test).slice(0, 20).map((f) => f.path).join(", ") || "None detected"}
  `.trim();

  if (!GEMINI_KEY) {
    return buildHeuristicImpact(changeRequest, files, arch);
  }

  const prompt = `You are a senior software architect performing a Change Impact Analysis.

REPOSITORY CONTEXT:
${repoContext}

REQUESTED CHANGE:
"${changeRequest}"

INSTRUCTIONS:
1. Analyze the change request against the repository context.
2. Identify which architectural layers and modules are likely affected.
3. List specific file paths that are likely to need modification. ONLY list files that actually exist in the "Key files" list above. Never fabricate paths.
4. Identify dependency impacts and test impacts.
5. Assess overall risk as "low", "medium", or "high".
6. Classify each claim: "verified" (direct evidence from files), "inferred" (reasonable structural inference), "recommendation".
7. Never fabricate file paths not present in the provided file list.

Respond with valid JSON only:
{
  "objective": "Restatement of the requested change",
  "summary": "One-paragraph summary of the analysis",
  "risk": "low|medium|high",
  "risk_rationale": "Why this risk level",
  "affected_areas": [
    { "name": "...", "description": "...", "classification": "verified|inferred|recommendation" }
  ],
  "likely_files": [
    { "path": "...", "change_type": "modify|create|delete|test", "reasoning": "...", "classification": "verified|inferred" }
  ],
  "dependencies": [
    { "name": "...", "type": "internal|external", "impact": "...", "classification": "inferred" }
  ],
  "test_impact": "Description of existing tests that may be affected",
  "config_impact": "Description of config/env changes if relevant, or null",
  "api_impact": "Description of API/data flow changes if relevant, or null",
  "implementation_steps": [
    { "number": 1, "title": "...", "description": "...", "files": ["..."], "classification": "recommendation" }
  ],
  "acceptance_criteria": ["..."],
  "risks": [
    { "id": "r1", "title": "...", "description": "...", "severity": "low|medium|high", "classification": "inferred" }
  ]
}`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 2048,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!res.ok) throw new Error(`Gemini API error: ${res.status}`);
    const geminiData = await res.json();
    const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
    const parsed = JSON.parse(text);

    // Validate that file paths are real
    const realPaths = new Set(files.map((f) => f.path));
    const validatedFiles = (parsed.likely_files ?? []).filter(
      (f: { path: string }) => realPaths.has(f.path) || f.path.startsWith("*") || f.path === "NEW_FILE"
    );

    return {
      objective:            parsed.objective            ?? changeRequest,
      summary:              parsed.summary              ?? "",
      risk:                 parsed.risk                 ?? "medium",
      risk_rationale:       parsed.risk_rationale       ?? "",
      affected_areas:       parsed.affected_areas       ?? [],
      likely_files:         validatedFiles,
      dependencies:         parsed.dependencies         ?? [],
      test_impact:          parsed.test_impact          ?? "",
      config_impact:        parsed.config_impact        ?? null,
      api_impact:           parsed.api_impact           ?? null,
      implementation_steps: parsed.implementation_steps ?? [],
      acceptance_criteria:  parsed.acceptance_criteria  ?? [],
      risks:                parsed.risks                ?? [],
      ai_powered:           true,
      classification:       "inferred" as const,
    };
  } catch (err) {
    console.error("[Gemini Change Impact Error]", err);
    return buildHeuristicImpact(changeRequest, files, arch);
  }
}

function buildHeuristicImpact(
  changeRequest: string,
  files: FileRecord[],
  arch: { overview?: string; layers?: { name: string; description: string }[] } | null
) {
  const q = changeRequest.toLowerCase();

  // Keyword-based heuristic matching
  const matchedFiles: { path: string; change_type: string; reasoning: string; classification: string }[] = [];

  if (q.includes("auth") || q.includes("login") || q.includes("password") || q.includes("session")) {
    files.filter((f) => f.path.toLowerCase().includes("auth") || f.path.toLowerCase().includes("session") || f.path.toLowerCase().includes("login"))
      .slice(0, 5)
      .forEach((f) => matchedFiles.push({ path: f.path, change_type: "modify", reasoning: "Auth-related file", classification: "inferred" }));
  }

  if (q.includes("api") || q.includes("route") || q.includes("endpoint")) {
    files.filter((f) => f.path.toLowerCase().includes("api") || f.path.toLowerCase().includes("route"))
      .slice(0, 5)
      .forEach((f) => matchedFiles.push({ path: f.path, change_type: "modify", reasoning: "API/routing file", classification: "inferred" }));
  }

  if (q.includes("database") || q.includes("db") || q.includes("model") || q.includes("schema") || q.includes("migration")) {
    files.filter((f) => f.path.toLowerCase().includes("model") || f.path.toLowerCase().includes("schema") || f.path.toLowerCase().includes("db"))
      .slice(0, 5)
      .forEach((f) => matchedFiles.push({ path: f.path, change_type: "modify", reasoning: "Database-related file", classification: "inferred" }));
  }

  if (q.includes("test") || q.includes("spec")) {
    files.filter((f) => f.is_test)
      .slice(0, 5)
      .forEach((f) => matchedFiles.push({ path: f.path, change_type: "test", reasoning: "Existing test file", classification: "verified" }));
  }

  const testFiles = files.filter((f) => f.is_test);

  return {
    objective:      changeRequest,
    summary:        `Heuristic analysis of "${changeRequest}". Configure GEMINI_API_KEY for AI-powered analysis.`,
    risk:           "medium" as const,
    risk_rationale: "Unable to determine exact risk without AI analysis. Heuristic matching applied.",
    affected_areas: arch?.layers?.map((l) => ({
      name: l.name + " Layer",
      description: l.description,
      classification: "inferred",
    })) ?? [],
    likely_files:   matchedFiles.slice(0, 10),
    dependencies:   [],
    test_impact:    testFiles.length > 0
      ? `${testFiles.length} test files detected. Relevant tests may need updating.`
      : "No test files detected. Changes may be unverifiable.",
    config_impact:   null,
    api_impact:      null,
    implementation_steps: [
      { number: 1, title: "Inspect relevant files", description: "Review the files identified in the impact map.", files: matchedFiles.slice(0, 3).map((f) => f.path), classification: "recommendation" },
      { number: 2, title: "Implement the change", description: `Make the required modification for: ${changeRequest}`, files: [], classification: "recommendation" },
      { number: 3, title: "Update tests", description: "Update or add tests to verify the change.", files: testFiles.slice(0, 2).map((f) => f.path), classification: "recommendation" },
      { number: 4, title: "Verify", description: "Run tests and lint to confirm no regressions.", files: [], classification: "recommendation" },
    ],
    acceptance_criteria: [
      "Change implemented as requested",
      "Existing tests pass",
      "No new lint errors",
    ],
    risks: [
      {
        id: "r1",
        title: "Limited analysis confidence",
        description: "This is a heuristic analysis. Configure GEMINI_API_KEY for AI-powered insights.",
        severity: "low",
        classification: "recommendation",
      },
    ],
    ai_powered:     false,
    classification: "inferred" as const,
  };
}
