"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import {
  ArrowLeft, CheckCircle, XCircle, AlertTriangle, HelpCircle,
  TestTube, Hammer, FileCode, Eye, Terminal,
  Copy, Check, Cpu, ArrowRight, RefreshCw, ClipboardList, Target
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────

type CheckStatus = "passed" | "failed" | "not_run" | "needs_verification";

interface VerifyCheck {
  id: string;
  name: string;
  description: string;
  status: CheckStatus;
  command?: string;
  output?: string;
  category: "test" | "lint" | "build" | "type" | "review" | "manual";
}

interface AcceptanceCriterion {
  id: string;
  label: string;
  satisfied: CheckStatus;
  notes?: string;
}

// ── Helpers ───────────────────────────────────────────────────

function StatusIcon({ status }: { status: CheckStatus }) {
  switch (status) {
    case "passed":             return <CheckCircle  size={16} style={{ color: "var(--color-success)" }} />;
    case "failed":             return <XCircle       size={16} style={{ color: "var(--color-danger)" }} />;
    case "not_run":            return <AlertTriangle size={16} style={{ color: "var(--color-warning)" }} />;
    case "needs_verification": return <HelpCircle   size={16} style={{ color: "var(--color-text-tertiary)" }} />;
  }
}

function StatusBadge({ status }: { status: CheckStatus }) {
  const map = {
    passed:             { cls: "badge-success",  label: "✓ Passed" },
    failed:             { cls: "badge-danger",   label: "✕ Failed" },
    not_run:            { cls: "badge-warning",  label: "⚠ Not run" },
    needs_verification: { cls: "badge-default",  label: "? Needs verification" },
  };
  const cfg = map[status];
  return <span className={`badge ${cfg.cls}`}>{cfg.label}</span>;
}

