import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import {
  FolderGit2, Plus, Clock, CheckCircle, AlertTriangle, Loader2
} from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

export const metadata = { title: "Repositories" };

function StatusBadge({ status }: { status: string }) {
  if (status === "completed") return <span className="badge badge-success gap-1"><CheckCircle size={10} />Analyzed</span>;
  if (status === "running")   return <span className="badge badge-warning gap-1"><Loader2 size={10} className="animate-spin" />Analyzing…</span>;
  if (status === "failed")    return <span className="badge badge-danger gap-1"><AlertTriangle size={10} />Failed</span>;
  return <span className="badge badge-default gap-1"><Clock size={10} />Pending</span>;
}

export default async function RepositoriesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: repos, error } = await supabase
    .from("repositories")
    .select("*")
    .eq("user_id", user!.id)
    .order("updated_at", { ascending: false });

  return (
    <div className="p-6 max-w-5xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-heading-md mb-1" style={{ color: "var(--color-text-primary)" }}>
            Repositories
          </h1>
          <p className="text-body-sm" style={{ color: "var(--color-text-secondary)" }}>
            Connected GitHub repositories and their analysis status
          </p>
        </div>
        <Link href="/repositories/new" className="btn btn-primary btn-md gap-1.5 no-underline">
          <Plus size={15} /> Connect Repository
        </Link>
      </div>

      {/* Error state */}
      {error && (
        <div className="card p-6 text-center mb-6"
          style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.2)" }}>
          <AlertTriangle size={24} className="mx-auto mb-3" style={{ color: "var(--color-danger)" }} />
          <p className="text-body-sm" style={{ color: "var(--color-danger)" }}>
            Failed to load repositories. Please refresh the page.
          </p>
        </div>
      )}

      {/* Empty state */}
      {!error && (!repos || repos.length === 0) && (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "var(--color-bg-interactive)" }}>
            <FolderGit2 size={28} style={{ color: "var(--color-text-tertiary)" }} />
          </div>
          <h2 className="text-heading-sm mb-2" style={{ color: "var(--color-text-primary)" }}>
            No repositories connected
          </h2>
          <p className="text-body-sm mb-6" style={{ color: "var(--color-text-secondary)" }}>
            Connect a GitHub repository to start generating Repository X-Rays and intelligence reports.
          </p>
          <Link href="/repositories/new" className="btn btn-primary btn-md gap-1.5 no-underline">
            <Plus size={15} /> Connect your first repository
          </Link>
        </div>
      )}

      {/* Repository list */}
      {repos && repos.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="divide-y" style={{ borderColor: "var(--color-border-default)" }}>
            {(repos as any[]).map((repo) => (
              <Link
                key={repo.id}
                href={`/repositories/${repo.id}`}
                className="flex items-center gap-4 px-5 py-4 no-underline transition-colors hover:bg-white/[0.02]"
              >
                {/* Icon */}
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "var(--color-bg-interactive)" }}>
                  <FolderGit2 size={18} style={{ color: "var(--color-text-secondary)" }} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-body-sm font-semibold truncate" style={{ color: "var(--color-text-primary)" }}>
                      {repo.github_owner}/{repo.github_repo}
                    </span>
                    {repo.language && (
                      <span className="badge badge-default flex-shrink-0">{repo.language}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {repo.description && (
                      <span className="text-caption truncate" style={{ color: "var(--color-text-tertiary)", maxWidth: "400px" }}>
                        {repo.description}
                      </span>
                    )}
                    <span className="text-caption flex-shrink-0" style={{ color: "var(--color-text-tertiary)" }}>
                      Updated {formatRelativeTime(repo.updated_at)}
                    </span>
                  </div>
                </div>

                {/* Status */}
                <div className="flex-shrink-0">
                  <StatusBadge status={repo.analysis_status} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
