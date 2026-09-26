import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { MessageSquare, ArrowRight, FolderGit2 } from "lucide-react";

export const metadata = { title: "Ask Codebase" };

export default async function AskIndexPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: repos } = await supabase
    .from("repositories")
    .select("id, name, github_owner, github_repo, analysis_status")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  const analyzed = (repos as Array<{ id: string; name: string; github_owner: string; github_repo: string; analysis_status: string }> | null)?.filter((r) => r.analysis_status === "completed") ?? [];

  if (analyzed.length === 1) {
    redirect(`/repositories/${analyzed[0].id}/ask`);
  }

  return (
    <div className="p-6 max-w-3xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-heading-md mb-1" style={{ color: "var(--color-text-primary)" }}>
          Ask Your Codebase
        </h1>
        <p className="text-body-sm" style={{ color: "var(--color-text-secondary)" }}>
          Select an analyzed repository to query with evidence-backed citations.
        </p>
      </div>

      {analyzed.length === 0 ? (
        <div className="card p-12 text-center">
          <MessageSquare size={32} className="mx-auto mb-3" style={{ color: "var(--color-text-tertiary)" }} />
          <h2 className="text-heading-sm mb-2" style={{ color: "var(--color-text-primary)" }}>
            No analyzed repositories found
          </h2>
          <p className="text-body-sm mb-6" style={{ color: "var(--color-text-secondary)" }}>
            You need at least one completed repository analysis before asking questions.
          </p>
          <Link href="/repositories" className="btn btn-primary btn-sm">
            Go to Repositories
          </Link>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="divide-y" style={{ borderColor: "var(--color-border-default)" }}>
            {analyzed.map((repo) => (
              <Link
                key={repo.id}
                href={`/repositories/${repo.id}/ask`}
                className="flex items-center justify-between p-4 no-underline transition-colors hover:bg-white/[0.02]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: "var(--color-bg-interactive)" }}>
                    <FolderGit2 size={16} style={{ color: "var(--color-text-secondary)" }} />
                  </div>
                  <div>
                    <div className="text-body-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
                      {repo.github_owner}/{repo.github_repo}
                    </div>
                  </div>
                </div>
                <div className="btn btn-ghost btn-sm gap-1">
                  <span>Ask</span>
                  <ArrowRight size={13} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
