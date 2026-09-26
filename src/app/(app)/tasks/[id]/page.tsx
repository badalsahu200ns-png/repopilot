import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, CheckSquare, FolderGit2, Clock, Calendar,
  Cpu, FileCode, Layers, ShieldAlert, AlertCircle, ExternalLink
} from "lucide-react";
import { formatDate, formatRelativeTime } from "@/lib/utils";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const metadata = {
  title: "Task Details",
};

interface SafePlanStep {
  number: number;
  title: string;
  description?: string;
  files?: string[];
  status?: string;
  classification?: string;
}

function parsePlanSteps(raw: unknown): SafePlanStep[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item, idx) => {
    if (typeof item !== "object" || item === null) {
      return {
        number: idx + 1,
        title: String(item),
      };
    }
    const rec = item as Record<string, unknown>;
    const num = typeof rec.number === "number" ? rec.number : idx + 1;
    const title =
      typeof rec.title === "string"
        ? rec.title
        : typeof rec.name === "string"
        ? rec.name
        : `Step ${num}`;
    const description = typeof rec.description === "string" ? rec.description : undefined;
    const files = Array.isArray(rec.files)
      ? rec.files.filter((f): f is string => typeof f === "string")
      : Array.isArray(rec.filesToModify)
      ? rec.filesToModify.filter((f): f is string => typeof f === "string")
      : undefined;
    const status = typeof rec.status === "string" ? rec.status : undefined;
    const classification = typeof rec.classification === "string" ? rec.classification : undefined;

    return {
      number: num,
      title,
      description,
      files,
      status,
      classification,
    };
  });
}

function TaskStatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    created:     { cls: "badge-default",         label: "Created" },
    planned:     { cls: "badge-recommendation",  label: "Planned" },
    in_progress: { cls: "badge-accent",          label: "In Progress" },
    complete:    { cls: "badge-success",         label: "Complete" },
    failed:      { cls: "badge-danger",          label: "Failed" },
  };
  const cfg = map[status] ?? { cls: "badge-default", label: status.replace("_", " ") };
  return <span className={`badge ${cfg.cls}`}>{cfg.label}</span>;
}

