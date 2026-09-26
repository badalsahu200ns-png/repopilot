import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ClassificationLevel, ConfidenceLevel } from "@/types";

// ── Tailwind utility merge ───────────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── Classification helpers ───────────────────────────────────
export function getClassificationColor(level: ClassificationLevel): string {
  switch (level) {
    case "verified":       return "text-emerald-400";
    case "inferred":       return "text-amber-400";
    case "recommendation": return "text-indigo-400";
    case "unknown":        return "text-zinc-400";
    default:               return "text-zinc-400";
  }
}

export function getClassificationBadge(level: ClassificationLevel): string {
  switch (level) {
    case "verified":       return "badge-verified";
    case "inferred":       return "badge-inferred";
    case "recommendation": return "badge-recommendation";
    case "unknown":        return "badge-unknown";
    default:               return "badge-unknown";
  }
}

export function getConfidencePercent(level: ConfidenceLevel): number {
  switch (level) {
    case "high":   return 90;
    case "medium": return 55;
    case "low":    return 25;
    default:       return 0;
  }
}

// ── Time formatting ──────────────────────────────────────────
export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now  = new Date();
  const diff = now.getTime() - date.getTime();
  const secs  = Math.floor(diff / 1000);
  const mins  = Math.floor(secs / 60);
  const hours = Math.floor(mins / 60);
  const days  = Math.floor(hours / 24);

  if (secs  < 60)  return "just now";
  if (mins  < 60)  return `${mins}m ago`;
  if (hours < 24)  return `${hours}h ago`;
  if (days  < 30)  return `${days}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ── File utilities ───────────────────────────────────────────
export function getFileLanguage(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    ts: "TypeScript", tsx: "TypeScript",
    js: "JavaScript", jsx: "JavaScript",
    py: "Python",
    go: "Go",
    rs: "Rust",
    java: "Java",
    kt: "Kotlin",
    rb: "Ruby",
    php: "PHP",
    cs: "C#",
    cpp: "C++", cc: "C++", cxx: "C++",
    c: "C",
    swift: "Swift",
    dart: "Dart",
    html: "HTML", htm: "HTML",
    css: "CSS", scss: "SCSS", sass: "SASS", less: "LESS",
    json: "JSON",
    yaml: "YAML", yml: "YAML",
    md: "Markdown",
    sql: "SQL",
    sh: "Shell", bash: "Shell",
    dockerfile: "Dockerfile",
  };
  return map[ext] ?? (ext.toUpperCase() || "Unknown");
}

export function getLanguageColor(lang: string): string {
  const map: Record<string, string> = {
    TypeScript: "#3178c6",
    JavaScript: "#f7df1e",
    Python:     "#3572a5",
    Go:         "#00add8",
    Rust:       "#dea584",
    Java:       "#b07219",
    Kotlin:     "#a97bff",
    Ruby:       "#701516",
    PHP:        "#4f5d95",
    "C#":       "#178600",
    "C++":      "#f34b7d",
    C:          "#555555",
    Swift:      "#f05138",
    Dart:       "#00b4ab",
    HTML:       "#e34c26",
    CSS:        "#563d7c",
    SCSS:       "#c6538c",
    SQL:        "#336791",
    Shell:      "#89e051",
    Markdown:   "#083fa1",
  };
  return map[lang] ?? "#6366f1";
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024)       return `${bytes}B`;
  if (bytes < 1048576)    return `${(bytes / 1024).toFixed(1)}KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)}MB`;
  return `${(bytes / 1073741824).toFixed(1)}GB`;
}

// ── String utilities ─────────────────────────────────────────
export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "…";
}

export function extractRepoFromUrl(url: string): { owner: string; repo: string } | null {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?(?:\/|$)/);
  if (!match) return null;
  return { owner: match[1], repo: match[2] };
}

// ── Analytics ────────────────────────────────────────────────
export function track(event: string, properties?: Record<string, unknown>) {
  if (process.env.NODE_ENV === "development") {
    console.log("[Analytics]", event, properties);
  }
  // In production: send to your analytics provider
}

// ── Error handling ────────────────────────────────────────────
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "An unexpected error occurred";
}
