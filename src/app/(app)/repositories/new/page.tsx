"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, GitBranch, Loader2, AlertCircle, CheckCircle, Lock, Globe } from "lucide-react";

export default function NewRepositoryPage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function validateGitHubUrl(rawUrl: string): { owner: string; repo: string } | null {
    const clean = rawUrl.trim().replace(/\.git$/, "");
    const match = clean.match(/github\.com[:/]([^/]+)\/([^/]+?)(?:\/|$)/);
    if (!match) return null;
    return { owner: match[1], repo: match[2] };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = validateGitHubUrl(url);
    if (!parsed) {
      setError("Please enter a valid GitHub repository URL (e.g. https://github.com/owner/repo)");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/repositories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          github_url: url.trim(),
          github_owner: parsed.owner,
          github_repo: parsed.repo,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message ?? "Failed to connect repository");

      // Trigger analysis
      await fetch(`/api/repositories/${data.data.id}/analyze`, { method: "POST" });

      router.push(`/repositories/${data.data.id}`);
    } catch (err: unknown) {
      if (err instanceof TypeError && err.message.toLowerCase().includes("fetch")) {
        setError("Unable to connect to RepoPilot API. Please ensure the development server is running at http://localhost:3000.");
      } else {
        setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  const parsed = validateGitHubUrl(url);
  const isValid = parsed !== null;

  return (
    <div className="p-6 max-w-2xl mx-auto animate-fade-in">
      <div className="mb-6">
        <Link href="/repositories" className="btn btn-ghost btn-sm gap-1.5 mb-4 -ml-2">
          <ArrowLeft size={15} /> Back to Repositories
        </Link>
        <h1 className="text-heading-md mb-1" style={{ color: "var(--color-text-primary)" }}>Connect Repository</h1>
        <p className="text-body-sm" style={{ color: "var(--color-text-secondary)" }}>
          Connect a GitHub repository to generate a Repository X-Ray and start the contribution workflow.
        </p>
      </div>

      <div className="card p-6">
        {error && (
          <div className="flex items-start gap-2.5 p-3 rounded-lg mb-5"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <AlertCircle size={15} className="flex-shrink-0 mt-0.5" style={{ color: "var(--color-danger)" }} />
            <p className="text-body-sm" style={{ color: "var(--color-danger)" }}>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="repo-url" className="text-label mb-1.5 block" style={{ color: "var(--color-text-secondary)" }}>
              GitHub Repository URL *
            </label>
            <div className="relative">
              <input
                id="repo-url"
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://github.com/owner/repository"
                className="input input-mono pr-10"
              />
              {url.length > 0 && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {isValid
                    ? <CheckCircle size={15} style={{ color: "var(--color-success)" }} />
                    : <AlertCircle size={15} style={{ color: "var(--color-danger)" }} />}
                </div>
              )}
            </div>
            {parsed && (
              <div className="mt-2 flex items-center gap-2">
                <GitBranch size={13} style={{ color: "var(--color-text-tertiary)" }} />
                <span className="text-caption" style={{ color: "var(--color-text-tertiary)" }}>
                  {parsed.owner} / {parsed.repo}
                </span>
              </div>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="flex items-start gap-2.5 p-3 rounded-lg"
              style={{ background: "var(--color-bg-interactive)", border: "1px solid var(--color-border-default)" }}>
              <Globe size={15} className="flex-shrink-0 mt-0.5" style={{ color: "var(--color-text-tertiary)" }} />
              <div>
                <div className="text-body-sm font-medium mb-0.5" style={{ color: "var(--color-text-primary)" }}>Public repos</div>
                <div className="text-caption" style={{ color: "var(--color-text-tertiary)" }}>Available after GitHub authorization</div>
              </div>
            </div>
            <div className="flex items-start gap-2.5 p-3 rounded-lg"
              style={{ background: "var(--color-bg-interactive)", border: "1px solid var(--color-border-default)" }}>
              <Lock size={15} className="flex-shrink-0 mt-0.5" style={{ color: "var(--color-text-tertiary)" }} />
              <div>
                <div className="text-body-sm font-medium mb-0.5" style={{ color: "var(--color-text-primary)" }}>Private repos</div>
                <div className="text-caption" style={{ color: "var(--color-text-tertiary)" }}>Authorized via your GitHub account</div>
              </div>
            </div>
          </div>

          {/* What happens next */}
          <div className="p-4 rounded-lg" style={{ background: "var(--color-bg-interactive)" }}>
            <p className="text-label mb-2" style={{ color: "var(--color-text-secondary)" }}>After connecting</p>
            <div className="space-y-1.5">
              {[
                "File structure discovery",
                "Language & framework detection",
                "Architecture analysis",
                "Dependency mapping",
                "X-Ray report generation",
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: "var(--color-accent-muted)", color: "var(--color-accent-hover)" }}>
                    {i + 1}
                  </div>
                  <span className="text-body-sm" style={{ color: "var(--color-text-secondary)" }}>{step}</span>
                </div>
              ))}
            </div>
          </div>

          <button type="submit" disabled={loading || !isValid} className="btn btn-primary btn-md w-full justify-center">
            {loading
              ? <><Loader2 size={15} className="animate-spin" /> Connecting…</>
              : <><GitBranch size={15} /> Connect &amp; Analyze</>}
          </button>
        </form>
      </div>
    </div>
  );
}