export default async function TaskDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 1. Fetch Task scoped strictly by task id AND user id
  const { data: task, error: taskError } = await supabase
    .from("tasks")
    .select("id, title, description, status, repository_id, user_id, impact_analysis, created_at, updated_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (taskError || !task) {
    return (
      <div className="p-6 max-w-4xl mx-auto animate-fade-in">
        <Link href="/tasks" className="btn btn-ghost btn-sm gap-1.5 mb-4 -ml-2">
          <ArrowLeft size={15} /> Back to Tasks
        </Link>
        <div className="card p-12 text-center">
          <AlertCircle size={32} className="mx-auto mb-3" style={{ color: "var(--color-danger)" }} />
          <h2 className="text-heading-sm mb-2" style={{ color: "var(--color-text-primary)" }}>
            Task Not Found
          </h2>
          <p className="text-body-sm mb-6" style={{ color: "var(--color-text-secondary)" }}>
            The requested task does not exist or you do not have permission to view it.
          </p>
          <Link href="/tasks" className="btn btn-primary btn-sm">
            Return to Tasks
          </Link>
        </div>
      </div>
    );
  }

  // 2. Fetch Latest Task Plan (ORDER BY created_at DESC LIMIT 1)
  const { data: latestPlan } = await supabase
    .from("task_plans")
    .select("id, task_id, steps, generated_by, bob_plan_id, created_at")
    .eq("task_id", task.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // 3. Fetch Repository when repository_id exists
  let repository: {
    id: string;
    name: string;
    github_owner: string;
    github_repo: string;
    language: string | null;
    default_branch: string;
    description: string | null;
  } | null = null;

  if (task.repository_id) {
    const { data: repoData } = await supabase
      .from("repositories")
      .select("id, name, github_owner, github_repo, language, default_branch, description")
      .eq("id", task.repository_id)
      .eq("user_id", user.id)
      .maybeSingle();
    repository = repoData;
  }

  const steps = latestPlan ? parsePlanSteps(latestPlan.steps) : [];
  const impact = task.impact_analysis as Record<string, unknown> | null;

  return (
    <div className="p-6 max-w-4xl mx-auto animate-fade-in">
      {/* 1. Back to Tasks */}
      <Link href="/tasks" className="btn btn-ghost btn-sm gap-1.5 mb-4 -ml-2 no-underline">
        <ArrowLeft size={15} /> Back to Tasks
      </Link>

      {/* Header card with Task title, Status, Dates */}
      <div className="card p-6 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              {/* 2. Task title */}
              <h1 className="text-heading-md" style={{ color: "var(--color-text-primary)" }}>
                {task.title}
              </h1>
              {/* 4. Status */}
              <TaskStatusBadge status={task.status} />
            </div>

            {/* 3. Description */}
            <p className="text-body-sm whitespace-pre-wrap" style={{ color: task.description ? "var(--color-text-secondary)" : "var(--color-text-tertiary)" }}>
              {task.description || "No description provided."}
            </p>
          </div>
        </div>

        {/* 6. Created/updated information */}
        <div className="flex items-center gap-4 pt-4 mt-4 border-t flex-wrap text-caption"
          style={{ borderColor: "var(--color-border-default)", color: "var(--color-text-tertiary)" }}>
          <span className="flex items-center gap-1.5">
            <Calendar size={13} /> Created {formatDate(task.created_at)}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock size={13} /> Updated {formatRelativeTime(task.updated_at)}
          </span>
        </div>
      </div>

      {/* 5. Repository Context & 10. Repository X-Ray link */}
      {repository ? (
        <div className="card p-5 mb-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "var(--color-bg-interactive)" }}>
                <FolderGit2 size={18} style={{ color: "var(--color-text-secondary)" }} />
              </div>
              <div>
                <div className="text-caption" style={{ color: "var(--color-text-tertiary)" }}>Repository</div>
                <div className="text-body-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                  {repository.name}
                  <span className="text-caption font-normal ml-2" style={{ color: "var(--color-text-tertiary)" }}>
                    ({repository.github_owner}/{repository.github_repo})
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {repository.language && (
                <span className="badge badge-default">{repository.language}</span>
              )}
              {/* 10. Repository X-Ray Link */}
              <Link
                href={`/repositories/${repository.id}`}
                className="btn btn-secondary btn-sm gap-1.5 no-underline"
              >
                <span>Repository X-Ray</span>
                <ExternalLink size={12} />
              </Link>
            </div>
          </div>
        </div>
      ) : task.repository_id ? (
        <div className="card p-4 mb-6 text-caption" style={{ color: "var(--color-text-tertiary)" }}>
          Associated repository information is unavailable.
        </div>
      ) : null}

      {/* 7. Impact Analysis */}
      <div className="card p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Layers size={16} style={{ color: "var(--color-text-secondary)" }} />
          <h2 className="text-heading-sm" style={{ color: "var(--color-text-primary)" }}>
            Impact Analysis
          </h2>
        </div>

        {impact ? (
          <div className="space-y-4">
            {Array.isArray(impact.affectedModules) && impact.affectedModules.length > 0 && (
              <div>
                <p className="text-label mb-2" style={{ color: "var(--color-text-secondary)" }}>
                  Affected Modules
                </p>
                <div className="space-y-2">
                  {impact.affectedModules.map((m: Record<string, unknown>, i: number) => (
                    <div key={i} className="p-3 rounded-lg flex items-center justify-between"
                      style={{ background: "var(--color-bg-interactive)", border: "1px solid var(--color-border-default)" }}>
                      <span className="text-body-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
                        {String(m.moduleName ?? m.moduleId ?? `Module ${i + 1}`)}
                      </span>
                      {Boolean(m.impactType) && (
                        <span className="badge badge-accent">{String(m.impactType)}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {Array.isArray(impact.affectedFiles) && impact.affectedFiles.length > 0 && (
              <div>
                <p className="text-label mb-2" style={{ color: "var(--color-text-secondary)" }}>
                  Affected Files
                </p>
                <div className="flex flex-wrap gap-2">
                  {impact.affectedFiles.map((f: Record<string, unknown> | string, i: number) => {
                    const path = typeof f === "string" ? f : String(f.path ?? "");
                    return (
                      <span key={i} className="inline-code text-xs">
                        {path}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {Array.isArray(impact.risks) && impact.risks.length > 0 && (
              <div>
                <p className="text-label mb-2" style={{ color: "var(--color-warning)" }}>
                  Risks &amp; Side Effects
                </p>
                <div className="space-y-2">
                  {impact.risks.map((r: Record<string, unknown> | string, i: number) => {
                    const title = typeof r === "string" ? r : String(r.title ?? r.description ?? "");
                    return (
                      <div key={i} className="flex items-start gap-2 text-body-sm"
                        style={{ color: "var(--color-text-secondary)" }}>
                        <ShieldAlert size={14} className="flex-shrink-0 mt-1" style={{ color: "var(--color-warning)" }} />
                        <span>{title}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-body-sm" style={{ color: "var(--color-text-tertiary)" }}>
            Impact analysis has not been generated yet.
          </p>
        )}
      </div>

      {/* 8. Implementation Plan & 9. Plan steps */}
      <div className="card p-6">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-2">
            <CheckSquare size={16} style={{ color: "var(--color-text-secondary)" }} />
            <h2 className="text-heading-sm" style={{ color: "var(--color-text-primary)" }}>
              Implementation Plan
            </h2>
          </div>

          {latestPlan && (
            <div className="flex items-center gap-2">
              {latestPlan.generated_by === "bob" ? (
                <span className="bob-badge">IBM Bob 2.0 Plan</span>
              ) : (
                <span className="badge badge-default">RepoPilot Plan</span>
              )}
              {latestPlan.bob_plan_id && (
                <span className="text-caption font-mono" style={{ color: "var(--color-text-tertiary)" }}>
                  {latestPlan.bob_plan_id}
                </span>
              )}
            </div>
          )}
        </div>

        {latestPlan && steps.length > 0 ? (
          <div className="space-y-3">
            {steps.map((step) => (
              <div
                key={step.number}
                className="p-4 rounded-lg"
                style={{
                  background: "var(--color-bg-interactive)",
                  border: "1px solid var(--color-border-default)",
                }}
              >
                <div className="flex items-start gap-3">
                  {/* Step number */}
                  <div
                    className="step-dot flex-shrink-0"
                    style={{ width: "24px", height: "24px", fontSize: "11px" }}
                  >
                    {step.number}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {/* Title */}
                      <span className="text-body-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                        {step.title}
                      </span>

                      {/* Status */}
                      {step.status && (
                        <span className={`badge ${
                          step.status === "complete" ? "badge-success" :
                          step.status === "active" ? "badge-accent" : "badge-default"
                        }`}>
                          {step.status}
                        </span>
                      )}

                      {/* Classification */}
                      {step.classification && (
                        <span className={`badge badge-${step.classification}`}>
                          {step.classification.toUpperCase()}
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    {step.description && (
                      <p className="text-body-sm mb-2" style={{ color: "var(--color-text-secondary)" }}>
                        {step.description}
                      </p>
                    )}

                    {/* Files */}
                    {step.files && step.files.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap mt-2">
                        <FileCode size={12} style={{ color: "var(--color-text-tertiary)" }} />
                        {step.files.map((file) => (
                          <span key={file} className="inline-code text-xs">
                            {file}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Cpu size={28} className="mx-auto mb-3" style={{ color: "var(--color-text-tertiary)" }} />
            <p className="text-body-sm mb-2" style={{ color: "var(--color-text-secondary)" }}>
              No implementation plan has been generated for this task yet.
            </p>
            <p className="text-caption" style={{ color: "var(--color-text-tertiary)" }}>
              Use Create Task or the analysis workflow to generate plan steps.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
