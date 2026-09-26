"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft, ArrowRight, Loader2, AlertCircle, AlertTriangle,
  CheckCircle, Shield, FileCode, Layers, Cpu, Copy, Check,
  Zap, TestTube, Settings2, GitBranch, Target, ChevronDown, ChevronUp,
  Info
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────

type ClassificationLevel = "verified" | "inferred" | "recommendation" | "unknown";
type RiskLevel = "low" | "medium" | "high";

interface AffectedArea {
  name: string;
  description: string;
  classification: ClassificationLevel;
}

interface LikelyFile {
  path: string;
  change_type: "modify" | "create" | "delete" | "test";
  reasoning: string;
  classification: ClassificationLevel;
}

interface DependencyImpact {
  name: string;
  type: "internal" | "external";
  impact: string;
  classification: ClassificationLevel;
}

interface ImplementationStep {
  number: number;
  title: string;
  description: string;
  files: string[];
  classification: ClassificationLevel;
}

interface RiskItem {
  id: string;
  title: string;
  description: string;
  severity: RiskLevel;
  classification: ClassificationLevel;
}

interface ChangeImpact {
  objective: string;
  summary: string;
  risk: RiskLevel;
  risk_rationale: string;
  affected_areas: AffectedArea[];
  likely_files: LikelyFile[];
  dependencies: DependencyImpact[];
  test_impact: string;
  config_impact: string | null;
  api_impact: string | null;
  implementation_steps: ImplementationStep[];
  acceptance_criteria: string[];
  risks: RiskItem[];
  ai_powered: boolean;
  classification: ClassificationLevel;
}

// ── Sub-components ────────────────────────────────────────────

function ClassBadge({ level }: { level: ClassificationLevel }) {
  const map = {
    verified:       "badge-verified",
    inferred:       "badge-inferred",
    recommendation: "badge-recommendation",
    unknown:        "badge-unknown",
  };
  return <span className={`badge ${map[level]}`}>{level.toUpperCase()}</span>;
}

function RiskBadge({ risk }: { risk: RiskLevel }) {
  const map = {
    low:    { cls: "badge-success",  icon: CheckCircle },
    medium: { cls: "badge-warning",  icon: AlertTriangle },
    high:   { cls: "badge-danger",   icon: Shield },
  };
  const cfg = map[risk];
  const Icon = cfg.icon;
  return (
    <span className={`badge ${cfg.cls} gap-1`}>
      <Icon size={10} />
      {risk.toUpperCase()} RISK
    </span>
  );
}

function ChangeTypeBadge({ type }: { type: LikelyFile["change_type"] }) {
  const map = {
    modify: { cls: "badge-accent",          label: "MODIFY" },
    create: { cls: "badge-success",         label: "CREATE" },
    delete: { cls: "badge-danger",          label: "DELETE" },
    test:   { cls: "badge-recommendation",  label: "TEST" },
  };
  const cfg = map[type];
  return <span className={`badge ${cfg.cls}`}>{cfg.label}</span>;
}

