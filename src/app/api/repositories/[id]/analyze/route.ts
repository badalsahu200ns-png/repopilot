import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedGitHubTokenForUser, getGitHubApiHeaders } from "@/lib/github/client";

type Params = { params: Promise<{ id: string }> };

// POST /api/repositories/:id/analyze — Trigger analysis pipeline
export async function POST(_req: NextRequest, { params }: Params) {
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

    if (!repo) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Repository not found" } }, { status: 404 });

    // Mark as running
    await supabase.from("repositories").update({ analysis_status: "running" }).eq("id", id);

    // Run analysis pipeline asynchronously
    // In production this would be a background job queue
    // For MVP: run inline with streaming response
    runAnalysisPipeline(id, repo.github_owner, repo.github_repo, user.id).catch(async (err) => {
      console.error("[Analysis Pipeline Error]", err);
      await supabase.from("repositories").update({ analysis_status: "failed" }).eq("id", id);
    });

    return NextResponse.json({ data: { status: "running", repositoryId: id } }, { status: 202 });
  } catch (error) {
    console.error("[POST /api/repositories/:id/analyze]", error);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR" } }, { status: 500 });
  }
}

// GET /api/repositories/:id/analyze — Get analysis status
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });

    const { data: repo } = await supabase
      .from("repositories")
      .select("id, github_owner, github_repo, name, description, language, default_branch, analysis_status, analyzed_at")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (!repo) return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 });

    const { data: snapshot } = await supabase
      .from("repository_snapshots")
      .select("*")
      .eq("repository_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return NextResponse.json({ data: { ...repo, snapshot } });
  } catch (error) {
    console.error("[GET /api/repositories/:id/analyze]", error);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR" } }, { status: 500 });
  }
}

