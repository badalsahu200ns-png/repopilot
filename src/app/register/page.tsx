"use client";

import { useState, useId } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  GitBranch, Eye, EyeOff, Loader2, AlertCircle,
  CheckCircle, ArrowRight, ShieldCheck, Check, Sparkles
} from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const nameId = useId();
  const emailId = useId();
  const passwordId = useId();
  const confirmPasswordId = useId();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Validation states
  const isLengthValid = password.length >= 8;
  const hasNumberOrSymbol = /[0-9!@#$%^&*(),.?":{}|<>]/.test(password);
  const isPasswordValid = isLengthValid && hasNumberOrSymbol;
  const isMatch = password === confirmPassword && confirmPassword.length > 0;
  const isFormValid = name.trim().length >= 2 && email.includes("@") && isPasswordValid && isMatch;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (name.trim().length < 2) {
      setError("Please enter your full name (minimum 2 characters).");
      return;
    }
    if (!email.includes("@")) {
      setError("Please enter a valid work or personal email address.");
      return;
    }
    if (!isLengthValid) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (!hasNumberOrSymbol) {
      setError("Password must include at least one number or special symbol.");
      return;
    }
    if (!isMatch) {
      setError("Passwords do not match. Please verify both password entries.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          confirmPassword,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error?.message || "Unable to complete account registration.");
      }

      setSuccess(true);
      setTimeout(() => {
        router.push(data.data?.redirect || "/onboarding");
        router.refresh();
      }, 1000);
    } catch (err: unknown) {
      if (err instanceof TypeError && err.message.toLowerCase().includes("fetch")) {
        setError("We're unable to connect to RepoPilot right now. Please try again in a moment.");
      } else {
        setError(err instanceof Error ? err.message : "Something went wrong while creating your account. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  function handleGithubLogin() {
    window.location.href = "/api/auth/github/start";
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--color-bg-base)" }}>
        <div className="w-full max-w-md card p-8 text-center animate-fade-in border border-emerald-500/30">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <CheckCircle size={32} />
          </div>
          <h2 className="text-xl font-bold mb-2 text-white">Account Created Successfully</h2>
          <p className="text-sm text-zinc-400 mb-6">
            Welcome to RepoPilot 2.0. Redirecting to your repository onboarding experience…
          </p>
          <div className="flex items-center justify-center gap-2 text-xs font-mono text-indigo-400">
            <Loader2 size={14} className="animate-spin" />
            <span>Preparing developer workspace</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: "var(--color-bg-base)" }}>
      {/* Background ambient lighting */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[450px] rounded-full opacity-15"
          style={{ background: "radial-gradient(ellipse, rgba(99,102,241,0.5) 0%, transparent 70%)", filter: "blur(70px)" }}
        />
      </div>

      <div className="w-full max-w-md relative z-10 animate-fade-in">
        {/* Header Logo */}
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

        {/* Signup Card */}
        <div className="card p-7 sm:p-8 border border-white/[0.08] shadow-2xl backdrop-blur-sm" style={{ background: "var(--color-bg-surface)" }}>
          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-white mb-1.5">Create your account</h1>
            <p className="text-sm text-zinc-400">
              Start understanding your codebase in minutes.
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="flex items-start gap-3 p-3.5 rounded-lg mb-5 bg-red-500/10 border border-red-500/25 text-red-300 text-sm animate-fade-in">
              <AlertCircle size={17} className="flex-shrink-0 mt-0.5 text-red-400" />
              <div className="flex-1 leading-snug">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Full Name */}
            <div>
              <label htmlFor={nameId} className="block text-xs font-medium uppercase tracking-wider text-zinc-300 mb-1.5">
                Full Name
              </label>
              <input
                id={nameId}
                type="text"
                required
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Developer"
                className="input text-sm"
                disabled={loading}
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor={emailId} className="block text-xs font-medium uppercase tracking-wider text-zinc-300 mb-1.5">
                Work or Personal Email
              </label>
              <input
                id={emailId}
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alex@company.com"
                className="input text-sm"
                disabled={loading}
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor={passwordId} className="block text-xs font-medium uppercase tracking-wider text-zinc-300">
                  Password
                </label>
                <span className="text-[11px] text-zinc-500">Min. 8 characters</span>
              </div>
              <div className="relative">
                <input
                  id={passwordId}
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="input pr-10 text-sm font-mono"
                  disabled={loading}
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

              {/* Password Requirements Checklist */}
              {password.length > 0 && (
                <div className="mt-2.5 p-2.5 rounded-md bg-zinc-900/60 border border-white/[0.05] space-y-1.5 text-xs">
                  <div className="flex items-center gap-2">
                    <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px] ${isLengthValid ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-800 text-zinc-500"}`}>
                      {isLengthValid ? <Check size={10} /> : "•"}
                    </div>
                    <span className={isLengthValid ? "text-zinc-200" : "text-zinc-500"}>At least 8 characters</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px] ${hasNumberOrSymbol ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-800 text-zinc-500"}`}>
                      {hasNumberOrSymbol ? <Check size={10} /> : "•"}
                    </div>
                    <span className={hasNumberOrSymbol ? "text-zinc-200" : "text-zinc-500"}>Includes a number or special character</span>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor={confirmPasswordId} className="block text-xs font-medium uppercase tracking-wider text-zinc-300 mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id={confirmPasswordId}
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="input pr-10 text-sm font-mono"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors p-1"
                  aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                >
                  {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {confirmPassword.length > 0 && (
                <div className="mt-1.5 flex items-center gap-1.5 text-xs">
                  {isMatch ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <Check size={12} /> Passwords match
                    </span>
                  ) : (
                    <span className="text-amber-400 flex items-center gap-1">
                      <AlertCircle size={12} /> Passwords do not match yet
                    </span>
                  )}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !isFormValid}
              className="btn btn-primary btn-md w-full justify-center mt-3 gap-2 text-sm font-semibold shadow-lg shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Creating your account…</span>
                </>
              ) : (
                <>
                  <span>Create account</span>
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
            disabled={loading}
            className="btn btn-secondary btn-md w-full justify-center gap-2 text-sm font-semibold"
          >
            <GitBranch size={16} />
            <span>Continue with GitHub</span>
          </button>

          <div className="mt-5 pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs text-zinc-400">
            <span className="flex items-center gap-1.5 text-zinc-400">
              <ShieldCheck size={14} className="text-indigo-400" />
              Secure session &amp; password hashing
            </span>
            <span className="text-zinc-500">v2.0</span>
          </div>

          <div className="mt-4 text-center text-sm text-zinc-400">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-indigo-400 hover:text-indigo-300 transition-colors no-underline">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
