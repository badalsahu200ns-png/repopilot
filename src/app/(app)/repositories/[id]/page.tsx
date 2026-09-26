"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft, Layers, GitBranch, Clock, AlertTriangle,
  CheckCircle, Code2, Loader2, RefreshCw, FileText,
  Network, TestTube, BookOpen, Cpu, ShieldAlert
} from "lucide-react";
import { getLanguageColor, formatRelativeTime } from "@/lib/utils";
import type { Risk } from "@/types";

// Raw DB snapshot shape (snake_case columns)
interface SnapshotRow {
  id: string;
  repository_id: string;
  file_count: number;
  language_breakdown: Record<string, number>;
  framework_detected: unknown[];
  architecture: unknown;
  tech_stack: unknown;
  risks: unknown[];
  created_at: string;
}

interface RepoData {
  id: string;
  github_owner: string;
  github_repo: string;
  name: string;
  description: string | null;
  language: string | null;
  default_branch: string;
  analysis_status: string;
  analyzed_at: string | null;
  snapshot: SnapshotRow | null;
}

function StatusBadge({ status }: { status: string }) {
  const map = {
    completed: { cls: "badge-success",  icon: CheckCircle, label: "Analyzed" },
    running:   { cls: "badge-warning",  icon: Loader2,      label: "Analyzing…" },
    failed:    { cls: "badge-danger",   icon: AlertTriangle, label: "Failed" },
    pending:   { cls: "badge-default",  icon: Clock,         label: "Pending" },
  };
  const cfg = map[status as keyof typeof map] ?? map.pending;
  const Icon = cfg.icon;
  return (
    <span className={`badge ${cfg.cls} gap-1`}>
      <Icon size={10} className={status === "running" ? "animate-spin" : ""} />
      {cfg.label}
    </span>
  );
}

