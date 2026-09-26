import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

// POST /api/repositories/:id/ask — Evidence-backed Q&A
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });

    // Verify ownership
    const { data: repo } = await supabase
      .from("repositories")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();
    if (!repo) return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
    if (repo.analysis_status !== "completed") {
      return NextResponse.json({ error: { code: "NOT_ANALYZED", message: "Repository must be analyzed before asking questions." } }, { status: 422 });
    }

    const body = await req.json();
    const question = (body.question ?? "").trim();
    if (!question) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Question is required" } }, { status: 400 });

    // Fetch snapshot for context
    const { data: snapshot } = await supabase
      .from("repository_snapshots")
      .select("*")
      .eq("repository_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Fetch relevant files as context
    const { data: files } = await supabase
      .from("repository_files")
      .select("path, language, is_test, is_doc")
      .eq("repository_id", id)
      .limit(200);

    // Build context string
    const arch = snapshot?.architecture as { overview?: string; layers?: { name: string }[] } | null;
    const context = `
Repository: ${repo.github_owner}/${repo.github_repo}
Language: ${repo.language ?? "Unknown"}
Files: ${files?.length ?? 0} files analyzed
Architecture: ${arch?.overview ?? "Not yet determined"}
Layers: ${arch?.layers?.map((l: { name: string }) => l.name).join(", ") ?? "Unknown"}
Key file paths: ${files?.slice(0, 50).map((f: { path: string }) => f.path).join(", ") ?? ""}
    `.trim();

    // Call Gemini API for answer
    const answer = await callGeminiForQA(question, context, files ?? []);

    // Save conversation message
    const { data: conversation } = await supabase
      .from("conversations")
      .insert({ repository_id: id, user_id: user.id, title: question.slice(0, 60) })
      .select()
      .single();

    if (conversation) {
      await supabase.from("conversation_messages").insert([
        { conversation_id: conversation.id, role: "user", content: question },
        {
          conversation_id: conversation.id,
          role: "assistant",
          content: answer.content,
          classification: answer.classification,
          confidence: answer.confidence,
          evidence: answer.evidence,
        },
      ]);
    }

    return NextResponse.json({ data: answer });
  } catch (error) {
    console.error("[POST /api/repositories/:id/ask]", error);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Failed to answer question" } }, { status: 500 });
  }
}

type FileRecord = { path: string; language: string | null; is_test: boolean; is_doc: boolean };

async function callGeminiForQA(question: string, repoContext: string, files: FileRecord[]) {
  const GEMINI_KEY = process.env.GEMINI_API_KEY;

  if (!GEMINI_KEY) {
    // Fallback: heuristic answer based on file paths
    return buildHeuristicAnswer(question, files);
  }

  const prompt = `You are a codebase intelligence assistant. Answer the developer's question about their repository.

REPOSITORY CONTEXT:
${repoContext}

DEVELOPER QUESTION:
${question}

INSTRUCTIONS:
1. Answer based ONLY on the provided repository context.
2. Classify your answer: "verified" (direct evidence), "inferred" (reasonable inference), "recommendation" (suggestion), or "unknown" (insufficient data).
3. Identify confidence: "high", "medium", or "low".
4. Cite specific file paths as evidence.
5. Return valid JSON only.

RESPONSE FORMAT:
{
  "content": "Your detailed answer here",
  "classification": "verified|inferred|recommendation|unknown",
  "confidence": "high|medium|low",
  "evidence": [
    { "file": "path/to/file.ts", "symbol": "optional symbol name" }
  ],
  "recommendations": ["optional suggestions"]
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
            maxOutputTokens: 1024,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!res.ok) throw new Error(`Gemini API error: ${res.status}`);
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
    const parsed = JSON.parse(text);

    return {
      content:         parsed.content         ?? "Unable to answer based on available context.",
      classification:  parsed.classification  ?? "unknown",
      confidence:      parsed.confidence      ?? "low",
      evidence:        parsed.evidence        ?? [],
      recommendations: parsed.recommendations ?? [],
    };
  } catch (err) {
    console.error("[Gemini Q&A Error]", err);
    return buildHeuristicAnswer(question, files);
  }
}

function buildHeuristicAnswer(question: string, files: FileRecord[]) {
  const q = question.toLowerCase();
  const matchingFiles: { file: string; symbol?: string }[] = [];

  // Simple keyword matching for common questions
  if (q.includes("auth")) {
    files.filter(f => f.path.toLowerCase().includes("auth")).slice(0, 5).forEach(f => matchingFiles.push({ file: f.path }));
  }
  if (q.includes("test")) {
    files.filter(f => f.is_test).slice(0, 5).forEach(f => matchingFiles.push({ file: f.path }));
  }
  if (q.includes("api") || q.includes("route") || q.includes("endpoint")) {
    files.filter(f => f.path.toLowerCase().includes("api") || f.path.toLowerCase().includes("route")).slice(0, 5).forEach(f => matchingFiles.push({ file: f.path }));
  }
  if (q.includes("database") || q.includes("db") || q.includes("model")) {
    files.filter(f => f.path.toLowerCase().includes("model") || f.path.toLowerCase().includes("schema") || f.path.toLowerCase().includes("migration")).slice(0, 5).forEach(f => matchingFiles.push({ file: f.path }));
  }

  if (matchingFiles.length > 0) {
    return {
      content: `Based on the repository file structure, these files appear relevant to your question: ${matchingFiles.map(f => f.file).join(", ")}. Configure your Gemini API key for AI-powered answers with deeper analysis.`,
      classification: "inferred",
      confidence: "medium",
      evidence: matchingFiles,
      recommendations: ["Add GEMINI_API_KEY to environment variables for AI-powered answers"],
    };
  }

  return {
    content: "Insufficient context to answer this question from the current analysis. Configure your Gemini API key for deeper AI-powered answers, or re-analyze the repository.",
    classification: "unknown",
    confidence: "low",
    evidence: [],
    recommendations: ["Configure GEMINI_API_KEY", "Ensure repository analysis is complete"],
  };
}
