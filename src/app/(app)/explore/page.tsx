"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Search, Sparkles, FolderGit2, FileCode, Shield, Loader2, ArrowUpRight } from "lucide-react";

interface RepoItem {
  id: string;
  github_owner: string;
  github_repo: string;
  name: string;
  language: string | null;
  description: string | null;
  analysis_status: string;
}

export default function ExplorePage() {
  const [repos, setRepos] = useState<RepoItem[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/repositories");
        const json = await res.json();
        setRepos(Array.isArray(json.data) ? json.data : []);
      } catch {
        setRepos([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredRepos = useMemo(() => {
    if (!query.trim()) return repos;
    const val = query.toLowerCase();
    return repos.filter((repo) =>
      `${repo.github_owner}/${repo.github_repo}`.toLowerCase().includes(val) ||
      (repo.description || "").toLowerCase().includes(val) ||
      (repo.language || "").toLowerCase().includes(val)
    );
  }, [query, repos]);

  return (
    <div className="p-6 max-w-6xl mx-auto animate-fade-in">
      <div className="mb-6">
        <Link href="/dashboard" className="btn btn-ghost btn-sm gap-1.5 mb-4 -ml-2">
          <ArrowLeft size={15} /> Dashboard
        </Link>
        <h1 className="text-heading-md mb-1" style={{ color: "var(--color-text-primary)" }}>Explore repositories</h1>
        <p className="text-body-sm" style={{ color: "var(--color-text-secondary)" }}>
          Search connected repositories, find likely starting points, and understand their structure before changing code.
        </p>
      </div>

      <div className="card p-5 mb-6">
        <div className="flex items-center gap-3">
          <Search size={16} style={{ color: "var(--color-text-secondary)" }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search repo name, owner, language, or keyword"
            className="input flex-1"
          />
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            <div className="card p-8 text-center">
              <Loader2 size={20} className="mx-auto animate-spin" style={{ color: "var(--color-accent)" }} />
              <div className="mt-3 text-body-sm" style={{ color: "var(--color-text-secondary)" }}>Loading connected repositories…</div>
            </div>
          ) : filteredRepos.length === 0 ? (
            <div className="card p-8 text-center">
              <FolderGit2 size={28} className="mx-auto mb-3" style={{ color: "var(--color-text-tertiary)" }} />
              <h2 className="text-heading-sm mb-2" style={{ color: "var(--color-text-primary)" }}>No repositories match</h2>
              <p className="text-body-sm" style={{ color: "var(--color-text-secondary)" }}>
                Connect a GitHub repository to begin exploring it with RepoPilot.
              </p>
              <Link href="/repositories/new" className="btn btn-primary btn-sm mt-4">Connect a repo</Link>
            </div>
          ) : (
            filteredRepos.map((repo) => (
              <Link key={repo.id} href={`/repositories/${repo.id}`} className="card card-interactive p-5 block no-underline">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--color-bg-interactive)" }}>
                      <FileCode size={18} style={{ color: "var(--color-text-secondary)" }} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-body-sm font-semibold truncate" style={{ color: "var(--color-text-primary)" }}>
                        {repo.github_owner}/{repo.github_repo}
                      </div>
                      <div className="text-caption" style={{ color: "var(--color-text-tertiary)" }}>
                        {repo.language || "Unknown language"}
                      </div>
                    </div>
                  </div>
                  <span className={`badge ${repo.analysis_status === "completed" ? "badge-success" : repo.analysis_status === "running" ? "badge-warning" : "badge-default"}`}>
                    {repo.analysis_status}
                  </span>
                </div>

                <p className="text-body-sm" style={{ color: "var(--color-text-secondary)" }}>
                  {repo.description || "No repository description available."}
                </p>

                <div className="mt-4 flex items-center justify-between">
                  <div className="flex flex-wrap gap-1.5">
                    <span className="badge badge-default">X-Ray</span>
                    <span className="badge badge-default">Understand</span>
                    <span className="badge badge-default">Ask</span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-caption" style={{ color: "var(--color-accent-hover)" }}>
                    Open <ArrowUpRight size={12} />
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>

        <div className="space-y-4">
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={16} style={{ color: "var(--color-accent-hover)" }} />
              <h2 className="text-heading-sm" style={{ color: "var(--color-text-primary)" }}>RepoPilot workflow</h2>
            </div>
            <div className="space-y-3">
              {[
                "Connect GitHub",
                "Analyze repository",
                "Understand architecture",
                "Ask evidence-backed questions",
                "Plan and verify changes",
              ].map((step, idx) => (
                <div key={step} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: "var(--color-accent-muted)", color: "var(--color-accent-hover)" }}>
                    {idx + 1}
                  </div>
                  <span className="text-body-sm" style={{ color: "var(--color-text-secondary)" }}>{step}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Shield size={16} style={{ color: "var(--color-success)" }} />
              <h2 className="text-heading-sm" style={{ color: "var(--color-text-primary)" }}>Evidence-first</h2>
            </div>
            <p className="text-body-sm" style={{ color: "var(--color-text-secondary)" }}>
              RepoPilot grounds its explanations in the actual repository structure and file evidence rather than generic AI guesses.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