function CheckCard({
  check,
  onStatusChange,
}: {
  check: VerifyCheck;
  onStatusChange: (id: string, status: CheckStatus) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copyCommand() {
    if (!check.command) return;
    await navigator.clipboard.writeText(check.command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const categoryIcon = {
    test:   TestTube,
    lint:   AlertTriangle,
    build:  Hammer,
    type:   FileCode,
    review: Eye,
    manual: ClipboardList,
  };
  const CatIcon = categoryIcon[check.category];

  return (
    <div className="border rounded-lg overflow-hidden"
      style={{
        borderColor: check.status === "passed" ? "rgba(34,197,94,0.25)" : check.status === "failed" ? "rgba(239,68,68,0.25)" : "var(--color-border-default)",
        background: check.status === "passed" ? "rgba(34,197,94,0.03)" : check.status === "failed" ? "rgba(239,68,68,0.03)" : "var(--color-bg-surface)",
      }}>
      {/* Header row */}
      <div className="flex items-center gap-3 p-4">
        <StatusIcon status={check.status} />
        <CatIcon size={14} style={{ color: "var(--color-text-tertiary)" }} />
        <div className="flex-1 min-w-0">
          <div className="text-body-sm font-medium" style={{ color: "var(--color-text-primary)" }}>{check.name}</div>
          <div className="text-caption" style={{ color: "var(--color-text-tertiary)" }}>{check.description}</div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <StatusBadge status={check.status} />
          <button onClick={() => setExpanded(!expanded)}
            className="btn btn-ghost btn-sm" style={{ padding: "4px 6px", fontSize: "0.75rem" }}>
            {expanded ? "Less" : "More"}
          </button>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 animate-fade-in" style={{ borderTop: "1px solid var(--color-border-default)" }}>
          {check.command && (
            <div className="mt-3 mb-3">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-label" style={{ color: "var(--color-text-tertiary)" }}>Command</p>
                <button onClick={copyCommand} className="btn btn-ghost btn-sm gap-1" style={{ padding: "2px 6px" }}>
                  {copied ? <Check size={11} /> : <Copy size={11} />}
                  <span className="text-xs">{copied ? "Copied" : "Copy"}</span>
                </button>
              </div>
              <div className="code-block flex items-center gap-2" style={{ padding: "0.5rem 0.75rem" }}>
                <Terminal size={12} style={{ color: "var(--color-text-tertiary)" }} />
                <code style={{ fontSize: "0.8125rem" }}>{check.command}</code>
              </div>
            </div>
          )}

          {check.output && (
            <div className="mb-3">
              <p className="text-label mb-1.5" style={{ color: "var(--color-text-tertiary)" }}>Expected Output</p>
              <p className="text-body-sm" style={{ color: "var(--color-text-secondary)" }}>{check.output}</p>
            </div>
          )}

          {/* Manual status toggle */}
          <div>
            <p className="text-label mb-2" style={{ color: "var(--color-text-tertiary)" }}>Mark status</p>
            <div className="flex gap-2 flex-wrap">
              {(["passed", "failed", "not_run", "needs_verification"] as CheckStatus[]).map((s) => (
                <button key={s} onClick={() => onStatusChange(check.id, s)}
                  className={`btn btn-sm ${check.status === s ? "btn-primary" : "btn-secondary"}`}
                  style={{ fontSize: "0.75rem" }}>
                  {s.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Default checks ────────────────────────────────────────────

function getDefaultChecks(repoId: string): VerifyCheck[] {
  void repoId; // reserved for future repo-specific check customization
  return [
    {
      id: "tests",
      name: "Test Suite",
      description: "All tests pass without failures",
      status: "not_run",
      command: "npm test",
      output: "All test suites passed. No test failures.",
      category: "test",
    },
    {
      id: "lint",
      name: "Lint",
      description: "No lint errors or warnings",
      status: "not_run",
      command: "npm run lint",
      output: "No ESLint errors or warnings.",
      category: "lint",
    },
    {
      id: "build",
      name: "Build",
      description: "Production build succeeds with no errors",
      status: "not_run",
      command: "npm run build",
      output: "Build completed successfully.",
      category: "build",
    },
    {
      id: "typecheck",
      name: "Type Check",
      description: "No TypeScript type errors",
      status: "not_run",
      command: "npx tsc --noEmit",
      output: "No TypeScript errors.",
      category: "type",
    },
    {
      id: "review",
      name: "Code Review",
      description: "Changed files reviewed for correctness and quality",
      status: "needs_verification",
      category: "review",
    },
    {
      id: "diff",
      name: "Changed Files",
      description: "Review the git diff — changes are minimal and scoped to the task",
      status: "needs_verification",
      command: "git diff --stat HEAD",
      category: "review",
    },
    {
      id: "security",
      name: "Security Check",
      description: "No new security vulnerabilities introduced",
      status: "needs_verification",
      command: "npm audit",
      output: "Found 0 vulnerabilities.",
      category: "review",
    },
    {
      id: "acceptance",
      name: "Acceptance Criteria",
      description: "All acceptance criteria from the change plan are satisfied",
      status: "needs_verification",
      category: "manual",
    },
  ];
}

function getDefaultCriteria(): AcceptanceCriterion[] {
  return [
    { id: "c1", label: "Requested change implemented as described", satisfied: "needs_verification" },
    { id: "c2", label: "Existing functionality not broken", satisfied: "needs_verification" },
    { id: "c3", label: "New tests added for the change", satisfied: "needs_verification" },
    { id: "c4", label: "All existing tests pass", satisfied: "needs_verification" },
    { id: "c5", label: "Build succeeds without errors", satisfied: "needs_verification" },
    { id: "c6", label: "Code reviewed and approved", satisfied: "needs_verification" },
    { id: "c7", label: "No secrets or credentials in changed files", satisfied: "needs_verification" },
  ];
}

// ── Main Page ─────────────────────────────────────────────────

export default function VerifyPage() {
  return (
    <Suspense fallback={<VerifyPageInner changeContext="" />}>
      <VerifyPageContent />
    </Suspense>
  );
}

function VerifyPageContent() {
  const searchParams = useSearchParams();
  const changeContext = searchParams.get("change") ?? "";
  return <VerifyPageInner changeContext={changeContext} />;
}

function VerifyPageInner({ changeContext }: { changeContext: string }) {
  const { id } = useParams<{ id: string }>();
  const [checks, setChecks] = useState<VerifyCheck[]>(() => getDefaultChecks(id));
  const [criteria, setCriteria] = useState<AcceptanceCriterion[]>(getDefaultCriteria);
  const [notes, setNotes] = useState("");
  const [summaryVisible, setSummaryVisible] = useState(false);
  const [summaryCopied, setSummaryCopied] = useState(false);

  function updateCheckStatus(checkId: string, status: CheckStatus) {
    setChecks((prev) => prev.map((c) => c.id === checkId ? { ...c, status } : c));
  }

  function updateCriterionStatus(criterionId: string, status: CheckStatus) {
    setCriteria((prev) => prev.map((c) => c.id === criterionId ? { ...c, satisfied: status } : c));
  }

  function resetAll() {
    setChecks(getDefaultChecks(id));
    setCriteria(getDefaultCriteria());
    setNotes("");
    setSummaryVisible(false);
  }

  const passed  = checks.filter((c) => c.status === "passed").length;
  const failed  = checks.filter((c) => c.status === "failed").length;
  const notRun  = checks.filter((c) => c.status === "not_run").length;
  const total   = checks.length;
  const pct     = Math.round((passed / total) * 100);

  const critPassed = criteria.filter((c) => c.satisfied === "passed").length;
  const critTotal  = criteria.length;

  const overallStatus: CheckStatus =
    failed > 0        ? "failed" :
    notRun > 0        ? "not_run" :
    passed === total  ? "passed" : "needs_verification";

  function generateContributionSummary() {
    const lines = [
      `# Contribution Verification Summary`,
      `Repository: ${id}`,
      `Date: ${new Date().toLocaleDateString()}`,
      ``,
      `## Checks: ${passed}/${total} passed (${pct}%)`,
      ...checks.map((c) => `- ${c.status === "passed" ? "✓" : c.status === "failed" ? "✗" : "?"} ${c.name}: ${c.status.replace("_", " ")}`),
      ``,
      `## Acceptance Criteria: ${critPassed}/${critTotal} satisfied`,
      ...criteria.map((c) => `- ${c.satisfied === "passed" ? "✓" : "?"} ${c.label}`),
      ``,
      notes ? `## Notes\n${notes}` : "",
      ``,
      `---`,
      `Generated by RepoPilot 2.0 Verification Center`,
    ].filter(Boolean);
    return lines.join("\n");
  }

  async function copySummary() {
    await navigator.clipboard.writeText(generateContributionSummary());
    setSummaryCopied(true);
    setTimeout(() => setSummaryCopied(false), 2500);
  }

  const categoryGroups: { label: string; icon: React.ElementType; ids: string[] }[] = [
    { label: "Tests",           icon: TestTube,      ids: ["tests"] },
    { label: "Code Quality",    icon: AlertTriangle,  ids: ["lint", "typecheck"] },
    { label: "Build",           icon: Hammer,         ids: ["build"] },
    { label: "Review",          icon: Eye,            ids: ["review", "diff", "security"] },
    { label: "Acceptance",      icon: ClipboardList,  ids: ["acceptance"] },
  ];

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
              Verification Center
            </h1>
            <p className="text-body-sm" style={{ color: "var(--color-text-secondary)" }}>
              Verify your change is complete, tests pass, build succeeds, and acceptance criteria are satisfied.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={resetAll} className="btn btn-ghost btn-sm gap-1.5">
              <RefreshCw size={13} /> Reset
            </button>
            <button onClick={copySummary} className="btn btn-secondary btn-sm gap-1.5">
              {summaryCopied ? <Check size={13} /> : <Copy size={13} />}
              {summaryCopied ? "Copied!" : "Copy Summary"}
            </button>
          </div>
        </div>
      </div>

      {/* Sub-nav */}
      <div className="flex gap-1 mb-6 overflow-x-auto" style={{ borderBottom: "1px solid var(--color-border-default)" }}>
        {[
          { label: "X-Ray",         href: `/repositories/${id}`,        active: false },
          { label: "Ask Codebase",  href: `/repositories/${id}/ask`,    active: false },
          { label: "Change Impact", href: `/repositories/${id}/change`, active: false },
          { label: "Verify",        href: `/repositories/${id}/verify`, active: true  },
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

      {/* Change context banner — shown when arriving from Change Impact page */}
      {changeContext && (
        <div className="card p-4 mb-6 flex items-start gap-3"
          style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.2)" }}>
          <Target size={15} className="flex-shrink-0 mt-0.5" style={{ color: "var(--color-accent-hover)" }} />
          <div className="flex-1 min-w-0">
            <p className="text-caption mb-0.5" style={{ color: "var(--color-text-tertiary)" }}>Verifying change</p>
            <p className="text-body-sm font-medium truncate" style={{ color: "var(--color-text-primary)" }}>
              {changeContext}
            </p>
          </div>
          <Link
            href={`/repositories/${id}/change`}
            className="btn btn-ghost btn-sm gap-1 no-underline flex-shrink-0"
            style={{ fontSize: "0.75rem" }}>
            ← Impact
          </Link>
        </div>
      )}

      {/* Progress overview */}
      <div className="card p-5 mb-6">
        <div className="flex items-center justify-between gap-4 mb-3 flex-wrap">
          <div className="flex items-center gap-3">
            <StatusIcon status={overallStatus} />
            <div>
              <div className="text-body-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                Overall Status
              </div>
              <div className="text-caption" style={{ color: "var(--color-text-tertiary)" }}>
                {passed} of {total} checks passed · {failed > 0 ? `${failed} failed · ` : ""}{notRun} not run
              </div>
            </div>
          </div>
          <StatusBadge status={overallStatus} />
        </div>

        {/* Progress bar */}
        <div className="confidence-bar" style={{ height: "8px" }}>
          <div
            className={`confidence-fill ${overallStatus === "passed" ? "high" : overallStatus === "failed" ? "low" : "medium"}`}
            style={{ width: `${pct}%`, transition: "width 0.5s ease" }}
          />
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-caption" style={{ color: "var(--color-text-tertiary)" }}>{pct}% complete</span>
          <span className="text-caption" style={{ color: "var(--color-text-tertiary)" }}>
            {critPassed}/{critTotal} acceptance criteria met
          </span>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-2.5 p-3 rounded-lg mb-6"
        style={{ background: "rgba(234,179,8,0.05)", border: "1px solid rgba(234,179,8,0.15)" }}>
        <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" style={{ color: "var(--color-warning)" }} />
        <p className="text-caption" style={{ color: "var(--color-warning)" }}>
          RepoPilot does not run commands automatically. Use the commands below in your terminal and manually mark the status. Only mark &quot;Passed&quot; when you have verified the result yourself.
        </p>
      </div>

      {/* Checks by category */}
      <div className="space-y-6 mb-6">
        {categoryGroups.map((group) => {
          const groupChecks = checks.filter((c) => group.ids.includes(c.id));
          if (groupChecks.length === 0) return null;
          const Icon = group.icon;
          const groupPassed = groupChecks.filter((c) => c.status === "passed").length;
          return (
            <div key={group.label}>
              <div className="flex items-center gap-2 mb-3">
                <Icon size={14} style={{ color: "var(--color-text-tertiary)" }} />
                <span className="text-label" style={{ color: "var(--color-text-secondary)" }}>{group.label}</span>
                <span className="text-caption" style={{ color: "var(--color-text-tertiary)" }}>
                  ({groupPassed}/{groupChecks.length})
                </span>
              </div>
              <div className="space-y-2">
                {groupChecks.map((check) => (
                  <CheckCard key={check.id} check={check} onStatusChange={updateCheckStatus} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Acceptance Criteria */}
      <div className="card p-0 overflow-hidden mb-6">
        <div className="flex items-center gap-2 px-5 py-3.5"
          style={{ borderBottom: "1px solid var(--color-border-default)" }}>
          <ClipboardList size={15} style={{ color: "var(--color-text-secondary)" }} />
          <h3 className="text-heading-sm" style={{ color: "var(--color-text-primary)" }}>Acceptance Criteria</h3>
          <span className="text-caption ml-auto" style={{ color: "var(--color-text-tertiary)" }}>
            {critPassed}/{critTotal} satisfied
          </span>
        </div>
        <div className="p-5 space-y-2">
          {criteria.map((c) => (
            <div key={c.id} className="flex items-center gap-3 p-3 rounded-lg"
              style={{
                background: c.satisfied === "passed" ? "rgba(34,197,94,0.04)" : "var(--color-bg-interactive)",
                border: `1px solid ${c.satisfied === "passed" ? "rgba(34,197,94,0.2)" : "var(--color-border-default)"}`,
              }}>
              <button
                onClick={() => updateCriterionStatus(c.id, c.satisfied === "passed" ? "needs_verification" : "passed")}
                className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center transition-colors"
                style={{
                  background: c.satisfied === "passed" ? "rgba(34,197,94,0.2)" : "var(--color-bg-overlay)",
                  border: `1px solid ${c.satisfied === "passed" ? "rgba(34,197,94,0.4)" : "var(--color-border-strong)"}`,
                }}>
                {c.satisfied === "passed" && <CheckCircle size={12} style={{ color: "var(--color-success)" }} />}
              </button>
              <span className="text-body-sm flex-1" style={{
                color: c.satisfied === "passed" ? "var(--color-text-secondary)" : "var(--color-text-primary)",
                textDecoration: c.satisfied === "passed" ? "line-through" : "none",
              }}>
                {c.label}
              </span>
              <StatusBadge status={c.satisfied} />
            </div>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div className="card p-5 mb-6">
        <label className="text-label block mb-2" style={{ color: "var(--color-text-secondary)" }}>
          Verification Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any notes about remaining risks, follow-up tasks, or caveats…"
          rows={3}
          className="input resize-none"
        />
      </div>

      {/* Contribution Summary */}
      {overallStatus === "passed" && (
        <div className="card p-6 mb-6 animate-fade-in"
          style={{ background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.2)" }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)" }}>
              <CheckCircle size={20} style={{ color: "var(--color-success)" }} />
            </div>
            <div>
              <div className="text-body-sm font-semibold mb-0.5" style={{ color: "var(--color-success)" }}>
                All checks passed!
              </div>
              <div className="text-caption" style={{ color: "var(--color-text-secondary)" }}>
                From unfamiliar codebase to verified contribution.
              </div>
            </div>
          </div>
          <button onClick={() => setSummaryVisible(!summaryVisible)} className="btn btn-secondary btn-sm gap-1.5 mb-3">
            <ClipboardList size={13} /> {summaryVisible ? "Hide" : "View"} Contribution Summary
          </button>
          {summaryVisible && (
            <pre className="code-block text-xs overflow-x-auto max-h-64 overflow-y-auto whitespace-pre-wrap">
              {generateContributionSummary()}
            </pre>
          )}
        </div>
      )}

      {/* Footer actions */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(20,80,200,0.15)", border: "1px solid rgba(100,150,255,0.2)" }}>
            <Cpu size={15} style={{ color: "#7ba7ff" }} />
          </div>
          <div>
            <div className="text-body-sm font-medium" style={{ color: "var(--color-text-primary)" }}>IBM Bob 2.0</div>
            <div className="text-caption" style={{ color: "var(--color-text-tertiary)" }}>Used to implement the task</div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/repositories/${id}/change`} className="btn btn-secondary btn-sm gap-1.5 no-underline">
            <ArrowLeft size={13} /> Change Impact
          </Link>
          <Link href={`/tasks/new?repo=${id}`} className="btn btn-primary btn-sm gap-1.5 no-underline">
            <Cpu size={13} /> New Bob Task <ArrowRight size={13} />
          </Link>
        </div>
      </div>

      {/* Product story */}
      <div className="mt-6 p-4 rounded-xl text-center"
        style={{ background: "var(--color-bg-interactive)", border: "1px solid var(--color-border-default)" }}>
        <p className="text-body-sm font-semibold mb-1" style={{ color: "var(--color-text-primary)" }}>
          From unfamiliar codebase to verified contribution.
        </p>
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {["Connect", "X-Ray", "Ask", "Change Impact", "Plan", "IBM Bob", "Verify"].map((step, i, arr) => (
            <span key={step} className="flex items-center gap-2">
              <span className="text-caption" style={{ color: i === 6 ? "var(--color-success)" : "var(--color-text-secondary)" }}>
                {step}
              </span>
              {i < arr.length - 1 && <span style={{ color: "var(--color-text-tertiary)" }}>→</span>}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
