"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, ArrowRight, Eye, EyeOff, GitBranch, Loader2, ShieldCheck } from "lucide-react";

function getFriendlyAuthError(code?: string, fallback?: string) {
  switch (code) {
    case "USER_NOT_FOUND":
      return "No RepoPilot account was found with this email. Create an account to continue.";
    case "INVALID_CREDENTIALS":
      return "Email or password is incorrect. Please try again.";
    case "VALIDATION_ERROR":
      return "Please enter a valid email and password.";
    case "SERVER_ERROR":
      return "Something went wrong while signing you in. Please try again.";
    case "oauth_failed":
      return "GitHub authentication could not be completed. Please try again.";
    case "oauth_state_invalid":
      return "GitHub authentication could not be completed. Please try again.";
    default:
      return fallback || "Unable to connect to RepoPilot right now. Please try again in a moment.";
  }
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageFallback />}>
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: "var(--color-bg-base)" }}>
      <div className="card p-7 sm:p-8 border border-white/[0.08] shadow-2xl backdrop-blur-sm" style={{ background: "var(--color-bg-surface)" }}>
        <div className="flex items-center justify-center gap-2 text-sm text-zinc-300">
          <Loader2 size={16} className="animate-spin" />
          <span>Loading sign in…</span>
        </div>
      </div>
    </div>
  );
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const queryError = searchParams.get("error");
    if (queryError) {
      setError(getFriendlyAuthError(queryError, "GitHub authentication could not be completed. Please try again."));
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const code = data.error?.code;
        const message = getFriendlyAuthError(code, data.error?.message || "Unable to connect to RepoPilot right now. Please try again in a moment.");
        throw new Error(message);
      }

      router.push(data.data?.redirect || "/dashboard");
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unable to connect to RepoPilot right now. Please try again in a moment.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGithubLogin() {
    setError(null);
    setGithubLoading(true);
    window.location.href = "/api/auth/github/start";
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: "var(--color-bg-base)" }}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full opacity-15"
          style={{ background: "radial-gradient(ellipse, rgba(99,102,241,0.5) 0%, transparent 70%)", filter: "blur(70px)" }}
        />
      </div>

      <div className="w-full max-w-md relative z-10 animate-fade-in">
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex items-center gap-2.5 no-underline group">
            <div className="w-10 h-10 rounded-xl gradient-accent flex items-center justify-center shadow-lg shadow-indigo-500/20 transition-transform group-hover:scale-105">
              <GitBranch size={20} className="text-white" />
            </div>
            <div className="text-left">
              <div className="font-bold text-lg leading-tight text-white flex items-center gap-1.5">
                RepoPilot
                <span className="text-xs font-mono font-medium px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-400 border border-indigo-500/25">2.0</span>
              </div>
              <div className="text-[11px] text-zinc-400 font-mono">Codebase Intelligence</div>
            </div>
          </Link>
        </div>

        <div className="card p-7 sm:p-8 border border-white/[0.08] shadow-2xl backdrop-blur-sm" style={{ background: "var(--color-bg-surface)" }}>
          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-white mb-1.5">Welcome back</h1>
            <p className="text-sm text-zinc-400">Sign in to your RepoPilot account</p>
          </div>

          {error && (
            <div className="flex items-start gap-3 p-3.5 rounded-lg mb-5 bg-red-500/10 border border-red-500/25 text-red-300 text-sm animate-fade-in">
              <AlertCircle size={17} className="flex-shrink-0 mt-0.5 text-red-400" />
              <div className="flex-1 leading-snug">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-xs font-medium uppercase tracking-wider text-zinc-300 mb-1.5">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="input text-sm"
                disabled={loading || githubLoading}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="login-password" className="block text-xs font-medium uppercase tracking-wider text-zinc-300">
                  Password
                </label>
                <Link href="/login" className="text-[11px] text-zinc-400 hover:text-indigo-300 transition-colors no-underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="input pr-10 text-sm font-mono"
                  disabled={loading || githubLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors p-1"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || githubLoading || !email || !password}
              className="btn btn-primary btn-md w-full justify-center mt-3 gap-2 text-sm font-semibold shadow-lg shadow-indigo-500/25"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign in</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">or</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <button
            type="button"
            onClick={handleGithubLogin}
            disabled={loading || githubLoading}
            className="btn btn-secondary btn-md w-full justify-center gap-2 text-sm font-semibold"
          >
            {githubLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Connecting to GitHub...</span>
              </>
            ) : (
              <>
                <GitBranch size={16} />
                <span>Continue with GitHub</span>
              </>
            )}
          </button>

          <div className="mt-5 pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs text-zinc-400">
            <span className="flex items-center gap-1.5 text-zinc-400">
              <ShieldCheck size={14} className="text-indigo-400" />
              Encrypted session
            </span>
            <span className="text-zinc-500">v2.0</span>
          </div>

          <div className="mt-4 text-center text-sm text-zinc-400">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-medium text-indigo-400 hover:text-indigo-300 transition-colors no-underline">
              Create one
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
