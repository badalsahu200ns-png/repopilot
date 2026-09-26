"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Loader2, AlertCircle, Cpu, CheckCircle,
  FileText, Zap, Shield, ArrowRight, ChevronDown, ChevronUp
} from "lucide-react";
import type { PlanStep } from "@/types";

type BobMode = "plan" | "code" | "review";

interface BobResult {
  source: "ibm_bob" | "gemini_fallback";
  bobAvailable: boolean;
  content: string;
  steps?: PlanStep[];
  filesToModify?: string[];
  risks?: string[];
  securityFindings?: string[];
  success: boolean;
}

export default function NewTaskPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const repoId = searchParams.get("repo") ?? "";
  const taskParam = searchParams.get("task") ?? "";

  const [title, setTitle] = useState(taskParam);
  const [description, setDescription] = useState("");
  const [selectedRepo, setSelectedRepo] = useState(repoId);
  const [repos, setRepos] = useState<{ id: string; github_owner: string; github_repo: string; analysis_status: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [bobLoading, setBobLoading] = useState(false);
  const [bobMode, setBobMode] = useState<BobMode | null>(null);
  const [bobResult, setBobResult] = useState<BobResult | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const [humanApproved, setHumanApproved] = useState(false);

  useEffect(() => {
    fetch("/api/repositories").then(r => r.json()).then(({ data }) => {
      if (data) setRepos(data.filter((r: { analysis_status: string }) => r.analysis_status === "completed"));
    });
  }, []);

  async function createTask() {
    if (!title.trim() || !selectedRepo) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, repository_id: selectedRepo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message ?? "Failed to create task");
      setTaskId(data.data.id);
    } catch (err: unknown) {
      if (err instanceof TypeError && err.message.toLowerCase().includes("fetch")) {
        setError("Unable to connect to RepoPilot API. Please ensure the development server is running at http://localhost:3000.");
      } else {
        setError(err instanceof Error ? err.message : "Failed to create task.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function callBob(mode: BobMode) {
    if (!taskId && !title) return;
    setBobLoading(true);
    setBobMode(mode);
    setError(null);
    setBobResult(null);
    setHumanApproved(false);

    try {
      // Build context from selected repo
      let repoContext = "";
      if (selectedRepo) {
        const snapRes = await fetch(`/api/repositories/${selectedRepo}/analyze`);
        if (snapRes.ok) {
          const snapData = await snapRes.json();
          const snap = snapData.data?.snapshot;
          if (snap) {
            const arch = snap.architecture as { overview?: string };
            repoContext = `Repository Analysis Context:
Architecture: ${arch?.overview ?? "Unknown"}
Files: ${snap.file_count} total`;
          }
        }
      }

      const res = await fetch("/api/bob", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          task: `${title}\n\n${description}`,
          repositoryContext: repoContext,
          codebaseContext:   description,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message ?? "IBM Bob request failed");
      setBobResult(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "IBM Bob request failed");
    } finally {
      setBobLoading(false);
    }
  }

  async function savePlan() {
    if (!taskId || !bobResult?.steps) return;
    await fetch(`/api/tasks/${taskId}/plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ steps: bobResult.steps, generated_by: bobResult.source === "ibm_bob" ? "bob" : "repopilot" }),
    });
    router.push(`/tasks/${taskId}`);
  }

  return (
    <div className="p-6 max-w-3xl mx-auto animate-fade-in">
      <div className="mb-6">
        <Link href="/tasks" className="btn btn-ghost btn-sm gap-1.5 mb-4 -ml-2">
          <ArrowLeft size={15} /> Tasks
        </Link>
        <h1 className="text-heading-md mb-1" style={{ color: "var(--color-text-primary)" }}>Create Task</h1>
        <p className="text-body-sm" style={{ color: "var(--color-text-secondary)" }}>
          Describe your development task. IBM Bob 2.0 will create an evidence-backed implementation plan.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 p-3 rounded-lg mb-4"
          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
          <AlertCircle size={14} className="flex-shrink-0 mt-0.5" style={{ color: "var(--color-danger)" }} />
          <p className="text-body-sm" style={{ color: "var(--color-danger)" }}>{error}</p>
        </div>
      )}

      {/* Step 1: Task Details */}
      <div className="card p-6 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="step-dot active">1</div>
          <h2 className="text-heading-sm" style={{ color: "var(--color-text-primary)" }}>Task Details</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-label mb-1.5 block" style={{ color: "var(--color-text-secondary)" }}>Repository</label>
            <select value={selectedRepo} onChange={(e) => setSelectedRepo(e.target.value)} className="input">
              <option value="">Select analyzed repository…</option>
              {repos.map((r) => (
                <option key={r.id} value={r.id}>{r.github_owner}/{r.github_repo}</option>
              ))}
            </select>
            {repos.length === 0 && (
              <p className="text-caption mt-1.5" style={{ color: "var(--color-text-tertiary)" }}>
                No analyzed repositories.{" "}
                <Link href="/repositories/new" style={{ color: "var(--color-accent-hover)" }}>Connect one first →</Link>
              </p>
            )}
          </div>

          <div>
            <label className="text-label mb-1.5 block" style={{ color: "var(--color-text-secondary)" }}>Task Title *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Add password reset feature"
              className="input" maxLength={200} />
          </div>

          <div>
            <label className="text-label mb-1.5 block" style={{ color: "var(--color-text-secondary)" }}>Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the task in more detail. The more context you provide, the better IBM Bob's plan will be."
              rows={4} className="input resize-none" />
          </div>

          {!taskId && (
            <button onClick={createTask} disabled={loading || !title.trim() || !selectedRepo}
              className="btn btn-primary btn-md gap-1.5">
              {loading ? <><Loader2 size={14} className="animate-spin" /> Creating…</> : <>Create Task <ArrowRight size={14} /></>}
            </button>
          )}
          {taskId && (
            <div className="flex items-center gap-2 text-body-sm" style={{ color: "var(--color-success)" }}>
              <CheckCircle size={16} /> Task created successfully
            </div>
          )}
        </div>
      </div>

      {/* Step 2: IBM Bob */}
      {(taskId || title.trim()) && (
        <div className="card p-6 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <div className={`step-dot ${bobResult ? "complete" : "active"}`}>2</div>
            <h2 className="text-heading-sm" style={{ color: "var(--color-text-primary)" }}>IBM Bob 2.0 Analysis</h2>
            <span className="bob-badge ml-auto">IBM Bob 2.0</span>
          </div>
          <p className="text-body-sm mb-4" style={{ color: "var(--color-text-secondary)" }}>
            Choose how IBM Bob should assist with this task.
          </p>

          <div className="grid sm:grid-cols-3 gap-3 mb-4">
            {[
              { mode: "plan" as BobMode,   icon: FileText, label: "Plan Mode",   desc: "Generate implementation steps" },
              { mode: "code" as BobMode,   icon: Zap,      label: "Code Mode",   desc: "Implement with guidance" },
              { mode: "review" as BobMode, icon: Shield,   label: "Review Mode", desc: "Security & quality audit" },
            ].map((option) => (
              <button key={option.mode} onClick={() => callBob(option.mode)}
                disabled={bobLoading}
                className={`card card-interactive p-4 text-left transition-all ${bobMode === option.mode && bobLoading ? "border-indigo-500/50" : ""}`}>
                <option.icon size={18} className="mb-2" style={{ color: "var(--color-accent-hover)" }} />
                <div className="text-body-sm font-medium mb-0.5" style={{ color: "var(--color-text-primary)" }}>{option.label}</div>
                <div className="text-caption" style={{ color: "var(--color-text-tertiary)" }}>{option.desc}</div>
              </button>
            ))}
          </div>

          {bobLoading && (
            <div className="flex items-center gap-3 p-4 rounded-lg"
              style={{ background: "rgba(20,80,200,0.08)", border: "1px solid rgba(100,150,255,0.15)" }}>
              <Cpu size={16} className="animate-pulse" style={{ color: "#7ba7ff" }} />
              <span className="text-body-sm" style={{ color: "var(--color-text-secondary)" }}>
                IBM Bob is working in {bobMode} mode…
              </span>
            </div>
          )}

          {/* Bob Result */}
          {bobResult && (
            <div className="animate-fade-in">
              {/* Source indicator */}
              <div className="flex items-center gap-2 mb-3">
                {bobResult.bobAvailable
                  ? <span className="bob-badge">IBM Bob 2.0 · {bobMode} mode</span>
                  : <span className="badge badge-warning">Gemini Fallback (Bob API not configured)</span>}
              </div>

              {/* Plan steps */}
              {bobResult.steps && bobResult.steps.length > 0 && (
                <div className="space-y-2 mb-4">
                  <p className="text-label mb-2" style={{ color: "var(--color-text-secondary)" }}>Implementation Plan</p>
                  {bobResult.steps.map((step, i) => (
                    <div key={i} className="border rounded-lg overflow-hidden"
                      style={{ borderColor: "var(--color-border-default)" }}>
                      <button className="w-full flex items-center gap-3 p-3 text-left"
                        style={{ background: "var(--color-bg-interactive)" }}
                        onClick={() => setExpandedStep(expandedStep === i ? null : i)}>
                        <div className="step-dot" style={{ width: "24px", height: "24px", fontSize: "11px" }}>{step.number ?? i + 1}</div>
                        <span className="text-body-sm font-medium flex-1" style={{ color: "var(--color-text-primary)" }}>{step.title}</span>
                        {expandedStep === i ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </button>
                      {expandedStep === i && (
                        <div className="p-3" style={{ borderTop: "1px solid var(--color-border-default)" }}>
                          <p className="text-body-sm mb-2" style={{ color: "var(--color-text-secondary)" }}>{step.description}</p>
                          {step.files?.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {step.files.map((f: string) => <span key={f} className="inline-code text-xs">{f}</span>)}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Risks */}
              {bobResult.risks && bobResult.risks.length > 0 && (
                <div className="p-3 rounded-lg mb-4"
                  style={{ background: "rgba(234,179,8,0.05)", border: "1px solid rgba(234,179,8,0.2)" }}>
                  <p className="text-label mb-2" style={{ color: "var(--color-warning)" }}>Risks identified</p>
                  {bobResult.risks.map((r, i) => (
                    <p key={i} className="text-body-sm" style={{ color: "var(--color-text-secondary)" }}>• {r}</p>
                  ))}
                </div>
              )}

              {/* Human Approval Gate */}
              {bobResult.steps && bobResult.steps.length > 0 && !humanApproved && (
                <div className="card p-4" style={{ background: "var(--color-accent-muted)", border: "1px solid rgba(99,102,241,0.3)" }}>
                  <p className="text-body-sm font-medium mb-1" style={{ color: "var(--color-text-primary)" }}>
                    Human review required
                  </p>
                  <p className="text-caption mb-3" style={{ color: "var(--color-text-secondary)" }}>
                    Review IBM Bob&apos;s plan before proceeding. You remain in full control.
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => setHumanApproved(true)} className="btn btn-primary btn-sm gap-1.5">
                      <CheckCircle size={13} /> Approve Plan
                    </button>
                    <button onClick={() => setBobResult(null)} className="btn btn-secondary btn-sm">
                      Request new plan
                    </button>
                  </div>
                </div>
              )}

              {humanApproved && (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-body-sm" style={{ color: "var(--color-success)" }}>
                    <CheckCircle size={16} /> Plan approved
                  </div>
                  <button onClick={savePlan} className="btn btn-primary btn-sm gap-1.5">
                    Save Plan & Continue <ArrowRight size={13} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
