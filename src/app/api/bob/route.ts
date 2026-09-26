import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const BobRequestSchema = z.object({
  mode:               z.enum(["ask", "plan", "code", "review", "orchestrator"] as const),
  task:               z.string().optional(),
  repositoryContext:  z.string().optional(),
  codebaseContext:    z.string().optional(),
  planId:             z.string().optional(),
  filePaths:          z.array(z.string()).optional(),
});

// POST /api/bob — IBM Bob 2.0 Integration
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });

    const body = await req.json();
    const parsed = BobRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", details: parsed.error.flatten() } }, { status: 400 });
    }

    const { mode, task, repositoryContext, codebaseContext, filePaths } = parsed.data;

    const BOB_API_URL = process.env.IBM_BOB_API_URL;
    const BOB_API_KEY = process.env.IBM_BOB_API_KEY;
    const BOB_PROJECT_ID = process.env.IBM_BOB_PROJECT_ID;

    if (!BOB_API_URL || !BOB_API_KEY) {
      // Fallback: use Gemini for plan/ask mode
      console.warn("[Bob API] Credentials not configured — using Gemini fallback");
      const fallback = await callGeminiFallback(mode, task, repositoryContext, codebaseContext);
      return NextResponse.json({ data: { ...fallback, source: "gemini_fallback", bobAvailable: false } });
    }

    // Call IBM Bob 2.0 API
    // IBM watsonx.ai API endpoint pattern
    const bobResult = await callIBMBob({
      mode,
      task,
      repositoryContext,
      codebaseContext,
      filePaths,
      apiUrl: BOB_API_URL,
      apiKey: BOB_API_KEY,
      projectId: BOB_PROJECT_ID,
    });

    return NextResponse.json({ data: { ...bobResult, source: "ibm_bob", bobAvailable: true } });
  } catch (error) {
    console.error("[POST /api/bob]", error);
    return NextResponse.json({ error: { code: "BOB_ERROR", message: "IBM Bob request failed" } }, { status: 500 });
  }
}

async function callIBMBob(opts: {
  mode: string;
  task?: string;
  repositoryContext?: string;
  codebaseContext?: string;
  filePaths?: string[];
  apiUrl: string;
  apiKey: string;
  projectId?: string;
}) {
  const { mode, task, repositoryContext, codebaseContext, apiUrl, apiKey, projectId } = opts;

  // IBM watsonx.ai text generation endpoint
  // Ref: https://cloud.ibm.com/apidocs/watsonx-ai
  const systemPrompt = buildBobSystemPrompt(mode, repositoryContext);
  const userMessage  = buildBobUserMessage(mode, task, codebaseContext);

  const requestBody = {
    model_id: "ibm/granite-13b-chat-v2",
    project_id: projectId,
    messages: [
      { role: "system",    content: systemPrompt },
      { role: "user",      content: userMessage },
    ],
    parameters: {
      max_new_tokens: 2048,
      temperature: 0.1,
      top_p: 0.9,
    },
  };

  const res = await fetch(`${apiUrl}/ml/v1/text/chat?version=2024-05-31`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(`IBM Bob API error ${res.status}: ${JSON.stringify(errBody)}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? data.results?.[0]?.generated_text ?? "";

  return parseBobResponse(mode, content);
}

function buildBobSystemPrompt(mode: string, repoContext?: string): string {
  const base = `You are IBM Bob 2.0, an expert AI software development partner operating in ${mode.toUpperCase()} MODE.
${repoContext ? `\nREPOSITORY CONTEXT (AGENTS.md):\n${repoContext}` : ""}

You operate with IBM Bob's core principles:
- Evidence over assumptions
- Human-in-the-loop for all code changes
- Security-first development
- Testable, maintainable code
- Structured, auditable output`;

  if (mode === "plan") return base + `\n\nIn PLAN MODE: Generate a detailed, ordered implementation plan with numbered steps. Each step must specify affected files and purpose. Output as JSON.`;
  if (mode === "code") return base + `\n\nIn CODE MODE: Generate precise code modifications. Always explain what changed and why. Never modify files not in the plan.`;
  if (mode === "review") return base + `\n\nIn REVIEW MODE (/review): Audit for security vulnerabilities, code quality issues, and architectural concerns. Be specific and actionable.`;
  return base;
}

function buildBobUserMessage(mode: string, task?: string, context?: string): string {
  if (mode === "plan") {
    return `TASK: ${task ?? "Not specified"}
${context ? `\nCODEBASE CONTEXT:\n${context}` : ""}

Generate a structured implementation plan as JSON:
{
  "objective": "...",
  "steps": [
    { "number": 1, "title": "...", "description": "...", "files": ["..."], "verification": "..." }
  ],
  "risks": ["..."],
  "filesToModify": ["..."]
}`;
  }

  if (mode === "review") {
    return `Review the following files for security issues and code quality:
${context ?? "No files provided"}

Return findings as JSON:
{
  "securityFindings": ["..."],
  "qualityFindings": ["..."],
  "recommendations": ["..."],
  "overallRisk": "low|medium|high"
}`;
  }

  return task ?? "Provide assistance with the development task.";
}

function parseBobResponse(mode: string, content: string) {
  try {
    // Try to extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        mode,
        success: true,
        content,
        steps:            parsed.steps            ?? [],
        filesToModify:    parsed.filesToModify     ?? [],
        risks:            parsed.risks             ?? [],
        securityFindings: parsed.securityFindings  ?? [],
        planId:           `bob-plan-${Date.now()}`,
      };
    }
  } catch { /* fall through */ }

  return { mode, success: true, content, steps: [], filesToModify: [], risks: [], securityFindings: [] };
}

async function callGeminiFallback(mode: string, task?: string, repoContext?: string, context?: string) {
  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_KEY) {
    return {
      mode,
      success: false,
      content: "IBM Bob 2.0 API not configured. Please add IBM_BOB_API_URL and IBM_BOB_API_KEY to environment variables.",
      steps: [],
      filesToModify: [],
      risks: ["IBM Bob API credentials missing"],
    };
  }

  const prompt = buildBobSystemPrompt(mode, repoContext) + "\n\n" + buildBobUserMessage(mode, task, context);

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 2048 },
        }),
      }
    );

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    return parseBobResponse(mode, text);
  } catch {
    return {
      mode, success: false,
      content: "AI service temporarily unavailable.",
      steps: [], filesToModify: [], risks: [],
    };
  }
}