function SectionCard({ icon: Icon, title, badge, children }: {
  icon: React.ElementType; title: string; badge?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="card p-0 overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-5 py-3.5"
        style={{ borderBottom: "1px solid var(--color-border-default)" }}>
        <div className="flex items-center gap-2">
          <Icon size={15} style={{ color: "var(--color-text-secondary)" }} />
          <h3 className="text-heading-sm" style={{ color: "var(--color-text-primary)" }}>{title}</h3>
        </div>
        {badge}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────

export default function ChangeImpactPage() {
  const { id } = useParams<{ id: string }>();
  const [changeRequest, setChangeRequest] = useState("");
  const [loading, setLoading] = useState(false);
  const [impact, setImpact] = useState<ChangeImpact | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [bobTaskCopied, setBobTaskCopied] = useState(false);

  const EXAMPLE_REQUESTS = [
    "Add rate limiting to the API",
    "Implement password reset via email",
    "Add two-factor authentication",
    "Migrate the database from SQLite to PostgreSQL",
    "Add comprehensive error logging and monitoring",
    "Implement user role-based access control",
  ];

  async function analyzeChange(e?: React.FormEvent) {
    e?.preventDefault();
    if (!changeRequest.trim()) return;
    setLoading(true);
    setError(null);
    setImpact(null);

    try {
      const res = await fetch(`/api/repositories/${id}/change-impact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ change_request: changeRequest }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error?.code === "NOT_ANALYZED") {
          throw new Error("__NOT_ANALYZED__");
        }
        throw new Error(data.error?.message ?? "Failed to analyze change impact");
      }
      setImpact(data.data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to analyze change impact";
      setError(msg === "__NOT_ANALYZED__" ? "__NOT_ANALYZED__" : msg);
    } finally {
      setLoading(false);
    }
  }

  const generateBobTaskPackage = useCallback(() => {
    if (!impact) return "";
    return `# IBM Bob Task Package
# Generated by RepoPilot 2.0 — Change Impact Analysis
# Repository: ${id}

## OBJECTIVE
${impact.objective}

## REPOSITORY CONTEXT
- Analysis status: Completed
- Risk level: ${impact.risk.toUpperCase()} — ${impact.risk_rationale}

## CHANGE SUMMARY
${impact.summary}

## AFFECTED AREAS
${impact.affected_areas.map((a) => `- ${a.name} [${a.classification.toUpperCase()}]: ${a.description}`).join("\n")}

## LIKELY FILES TO CHANGE
${impact.likely_files.map((f) => `- ${f.path} (${f.change_type.toUpperCase()}) [${f.classification.toUpperCase()}]: ${f.reasoning}`).join("\n")}

## DEPENDENCY IMPACTS
${impact.dependencies.length > 0
  ? impact.dependencies.map((d) => `- ${d.name} (${d.type}): ${d.impact}`).join("\n")
  : "No significant dependency impacts identified."}

## TEST IMPACT
${impact.test_impact}

## API/DATA IMPACT
${impact.api_impact ?? "No significant API/data impact identified."}

## CONFIGURATION IMPACT
${impact.config_impact ?? "No configuration changes expected."}

## IMPLEMENTATION STEPS
${impact.implementation_steps.map((s) => `${s.number}. ${s.title}
   ${s.description}
   Files: ${s.files.join(", ") || "TBD"}`).join("\n\n")}

## ACCEPTANCE CRITERIA
${impact.acceptance_criteria.map((c) => `- [ ] ${c}`).join("\n")}

## RISKS
${impact.risks.map((r) => `- [${r.severity.toUpperCase()}] ${r.title}: ${r.description}`).join("\n")}

## CONSTRAINTS
- Do not modify files not listed in the impact analysis without explicit approval.
- All changes require corresponding test updates.
- Run the full test suite before marking work as complete.
- Human review required before merging.

## VERIFICATION COMMANDS
- Run: npm test (or equivalent)
- Run: npm run lint
- Run: npm run build
- Review changed files in diff
- Verify acceptance criteria above

---
Generated by RepoPilot 2.0 · AI analysis powered by Gemini · Execution by IBM Bob
NOTE: This analysis is ${impact.ai_powered ? "AI-generated" : "heuristic"} — verify all claims against the actual codebase.
`;
  }, [impact, id]);

  async function copyBobTask() {
    const pkg = generateBobTaskPackage();
    if (!pkg) return;
    await navigator.clipboard.writeText(pkg);
    setBobTaskCopied(true);
    setTimeout(() => setBobTaskCopied(false), 2500);
  }

  async function copyImpactSummary() {
    if (!impact) return;
    const summary = `Change: ${impact.objective}\nRisk: ${impact.risk.toUpperCase()}\nFiles: ${impact.likely_files.map((f) => f.path).join(", ")}\nSteps: ${impact.implementation_steps.length}`;
    await navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="p-6 max-w-5xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <Link href={`/repositories/${id}`} className="btn btn-ghost btn-sm gap-1.5 mb-4 -ml-2">
          <ArrowLeft size={15} /> Repository X-Ray
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-heading-md mb-1" style={{ color: "var(--color-text-primary)" }}>
              Change Impact Analysis
            </h1>
            <p className="text-body-sm" style={{ color: "var(--color-text-secondary)" }}>
              Describe what you need to change. RepoPilot will map the impact, identify files, and generate an IBM Bob task.
            </p>
          </div>
          {impact && (
            <div className="flex items-center gap-2">
              <button onClick={copyImpactSummary} className="btn btn-secondary btn-sm gap-1.5">
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? "Copied" : "Copy Summary"}
              </button>
              <Link
                href={`/tasks/new?repo=${id}&task=${encodeURIComponent(changeRequest)}`}
                className="btn btn-primary btn-sm gap-1.5 no-underline"
              >
                <Cpu size={13} /> Create Task in Bob
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Sub-nav */}
      <div className="flex gap-1 mb-6 overflow-x-auto" style={{ borderBottom: "1px solid var(--color-border-default)" }}>
        {[
          { label: "X-Ray",          href: `/repositories/${id}`,              active: false },
          { label: "Ask Codebase",   href: `/repositories/${id}/ask`,          active: false },
          { label: "Change Impact",  href: `/repositories/${id}/change`,       active: true  },
          { label: "Verify",         href: `/repositories/${id}/verify`,       active: false },
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

      {/* Change Request Form */}
      <div className="card p-6 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Target size={16} style={{ color: "var(--color-accent-hover)" }} />
          <h2 className="text-heading-sm" style={{ color: "var(--color-text-primary)" }}>
            I need to…
          </h2>
        </div>
        <form onSubmit={analyzeChange} className="space-y-4">
          <div>
            <textarea
              value={changeRequest}
              onChange={(e) => setChangeRequest(e.target.value)}
              placeholder="Describe the change you need to make. Be specific. For example: 'Add rate limiting to the API endpoints' or 'Implement password reset via email'."
              rows={3}
              className="input resize-none"
              style={{ fontSize: "1rem", lineHeight: "1.6" }}
              disabled={loading}
            />
            <p className="text-caption mt-1.5" style={{ color: "var(--color-text-tertiary)" }}>
              Be specific. The more context you provide, the more accurate the impact analysis.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {EXAMPLE_REQUESTS.map((ex) => (
              <button key={ex} type="button"
                onClick={() => setChangeRequest(ex)}
                className="btn btn-ghost btn-sm"
                style={{ fontSize: "0.75rem", border: "1px solid var(--color-border-strong)" }}>
                {ex}
              </button>
            ))}
          </div>

          <button type="submit" disabled={loading || !changeRequest.trim()}
            className="btn btn-primary btn-md gap-1.5">
            {loading
              ? <><Loader2 size={15} className="animate-spin" /> Analyzing impact…</>
              : <><Zap size={15} /> Analyze Change Impact</>}
          </button>
        </form>
      </div>

      {/* Error */}
      {error && error !== "__NOT_ANALYZED__" && (
        <div className="flex items-start gap-2.5 p-3 rounded-lg mb-6"
          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
          <AlertCircle size={15} className="flex-shrink-0 mt-0.5" style={{ color: "var(--color-danger)" }} />
          <p className="text-body-sm" style={{ color: "var(--color-danger)" }}>{error}</p>
        </div>
      )}
      {error === "__NOT_ANALYZED__" && (
        <div className="card p-5 mb-6 flex items-start gap-4"
          style={{ background: "rgba(234,179,8,0.05)", border: "1px solid rgba(234,179,8,0.25)" }}>
          <AlertTriangle size={20} className="flex-shrink-0 mt-0.5" style={{ color: "var(--color-warning)" }} />
          <div>
            <p className="text-body-sm font-semibold mb-1" style={{ color: "var(--color-text-primary)" }}>
              Repository not yet analyzed
            </p>
            <p className="text-body-sm mb-3" style={{ color: "var(--color-text-secondary)" }}>
              Run the X-Ray analysis first so RepoPilot can map your codebase before performing change impact analysis.
            </p>
            <Link href={`/repositories/${id}`} className="btn btn-primary btn-sm gap-1.5 no-underline">
              Go to Repository X-Ray → Start Analysis
            </Link>
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-4 animate-fade-in">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-6">
              <div className="skeleton h-4 w-48 mb-4 rounded" />
              <div className="skeleton h-3 w-full mb-2 rounded" />
              <div className="skeleton h-3 w-3/4 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Impact Results */}
      {impact && !loading && (
        <div className="space-y-6 animate-fade-in">
          {/* AI/Heuristic indicator */}
          {!impact.ai_powered && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg"
              style={{ background: "rgba(234,179,8,0.05)", border: "1px solid rgba(234,179,8,0.2)" }}>
              <Info size={14} className="flex-shrink-0 mt-0.5" style={{ color: "var(--color-warning)" }} />
              <p className="text-body-sm" style={{ color: "var(--color-warning)" }}>
                Heuristic analysis — configure <code className="inline-code">GEMINI_API_KEY</code> for AI-powered impact analysis.
              </p>
            </div>
          )}

          {/* Overview Card */}
          <div className="card p-6" style={{ background: "var(--color-bg-surface)" }}>
            <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Target size={15} style={{ color: "var(--color-accent-hover)" }} />
                  <span className="text-label" style={{ color: "var(--color-text-tertiary)" }}>Objective</span>
                </div>
                <p className="text-body" style={{ color: "var(--color-text-primary)" }}>{impact.objective}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <RiskBadge risk={impact.risk} />
                <ClassBadge level={impact.classification} />
              </div>
            </div>
            {impact.summary && (
              <p className="text-body-sm mt-3 pt-3 border-t"
                style={{ color: "var(--color-text-secondary)", borderColor: "var(--color-border-default)" }}>
                {impact.summary}
              </p>
            )}
            {impact.risk_rationale && (
              <div className="mt-3 flex items-start gap-2">
                <Shield size={13} className="flex-shrink-0 mt-0.5" style={{ color: "var(--color-text-tertiary)" }} />
                <p className="text-caption" style={{ color: "var(--color-text-tertiary)" }}>{impact.risk_rationale}</p>
              </div>
            )}
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Affected Areas */}
            {impact.affected_areas.length > 0 && (
              <SectionCard icon={Layers} title="Affected Areas">
                <div className="space-y-2">
                  {impact.affected_areas.map((area, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg"
                      style={{ background: "var(--color-bg-interactive)", border: "1px solid var(--color-border-default)" }}>
                      <div className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                        style={{ background: "var(--color-accent-muted)", color: "var(--color-accent-hover)" }}>
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="text-body-sm font-medium" style={{ color: "var(--color-text-primary)" }}>{area.name}</span>
                          <ClassBadge level={area.classification} />
                        </div>
                        <p className="text-caption" style={{ color: "var(--color-text-secondary)" }}>{area.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            {/* Risks */}
            {impact.risks.length > 0 && (
              <SectionCard icon={Shield} title="Risk Areas">
                <div className="space-y-2">
                  {impact.risks.map((risk) => (
                    <div key={risk.id} className="flex items-start gap-3 p-3 rounded-lg"
                      style={{
                        background: risk.severity === "high" ? "rgba(239,68,68,0.05)" : risk.severity === "medium" ? "rgba(234,179,8,0.05)" : "var(--color-bg-interactive)",
                        border: `1px solid ${risk.severity === "high" ? "rgba(239,68,68,0.2)" : risk.severity === "medium" ? "rgba(234,179,8,0.2)" : "var(--color-border-default)"}`,
                      }}>
                      <AlertTriangle size={13} className="flex-shrink-0 mt-0.5"
                        style={{ color: risk.severity === "high" ? "var(--color-danger)" : risk.severity === "medium" ? "var(--color-warning)" : "var(--color-text-tertiary)" }} />
                      <div>
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="text-body-sm font-medium" style={{ color: "var(--color-text-primary)" }}>{risk.title}</span>
                          <span className={`badge ${risk.severity === "high" ? "badge-danger" : risk.severity === "medium" ? "badge-warning" : "badge-default"}`}>
                            {risk.severity}
                          </span>
                        </div>
                        <p className="text-caption" style={{ color: "var(--color-text-secondary)" }}>{risk.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}
          </div>

          {/* Likely Files — always shown, empty state when no files */}
          <SectionCard icon={FileCode} title="Likely Files"
            badge={<span className="badge badge-default">{impact.likely_files.length} files</span>}>
            {impact.likely_files.length > 0 ? (
              <div className="space-y-2">
                {impact.likely_files.map((file, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg"
                    style={{ background: "var(--color-bg-interactive)", border: "1px solid var(--color-border-default)" }}>
                    <FileCode size={13} className="flex-shrink-0 mt-1" style={{ color: "var(--color-text-tertiary)" }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="inline-code text-xs">{file.path}</span>
                        <ChangeTypeBadge type={file.change_type} />
                        <ClassBadge level={file.classification} />
                      </div>
                      <p className="text-caption" style={{ color: "var(--color-text-secondary)" }}>{file.reasoning}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-4 text-center">
                <p className="text-body-sm mb-1" style={{ color: "var(--color-text-secondary)" }}>
                  No specific files identified from repository evidence.
                </p>
                <p className="text-caption" style={{ color: "var(--color-text-tertiary)" }}>
                  Configure <code className="inline-code">GEMINI_API_KEY</code> for AI-powered file-level analysis.
                </p>
              </div>
            )}
          </SectionCard>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Test Impact */}
            <SectionCard icon={TestTube} title="Test Impact">
              <p className="text-body-sm" style={{ color: "var(--color-text-secondary)" }}>{impact.test_impact}</p>
            </SectionCard>

            {/* Dependencies */}
            {impact.dependencies.length > 0 && (
              <SectionCard icon={GitBranch} title="Dependencies">
                <div className="space-y-2">
                  {impact.dependencies.map((dep, i) => (
                    <div key={i} className="flex items-start gap-2 p-2 rounded"
                      style={{ background: "var(--color-bg-interactive)" }}>
                      <span className={`badge ${dep.type === "internal" ? "badge-accent" : "badge-default"} flex-shrink-0 mt-0.5`}>
                        {dep.type}
                      </span>
                      <div>
                        <div className="text-body-sm font-medium" style={{ color: "var(--color-text-primary)" }}>{dep.name}</div>
                        <div className="text-caption" style={{ color: "var(--color-text-secondary)" }}>{dep.impact}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            {/* Config/API impacts */}
            {(impact.config_impact || impact.api_impact) && (
              <SectionCard icon={Settings2} title="Config & API Impact">
                {impact.api_impact && (
                  <div className="mb-3">
                    <p className="text-label mb-1" style={{ color: "var(--color-text-tertiary)" }}>API / Data Flow</p>
                    <p className="text-body-sm" style={{ color: "var(--color-text-secondary)" }}>{impact.api_impact}</p>
                  </div>
                )}
                {impact.config_impact && (
                  <div>
                    <p className="text-label mb-1" style={{ color: "var(--color-text-tertiary)" }}>Configuration</p>
                    <p className="text-body-sm" style={{ color: "var(--color-text-secondary)" }}>{impact.config_impact}</p>
                  </div>
                )}
              </SectionCard>
            )}
          </div>

          {/* Implementation Plan */}
          {impact.implementation_steps.length > 0 && (
            <SectionCard icon={ArrowRight} title="Implementation Plan">
              <div className="space-y-2 mb-4">
                {impact.implementation_steps.map((step) => (
                  <div key={step.number} className="border rounded-lg overflow-hidden"
                    style={{ borderColor: "var(--color-border-default)" }}>
                    <button
                      className="w-full flex items-center gap-3 p-3 text-left transition-colors"
                      style={{ background: "var(--color-bg-interactive)" }}
                      onClick={() => setExpandedStep(expandedStep === step.number ? null : step.number)}>
                      <div className="step-dot flex-shrink-0" style={{ width: "24px", height: "24px", fontSize: "11px" }}>
                        {step.number}
                      </div>
                      <span className="text-body-sm font-medium flex-1" style={{ color: "var(--color-text-primary)" }}>
                        {step.title}
                      </span>
                      <ClassBadge level={step.classification} />
                      {expandedStep === step.number ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                    {expandedStep === step.number && (
                      <div className="p-3 animate-fade-in"
                        style={{ borderTop: "1px solid var(--color-border-default)", background: "var(--color-bg-surface)" }}>
                        <p className="text-body-sm mb-3" style={{ color: "var(--color-text-secondary)" }}>{step.description}</p>
                        {step.files.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {step.files.map((f) => <span key={f} className="inline-code text-xs">{f}</span>)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {impact.acceptance_criteria.length > 0 && (
                <div className="p-4 rounded-lg" style={{ background: "var(--color-bg-interactive)", border: "1px solid var(--color-border-default)" }}>
                  <p className="text-label mb-2" style={{ color: "var(--color-text-secondary)" }}>Acceptance Criteria</p>
                  <div className="space-y-1.5">
                    {impact.acceptance_criteria.map((c, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <CheckCircle size={13} className="flex-shrink-0 mt-0.5" style={{ color: "var(--color-text-tertiary)" }} />
                        <p className="text-body-sm" style={{ color: "var(--color-text-secondary)" }}>{c}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </SectionCard>
          )}

          {/* IBM Bob Task Package */}
          <div className="card p-6"
            style={{ background: "rgba(20,80,200,0.06)", border: "1px solid rgba(100,150,255,0.2)" }}>
            <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(20,80,200,0.2)", border: "1px solid rgba(100,150,255,0.25)" }}>
                  <Cpu size={20} style={{ color: "#7ba7ff" }} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-body-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>IBM Bob Task</span>
                    <span className="bob-badge">IBM Bob 2.0</span>
                  </div>
                  <p className="text-caption" style={{ color: "var(--color-text-tertiary)" }}>
                    Structured task package — paste directly into IBM Bob IDE
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={copyBobTask} className="btn btn-primary btn-sm gap-1.5">
                  {bobTaskCopied ? <Check size={13} /> : <Copy size={13} />}
                  {bobTaskCopied ? "Copied!" : "Copy Bob Task"}
                </button>
                <Link
                  href={`/tasks/new?repo=${id}&task=${encodeURIComponent(changeRequest)}`}
                  className="btn btn-secondary btn-sm gap-1.5 no-underline"
                >
                  Open Bob Workflow <ArrowRight size={13} />
                </Link>
              </div>
            </div>

            {/* Task preview */}
            <pre className="code-block text-xs overflow-x-auto max-h-64 overflow-y-auto"
              style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {(() => { const pkg = generateBobTaskPackage(); return pkg.length > 600 ? pkg.slice(0, 600) + "…" : pkg; })()}
            </pre>
            <p className="text-caption mt-2" style={{ color: "var(--color-text-tertiary)" }}>
              Click &quot;Copy Bob Task&quot; to copy the full structured task package.
            </p>
          </div>

          {/* Workflow story */}
          <div className="card p-5 flex items-center gap-6 flex-wrap justify-center text-center"
            style={{ background: "var(--color-bg-interactive)", border: "1px solid var(--color-border-default)" }}>
            {[
              { label: "RepoPilot", sub: "Understand + Plan", accent: false },
              { label: "→", sub: "", accent: false },
              { label: "IBM Bob", sub: "Implement + Iterate", accent: true },
              { label: "→", sub: "", accent: false },
              { label: "Verify", sub: "Prove the result", accent: false },
            ].map((item, i) => (
              item.label === "→"
                ? <ArrowRight key={i} size={18} style={{ color: "var(--color-text-tertiary)" }} />
                : (
                  <div key={i}>
                    <div className="text-body-sm font-semibold" style={{ color: item.accent ? "#7ba7ff" : "var(--color-text-primary)" }}>
                      {item.label}
                    </div>
                    <div className="text-caption" style={{ color: "var(--color-text-tertiary)" }}>{item.sub}</div>
                  </div>
                )
            ))}
          </div>

          {/* Continue to Verify */}
          <div className="flex justify-end gap-3">
            <Link
              href={`/repositories/${id}/verify?change=${encodeURIComponent(changeRequest)}`}
              className="btn btn-secondary btn-md gap-1.5 no-underline"
            >
              Verification Center <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
