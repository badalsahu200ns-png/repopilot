"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  GitBranch, ArrowRight, Shield,
  FileCode, Layers, Search, Cpu,
  Lock, CheckCircle2,
  FolderGit2, Terminal, ExternalLink, Menu, X, Database
} from "lucide-react";

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div style={{ backgroundColor: "#08090B", color: "#FFFFFF", minHeight: "100vh" }} className="flex flex-col font-sans selection:bg-[#0F62FE]/30 selection:text-white">
      {/* ── 1. PUBLIC NAVIGATION ── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-200"
        style={{
          backgroundColor: scrolled ? "rgba(8, 9, 11, 0.88)" : "transparent",
          backdropFilter: scrolled ? "blur(12px)" : "none",
          borderBottom: scrolled ? "1px solid #242832" : "1px solid transparent",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 no-underline group">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-105"
              style={{ backgroundColor: "#0F62FE" }}
            >
              <GitBranch size={17} className="text-white" />
            </div>
            <span className="font-semibold text-base tracking-tight text-white flex items-center gap-2">
              RepoPilot
              <span
                className="text-[11px] font-normal px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: "#16191F",
                  border: "1px solid #242832",
                  color: "#A1A1AA",
                }}
              >
                IBM Bob 2.0 Hackathon
              </span>
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-7">
            {[
              { label: "Product", href: "#features" },
              { label: "How it works", href: "#how-it-works" },
              { label: "Architecture", href: "#architecture" },
              { label: "Security", href: "#security" },
              { label: "Privacy", href: "#privacy" },
            ].map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm font-medium transition-colors no-underline"
                style={{ color: "#A1A1AA" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#FFFFFF")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#A1A1AA")}
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Action CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium px-3.5 py-2 rounded-lg transition-colors no-underline"
              style={{ color: "#A1A1AA" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#FFFFFF")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#A1A1AA")}
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="text-sm font-medium px-4 py-2 rounded-lg text-white transition-all duration-150 inline-flex items-center gap-1.5 no-underline shadow-sm"
              style={{ backgroundColor: "#0F62FE" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#4589FF";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#0F62FE";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              Connect repository
              <ArrowRight size={14} />
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-lg text-[#A1A1AA] hover:text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div
            className="md:hidden px-4 pt-2 pb-6 space-y-3"
            style={{ backgroundColor: "#101216", borderBottom: "1px solid #242832" }}
          >
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm text-[#A1A1AA] hover:text-white no-underline"
            >
              Product
            </a>
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm text-[#A1A1AA] hover:text-white no-underline"
            >
              How it works
            </a>
            <a
              href="#architecture"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm text-[#A1A1AA] hover:text-white no-underline"
            >
              Architecture
            </a>
            <a
              href="#security"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm text-[#A1A1AA] hover:text-white no-underline"
            >
              Security
            </a>
            <a
              href="#privacy"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm text-[#A1A1AA] hover:text-white no-underline"
            >
              Privacy
            </a>
            <div className="pt-3 border-t border-[#242832] flex flex-col gap-2">
              <Link
                href="/login"
                className="block text-center py-2 text-sm text-[#A1A1AA] hover:text-white rounded-lg no-underline"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="block text-center py-2 text-sm text-white rounded-lg font-medium no-underline"
                style={{ backgroundColor: "#0F62FE" }}
              >
                Connect repository
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* ── 2. HERO SECTION ── */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden">
        {/* Subtle grid background & glow */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage:
              "linear-gradient(#242832 1px, transparent 1px), linear-gradient(90deg, #242832 1px, transparent 1px)",
            backgroundSize: "40px 40px",
            maskImage: "radial-gradient(ellipse 65% 50% at 50% 15%, black 40%, transparent 100%)",
          }}
        />
        <div
          className="absolute top-24 left-1/2 -translate-x-1/2 w-[700px] h-[340px] rounded-full pointer-events-none opacity-25"
          style={{
            background: "radial-gradient(ellipse, rgba(15, 98, 254, 0.4) 0%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          {/* Tagline Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-6 border border-[#242832] bg-[#101216]">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "#42BE65" }} />
            <span className="text-xs font-medium text-[#A1A1AA]">
              Codebase Intelligence &amp; Task Planning
            </span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-white mb-6 leading-[1.08]">
            Understand your codebase. <br />
            <span className="text-[#A1A1AA]">Ship changes with confidence.</span>
          </h1>

          {/* Supporting Copy */}
          <p className="text-lg sm:text-xl text-[#A1A1AA] max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
            RepoPilot helps developers understand unfamiliar repositories, find the code that matters, and turn development tasks into implementation-ready plans.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-16">
            <Link
              href="/register"
              className="w-full sm:w-auto px-6 py-3 rounded-lg text-sm font-medium text-white inline-flex items-center justify-center gap-2 transition-all duration-150 no-underline shadow-md"
              style={{ backgroundColor: "#0F62FE" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#4589FF";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#0F62FE";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              Connect repository
              <ArrowRight size={15} />
            </Link>
            <a
              href="#how-it-works"
              className="w-full sm:w-auto px-6 py-3 rounded-lg text-sm font-medium text-[#FFFFFF] inline-flex items-center justify-center gap-2 transition-colors duration-150 no-underline border border-[#242832] bg-[#101216] hover:bg-[#16191F]"
            >
              Explore how it works
            </a>
          </div>

          {/* ── 3. HERO VISUAL (Product UI Preview) ── */}
          <div className="relative mx-auto max-w-4xl text-left rounded-xl overflow-hidden border border-[#242832] bg-[#101216] shadow-2xl">
            {/* Window title bar */}
            <div className="px-4 py-3 border-b border-[#242832] bg-[#0C0E12] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#DA1E28]/70" />
                <div className="w-3 h-3 rounded-full bg-[#F1C21B]/70" />
                <div className="w-3 h-3 rounded-full bg-[#42BE65]/70" />
                <span className="ml-3 text-xs text-[#71717A] font-mono">repopilot.internal / x-ray / payments-api</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-[#71717A]">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#16191F] border border-[#242832]">
                  <GitBranch size={11} /> main
                </span>
              </div>
            </div>

            {/* Window body */}
            <div className="grid grid-cols-1 md:grid-cols-12 min-h-[380px]">
              {/* Sidebar preview */}
              <div className="md:col-span-4 border-b md:border-b-0 md:border-r border-[#242832] p-4 bg-[#0A0C0F] space-y-4">
                <div className="text-[11px] font-semibold tracking-wider uppercase text-[#71717A]">
                  Connected Repositories
                </div>
                <div className="space-y-1.5">
                  <div className="p-2.5 rounded-lg bg-[#16191F] border border-[#0F62FE]/40 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <FolderGit2 size={15} className="text-[#0F62FE]" />
                      <div>
                        <div className="text-xs font-semibold text-white font-mono">payments-api</div>
                        <div className="text-[10px] text-[#71717A]">Updated 2h ago</div>
                      </div>
                    </div>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#42BE65]" />
                  </div>

                  <div className="p-2.5 rounded-lg hover:bg-[#16191F]/40 flex items-center justify-between text-[#71717A]">
                    <div className="flex items-center gap-2.5">
                      <FolderGit2 size={15} />
                      <div>
                        <div className="text-xs font-medium font-mono text-[#A1A1AA]">web-app</div>
                        <div className="text-[10px] text-[#71717A]">Next.js frontend</div>
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg hover:bg-[#16191F]/40 flex items-center justify-between text-[#71717A]">
                    <div className="flex items-center gap-2.5">
                      <FolderGit2 size={15} />
                      <div>
                        <div className="text-xs font-medium font-mono text-[#A1A1AA]">auth-service</div>
                        <div className="text-[10px] text-[#71717A]">OAuth &amp; Sessions</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#242832]">
                  <div className="p-3 rounded-lg bg-[#16191F]/60 border border-[#242832]">
                    <div className="flex items-center gap-2 mb-1">
                      <Cpu size={13} className="text-[#0F62FE]" />
                      <span className="text-[11px] font-semibold text-white">IBM Bob 2.0 Ready</span>
                    </div>
                    <p className="text-[10px] text-[#71717A] leading-relaxed">
                      watsonx Granite model active for implementation plans.
                    </p>
                  </div>
                </div>
              </div>

              {/* Main pane preview */}
              <div className="md:col-span-8 p-5 sm:p-6 space-y-5 bg-[#101216]">
                {/* Repository header */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <h3 className="text-base font-bold text-white font-mono">payments-api</h3>
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-[#42BE65]/10 text-[#42BE65] border border-[#42BE65]/20 flex items-center gap-1">
                        <CheckCircle2 size={10} /> Analyzed
                      </span>
                    </div>
                    <p className="text-xs text-[#A1A1AA]">
                      Core payment processing service handling invoices, charges, and webhooks.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#16191F] border border-[#242832] text-[#A1A1AA]">
                      TypeScript
                    </span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#16191F] border border-[#242832] text-[#A1A1AA]">
                      PostgreSQL
                    </span>
                  </div>
                </div>

                {/* Architecture visualization preview */}
                <div className="p-4 rounded-lg bg-[#0A0C0F] border border-[#242832]">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-[#71717A] mb-3">
                    Architecture Dependency Topology
                  </div>
                  <div className="flex items-center justify-between gap-2 overflow-x-auto py-2">
                    <div className="px-3 py-2 rounded-md bg-[#16191F] border border-[#242832] text-center min-w-[110px]">
                      <div className="text-[11px] font-semibold text-white">API Layer</div>
                      <div className="text-[10px] text-[#71717A] font-mono">/routes/v1</div>
                    </div>
                    <div className="text-[#0F62FE] text-xs font-mono font-bold">──▶</div>
                    <div className="px-3 py-2 rounded-md bg-[#16191F] border border-[#0F62FE]/40 text-center min-w-[120px]">
                      <div className="text-[11px] font-semibold text-white">PaymentService</div>
                      <div className="text-[10px] text-[#A1A1AA] font-mono">/services/charge</div>
                    </div>
                    <div className="text-[#0F62FE] text-xs font-mono font-bold">──▶</div>
                    <div className="px-3 py-2 rounded-md bg-[#16191F] border border-[#242832] text-center min-w-[110px]">
                      <div className="text-[11px] font-semibold text-white">Database</div>
                      <div className="text-[10px] text-[#71717A] font-mono">PostgreSQL</div>
                    </div>
                  </div>
                </div>

                {/* Metrics bar */}
                <div className="pt-2 flex items-center justify-between text-xs text-[#71717A] border-t border-[#242832] flex-wrap gap-2">
                  <div className="flex items-center gap-4">
                    <span><strong className="text-white">42</strong> modules</span>
                    <span><strong className="text-white">186</strong> files mapped</span>
                    <span><strong className="text-white">12</strong> test suites</span>
                  </div>
                  <div className="text-[11px] text-[#A1A1AA] flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#42BE65]" />
                    Ready for task planning
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. PROBLEM SECTION ── */}
      <section className="py-20 md:py-28 border-t border-[#242832] bg-[#08090B]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-4">
              New codebase. Same pressure.
            </h2>
            <p className="text-base text-[#A1A1AA] leading-relaxed">
              Understanding an unfamiliar repository shouldn&apos;t take days of guesswork and broken assumptions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-7 rounded-xl bg-[#101216] border border-[#242832] hover:border-[#2E3442] transition-colors">
              <div className="w-10 h-10 rounded-lg bg-[#16191F] border border-[#242832] flex items-center justify-center mb-5 text-[#0F62FE]">
                <Search size={20} />
              </div>
              <h3 className="text-base font-semibold text-white mb-2">Find where to start</h3>
              <p className="text-sm text-[#A1A1AA] leading-relaxed">
                Quickly identify the files, modules and services relevant to your task without manually searching across thousands of source lines.
              </p>
            </div>

            <div className="p-7 rounded-xl bg-[#101216] border border-[#242832] hover:border-[#2E3442] transition-colors">
              <div className="w-10 h-10 rounded-lg bg-[#16191F] border border-[#242832] flex items-center justify-center mb-5 text-[#0F62FE]">
                <Layers size={20} />
              </div>
              <h3 className="text-base font-semibold text-white mb-2">Understand how it fits together</h3>
              <p className="text-sm text-[#A1A1AA] leading-relaxed">
                Explore relationships between components, middleware, and database layers before introducing your changes.
              </p>
            </div>

            <div className="p-7 rounded-xl bg-[#101216] border border-[#242832] hover:border-[#2E3442] transition-colors">
              <div className="w-10 h-10 rounded-lg bg-[#16191F] border border-[#242832] flex items-center justify-center mb-5 text-[#0F62FE]">
                <FileCode size={20} />
              </div>
              <h3 className="text-base font-semibold text-white mb-2">Move from idea to implementation</h3>
              <p className="text-sm text-[#A1A1AA] leading-relaxed">
                Turn a requirement or bug ticket into a structured, step-by-step implementation plan grounded in your actual codebase.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. CORE PRODUCT SECTION ── */}
      <section id="features" className="py-20 md:py-28 border-t border-[#242832] bg-[#0A0C0F]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-4">
              Your codebase, finally understandable.
            </h2>
            <p className="text-base text-[#A1A1AA] leading-relaxed">
              Everything needed to explore, query, and plan work in any repository with certainty.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-8 rounded-xl bg-[#101216] border border-[#242832] hover:border-[#2E3442] transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-lg bg-[#16191F] border border-[#242832] flex items-center justify-center text-[#0F62FE]">
                  <FolderGit2 size={18} />
                </div>
                <h3 className="text-lg font-semibold text-white">Repository Intelligence</h3>
              </div>
              <p className="text-sm text-[#A1A1AA] leading-relaxed mb-4">
                Understand languages, detected frameworks, module boundaries, dependencies, and project structure at a glance.
              </p>
              <div className="text-xs font-mono text-[#71717A] bg-[#08090B] p-3 rounded-lg border border-[#242832]">
                Snapshot: file count, language distribution, key entrypoints, risk flags
              </div>
            </div>

            <div className="p-8 rounded-xl bg-[#101216] border border-[#242832] hover:border-[#2E3442] transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-lg bg-[#16191F] border border-[#242832] flex items-center justify-center text-[#0F62FE]">
                  <Layers size={18} />
                </div>
                <h3 className="text-lg font-semibold text-white">Architecture Explorer</h3>
              </div>
              <p className="text-sm text-[#A1A1AA] leading-relaxed mb-4">
                Navigate your system visually and understand how layers connect: API routes, business logic, storage, and tests.
              </p>
              <div className="text-xs font-mono text-[#71717A] bg-[#08090B] p-3 rounded-lg border border-[#242832]">
                Topology: Frontend ──▶ API Layer ──▶ Services ──▶ Database
              </div>
            </div>

            <div className="p-8 rounded-xl bg-[#101216] border border-[#242832] hover:border-[#2E3442] transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-lg bg-[#16191F] border border-[#242832] flex items-center justify-center text-[#0F62FE]">
                  <Search size={18} />
                </div>
                <h3 className="text-lg font-semibold text-white">Codebase Q&amp;A</h3>
              </div>
              <p className="text-sm text-[#A1A1AA] leading-relaxed mb-4">
                Ask questions about your repository and jump directly to relevant source files with verified evidence and citations.
              </p>
              <div className="text-xs font-mono text-[#71717A] bg-[#08090B] p-3 rounded-lg border border-[#242832]">
                Q: &quot;Where is authentication handled?&quot; ──▶ Citations: AuthService.ts, middleware.ts
              </div>
            </div>

            <div className="p-8 rounded-xl bg-[#101216] border border-[#242832] hover:border-[#2E3442] transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-lg bg-[#16191F] border border-[#242832] flex items-center justify-center text-[#0F62FE]">
                  <Terminal size={18} />
                </div>
                <h3 className="text-lg font-semibold text-white">Task Planning</h3>
              </div>
              <p className="text-sm text-[#A1A1AA] leading-relaxed mb-4">
                Describe a feature or bug and identify the parts of the codebase that need attention, creating an auditable plan.
              </p>
              <div className="text-xs font-mono text-[#71717A] bg-[#08090B] p-3 rounded-lg border border-[#242832]">
                Output: Numbered steps, affected files, side effects, human approval gate
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. WORKFLOW SECTION ── */}
      <section id="how-it-works" className="py-20 md:py-28 border-t border-[#242832] bg-[#08090B]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-4">
              From repository to confident contribution
            </h2>
            <p className="text-base text-[#A1A1AA] leading-relaxed">
              A structured seven-step journey built around developer control and codebase context.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-4">
            {[
              { num: "01", step: "Connect", desc: "Connect a repository and give RepoPilot the context it needs." },
              { num: "02", step: "Understand", desc: "Analyze the structure, technologies and relationships inside the codebase." },
              { num: "03", step: "Explore", desc: "Navigate the architecture and identify important modules." },
              { num: "04", step: "Ask", desc: "Ask questions about how the system works." },
              { num: "05", step: "Plan", desc: "Turn requirements into actionable implementation steps." },
              { num: "06", step: "Build", desc: "Work through the planned changes with developer control." },
              { num: "07", step: "Verify", desc: "Review the result and validate the work before contribution." },
            ].map((item) => (
              <div
                key={item.num}
                className="p-5 rounded-xl bg-[#101216] border border-[#242832] flex flex-col justify-between"
              >
                <div>
                  <div className="text-xs font-mono font-bold text-[#0F62FE] mb-2">{item.num}</div>
                  <h3 className="text-sm font-semibold text-white mb-2">{item.step}</h3>
                  <p className="text-xs text-[#A1A1AA] leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 7. EVIDENCE SECTION ── */}
      <section id="architecture" className="py-20 md:py-28 border-t border-[#242832] bg-[#0A0C0F]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-5 space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border border-[#242832] bg-[#101216] text-[#A1A1AA]">
                Source Grounding
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white leading-tight">
                AI grounded in your repository
              </h2>
              <p className="text-sm sm:text-base text-[#A1A1AA] leading-relaxed">
                RepoPilot connects AI responses to the repository context used to generate them, helping developers understand where an answer comes from.
              </p>
              <div className="pt-2">
                <span className="text-xs font-mono text-[#71717A] flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-[#42BE65]" />
                  Inspect the relevant source when you need more context.
                </span>
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="rounded-xl border border-[#242832] bg-[#101216] p-6 shadow-xl space-y-4">
                {/* Developer prompt */}
                <div className="p-3.5 rounded-lg bg-[#16191F] border border-[#242832] flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#0F62FE]/20 text-[#0F62FE] flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                    Q
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">Developer Question</div>
                    <div className="text-xs text-[#A1A1AA] mt-0.5 font-mono">
                      Why is authentication handled here?
                    </div>
                  </div>
                </div>

                {/* Assistant explanation */}
                <div className="p-4 rounded-lg bg-[#0A0C0F] border border-[#242832] space-y-3">
                  <p className="text-xs text-[#FFFFFF] leading-relaxed">
                    Authentication uses JWT token validation enforced at the route middleware layer before delegating to the authentication service.
                  </p>

                  <div className="text-[11px] font-semibold uppercase tracking-wider text-[#71717A]">
                    Source Evidence &amp; Citations
                  </div>

                  <div className="space-y-2">
                    <div className="p-2 rounded bg-[#101216] border border-[#242832] flex items-center justify-between font-mono text-xs">
                      <span className="text-[#A1A1AA]">src/auth/AuthService.ts</span>
                      <span className="text-[#0F62FE]">login()</span>
                    </div>
                    <div className="p-2 rounded bg-[#101216] border border-[#242832] flex items-center justify-between font-mono text-xs">
                      <span className="text-[#A1A1AA]">src/middleware/auth.ts</span>
                      <span className="text-[#0F62FE]">verifyToken()</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 8. IBM BOB 2.0 INTEGRATION SECTION ── */}
      <section className="py-20 md:py-28 border-t border-[#242832] bg-[#08090B]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border border-[#242832] bg-[#101216] text-[#A1A1AA] mb-4">
              Integration Architecture
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-3">
              Built to work with IBM Bob 2.0
            </h2>
            <p className="text-base text-[#A1A1AA] leading-relaxed">
              RepoPilot prepares the repository context. IBM Bob helps turn that context into implementation.
            </p>
            <div className="mt-2 text-xs font-medium text-[#71717A]">
              Powered by IBM watsonx
            </div>
          </div>

          {/* Integration Visual Diagram */}
          <div className="max-w-3xl mx-auto p-6 sm:p-8 rounded-xl bg-[#101216] border border-[#242832]">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
              {/* Step 1: RepoPilot */}
              <div className="flex-1 w-full p-4 rounded-lg bg-[#16191F] border border-[#242832]">
                <div className="text-xs font-bold text-[#0F62FE] mb-2 uppercase tracking-wide">RepoPilot</div>
                <div className="text-xs font-semibold text-white mb-2">Context Preparation</div>
                <ul className="text-[11px] text-[#A1A1AA] space-y-1 font-mono list-disc list-inside text-left">
                  <li>Repository context</li>
                  <li>Architecture map</li>
                  <li>Relevant files</li>
                  <li>Dependencies</li>
                  <li>Task context</li>
                </ul>
              </div>

              {/* Arrow */}
              <div className="text-[#71717A] text-lg font-bold">──▶</div>

              {/* Step 2: IBM Bob / watsonx */}
              <div className="flex-1 w-full p-4 rounded-lg bg-[#16191F] border border-[#0F62FE]/40">
                <div className="text-xs font-bold text-[#0F62FE] mb-2 uppercase tracking-wide">IBM Bob 2.0</div>
                <div className="text-xs font-semibold text-white mb-2">watsonx.ai Engine</div>
                <p className="text-[11px] text-[#A1A1AA] leading-relaxed">
                  Processes deep codebase context through IBM Granite foundation models to generate structured implementation steps.
                </p>
              </div>

              {/* Arrow */}
              <div className="text-[#71717A] text-lg font-bold">──▶</div>

              {/* Step 3: Human Review */}
              <div className="flex-1 w-full p-4 rounded-lg bg-[#16191F] border border-[#242832]">
                <div className="text-xs font-bold text-[#42BE65] mb-2 uppercase tracking-wide">Review &amp; Control</div>
                <div className="text-xs font-semibold text-white mb-2">Developer in the Loop</div>
                <p className="text-[11px] text-[#A1A1AA] leading-relaxed">
                  Ordered plan steps with affected files are reviewed and approved by the engineer before any modification.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 9. SECURITY SECTION ── */}
      <section id="security" className="py-20 md:py-28 border-t border-[#242832] bg-[#0A0C0F]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-4">
              Designed with security in mind
            </h2>
            <p className="text-base text-[#A1A1AA] leading-relaxed">
              Clear principles for user data isolation, repository boundaries, and AI prompt protection.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="p-7 rounded-xl bg-[#101216] border border-[#242832]">
              <div className="w-10 h-10 rounded-lg bg-[#16191F] border border-[#242832] flex items-center justify-center mb-5 text-[#0F62FE]">
                <Lock size={18} />
              </div>
              <h3 className="text-base font-semibold text-white mb-2">Private by account</h3>
              <p className="text-sm text-[#A1A1AA] leading-relaxed">
                Repository access, metadata, and task plans are strictly scoped to the authenticated user via Row Level Security.
              </p>
            </div>

            <div className="p-7 rounded-xl bg-[#101216] border border-[#242832]">
              <div className="w-10 h-10 rounded-lg bg-[#16191F] border border-[#242832] flex items-center justify-center mb-5 text-[#0F62FE]">
                <Shield size={18} />
              </div>
              <h3 className="text-base font-semibold text-white mb-2">Controlled AI context</h3>
              <p className="text-sm text-[#A1A1AA] leading-relaxed">
                Repository content is processed strictly as application context rather than treated as unvetted system instructions.
              </p>
            </div>

            <div className="p-7 rounded-xl bg-[#101216] border border-[#242832]">
              <div className="w-10 h-10 rounded-lg bg-[#16191F] border border-[#242832] flex items-center justify-center mb-5 text-[#0F62FE]">
                <Database size={18} />
              </div>
              <h3 className="text-base font-semibold text-white mb-2">Data controls</h3>
              <p className="text-sm text-[#A1A1AA] leading-relaxed">
                Manage and delete your repository data through the application with minimal long-term storage requirements.
              </p>
            </div>
          </div>

          <div className="text-center">
            <a
              href="#privacy"
              className="text-xs font-medium text-[#0F62FE] hover:text-[#4589FF] transition-colors inline-flex items-center gap-1 no-underline"
            >
              Security &amp; Privacy information
              <ArrowRight size={13} />
            </a>
          </div>
        </div>
      </section>

      {/* ── 10. DPDP ACT / PRIVACY SECTION ── */}
      <section id="privacy" className="py-16 border-t border-[#242832] bg-[#08090B]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-6 sm:p-8 rounded-xl bg-[#101216] border border-[#242832]">
            <h3 className="text-base font-bold text-white mb-2">
              Privacy &amp; Data Protection
            </h3>
            <p className="text-sm text-[#A1A1AA] leading-relaxed mb-4">
              RepoPilot is designed with privacy and responsible handling of personal data in mind. Our data practices should be understood together with applicable privacy requirements, including India&apos;s Digital Personal Data Protection Act, 2023.
            </p>
            <a
              href="https://www.meity.gov.in/static/uploads/2024/02/Digital-Personal-Data-Protection-Act-2023.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-[#0F62FE] hover:text-[#4589FF] transition-colors inline-flex items-center gap-1.5 no-underline"
            >
              Digital Personal Data Protection Act, 2023
              <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </section>

      {/* ── 11. FINAL CTA BANNER ── */}
      <section className="py-20 md:py-24 border-t border-[#242832] bg-[#0A0C0F] text-center">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-4">
            Ready to understand your codebase?
          </h2>
          <p className="text-base text-[#A1A1AA] max-w-xl mx-auto mb-8">
            Connect your repository and start navigating with confidence in minutes.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <Link
              href="/register"
              className="w-full sm:w-auto px-6 py-3 rounded-lg text-sm font-medium text-white inline-flex items-center justify-center gap-2 transition-all no-underline shadow-md"
              style={{ backgroundColor: "#0F62FE" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#4589FF";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#0F62FE";
              }}
            >
              Connect repository
              <ArrowRight size={15} />
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto px-6 py-3 rounded-lg text-sm font-medium text-[#FFFFFF] inline-flex items-center justify-center gap-2 transition-colors no-underline border border-[#242832] bg-[#101216] hover:bg-[#16191F]"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* ── 12. FOOTER ── */}
      <footer className="py-12 border-t border-[#242832] bg-[#08090B]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div
                className="w-6 h-6 rounded flex items-center justify-center text-white"
                style={{ backgroundColor: "#0F62FE" }}
              >
                <GitBranch size={13} />
              </div>
              <span className="font-semibold text-sm text-white">RepoPilot 2.0</span>
              <span className="text-[11px] text-[#71717A] ml-2">
                Built for the IBM Bob 2.0 Hackathon. Powered by IBM watsonx.
              </span>
            </div>

            <div className="flex items-center gap-6 text-xs text-[#71717A]">
              <a href="#features" className="hover:text-white transition-colors no-underline">
                Features
              </a>
              <a href="#how-it-works" className="hover:text-white transition-colors no-underline">
                How it works
              </a>
              <a href="#security" className="hover:text-white transition-colors no-underline">
                Security
              </a>
              <a href="#privacy" className="hover:text-white transition-colors no-underline">
                Privacy
              </a>
              <Link href="/login" className="hover:text-white transition-colors no-underline">
                Sign in
              </Link>
              <Link href="/register" className="hover:text-white transition-colors no-underline">
                Register
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
