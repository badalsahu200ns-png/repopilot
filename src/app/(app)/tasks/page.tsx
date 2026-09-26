import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { CheckSquare, Plus, AlertTriangle, FolderGit2 } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

export const metadata = { title: "Tasks" };

function TaskStatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    created:     { cls: "badge-default",         label: "Created" },
    planned:     { cls: "badge-recommendation",  label: "Planned" },
    in_progress: { cls: "badge-accent",          label: "In Progress" },
    complete:    { cls: "badge-success",         label: "Complete" },
    failed:      { cls: "badge-danger",          label: "Failed" },
  };
  const cfg = map[status] ?? { cls: "badge-default", label: status };
  return <span className={`badge ${cfg.cls}`}>{cfg.label}</span>;
}

export default async function TasksPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("*, repositories(github_owner, github_repo)")
    .eq("user_id", user!.id)
    .order("updated_at", { ascending: false });

  return (
    <div className="p-6 max-w-5xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-heading-md mb-1" style={{ color: "var(--color-text-primary)" }}>
            Tasks
          </h1>
          <p className="text-body-sm" style={{ color: "var(--color-text-secondary)" }}>
            Development tasks with IBM Bob 2.0 implementation plans
          </p>
        </div>
        <Link href="/tasks/new" className="btn btn-primary btn-md gap-1.5 no-underline">
          <Plus size={15} /> New Task
        </Link>
      </div>

      {/* Error state */}
      {error && (
        <div className="card p-6 text-center mb-6"
          style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.2)" }}>
          <AlertTriangle size={24} className="mx-auto mb-3" style={{ color: "var(--color-danger)" }} />
          <p className="text-body-sm" style={{ color: "var(--color-danger)" }}>
            Failed to load tasks. Please refresh the page.
          </p>
        </div>
      )}

      {/* Empty state */}
      {!error && (!tasks || tasks.length === 0) && (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "var(--color-bg-interactive)" }}>
            <CheckSquare size={28} style={{ color: "var(--color-text-tertiary)" }} />
          </div>
          <h2 className="text-heading-sm mb-2" style={{ color: "var(--color-text-primary)" }}>
            No tasks yet
          </h2>
          <p className="text-body-sm mb-6" style={{ color: "var(--color-text-secondary)" }}>
            Create a task to get IBM Bob 2.0 to generate an evidence-backed implementation plan.
          </p>
          <Link href="/tasks/new" className="btn btn-primary btn-md gap-1.5 no-underline">
            <Plus size={15} /> Create your first task
          </Link>
        </div>
      )}

      {/* Task list */}
      {tasks && tasks.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="divide-y" style={{ borderColor: "var(--color-border-default)" }}>
            {(tasks as any[]).map((task) => {
              const repo = task.repositories as { github_owner: string; github_repo: string } | null;
              return (
                <Link
                  key={task.id}
                  href={`/tasks/${task.id}`}
                  className="flex items-center gap-4 px-5 py-4 no-underline transition-colors hover:bg-white/[0.02]"
                >
                  {/* Icon */}
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "var(--color-bg-interactive)" }}>
                    <CheckSquare size={18} style={{ color: "var(--color-text-secondary)" }} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-body-sm font-semibold truncate" style={{ color: "var(--color-text-primary)" }}>
                        {task.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      {repo && (
                        <span className="flex items-center gap-1 text-caption" style={{ color: "var(--color-text-tertiary)" }}>
                          <FolderGit2 size={11} /> {repo.github_owner}/{repo.github_repo}
                        </span>
                      )}
                      <span className="text-caption" style={{ color: "var(--color-text-tertiary)" }}>
                        Updated {formatRelativeTime(task.updated_at)}
                      </span>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="flex-shrink-0">
                    <TaskStatusBadge status={task.status} />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