// ── Analysis Pipeline ─────────────────────────────────────────
async function runAnalysisPipeline(
  repositoryId: string,
  owner: string,
  repo: string,
  userId: string
) {
  const { createClient: createSupabase } = await import("@/lib/supabase/server");
  const supabase = await createSupabase();
  const accessToken = await getAuthenticatedGitHubTokenForUser(userId);

  if (!accessToken) {
    await supabase.from("repositories").update({ analysis_status: "failed" }).eq("id", repositoryId);
    throw new Error("GitHub OAuth token is missing for this user.");
  }

  const ghHeaders = getGitHubApiHeaders(accessToken);

  // Step 1: Fetch repository tree
  const treeRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`,
    { headers: ghHeaders }
  );
  const treeData = await treeRes.json();
  const allFiles: string[] = (treeData.tree ?? [])
    .filter((f: { type: string }) => f.type === "blob")
    .map((f: { path: string }) => f.path);

  // Step 2: Language detection from extensions
  const langCount: Record<string, number> = {};
  const extLangMap: Record<string, string> = {
    ts: "TypeScript", tsx: "TypeScript",
    js: "JavaScript", jsx: "JavaScript",
    py: "Python", go: "Go", rs: "Rust",
    java: "Java", kt: "Kotlin", rb: "Ruby",
    php: "PHP", cs: "C#", cpp: "C++", swift: "Swift",
    dart: "Dart", html: "HTML", css: "CSS", vue: "Vue",
  };

  allFiles.forEach((path) => {
    const ext = path.split(".").pop()?.toLowerCase() ?? "";
    const lang = extLangMap[ext];
    if (lang) langCount[lang] = (langCount[lang] ?? 0) + 1;
  });

  const totalFiles = Object.values(langCount).reduce((a, b) => a + b, 0) || 1;
  const languageBreakdown: Record<string, number> = {};
  for (const [lang, count] of Object.entries(langCount)) {
    languageBreakdown[lang] = Math.round((count / totalFiles) * 100);
  }

  // Step 3: Framework detection from key files
  const keyFiles = ["package.json", "requirements.txt", "pom.xml", "go.mod", "Gemfile", "pyproject.toml", "Cargo.toml"];
  const presentKeyFiles = keyFiles.filter((f) => allFiles.includes(f));
  const frameworks: { name: string; confidence: string; evidence: string[] }[] = [];

  if (allFiles.includes("package.json")) {
    try {
      const pkgRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/package.json`, { headers: ghHeaders });
      if (pkgRes.ok) {
        const pkgData = await pkgRes.json();
        const content = JSON.parse(Buffer.from(pkgData.content, "base64").toString());
        const deps = { ...content.dependencies, ...content.devDependencies };
        if (deps.next)    frameworks.push({ name: "Next.js",  confidence: "high", evidence: ["package.json"] });
        if (deps.react)   frameworks.push({ name: "React",    confidence: "high", evidence: ["package.json"] });
        if (deps.vue)     frameworks.push({ name: "Vue.js",   confidence: "high", evidence: ["package.json"] });
        if (deps.express) frameworks.push({ name: "Express",  confidence: "high", evidence: ["package.json"] });
        if (deps.fastify) frameworks.push({ name: "Fastify",  confidence: "high", evidence: ["package.json"] });
        if (deps.nestjs || deps["@nestjs/core"]) frameworks.push({ name: "NestJS", confidence: "high", evidence: ["package.json"] });
        if (deps.svelte)  frameworks.push({ name: "Svelte",   confidence: "high", evidence: ["package.json"] });
        if (deps.angular || deps["@angular/core"]) frameworks.push({ name: "Angular", confidence: "high", evidence: ["package.json"] });
      }
    } catch { /* ignore */ }
  }

  if (allFiles.includes("requirements.txt") || allFiles.includes("pyproject.toml")) {
    frameworks.push({ name: "Python", confidence: "high", evidence: presentKeyFiles.filter(f => f.endsWith(".txt") || f.endsWith(".toml")) });
    if (allFiles.some(f => f.includes("django"))) frameworks.push({ name: "Django", confidence: "medium", evidence: [] });
    if (allFiles.some(f => f.includes("fastapi"))) frameworks.push({ name: "FastAPI", confidence: "medium", evidence: [] });
  }

  // Step 4: Identify test files
  const testFiles = allFiles.filter(f =>
    f.includes("test") || f.includes("spec") || f.includes("__tests__") || f.endsWith(".test.ts") || f.endsWith(".test.js")
  );

  // Step 4b: Identify entry points
  const entryPointCandidates = ["src/index.ts", "src/index.tsx", "src/main.ts", "src/main.tsx",
    "src/app/page.tsx", "index.ts", "index.js", "app.ts", "app.js", "server.ts", "server.js",
    "src/server.ts", "src/app.ts", "main.py", "app.py", "__init__.py", "cmd/main.go",
  ];
  const entryPoints = entryPointCandidates.filter(f => allFiles.includes(f));

  // Step 4c: Identify key modules (high-value directories)
  const keyModulePaths = ["src/auth", "src/lib/auth", "src/api", "src/routes", "src/services",
    "src/middleware", "src/models", "src/components", "src/hooks", "src/store",
    "src/utils", "src/lib", "src/config", "src/db", "tests", "__tests__",
  ];
  const keyModules = keyModulePaths
    .filter(dir => allFiles.some(f => f.startsWith(dir + "/") || f === dir))
    .map(dir => ({
      path: dir,
      fileCount: allFiles.filter(f => f.startsWith(dir + "/")).length,
      type: dir.includes("auth") ? "auth" :
            dir.includes("api") || dir.includes("route") ? "api" :
            dir.includes("service") ? "service" :
            dir.includes("db") || dir.includes("model") ? "data" :
            dir.includes("test") ? "test" :
            dir.includes("component") || dir.includes("hook") ? "ui" : "other",
    }));

  // Step 5: Identify architecture layers (heuristic)
  const hasFrontend = allFiles.some(f => f.includes("src/app") || f.includes("src/pages") || f.includes("frontend") || f.includes("client") || f.endsWith(".html"));
  const hasBackend  = allFiles.some(f => f.includes("api") || f.includes("server") || f.includes("backend") || f.includes("routes") || f.includes("controllers"));
  const hasDatabase = allFiles.some(f => f.includes("migration") || f.includes("schema") || f.includes("models") || f.includes(".prisma") || f.includes("alembic"));
  const hasDocs     = allFiles.some(f => f === "README.md" || f.startsWith("docs/"));

  const layers: { name: string; description: string; technologies: string[] }[] = [];
  if (hasFrontend) layers.push({ name: "Frontend", description: "Client-side UI layer", technologies: frameworks.filter(f => ["React", "Vue.js", "Next.js", "Angular", "Svelte"].includes(f.name)).map(f => f.name) });
  if (hasBackend)  layers.push({ name: "Backend", description: "Server-side API layer", technologies: frameworks.filter(f => ["Express", "Fastify", "NestJS", "FastAPI", "Django"].includes(f.name)).map(f => f.name) });
  if (hasDatabase) layers.push({ name: "Data", description: "Database and persistence layer", technologies: [] });

  // Step 6: Build risks list
  const risks: { id: string; title: string; description: string; severity: string; classification: string }[] = [];
  if (testFiles.length === 0) risks.push({ id: "r1", title: "No test files detected", description: "No test files were found. Changes may be unverifiable.", severity: "medium", classification: "inferred" });
  if (!hasDocs) risks.push({ id: "r2", title: "No documentation found", description: "No README or docs directory detected.", severity: "low", classification: "verified" });
  if (allFiles.length > 5000) risks.push({ id: "r3", title: "Large repository", description: `${allFiles.length.toLocaleString()} files may impact analysis quality.`, severity: "low", classification: "verified" });

  // Step 7: Store snapshot
  const topLanguage = Object.keys(languageBreakdown)[0] ?? "multi-language";
  const archOverview = (() => {
    const parts = [`${owner}/${repo} is a ${topLanguage} project with ${allFiles.length} files.`];
    if (hasFrontend && hasBackend) parts.push("It has both frontend and backend layers.");
    else if (hasFrontend) parts.push("It appears to be a frontend application.");
    else if (hasBackend)  parts.push("It appears to be a backend/API service.");
    if (frameworks.length > 0) parts.push(`Detected frameworks: ${frameworks.slice(0, 3).map(f => f.name).join(", ")}.`);
    if (testFiles.length > 0)  parts.push(`${testFiles.length} test files detected.`);
    if (entryPoints.length > 0) parts.push(`Entry points: ${entryPoints.join(", ")}.`);
    return parts.join(" ");
  })();

  const snapshotData = {
    repository_id:       repositoryId,
    branch:              "HEAD",
    file_count:          allFiles.length,
    language_breakdown:  languageBreakdown,
    framework_detected:  frameworks,
    architecture:        {
      overview: archOverview,
      layers,
      keyModules: keyModules.slice(0, 10),
      entryPoints,
      classification: "inferred",
    },
    tech_stack: {
      languages: Object.entries(languageBreakdown).map(([name, pct]) => ({ name, percentage: pct, fileCount: Math.round((pct / 100) * allFiles.length) })),
      frameworks,
      packageManagers: presentKeyFiles.includes("package.json") ? ["npm"] : presentKeyFiles.includes("requirements.txt") ? ["pip"] : [],
    },
    risks,
  };

  await supabase.from("repository_snapshots").insert(snapshotData);

  // Store file records (first 2000 only for performance)
  const filesToInsert = allFiles.slice(0, 2000).map((path) => ({
    repository_id: repositoryId,
    path,
    language: (() => {
      const ext = path.split(".").pop()?.toLowerCase() ?? "";
      return extLangMap[ext] ?? null;
    })(),
    is_test: testFiles.includes(path),
    is_doc:  path === "README.md" || path.startsWith("docs/"),
  }));

  if (filesToInsert.length > 0) {
    await supabase.from("repository_files").insert(filesToInsert);
  }

  // Mark analysis complete
  await supabase.from("repositories").update({
    analysis_status: "completed",
    analyzed_at: new Date().toISOString(),
  }).eq("id", repositoryId);

  void userId; // used for future analytics
}