function SectionCard({ icon: Icon, title, children }: {
  icon: React.ElementType; title: string; children: React.ReactNode;
}) {
  return (
    <div className="card p-0 overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3.5" style={{ borderBottom: "1px solid var(--color-border-default)" }}>
        <Icon size={15} style={{ color: "var(--color-text-secondary)" }} />
        <h2 className="text-heading-sm" style={{ color: "var(--color-text-primary)" }}>{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export default function XRayPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<RepoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/repositories/${id}/analyze`);
      if (!res.ok) throw new Error("Failed to load repository");
      const { data: d } = await res.json();
      setData(d);
      setError(null);

      // Stop polling once complete or failed
      if (d.analysis_status === "completed" || d.analysis_status === "failed") {
        stopPolling();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load X-Ray data");
      stopPolling();
    } finally {
      setLoading(false);
    }
  }, [id, stopPolling]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchData();
    // Poll every 3s while analysis is running
    intervalRef.current = setInterval(() => { void fetchData(); }, 3000);
    return () => stopPolling();
  }, [fetchData, stopPolling]);

  async function triggerReanalysis() {
    await fetch(`/api/repositories/${id}/analyze`, { method: "POST" });
    setData((prev) => prev ? { ...prev, analysis_status: "running", snapshot: null } : prev);
  }

  if (loading) return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 py-16 justify-center">
        <Loader2 size={24} className="animate-spin" style={{ color: "var(--color-accent)" }} />
        <span className="text-body" style={{ color: "var(--color-text-secondary)" }}>Loading X-Ray data…</span>
      </div>
    </div>
  );

  if (error) return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="card p-8 text-center">
        <AlertTriangle size={32} className="mx-auto mb-3" style={{ color: "var(--color-danger)" }} />
        <p className="text-body mb-4" style={{ color: "var(--color-text-secondary)" }}>{error}</p>
        <button onClick={fetchData} className="btn btn-secondary btn-sm">Retry</button>
      </div>
    </div>
  );

  if (!data) return null;

  const snap = data.snapshot;
  const arch = snap?.architecture as {
    overview?: string;
    layers?: { name: string; description: string; technologies: string[] }[];
    keyModules?: { path: string; fileCount: number; type: string }[];
    entryPoints?: string[];
  } | null;
  const techStack = snap?.tech_stack as { languages?: { name: string; percentage: number }[]; frameworks?: { name: string; confidence: string }[]; packageManagers?: string[] } | null;
  const risks = (snap?.risks ?? []) as Risk[];

  const repositoryMap = [
    { title: "Frontend", detail: "UI, pages, and client behavior", files: ["src/app", "src/components", "src/pages"] },
    { title: "Backend", detail: "API routes and services", files: ["api", "server", "routes", "services"] },
    { title: "Data", detail: "Models, persistence, and schemas", files: ["db", "models", "migrations", "schema"] },
    { title: "Integrations", detail: "OAuth, providers, and external services", files: ["auth", "providers", "integrations", "config"] },
  ];

  const startHere = [
    { title: "Entry points", why: "Find the bootstrapping path and app startup flow.", files: ["src/app", "src/main.tsx", "src/index.tsx"] },
    { title: "Auth & session", why: "This is usually where login, OAuth, and user identity live.", files: ["src/auth", "src/lib/auth", "src/app/api/auth"] },
    { title: "Repository access", why: "Check how the app verifies user permissions and repo access.", files: ["src/lib/github", "src/app/api/repositories"] },
    { title: "Important workflows", why: "Trace the user journey from onboarding to task creation.", files: ["src/app/(app)", "src/components/layout"] },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <Link href="/repositories" className="btn btn-ghost btn-sm gap-1.5 mb-4 -ml-2">
          <ArrowLeft size={15} /> Repositories
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-heading-md" style={{ color: "var(--color-text-primary)" }}>
                {data.github_owner}/{data.github_repo}
              </h1>
              <StatusBadge status={data.analysis_status} />
            </div>
            {data.description && (
              <p className="text-body-sm" style={{ color: "var(--color-text-secondary)" }}>{data.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link href={`/repositories/${id}/ask`} className="btn btn-primary btn-sm gap-1.5">
              <Cpu size={13} /> Ask Codebase
            </Link>
            <button onClick={triggerReanalysis} className="btn btn-secondary btn-sm gap-1.5">
              <RefreshCw size={13} /> Re-analyze
            </button>
          </div>
        </div>
      </div>

      {/* Sub-nav */}
      <div className="flex gap-1 mb-6 overflow-x-auto" style={{ borderBottom: "1px solid var(--color-border-default)" }}>
        {[
          { label: "X-Ray",         href: `/repositories/${id}`,          active: true  },
          { label: "Ask Codebase",  href: `/repositories/${id}/ask`,      active: false },
          { label: "Change Impact", href: `/repositories/${id}/change`,   active: false },
          { label: "Verify",        href: `/repositories/${id}/verify`,   active: false },
        ].map((tab) => (
          <Link key={tab.label} href={tab.href}
            className={`px-4 py-2.5 text-body-sm font-medium no-underline border-b-2 transition-colors whitespace-nowrap ${
              tab.active ? "border-indigo-500" : "border-transparent"
            }`}
            style={{ color: tab.active ? "var(--color-accent-hover)" : "var(--color-text-secondary)" }}>
            {tab.label}
          </Link>
        ))}
      </div>

      {data.analysis_status === "running" && (
        <div className="card p-4 mb-6 flex items-center gap-3"
          style={{ background: "rgba(234,179,8,0.05)", border: "1px solid rgba(234,179,8,0.2)" }}>
          <Loader2 size={16} className="animate-spin" style={{ color: "var(--color-warning)" }} />
          <div>
            <div className="text-body-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Analysis in progress</div>
            <div className="text-caption" style={{ color: "var(--color-text-tertiary)" }}>Discovering architecture, languages, and dependencies…</div>
          </div>
        </div>
      )}

      {data.analysis_status === "failed" && (
        <div className="card p-4 mb-6 flex items-center gap-3"
          style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.2)" }}>
          <AlertTriangle size={16} style={{ color: "var(--color-danger)" }} />
          <div className="flex-1">
            <div className="text-body-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Analysis failed</div>
            <div className="text-caption" style={{ color: "var(--color-text-tertiary)" }}>The analysis pipeline encountered an error. Try re-analyzing.</div>
          </div>
          <button onClick={triggerReanalysis} className="btn btn-secondary btn-sm">Retry</button>
        </div>
      )}

      {snap ? (
        <div className="grid gap-6">
          {/* Identity row */}
          <div className="grid sm:grid-cols-4 gap-3">
            {[
              { icon: GitBranch, label: "Branch",   value: data.default_branch },
              { icon: FileText,  label: "Files",    value: snap.file_count?.toLocaleString() ?? "—" },
              { icon: Code2,     label: "Language", value: data.language ?? "Multi-lang" },
              { icon: Clock,     label: "Analyzed", value: data.analyzed_at ? formatRelativeTime(data.analyzed_at) : "—" },
            ].map((item) => (
              <div key={item.label} className="card p-4 flex items-center gap-3">
                <item.icon size={16} style={{ color: "var(--color-text-tertiary)" }} />
                <div>
                  <div className="text-caption" style={{ color: "var(--color-text-tertiary)" }}>{item.label}</div>
                  <div className="text-body-sm font-medium" style={{ color: "var(--color-text-primary)" }}>{item.value}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Languages */}
            {techStack?.languages && techStack.languages.length > 0 && (
              <SectionCard icon={Code2} title="Languages">
                <div className="space-y-3">
                  {techStack.languages.slice(0, 6).map((lang) => (
                    <div key={lang.name}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: getLanguageColor(lang.name) }} />
                          <span className="text-body-sm" style={{ color: "var(--color-text-primary)" }}>{lang.name}</span>
                        </div>
                        <span className="text-caption" style={{ color: "var(--color-text-tertiary)" }}>{lang.percentage}%</span>
                      </div>
                      <div className="confidence-bar">
                        <div className="confidence-fill high" style={{ width: `${lang.percentage}%`, background: getLanguageColor(lang.name) + "99" }} />
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            {/* Frameworks */}
            {techStack?.frameworks && techStack.frameworks.length > 0 && (
              <SectionCard icon={Layers} title="Frameworks & Stack">
                <div className="space-y-2">
                  {techStack.frameworks.map((fw) => (
                    <div key={fw.name} className="flex items-center justify-between py-1.5 border-b last:border-b-0"
                      style={{ borderColor: "var(--color-border-default)" }}>
                      <span className="text-body-sm font-medium" style={{ color: "var(--color-text-primary)" }}>{fw.name}</span>
                      <span className={`badge ${fw.confidence === "high" ? "badge-success" : "badge-warning"}`}>{fw.confidence}</span>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}
          </div>

          {/* Architecture */}
          {arch?.overview && (
            <SectionCard icon={Network} title="Architecture">
              <p className="text-body-sm mb-4" style={{ color: "var(--color-text-secondary)" }}>{arch.overview}</p>
              {arch.layers && arch.layers.length > 0 && (
                <div className="space-y-3">
                  {arch.layers.map((layer, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg"
                      style={{ background: "var(--color-bg-interactive)", border: "1px solid var(--color-border-default)" }}>
                      <div className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background: "var(--color-accent-muted)", color: "var(--color-accent-hover)" }}>{i + 1}</div>
                      <div>
                        <div className="text-body-sm font-medium mb-0.5" style={{ color: "var(--color-text-primary)" }}>{layer.name} Layer</div>
                        <div className="text-caption" style={{ color: "var(--color-text-secondary)" }}>{layer.description}</div>
                        {layer.technologies.length > 0 && (
                          <div className="flex gap-1.5 mt-1.5 flex-wrap">
                            {layer.technologies.map((t) => <span key={t} className="badge badge-accent">{t}</span>)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-3 flex items-center gap-2">
                <span className="badge badge-inferred">INFERRED</span>
                <span className="text-caption" style={{ color: "var(--color-text-tertiary)" }}>Architecture is inferred from file structure</span>
              </div>
            </SectionCard>
            )}
  
            {/* Entry points + Key modules */}
            {(arch?.entryPoints && arch.entryPoints.length > 0 || arch?.keyModules && arch.keyModules.length > 0) && (
              <div className="grid lg:grid-cols-2 gap-6">
                {arch?.entryPoints && arch.entryPoints.length > 0 && (
                  <SectionCard icon={Code2} title="Entry Points">
                    <div className="space-y-2">
                      {arch.entryPoints.map((ep) => (
                        <div key={ep} className="flex items-center gap-2 p-2 rounded"
                          style={{ background: "var(--color-bg-interactive)", border: "1px solid var(--color-border-default)" }}>
                          <Code2 size={12} style={{ color: "var(--color-accent-hover)" }} />
                          <span className="inline-code text-xs">{ep}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <span className="badge badge-verified">VERIFIED</span>
                      <span className="text-caption" style={{ color: "var(--color-text-tertiary)" }}>Detected from repository file tree</span>
                    </div>
                  </SectionCard>
                )}
                {arch?.keyModules && arch.keyModules.length > 0 && (
                  <SectionCard icon={Network} title="Key Modules">
                    <div className="space-y-2">
                      {arch.keyModules.map((mod) => (
                        <div key={mod.path} className="flex items-center justify-between gap-2 p-2 rounded"
                          style={{ background: "var(--color-bg-interactive)", border: "1px solid var(--color-border-default)" }}>
                          <div className="flex items-center gap-2">
                            <FileText size={12} style={{ color: "var(--color-text-tertiary)" }} />
                            <span className="inline-code text-xs">{mod.path}</span>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span className="badge badge-default">{mod.type}</span>
                            {mod.fileCount > 0 && (
                              <span className="text-caption" style={{ color: "var(--color-text-tertiary)" }}>{mod.fileCount} files</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </SectionCard>
                )}
              </div>
            )}
  
            <SectionCard icon={Layers} title="3D Architecture Map">
            <div className="relative overflow-hidden rounded-2xl p-6" style={{ background: "linear-gradient(180deg, rgba(99,102,241,0.10), rgba(15,23,42,0.28))", border: "1px solid rgba(99,102,241,0.20)" }}>
              <div className="pointer-events-none absolute inset-0 opacity-30" style={{ background: "radial-gradient(circle at 50% 0%, rgba(99,102,241,0.25), transparent 45%)" }} />
              <div className="relative flex flex-wrap items-end justify-center gap-4 min-h-[220px] [perspective:1100px]">
                {repositoryMap.map((area, idx) => (
                  <div key={area.title} className="relative rounded-2xl p-4 shadow-2xl border transition-transform duration-200 hover:-translate-y-1"
                    style={{
                      background: "rgba(15,23,42,0.82)",
                      borderColor: "rgba(148,163,184,0.25)",
                      transform: `translateY(${idx * 8}px) rotateX(12deg) rotateY(${idx % 2 === 0 ? -8 : 8}deg)`,
                      width: "180px",
                      minHeight: "130px",
                      boxShadow: "0 20px 35px rgba(3,7,18,0.45), inset 0 1px 0 rgba(255,255,255,0.05)",
                    }}>
                    <div className="text-[10px] uppercase tracking-[0.2em] mb-2" style={{ color: "var(--color-text-tertiary)" }}>{area.title}</div>
                    <div className="text-body-sm font-medium mb-2" style={{ color: "var(--color-text-primary)" }}>{area.detail}</div>
                    <div className="flex flex-wrap gap-1.5">
                      {area.files.map((file) => <span key={file} className="badge badge-default">{file}</span>)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>

          <SectionCard icon={Layers} title="Repository Map">
            <div className="flex flex-wrap gap-3 justify-between">
              {repositoryMap.map((area) => (
                <div key={area.title} className="flex-1 min-w-[180px] rounded-xl p-4" style={{ background: "var(--color-bg-interactive)", border: "1px solid var(--color-border-default)" }}>
                  <div className="text-body-sm font-medium mb-1" style={{ color: "var(--color-text-primary)" }}>{area.title}</div>
                  <div className="text-caption mb-3" style={{ color: "var(--color-text-secondary)" }}>{area.detail}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {area.files.map((file) => (
                      <span key={file} className="badge badge-default">{file}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard icon={Cpu} title="Where to start">
            <div className="grid gap-3">
              {startHere.map((item) => (
                <div key={item.title} className="p-3 rounded-lg" style={{ background: "var(--color-bg-interactive)", border: "1px solid var(--color-border-default)" }}>
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <span className="text-body-sm font-medium" style={{ color: "var(--color-text-primary)" }}>{item.title}</span>
                    <span className="badge badge-recommendation">Likely area</span>
                  </div>
                  <p className="text-caption mb-2" style={{ color: "var(--color-text-secondary)" }}>{item.why}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {item.files.map((file) => (
                      <span key={file} className="badge badge-default">{file}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Testing */}
            <SectionCard icon={TestTube} title="Testing">
              {snap.file_count > 0 ? (
                <div>
                  <p className="text-body-sm mb-3" style={{ color: "var(--color-text-secondary)" }}>
                    Test coverage analysis based on file patterns
                  </p>
                  <a href={`https://github.com/${data.github_owner}/${data.github_repo}`} target="_blank" rel="noopener noreferrer"
                    className="btn btn-secondary btn-sm gap-1.5 no-underline">
                    View repository on GitHub ↗
                  </a>
                </div>
              ) : (
                <p className="text-body-sm" style={{ color: "var(--color-text-secondary)" }}>Analysis needed</p>
              )}
            </SectionCard>

            {/* Documentation */}
            <SectionCard icon={BookOpen} title="Documentation">
              <p className="text-body-sm mb-3" style={{ color: "var(--color-text-secondary)" }}>
                Documentation files detected in repository
              </p>
              <a href={`https://github.com/${data.github_owner}/${data.github_repo}`} target="_blank" rel="noopener noreferrer"
                className="btn btn-secondary btn-sm gap-1.5 no-underline">
                View on GitHub ↗
              </a>
            </SectionCard>
          </div>

          {/* Risks */}
          {risks && risks.length > 0 && (
            <SectionCard icon={ShieldAlert} title="Observations & Risks">
              <div className="space-y-3">
                {risks.map((risk) => (
                  <div key={risk.id} className="flex items-start gap-3 p-3 rounded-lg"
                    style={{
                      background: risk.severity === "high" ? "rgba(239,68,68,0.05)" : risk.severity === "medium" ? "rgba(234,179,8,0.05)" : "var(--color-bg-interactive)",
                      border: `1px solid ${risk.severity === "high" ? "rgba(239,68,68,0.2)" : risk.severity === "medium" ? "rgba(234,179,8,0.2)" : "var(--color-border-default)"}`,
                    }}>
                    <AlertTriangle size={14} className="flex-shrink-0 mt-0.5"
                      style={{ color: risk.severity === "high" ? "var(--color-danger)" : risk.severity === "medium" ? "var(--color-warning)" : "var(--color-text-tertiary)" }} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-body-sm font-medium" style={{ color: "var(--color-text-primary)" }}>{risk.title}</span>
                        <span className={`badge ${risk.severity === "high" ? "badge-danger" : risk.severity === "medium" ? "badge-warning" : "badge-default"}`}>
                          {risk.severity}
                        </span>
                        <span className={`badge badge-${risk.classification}`}>{risk.classification.toUpperCase()}</span>
                      </div>
                      <p className="text-caption" style={{ color: "var(--color-text-secondary)" }}>{risk.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* CTA block — Change Impact + Bob Task */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="card p-5 text-center" style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)" }}>
              <ShieldAlert size={22} className="mx-auto mb-2" style={{ color: "var(--color-accent-hover)" }} />
              <h3 className="text-heading-sm mb-1" style={{ color: "var(--color-text-primary)" }}>I need to change…</h3>
              <p className="text-body-sm mb-4" style={{ color: "var(--color-text-secondary)" }}>
                Analyze change impact, identify files, and generate an IBM Bob task package.
              </p>
              <Link href={`/repositories/${id}/change`} className="btn btn-primary btn-md gap-1.5 no-underline w-full justify-center">
                Change Impact Analysis
              </Link>
            </div>
            <div className="card p-5 text-center" style={{ background: "rgba(20,80,200,0.06)", border: "1px solid rgba(100,150,255,0.2)" }}>
              <Cpu size={22} className="mx-auto mb-2" style={{ color: "#7ba7ff" }} />
              <h3 className="text-heading-sm mb-1" style={{ color: "var(--color-text-primary)" }}>IBM Bob Task</h3>
              <p className="text-body-sm mb-4" style={{ color: "var(--color-text-secondary)" }}>
                Create a task and let IBM Bob generate a structured implementation plan.
              </p>
              <Link href={`/tasks/new?repo=${id}`} className="btn btn-secondary btn-md gap-1.5 no-underline w-full justify-center">
                Create Bob Task
              </Link>
            </div>
          </div>
        </div>
      ) : (
        data.analysis_status === "pending" && (
          <div className="card p-12 text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: "var(--color-accent-muted)", border: "1px solid rgba(99,102,241,0.2)" }}>
              <Layers size={28} style={{ color: "var(--color-accent-hover)" }} />
            </div>
            <h3 className="text-heading-sm mb-2" style={{ color: "var(--color-text-primary)" }}>Analysis pending</h3>
            <p className="text-body-sm mb-4" style={{ color: "var(--color-text-secondary)" }}>
              Trigger the analysis pipeline to generate the Repository X-Ray.
            </p>
            <button onClick={triggerReanalysis} className="btn btn-primary btn-md gap-1.5">
              <RefreshCw size={15} /> Start Analysis
            </button>
          </div>
        )
      )}
    </div>
  );
}
