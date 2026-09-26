import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { FolderGit2, Plus, ArrowRight, CheckSquare, Cpu, ShieldCheck } from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch user's repositories
  const { data: repos } = await supabase
    .from("repositories")
    .select("*")
    .eq("user_id", user!.id)
    .order("updated_at", { ascending: false })
    .limit(5);

  // Fetch recent tasks
  const { data: tasks } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", user!.id)
    .order("updated_at", { ascending: false })
    .limit(5);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="p-6 max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-heading-md mb-1" style={{ color: "var(--color-text-primary)" }}>
          {greeting()}, {user?.email?.split("@")[0] ?? "Developer"} 👋
        </h1>
        <p className="text-body-sm" style={{ color: "var(--color-text-secondary)" }}>
          Your codebase intelligence dashboard
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-8">
        {[
          { href: "/compliance",       icon: ShieldCheck, label: "Hackathon Readiness", accent: true },
          { href: "/repositories/new", icon: Plus,        label: "Connect Repository",  accent: false },
          { href: "/tasks/new",        icon: CheckSquare, label: "New Task",            accent: false },
          { href: "/repositories",     icon: FolderGit2,  label: "All Repositories",    accent: false },
          { href: "/tasks",            icon: CheckSquare, label: "All Tasks",           accent: false },
        ].map((action) => (
          <Link key={action.href} href={action.href}
            className={`card card-interactive flex items-center gap-3 p-4 no-underline ${action.accent ? "border-indigo-500/30" : ""}`}
            style={action.accent ? { background: "var(--color-accent-muted)" } : {}}>
            <action.icon size={18} style={{ color: action.accent ? "var(--color-accent-hover)" : "var(--color-text-secondary)" }} />
            <span className="text-body-sm font-medium" style={{ color: action.accent ? "var(--color-accent-hover)" : "var(--color-text-primary)" }}>
              {action.label}
            </span>
          </Link>
        ))}
      </div>

      {/* IBM Bob Status Card */}
      <div className="mb-8 p-4 rounded-xl flex items-center gap-4"
        style={{ background: "rgba(20,80,200,0.08)", border: "1px solid rgba(100,150,255,0.15)" }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(20,80,200,0.2)", border: "1px solid rgba(100,150,255,0.25)" }}>
          <Cpu size={20} style={{ color: "#7ba7ff" }} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-body-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>IBM Bob 2.0</span>
            <span className="bob-badge">Connected</span>
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--color-success)", boxShadow: "0 0 4px rgba(34,197,94,0.8)" }} />
          </div>
          <p className="text-caption" style={{ color: "var(--color-text-tertiary)" }}>
            Ask, Plan, Code, and Review modes available · watsonx integration active
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/compliance" className="btn btn-secondary btn-sm gap-1.5">
            <ShieldCheck size={13} /> Hackathon Readiness
          </Link>
          <Link href="/tasks/new" className="btn btn-primary btn-sm gap-1.5">
            New Task <ArrowRight size={13} />
          </Link>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Repositories */}
        <div className="card p-0 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--color-border-default)" }}>
            <div className="flex items-center gap-2">
              <FolderGit2 size={16} style={{ color: "var(--color-text-secondary)" }} />
              <h2 className="text-heading-sm" style={{ color: "var(--color-text-primary)" }}>Repositories</h2>
            </div>
            <Link href="/repositories" className="text-caption no-underline" style={{ color: "var(--color-accent-hover)" }}>View all</Link>
          </div>

          {!repos || repos.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3"
                style={{ background: "var(--color-bg-interactive)" }}>
                <FolderGit2 size={22} style={{ color: "var(--color-text-tertiary)" }} />
              </div>
              <p className="text-body-sm mb-4" style={{ color: "var(--color-text-secondary)" }}>
                No repositories connected yet.
              </p>
              <Link href="/repositories/new" className="btn btn-primary btn-sm gap-1.5">
                <Plus size={13} /> Connect first repository
              </Link>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: "var(--color-border-default)" }}>
              {(repos as any[]).map((repo) => (
                <Link key={repo.id} href={`/repositories/${repo.id}`}
                  className="flex items-center gap-3 px-5 py-3.5 no-underline transition-colors hover:bg-white/[0.02]">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: "var(--color-bg-interactive)" }}>
                    <FolderGit2 size={15} style={{ color: "var(--color-text-secondary)" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-body-sm font-medium truncate" style={{ color: "var(--color-text-primary)" }}>
                      {repo.github_owner}/{repo.github_repo}
                    </div>
                    <div className="text-caption" style={{ color: "var(--color-text-tertiary)" }}>
                      {repo.language ?? "Unknown language"}
                    </div>
                  </div>
                  <span className={`badge ${repo.analysis_status === "completed" ? "badge-success" : repo.analysis_status === "running" ? "badge-warning" : repo.analysis_status === "failed" ? "badge-danger" : "badge-default"}`}>
                    {repo.analysis_status}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Tasks */}
        <div className="card p-0 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--color-border-default)" }}>
            <div className="flex items-center gap-2">
              <CheckSquare size={16} style={{ color: "var(--color-text-secondary)" }} />
              <h2 className="text-heading-sm" style={{ color: "var(--color-text-primary)" }}>Recent Tasks</h2>
            </div>
            <Link href="/tasks" className="text-caption no-underline" style={{ color: "var(--color-accent-hover)" }}>View all</Link>
          </div>

          {!tasks || tasks.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3"
                style={{ background: "var(--color-bg-interactive)" }}>
                <CheckSquare size={22} style={{ color: "var(--color-text-tertiary)" }} />
              </div>
              <p className="text-body-sm mb-4" style={{ color: "var(--color-text-secondary)" }}>
                No tasks yet. Connect a repository first.
              </p>
              <Link href="/repositories/new" className="btn btn-secondary btn-sm">Get started</Link>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: "var(--color-border-default)" }}>
              {(tasks as any[]).map((task) => (
                <Link key={task.id} href={`/tasks/${task.id}`}
                  className="flex items-center gap-3 px-5 py-3.5 no-underline transition-colors hover:bg-white/[0.02]">
                  <div className="flex-1 min-w-0">
                    <div className="text-body-sm font-medium truncate" style={{ color: "var(--color-text-primary)" }}>
                      {task.title}
                    </div>
                  </div>
                  <span className={`badge ${
                    task.status === "complete" ? "badge-success" :
                    task.status === "in_progress" ? "badge-accent" :
                    task.status === "planned" ? "badge-recommendation" :
                    "badge-default"
                  }`}>
                    {task.status.replace("_", " ")}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
