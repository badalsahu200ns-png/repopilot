"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import {
  GitBranch, LayoutDashboard, FolderGit2,
  CheckSquare, LogOut, ChevronLeft,
  ChevronRight, Bell, Cpu, Menu, X,
  Zap, BadgeCheck
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard",      icon: LayoutDashboard, label: "Overview" },
  { href: "/repositories",   icon: FolderGit2,      label: "Repositories" },
  { href: "/tasks",          icon: CheckSquare,      label: "Bob Tasks" },
];

function NavItem({ href, icon: Icon, label, collapsed, active }: {
  href: string; icon: React.ElementType; label: string; collapsed: boolean; active: boolean;
}) {
  return (
    <Link href={href} className={cn("nav-item", active && "active")} title={collapsed ? label : undefined}>
      <Icon size={17} className="flex-shrink-0" />
      {!collapsed && <span>{label}</span>}
    </Link>
  );
}

export default function AppShell({ children, user }: { children: React.ReactNode; user: User }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Ignore
    }
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // Ignore
    }
    router.push("/login");
    router.refresh();
  }

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className={cn("flex items-center gap-2.5 px-3 py-4 border-b", collapsed && "justify-center")}
        style={{ borderColor: "var(--color-border-default)" }}>
        <img
          src="/repopilot-logo.svg"
          alt="RepoPilot logo"
          className={cn("flex-shrink-0 object-contain", collapsed ? "h-7 w-7" : "h-8 w-8")}
        />
        {!collapsed && (
          <div>
            <div className="font-bold text-sm leading-none" style={{ color: "var(--color-text-primary)" }}>RepoPilot</div>
            <div className="text-caption" style={{ color: "var(--color-accent-hover)" }}>2.0</div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <NavItem key={item.href} {...item} collapsed={collapsed}
            active={pathname === item.href || pathname.startsWith(item.href + "/")} />
        ))}
      </nav>

      {/* IBM Bob status */}
      {!collapsed && (
        <div className="p-3 mx-2 mb-2 rounded-lg" style={{ background: "rgba(20,80,200,0.08)", border: "1px solid rgba(100,150,255,0.15)" }}>
          <div className="flex items-center gap-2 mb-1">
            <Cpu size={13} style={{ color: "#7ba7ff" }} />
            <span className="text-caption font-semibold" style={{ color: "#7ba7ff" }}>IBM Bob 2.0</span>
            <div className="w-1.5 h-1.5 rounded-full ml-auto" style={{ background: "var(--color-success)", boxShadow: "0 0 4px rgba(34,197,94,0.8)" }} />
          </div>
          <p className="text-caption mb-2" style={{ color: "var(--color-text-tertiary)" }}>Connected · Plan mode ready</p>
          <div className="flex flex-col gap-1">
            <Link href="/repositories" className="inline-flex items-center gap-1 text-[11px] font-medium no-underline hover:underline" style={{ color: "var(--color-accent-hover)" }}>
              <Zap size={11} /> Change Impact →
            </Link>
            <Link href="/tasks" className="inline-flex items-center gap-1 text-[11px] font-medium no-underline hover:underline" style={{ color: "var(--color-accent-hover)" }}>
              <BadgeCheck size={11} /> Bob Tasks →
            </Link>
          </div>
        </div>
      )}

      {/* User */}
      <div className={cn("p-3 border-t flex items-center gap-2", collapsed && "justify-center")}
        style={{ borderColor: "var(--color-border-default)" }}>
        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-semibold text-sm"
          style={{ background: "var(--color-accent-muted)", color: "var(--color-accent-hover)" }}>
          {user.email?.[0]?.toUpperCase() ?? "U"}
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <div className="text-body-sm font-medium truncate" style={{ color: "var(--color-text-primary)" }}>
              {user.email}
            </div>
          </div>
        )}
        {!collapsed && (
          <button onClick={handleLogout} className="btn btn-ghost" style={{ padding: "4px" }} title="Sign out">
            <LogOut size={15} style={{ color: "var(--color-text-tertiary)" }} />
          </button>
        )}
      </div>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--color-bg-base)" }}>
      {/* Desktop Sidebar */}
      <aside
        className="hidden md:flex flex-col flex-shrink-0 transition-all duration-300"
        style={{
          width: collapsed ? "64px" : "240px",
          background: "var(--color-bg-elevated)",
          borderRight: "1px solid var(--color-border-default)",
          position: "relative",
        }}>
        {sidebarContent}
        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full flex items-center justify-center z-10 transition-colors"
          style={{
            background: "var(--color-bg-overlay)",
            border: "1px solid var(--color-border-strong)",
            color: "var(--color-text-secondary)",
          }}>
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="relative z-10 flex flex-col w-64 h-full"
            style={{ background: "var(--color-bg-elevated)", borderRight: "1px solid var(--color-border-default)" }}>
            <button onClick={() => setMobileOpen(false)} className="absolute top-4 right-4 btn btn-ghost" style={{ padding: "4px" }}>
              <X size={18} />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center gap-4 px-4 h-14 flex-shrink-0"
          style={{ borderBottom: "1px solid var(--color-border-default)", background: "var(--color-bg-elevated)" }}>
          <button className="md:hidden btn btn-ghost" style={{ padding: "4px" }} onClick={() => setMobileOpen(true)}>
            <Menu size={18} />
          </button>

          {/* Breadcrumb — show section context on /repositories/[id]/* (not /repositories/new) */}
          {(() => {
            // Match UUID-style repo IDs (36 chars) or any non-"new" segment followed by optional sub-path
            const repoMatch = pathname.match(/^\/repositories\/([0-9a-f-]{8,})(\/.*)?$/i);
            if (!repoMatch) return null;
            const repoId = repoMatch[1];
            const sub = repoMatch[2] ?? "";
            const subLabel =
              sub === "/ask"    ? "Ask Codebase"  :
              sub === "/change" ? "Change Impact" :
              sub === "/verify" ? "Verify"        :
              sub === ""        ? "X-Ray"         : null;
            if (!subLabel) return null;
            return (
              <div className="flex items-center gap-1.5 text-caption min-w-0">
                <FolderGit2 size={13} style={{ color: "var(--color-text-tertiary)", flexShrink: 0 }} />
                <Link
                  href={`/repositories/${repoId}`}
                  className="no-underline"
                  style={{ color: "var(--color-text-tertiary)" }}>
                  Repository
                </Link>
                <span style={{ color: "var(--color-border-strong)" }}>/</span>
                <span className="font-medium" style={{ color: "var(--color-text-secondary)" }}>
                  {subLabel}
                </span>
              </div>
            );
          })()}

          <div className="flex-1" />
          <button className="btn btn-ghost" style={{ padding: "6px" }} aria-label="Notifications">
            <Bell size={17} style={{ color: "var(--color-text-secondary)" }} />
          </button>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>

        <footer className="border-t" style={{ borderColor: "var(--color-border-default)", background: "var(--color-bg-elevated)" }}>
          <div className="px-4 py-3 text-center sm:text-left">
            <p className="text-caption mb-1" style={{ color: "var(--color-text-secondary)" }}>
              Created by <span className="font-semibold" style={{ color: "var(--color-text-primary)" }}>BADAL KUMAR SAHU</span>
            </p>
            <p className="text-caption mb-2" style={{ color: "var(--color-text-tertiary)" }}>
              Facing an issue or need help? Get in touch.
            </p>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-3 gap-y-1 text-caption">
              <a href="mailto:badalsahu200ns@gmail.com" className="transition-colors no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-hover)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg-elevated)] rounded-sm" style={{ color: "var(--color-accent-hover)" }}>
                Email
              </a>
              <a href="https://www.linkedin.com/in/badalsahu200ns/" target="_blank" rel="noopener noreferrer" className="transition-colors no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-hover)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg-elevated)] rounded-sm" style={{ color: "var(--color-accent-hover)" }}>
                LinkedIn
              </a>
              <a href="https://github.com/badalsahu200ns-png" target="_blank" rel="noopener noreferrer" className="transition-colors no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-hover)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg-elevated)] rounded-sm" style={{ color: "var(--color-accent-hover)" }}>
                GitHub
              </a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
