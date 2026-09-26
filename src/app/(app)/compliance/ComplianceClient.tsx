"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  FolderGit2,
  Upload,
  Download,
  Copy,
  RefreshCw,
  FileCode,
  Coins,
  Cpu,
  UserCheck,
  Tag,
  Plus,
  Trash2,
  Info,
  Check,
  FileText,
} from "lucide-react";
import {
  ComplianceState,
  ComplianceItem,
  ComplianceStatus,
  DataSourceRecord,
  DEFAULT_BOB_VERSION_REQUIREMENT,
  INITIAL_COMPLIANCE_STATE,
} from "@/types/compliance";

// Server-side evaluation shape (returned by GET /api/compliance)
// Items include verificationSource from service.ts VERIFICATION_SOURCE map
interface EvaluatedItem extends ComplianceItem {
  verificationSource?: "automatic" | "developer" | "mixed";
  verificationSourceLabel?: string;
}

interface ServerEvaluation {
  items: EvaluatedItem[];
  readyToSubmit: boolean;
  unresolvedIssues: string[];
  counts: { verified: number; needsAttention: number; notVerified: number };
}

const EMPTY_EVALUATION: ServerEvaluation = {
  items: [],
  readyToSubmit: false,
  unresolvedIssues: [],
  counts: { verified: 0, needsAttention: 0, notVerified: 0 },
};

export default function ComplianceClient() {
  const [state, setState] = useState<ComplianceState>(INITIAL_COMPLIANCE_STATE);
  const [evaluation, setEvaluation] = useState<ServerEvaluation>(EMPTY_EVALUATION);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // New Screenshot form state
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [taskName, setTaskName] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [screenshotNotes, setScreenshotNotes] = useState("");
  const [screenshotDate, setScreenshotDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  // New Data Source form state
  const [newSource, setNewSource] = useState("");
  const [newSourceType, setNewSourceType] = useState("REST API");
  const [newSourcePermission, setNewSourcePermission] = useState("Public / Open Source License");
  const [newSourceUsedFor, setNewSourceUsedFor] = useState("");
  const [newSourceVerified, setNewSourceVerified] = useState(true);

  // Data Sources Markdown export feedback
  const [dataSourcesSaved, setDataSourcesSaved] = useState(false);

  // Fetch initial compliance state from server
  const loadComplianceState = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/compliance");
      if (res.ok) {
        const json = await res.json();
        if (json.data?.state) {
          setState(json.data.state);
        }
        if (json.data?.evaluation) {
          setEvaluation(json.data.evaluation);
        }
      }
    } catch (err) {
      console.error("[CompliancePage] Load error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadComplianceState();
  }, [loadComplianceState]);

  // Save current state to server
  const saveStateToServer = async (updatedState: ComplianceState) => {
    try {
      setSaving(true);
      const res = await fetch("/api/compliance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: updatedState }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data?.state) {
          setState(json.data.state);
        }
        if (json.data?.evaluation) {
          setEvaluation(json.data.evaluation);
        }
        setSaveMessage("Saved successfully");
        setTimeout(() => setSaveMessage(null), 3000);
      }
    } catch (err) {
      console.error("[CompliancePage] Save error:", err);
    } finally {
      setSaving(false);
    }
  };

  // Rescan bob_sessions folder
  const handleRescanFolder = async () => {
    try {
      setScanning(true);
      const res = await fetch("/api/compliance/scan", { method: "POST" });
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          const updated: ComplianceState = {
            ...state,
            bobSessions: {
              folderDetected: json.data.folderDetected,
              folderPath: json.data.folderPath,
              pngCount: json.data.pngCount,
              pngFiles: json.data.pngFiles,
              status: json.data.status,
              checkedAt: new Date().toISOString(),
              scanMessage: json.data.scanMessage,
            },
          };
          setState(updated);
          await saveStateToServer(updated);
        }
      }
    } catch (err) {
      console.error("[CompliancePage] Rescan error:", err);
    } finally {
      setScanning(false);
    }
  };

  // Upload screenshot
  const handleUploadScreenshot = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError(null);

    if (!screenshotFile) {
      setUploadError("Please select a PNG screenshot file.");
      return;
    }

    if (!screenshotFile.name.toLowerCase().endsWith(".png")) {
      setUploadError("Only genuine PNG (*.png) files are accepted.");
      return;
    }

    if (!taskName.trim()) {
      setUploadError("Please provide the Bob task name associated with this screenshot.");
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", screenshotFile);
      formData.append("taskName", taskName.trim());
      formData.append("description", taskDescription.trim());
      formData.append("date", screenshotDate);
      formData.append("notes", screenshotNotes.trim());

      const res = await fetch("/api/compliance/upload", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();

      if (!res.ok) {
        setUploadError(json.error?.message || "Failed to upload screenshot.");
        return;
      }

      if (json.data?.item) {
        const updatedScreenshots = [...state.bobScreenshots.items, json.data.item];
        const updatedSessions = json.data.scan
          ? {
              folderDetected: json.data.scan.folderDetected,
              folderPath: json.data.scan.folderPath,
              pngCount: json.data.scan.pngCount,
              pngFiles: json.data.scan.pngFiles,
              status: json.data.scan.status,
              checkedAt: new Date().toISOString(),
              scanMessage: json.data.scanMessage,
            }
          : state.bobSessions;

        const updatedState: ComplianceState = {
          ...state,
          bobScreenshots: {
            items: updatedScreenshots,
            status: state.bobScreenshots.status,
          },
          bobSessions: updatedSessions,
        };

        setState(updatedState);
        await saveStateToServer(updatedState);

        // Reset form
        setScreenshotFile(null);
        setTaskName("");
        setTaskDescription("");
        setScreenshotNotes("");
        const fileInput = document.getElementById("screenshot-file-input") as HTMLInputElement;
        if (fileInput) fileInput.value = "";
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  // Remove screenshot evidence item
  const handleDeleteScreenshot = async (id: string) => {
    const updatedScreenshots = state.bobScreenshots.items.filter((item) => item.id !== id);
    const updatedState: ComplianceState = {
      ...state,
      bobScreenshots: {
        items: updatedScreenshots,
        status: state.bobScreenshots.status,
      },
    };
    setState(updatedState);
    await saveStateToServer(updatedState);
  };

  // Add data source
  const handleAddDataSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSource.trim() || !newSourceUsedFor.trim()) return;

    const newRecord: DataSourceRecord = {
      id: `source-${Date.now()}`,
      source: newSource.trim(),
      type: newSourceType,
      permission: newSourcePermission.trim(),
      usedFor: newSourceUsedFor.trim(),
      verified: newSourceVerified,
    };

    const updatedSources = [...state.dataCompliance.sources, newRecord];

    const updatedState: ComplianceState = {
      ...state,
      dataCompliance: {
        ...state.dataCompliance,
        sources: updatedSources,
      },
    };

    setState(updatedState);
    setNewSource("");
    setNewSourceUsedFor("");
    await saveStateToServer(updatedState);
  };

  // Remove data source
  const handleDeleteDataSource = async (id: string) => {
    const updatedSources = state.dataCompliance.sources.filter((s) => s.id !== id);

    const updatedState: ComplianceState = {
      ...state,
      dataCompliance: {
        ...state.dataCompliance,
        sources: updatedSources,
      },
    };

    setState(updatedState);
    await saveStateToServer(updatedState);
  };

  // Toggle checklist item
  const handleChecklistToggle = async (key: keyof ComplianceState["dataCompliance"]["checklist"]) => {
    const updatedChecklist = {
      ...state.dataCompliance.checklist,
      [key]: !state.dataCompliance.checklist[key],
    };

    const updatedState: ComplianceState = {
      ...state,
      dataCompliance: {
        ...state.dataCompliance,
        checklist: updatedChecklist,
      },
    };

    setState(updatedState);
    await saveStateToServer(updatedState);
  };

  // Generate DATA_SOURCES.md
  const handleGenerateDataSourcesMd = async () => {
    try {
      const res = await fetch("/api/compliance/datasources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state }),
      });
      if (res.ok) {
        setDataSourcesSaved(true);
        setTimeout(() => setDataSourcesSaved(false), 4000);
      }
    } catch (err) {
      console.error("[CompliancePage] Generate DATA_SOURCES.md error:", err);
    }
  };

  // Export report download
  const handleExportDownload = (format: "markdown" | "json") => {
    window.open(`/api/compliance/export?format=${format}`, "_blank");
  };

  // Copy Markdown to clipboard
  const handleCopyMarkdown = async () => {
    try {
      const res = await fetch("/api/compliance/export?format=markdown");
      if (res.ok) {
        const text = await res.text();
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      // Fallback
    }
  };

  // Helper for Status Badge
  const renderStatusBadge = (status: ComplianceStatus) => {
    if (status === "verified") {
      return (
        <span className="badge badge-verified flex items-center gap-1">
          <CheckCircle2 size={11} /> Ready
        </span>
      );
    }
    if (status === "needs_attention") {
      return (
        <span className="badge badge-warning flex items-center gap-1">
          <AlertTriangle size={11} /> Needs attention
        </span>
      );
    }
    return (
      <span className="badge badge-default flex items-center gap-1">
        <HelpCircle size={11} /> Not verified
      </span>
    );
  };

  // Helper for Verification Source Chip
  const renderSourceChip = (source?: "automatic" | "developer" | "mixed", label?: string) => {
    if (!source || !label) return null;
    const styles: Record<string, { bg: string; border: string; color: string }> = {
      automatic: { bg: "rgba(59,130,246,0.08)", border: "rgba(59,130,246,0.25)", color: "#60a5fa" },
      developer: { bg: "rgba(168,85,247,0.08)", border: "rgba(168,85,247,0.25)", color: "#c084fc" },
      mixed:     { bg: "rgba(20,184,166,0.08)", border: "rgba(20,184,166,0.25)", color: "#2dd4bf" },
    };
    const s = styles[source];
    return (
      <span
        className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full"
        style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color }}>
        <Tag size={9} />
        {label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="p-8 max-w-6xl mx-auto flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw size={24} className="animate-spin text-indigo-400" />
          <p className="text-body-sm" style={{ color: "var(--color-text-secondary)" }}>
            Inspecting repository compliance evidence...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto animate-fade-in space-y-8 pb-16">
      {/* ── Page Header ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6"
        style={{ borderColor: "var(--color-border-default)" }}>
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)" }}>
              <ShieldCheck size={18} style={{ color: "var(--color-accent-hover)" }} />
            </div>
            <h1 className="text-heading-md" style={{ color: "var(--color-text-primary)" }}>
              Hackathon Readiness
            </h1>
            <span className="bob-badge">IBM Bob 2.0</span>
          </div>
          <p className="text-body-sm" style={{ color: "var(--color-text-secondary)" }}>
            Verify your RepoPilot submission against the IBM Bob 2.0 Hackathon requirements.
          </p>
        </div>

        {/* Global Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleRescanFolder}
            disabled={scanning}
            className="btn btn-secondary btn-sm gap-1.5"
            title="Scan repository filesystem for bob_sessions/ folder and screenshots">
            <RefreshCw size={13} className={scanning ? "animate-spin" : ""} />
            {scanning ? "Scanning..." : "Scan Repository"}
          </button>

          <button
            onClick={handleCopyMarkdown}
            className="btn btn-secondary btn-sm gap-1.5"
            title="Copy compliance report to clipboard">
            {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
            {copied ? "Copied" : "Copy Report"}
          </button>

          <div className="flex items-center rounded-md overflow-hidden border"
            style={{ borderColor: "var(--color-border-strong)" }}>
            <button
              onClick={() => handleExportDownload("markdown")}
              className="btn btn-primary btn-sm gap-1.5 rounded-none"
              title="Download official markdown report">
              <Download size={13} /> Export Report (.md)
            </button>
            <button
              onClick={() => handleExportDownload("json")}
              className="btn btn-secondary btn-sm gap-1 rounded-none border-l"
              style={{ borderColor: "var(--color-border-strong)" }}
              title="Export structured JSON evidence">
              JSON
            </button>
          </div>
        </div>
      </div>

      {saveMessage && (
        <div className="p-3 rounded-lg flex items-center gap-2 text-sm bg-emerald-950/60 border border-emerald-500/30 text-emerald-300">
          <CheckCircle2 size={16} /> {saveMessage}
        </div>
      )}

      {/* ── Overall Submission Readiness Banner (Requirement 9) ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-heading-sm font-semibold flex items-center gap-2" style={{ color: "var(--color-text-primary)" }}>
            <span>Submission Readiness</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
              Evidence-First
            </span>
          </h2>
          <span className="text-caption" style={{ color: "var(--color-text-tertiary)" }}>
            Strict verification · No fabricated scores
          </span>
        </div>

        {/* 7 Requirement Status Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          {evaluation.items.map((item) => (
            <div
              key={item.id}
              className="card p-3 flex flex-col justify-between transition-all"
              style={{
                borderColor:
                  item.status === "verified"
                    ? "rgba(34,197,94,0.3)"
                    : item.status === "needs_attention"
                    ? "rgba(234,179,8,0.3)"
                    : "var(--color-border-default)",
                background:
                  item.status === "verified"
                    ? "rgba(34,197,94,0.03)"
                    : item.status === "needs_attention"
                    ? "rgba(234,179,8,0.03)"
                    : "var(--color-bg-surface)",
              }}>
              <div className="mb-2">
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-caption font-semibold line-clamp-1" style={{ color: "var(--color-text-primary)" }}>
                    {item.title}
                  </span>
                  {item.status === "verified" ? (
                    <CheckCircle2 size={14} className="text-green-400 flex-shrink-0" />
                  ) : item.status === "needs_attention" ? (
                    <AlertTriangle size={14} className="text-amber-400 flex-shrink-0" />
                  ) : (
                    <HelpCircle size={14} className="text-slate-500 flex-shrink-0" />
                  )}
                </div>
                <p className="text-[11px] line-clamp-2" style={{ color: "var(--color-text-tertiary)" }}>
                  {item.description}
                </p>
              </div>
              <div className="mt-1 pt-1.5 border-t space-y-1" style={{ borderColor: "var(--color-border-default)" }}>
                {renderStatusBadge(item.status)}
                {renderSourceChip(item.verificationSource, item.verificationSourceLabel)}
              </div>
            </div>
          ))}
        </div>

        {/* Readiness Status Banner */}
        {evaluation.readyToSubmit ? (
          <div className="p-5 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-emerald-950/40 border-emerald-500/40 text-emerald-200">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-emerald-500/20 text-emerald-400 flex-shrink-0 mt-0.5">
                <CheckCircle2 size={22} />
              </div>
              <div>
                <h3 className="font-bold text-base text-emerald-100 flex items-center gap-2">
                  Ready to submit
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    All 7 verified
                  </span>
                </h3>
                <p className="text-body-sm text-emerald-300/90 mt-0.5">
                  All requirements have genuine, verifiable development evidence. You may proceed with the IBM Bob 2.0 Hackathon submission.
                </p>
              </div>
            </div>
            <button
              onClick={() => handleExportDownload("markdown")}
              className="btn btn-primary btn-md gap-2 whitespace-nowrap self-stretch md:self-auto justify-center bg-emerald-600 hover:bg-emerald-500 border-emerald-500 text-white shadow-lg">
              <Download size={15} /> Download Submission Package
            </button>
          </div>
        ) : (
          <div className="p-5 rounded-xl border flex flex-col gap-3 bg-amber-950/30 border-amber-500/30 text-amber-200">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center bg-amber-500/20 text-amber-400 flex-shrink-0 mt-0.5">
                <AlertTriangle size={20} />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm text-amber-100 flex items-center gap-2">
                  Action required
                  <span className="text-xs font-normal text-amber-300">
                    ({evaluation.unresolvedIssues.length} {evaluation.unresolvedIssues.length === 1 ? "requirement needs" : "requirements need"} attention)
                  </span>
                </h3>
                <p className="text-body-sm text-amber-300/80 mt-0.5">
                  Provide genuine development evidence for unresolved items before submitting RepoPilot:
                </p>
                <ul className="mt-2 space-y-1 text-body-sm text-amber-200/90 list-disc list-inside">
                  {evaluation.unresolvedIssues.map((issue, idx) => (
                    <li key={idx} className="font-medium">
                      {issue}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ── Detailed Requirement Checklists & Evidence Sections ── */}

      {/* 1. IBM Bob IDE (Requirement 2) */}
      <section className="card p-6 space-y-5" id="section-bob-ide">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-4"
          style={{ borderColor: "var(--color-border-default)" }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(20,80,200,0.15)", border: "1px solid rgba(100,150,255,0.25)" }}>
              <Cpu size={18} style={{ color: "#7ba7ff" }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-heading-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                  1. IBM Bob IDE
                </h3>
                {renderStatusBadge(state.bobIde.status)}
              </div>
              <p className="text-caption mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
                RepoPilot must showcase IBM Bob IDE as a core component of the solution.
              </p>
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-lg flex items-start gap-2.5"
          style={{ background: "var(--color-bg-interactive)", border: "1px solid var(--color-border-default)" }}>
          <Info size={16} className="text-indigo-400 mt-0.5 flex-shrink-0" />
          <p className="text-body-sm" style={{ color: "var(--color-text-secondary)" }}>
            <strong className="text-slate-200">Compliance Rule:</strong> Bob IDE usage should represent genuine development work performed for RepoPilot. Do not treat a simple installation or mention of Bob IDE as evidence. If no development work has been recorded, this remains <em>Needs verification</em>.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-caption font-medium block mb-1.5" style={{ color: "var(--color-text-secondary)" }}>
              Bob IDE Used for Development *
            </label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer text-body-sm" style={{ color: "var(--color-text-primary)" }}>
                <input
                  type="radio"
                  name="bobIdeUsed"
                  checked={state.bobIde.used === true}
                  onChange={() => {
                    const updated = {
                      ...state,
                      bobIde: { ...state.bobIde, used: true },
                    };
                    setState(updated);
                  }}
                  className="accent-indigo-500"
                />
                Yes (Genuine development work performed)
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-body-sm" style={{ color: "var(--color-text-primary)" }}>
                <input
                  type="radio"
                  name="bobIdeUsed"
                  checked={state.bobIde.used === false}
                  onChange={() => {
                    const updated = {
                      ...state,
                      bobIde: { ...state.bobIde, used: false },
                    };
                    setState(updated);
                  }}
                  className="accent-indigo-500"
                />
                No
              </label>
            </div>
          </div>

          <div>
            <label className="text-caption font-medium block mb-1.5" style={{ color: "var(--color-text-secondary)" }}>
              Date of Usage *
            </label>
            <input
              type="date"
              value={state.bobIde.dateOfUsage}
              onChange={(e) => {
                const updated = {
                  ...state,
                  bobIde: { ...state.bobIde, dateOfUsage: e.target.value },
                };
                setState(updated);
              }}
              className="input input-mono"
            />
          </div>

          <div>
            <label className="text-caption font-medium block mb-1.5" style={{ color: "var(--color-text-secondary)" }}>
              Bob IDE Version *
            </label>
            <input
              type="text"
              placeholder="e.g. 2.0.2"
              value={state.bobIde.version}
              onChange={(e) => {
                const updated = {
                  ...state,
                  bobIde: { ...state.bobIde, version: e.target.value },
                };
                setState(updated);
              }}
              className="input input-mono"
            />
          </div>

          <div>
            <label className="text-caption font-medium block mb-1.5" style={{ color: "var(--color-text-secondary)" }}>
              Tasks Completed in Bob IDE *
            </label>
            <input
              type="text"
              placeholder="e.g. Implementation planning, watsonx API client, test review"
              value={state.bobIde.tasksCompleted}
              onChange={(e) => {
                const updated = {
                  ...state,
                  bobIde: { ...state.bobIde, tasksCompleted: e.target.value },
                };
                setState(updated);
              }}
              className="input"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-caption font-medium block mb-1.5" style={{ color: "var(--color-text-secondary)" }}>
              Evidence Notes
            </label>
            <textarea
              rows={2}
              placeholder="Detail the sessions, prompt strategies, and specific code written using Bob IDE..."
              value={state.bobIde.notes}
              onChange={(e) => {
                const updated = {
                  ...state,
                  bobIde: { ...state.bobIde, notes: e.target.value },
                };
                setState(updated);
              }}
              className="input resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={() => saveStateToServer(state)}
            disabled={saving}
            className="btn btn-primary btn-sm">
            {saving ? "Saving..." : "Save Bob IDE Evidence"}
          </button>
        </div>
      </section>

      {/* 2. bob_sessions Folder Required (Requirement 3) */}
      <section className="card p-6 space-y-5" id="section-bob-sessions">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-4"
          style={{ borderColor: "var(--color-border-default)" }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.25)" }}>
              <FolderGit2 size={18} className="text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-heading-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                  2. <code className="inline-code">bob_sessions/</code> Folder
                </h3>
                {renderStatusBadge(state.bobSessions.status)}
              </div>
              <p className="text-caption mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
                The final repository must contain a <code className="inline-code text-[11px]">bob_sessions/</code> folder containing PNG screenshots of Bob IDE task session summaries.
              </p>
            </div>
          </div>

          <button
            onClick={handleRescanFolder}
            disabled={scanning}
            className="btn btn-secondary btn-sm gap-1.5 self-start sm:self-auto">
            <RefreshCw size={13} className={scanning ? "animate-spin" : ""} />
            {scanning ? "Scanning..." : "Rescan Repository"}
          </button>
        </div>

        {/* Folder Detection Panel */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="surface p-4 rounded-lg space-y-1">
            <span className="text-caption" style={{ color: "var(--color-text-tertiary)" }}>Folder Detection</span>
            <div className="text-body font-semibold flex items-center gap-2" style={{ color: "var(--color-text-primary)" }}>
              {state.bobSessions.folderDetected ? (
                <span className="text-green-400 flex items-center gap-1.5">
                  <CheckCircle2 size={15} /> Found
                </span>
              ) : (
                <span className="text-amber-400 flex items-center gap-1.5">
                  <AlertTriangle size={15} /> Missing
                </span>
              )}
            </div>
            <p className="text-caption truncate" style={{ color: "var(--color-text-tertiary)" }}>
              {state.bobSessions.folderPath || "Root path check"}
            </p>
          </div>

          <div className="surface p-4 rounded-lg space-y-1">
            <span className="text-caption" style={{ color: "var(--color-text-tertiary)" }}>PNG Files Count</span>
            <div className="text-body font-semibold" style={{ color: "var(--color-text-primary)" }}>
              {state.bobSessions.pngCount} {state.bobSessions.pngCount === 1 ? "PNG file" : "PNG files"}
            </div>
            <p className="text-caption" style={{ color: "var(--color-text-tertiary)" }}>
              Requires at least 1 genuine screenshot
            </p>
          </div>

          <div className="surface p-4 rounded-lg space-y-1">
            <span className="text-caption" style={{ color: "var(--color-text-tertiary)" }}>Repository Verification</span>
            <div className="text-body font-semibold" style={{ color: "var(--color-text-primary)" }}>
              {state.bobSessions.folderDetected && state.bobSessions.pngCount > 0 ? (
                <span className="text-green-400">Verified on disk</span>
              ) : (
                <span className="text-amber-400">Action needed</span>
              )}
            </div>
            <p className="text-caption truncate" style={{ color: "var(--color-text-tertiary)" }}>
              {state.bobSessions.checkedAt ? `Checked ${new Date(state.bobSessions.checkedAt).toLocaleTimeString()}` : "Not scanned"}
            </p>
          </div>
        </div>

        {/* Found files list */}
        {state.bobSessions.pngFiles.length > 0 ? (
          <div>
            <span className="text-caption font-medium block mb-2" style={{ color: "var(--color-text-secondary)" }}>
              Detected Screenshot Files in <code className="inline-code">bob_sessions/</code>:
            </span>
            <div className="flex flex-wrap gap-2">
              {state.bobSessions.pngFiles.map((filename, i) => (
                <div key={i} className="px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700/60 flex items-center gap-2 text-xs font-mono text-slate-200">
                  <FileCode size={13} className="text-blue-400" />
                  <span>{filename}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-lg border border-dashed border-amber-500/40 bg-amber-950/20 text-amber-300 text-body-sm flex items-start gap-2.5">
            <AlertTriangle size={17} className="text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-amber-200">Add the actual Bob IDE task session summary screenshots before submission.</p>
              <p className="text-caption text-amber-300/80 mt-1">
                Upload PNG files below or place them directly in <code className="inline-code">bob_sessions/</code> at the repository root.
              </p>
            </div>
          </div>
        )}

        {/* Visual Folder Tree Example */}
        <div>
          <span className="text-caption font-medium block mb-1.5" style={{ color: "var(--color-text-tertiary)" }}>
            Expected Repository Structure Example:
          </span>
          <pre className="code-block text-xs">
{`bob_sessions/
├── task-01-session-summary.png
├── task-02-session-summary.png
└── task-03-session-summary.png`}
          </pre>
        </div>
      </section>

      {/* 3. Bob IDE Screenshot Evidence (Requirement 4) */}
      <section className="card p-6 space-y-5" id="section-bob-screenshots">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-4"
          style={{ borderColor: "var(--color-border-default)" }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(168,85,247,0.15)", border: "1px solid rgba(168,85,247,0.25)" }}>
              <Upload size={18} className="text-purple-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-heading-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                  3. Bob IDE Screenshot Evidence
                </h3>
                {renderStatusBadge(state.bobScreenshots.status)}
              </div>
              <p className="text-caption mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
                Capture session consumption summaries from genuine Bob IDE task workflows.
              </p>
            </div>
          </div>
        </div>

        {/* Workflow Instruction Box */}
        <div className="p-4 rounded-lg surface space-y-2">
          <span className="text-label text-indigo-400">Required Capture Workflow</span>
          <div className="p-2.5 rounded bg-slate-950/80 border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto">
            Bob IDE → Chat → Tasks → Select task → Open task header → Session consumption summary → Capture screenshot (*.png)
          </div>
          <p className="text-caption" style={{ color: "var(--color-text-tertiary)" }}>
            Screenshots must reflect genuine task completion and Bobcoin/session consumption.
          </p>
        </div>

        {/* Upload Form */}
        <form onSubmit={handleUploadScreenshot} className="p-4 rounded-lg border space-y-4"
          style={{ borderColor: "var(--color-border-strong)", background: "var(--color-bg-elevated)" }}>
          <h4 className="text-body-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
            Record New Screenshot Evidence
          </h4>

          {uploadError && (
            <div className="p-2.5 rounded bg-red-950/60 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
              <AlertTriangle size={14} /> {uploadError}
            </div>
          )}

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="text-caption font-medium block mb-1" style={{ color: "var(--color-text-secondary)" }}>
                Select PNG Screenshot *
              </label>
              <input
                id="screenshot-file-input"
                type="file"
                accept=".png,image/png"
                onChange={(e) => setScreenshotFile(e.target.files?.[0] || null)}
                className="input text-xs"
                required
              />
              <span className="text-[11px] text-slate-400 block mt-1">Must be genuine .png file</span>
            </div>

            <div>
              <label className="text-caption font-medium block mb-1" style={{ color: "var(--color-text-secondary)" }}>
                Associated Bob Task Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Plan RepoPilot Architecture"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                className="input text-xs"
                required
              />
            </div>

            <div>
              <label className="text-caption font-medium block mb-1" style={{ color: "var(--color-text-secondary)" }}>
                Date of Task *
              </label>
              <input
                type="date"
                value={screenshotDate}
                onChange={(e) => setScreenshotDate(e.target.value)}
                className="input input-mono text-xs"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-caption font-medium block mb-1" style={{ color: "var(--color-text-secondary)" }}>
                Task Session Description
              </label>
              <input
                type="text"
                placeholder="e.g. Generated ordered 6-step implementation plan for watsonx integration"
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                className="input text-xs"
              />
            </div>

            <div>
              <label className="text-caption font-medium block mb-1" style={{ color: "var(--color-text-secondary)" }}>
                Session Notes
              </label>
              <input
                type="text"
                placeholder="e.g. Consumed 4 Bobcoins, Granite 13b chat"
                value={screenshotNotes}
                onChange={(e) => setScreenshotNotes(e.target.value)}
                className="input text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={uploading}
              className="btn btn-primary btn-sm gap-1.5">
              <Upload size={13} />
              {uploading ? "Saving Screenshot..." : "Save Screenshot Evidence (*.png)"}
            </button>
          </div>
        </form>

        {/* Recorded Evidence Table */}
        <div>
          <span className="text-caption font-medium block mb-2" style={{ color: "var(--color-text-secondary)" }}>
            Recorded Bob IDE Evidence ({state.bobScreenshots.items.length})
          </span>

          {state.bobScreenshots.items.length === 0 ? (
            <div className="p-8 text-center surface rounded-lg">
              <FileCode size={24} className="mx-auto text-slate-500 mb-2" />
              <p className="text-body-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>
                No Bob IDE screenshot evidence recorded yet.
              </p>
              <p className="text-caption" style={{ color: "var(--color-text-tertiary)" }}>
                Use the form above to record task screenshots from your Bob IDE workspace.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto surface rounded-lg border" style={{ borderColor: "var(--color-border-default)" }}>
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b bg-slate-900/60" style={{ borderColor: "var(--color-border-default)" }}>
                    <th className="p-3 font-semibold text-slate-300">Task Name</th>
                    <th className="p-3 font-semibold text-slate-300">Filename</th>
                    <th className="p-3 font-semibold text-slate-300">Date</th>
                    <th className="p-3 font-semibold text-slate-300">Description / Notes</th>
                    <th className="p-3 font-semibold text-slate-300 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: "var(--color-border-default)" }}>
                  {state.bobScreenshots.items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-900/30">
                      <td className="p-3 font-medium text-slate-100">{item.taskName}</td>
                      <td className="p-3 font-mono text-indigo-400">{item.filename}</td>
                      <td className="p-3 font-mono text-slate-400">{item.date}</td>
                      <td className="p-3 text-slate-300 max-w-xs truncate">
                        {item.description || item.notes || "—"}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleDeleteScreenshot(item.id)}
                          className="btn btn-ghost btn-sm text-red-400 hover:text-red-300 p-1"
                          title="Remove evidence item">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* 4. Own / Clean Data (Requirement 5) */}
      <section className="card p-6 space-y-5" id="section-data-compliance">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-4"
          style={{ borderColor: "var(--color-border-default)" }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.25)" }}>
              <FileText size={18} className="text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-heading-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                  4. Data Compliance (Own / Clean Data)
                </h3>
                {renderStatusBadge(state.dataCompliance.status)}
              </div>
              <p className="text-caption mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
                The project must use data permitted for developer usage, free of client confidential or restricted data.
              </p>
            </div>
          </div>

          <button
            onClick={handleGenerateDataSourcesMd}
            className="btn btn-secondary btn-sm gap-1.5 self-start sm:self-auto">
            {dataSourcesSaved ? <Check size={13} className="text-green-400" /> : <FileCode size={13} />}
            {dataSourcesSaved ? "Saved DATA_SOURCES.md" : "Generate DATA_SOURCES.md"}
          </button>
        </div>

        {/* Hygiene Checklist */}
        <div className="space-y-3">
          <span className="text-caption font-semibold" style={{ color: "var(--color-text-primary)" }}>
            Data Hygiene Checklist (All items must be confirmed)
          </span>

          <div className="grid md:grid-cols-2 gap-2.5">
            {[
              {
                key: "noConfidentialData" as const,
                label: "No client/company confidential data",
                desc: "Codebase contains zero proprietary customer secrets or NDA-restricted data.",
              },
              {
                key: "noPersonalData" as const,
                label: "No private personal data (PII)",
                desc: "Zero user PII, real contact details, or private identifying records.",
              },
              {
                key: "noUnauthorizedSocialData" as const,
                label: "No unauthorized social-media data",
                desc: "No unauthorized scraped or restricted platform data.",
              },
              {
                key: "ownershipVerified" as const,
                label: "Dataset/source ownership or permission verified",
                desc: "All training or runtime sources are legitimately owned or open-source licensed.",
              },
              {
                key: "publicSourcesChecked" as const,
                label: "Public web sources checked for permitted usage",
                desc: "Verified API terms of service and public usage allowances.",
              },
              {
                key: "sourcesDocumented" as const,
                label: "Data sources documented",
                desc: "All external data endpoints, libraries, and datasets documented in table.",
              },
            ].map((chk) => (
              <label
                key={chk.key}
                className="surface p-3 rounded-lg flex items-start gap-3 cursor-pointer hover:border-slate-600 transition-colors">
                <input
                  type="checkbox"
                  checked={state.dataCompliance.checklist[chk.key]}
                  onChange={() => handleChecklistToggle(chk.key)}
                  className="mt-1 w-4 h-4 accent-emerald-500 rounded"
                />
                <div>
                  <div className="text-body-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
                    {chk.label}
                  </div>
                  <div className="text-caption mt-0.5" style={{ color: "var(--color-text-tertiary)" }}>
                    {chk.desc}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Data Sources Table */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-caption font-semibold" style={{ color: "var(--color-text-primary)" }}>
              Data Sources Log ({state.dataCompliance.sources.length})
            </span>
            <span className="text-caption" style={{ color: "var(--color-text-tertiary)" }}>
              Document every external API, schema, or repository dataset used
            </span>
          </div>

          <div className="overflow-x-auto surface rounded-lg border" style={{ borderColor: "var(--color-border-default)" }}>
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b bg-slate-900/60" style={{ borderColor: "var(--color-border-default)" }}>
                  <th className="p-3 font-semibold text-slate-300">Source</th>
                  <th className="p-3 font-semibold text-slate-300">Type</th>
                  <th className="p-3 font-semibold text-slate-300">Permission / License</th>
                  <th className="p-3 font-semibold text-slate-300">Used For</th>
                  <th className="p-3 font-semibold text-slate-300">Verified</th>
                  <th className="p-3 font-semibold text-slate-300 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "var(--color-border-default)" }}>
                {state.dataCompliance.sources.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-slate-400">
                      No data sources recorded. Add repository metadata sources (e.g. GitHub REST API, public repositories) below.
                    </td>
                  </tr>
                ) : (
                  state.dataCompliance.sources.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-900/30">
                      <td className="p-3 font-medium text-slate-200">{s.source}</td>
                      <td className="p-3 text-slate-400">{s.type}</td>
                      <td className="p-3 font-mono text-emerald-400">{s.permission}</td>
                      <td className="p-3 text-slate-300">{s.usedFor}</td>
                      <td className="p-3">
                        {s.verified ? (
                          <span className="badge badge-verified text-[10px]">Verified</span>
                        ) : (
                          <span className="badge badge-warning text-[10px]">Pending</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleDeleteDataSource(s.id)}
                          className="btn btn-ghost btn-sm text-red-400 p-1">
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Add Data Source Form */}
          <form onSubmit={handleAddDataSource} className="p-3.5 rounded-lg border space-y-3"
            style={{ borderColor: "var(--color-border-default)", background: "var(--color-bg-elevated)" }}>
            <span className="text-caption font-semibold block" style={{ color: "var(--color-text-secondary)" }}>
              Add Documented Data Source
            </span>
            <div className="grid sm:grid-cols-2 md:grid-cols-5 gap-2.5">
              <div>
                <input
                  type="text"
                  placeholder="Source (e.g. GitHub REST API)"
                  value={newSource}
                  onChange={(e) => setNewSource(e.target.value)}
                  className="input text-xs"
                  required
                />
              </div>
              <div>
                <select
                  value={newSourceType}
                  onChange={(e) => setNewSourceType(e.target.value)}
                  className="input text-xs">
                  <option value="REST API">REST API</option>
                  <option value="Open Source Dataset">Open Source Dataset</option>
                  <option value="Public Repository">Public Repository</option>
                  <option value="Documentation">Documentation</option>
                  <option value="Synthetic Data">Synthetic Data</option>
                </select>
              </div>
              <div>
                <input
                  type="text"
                  placeholder="License (e.g. MIT / GitHub ToS)"
                  value={newSourcePermission}
                  onChange={(e) => setNewSourcePermission(e.target.value)}
                  className="input text-xs"
                  required
                />
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Used For (e.g. File trees)"
                  value={newSourceUsedFor}
                  onChange={(e) => setNewSourceUsedFor(e.target.value)}
                  className="input text-xs"
                  required
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newSourceVerified}
                    onChange={(e) => setNewSourceVerified(e.target.checked)}
                    className="accent-emerald-500 rounded"
                  />
                  Verified
                </label>
                <button type="submit" className="btn btn-secondary btn-sm gap-1 ml-auto">
                  <Plus size={13} /> Add
                </button>
              </div>
            </div>
          </form>
        </div>
      </section>

      {/* 5. 40 Bobcoins (Requirement 6) */}
      <section className="card p-6 space-y-5" id="section-bobcoins">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-4"
          style={{ borderColor: "var(--color-border-default)" }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(234,179,8,0.15)", border: "1px solid rgba(234,179,8,0.25)" }}>
              <Coins size={18} className="text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-heading-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                  5. Bobcoin Budget
                </h3>
                {renderStatusBadge(state.bobcoins.status)}
              </div>
              <p className="text-caption mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
                Hackathon participants have a 40 Bobcoin allocation.
              </p>
            </div>
          </div>
        </div>

        {/* Balance Display */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="surface p-4 rounded-lg space-y-1">
            <span className="text-caption text-slate-400">Total Allocation</span>
            <div className="text-2xl font-bold font-mono text-slate-100">
              {state.bobcoins.allocation} <span className="text-xs font-normal text-slate-400">Bobcoins</span>
            </div>
            <p className="text-[11px] text-slate-500">Official hackathon stipend</p>
          </div>

          <div className="surface p-4 rounded-lg space-y-1">
            <span className="text-caption text-slate-400">Used</span>
            <div className="text-2xl font-bold font-mono text-slate-100">
              {state.bobcoins.used !== null ? state.bobcoins.used : "--"}
              <span className="text-xs font-normal text-slate-400"> Bobcoins</span>
            </div>
            <p className="text-[11px] text-slate-500">Recorded from Bob IDE task sessions</p>
          </div>

          <div className="surface p-4 rounded-lg space-y-1">
            <span className="text-caption text-slate-400">Remaining</span>
            <div className="text-2xl font-bold font-mono"
              style={{
                color:
                  state.bobcoins.remaining === null
                    ? "var(--color-text-primary)"
                    : state.bobcoins.remaining <= 0
                    ? "var(--color-danger)"
                    : state.bobcoins.remaining <= 10
                    ? "var(--color-warning)"
                    : "var(--color-success)",
              }}>
              {state.bobcoins.remaining !== null ? state.bobcoins.remaining : "--"}
              <span className="text-xs font-normal text-slate-400"> Bobcoins</span>
            </div>
            <p className="text-[11px] text-slate-500">Allocation − Used</p>
          </div>
        </div>

        {/* Visual Progress Bar */}
        {state.bobcoins.used !== null && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-caption text-slate-400">
              <span>Budget Usage Progress</span>
              <span>
                {Math.min(
                  100,
                  Math.round(((state.bobcoins.used || 0) / state.bobcoins.allocation) * 100)
                )}
                % Used
              </span>
            </div>
            <div className="w-full h-3 rounded-full bg-slate-900 border border-slate-800 overflow-hidden flex">
              <div
                className="h-full transition-all duration-300"
                style={{
                  width: `${Math.min(100, Math.max(0, ((state.bobcoins.used || 0) / state.bobcoins.allocation) * 100))}%`,
                  background:
                    (state.bobcoins.remaining ?? 40) <= 0
                      ? "var(--color-danger)"
                      : (state.bobcoins.remaining ?? 40) <= 10
                      ? "var(--color-warning)"
                      : "var(--color-accent)",
                }}
              />
            </div>
          </div>
        )}

        {/* Threshold Warnings */}
        {state.bobcoins.remaining !== null && (
          <>
            {state.bobcoins.remaining <= 0 && (
              <div className="p-3 rounded-lg bg-red-950/60 border border-red-500/40 text-red-200 text-body-sm flex items-center gap-2">
                <AlertTriangle size={16} className="text-red-400 flex-shrink-0" />
                <span>
                  <strong>Allocation exhausted:</strong> Remaining Bobcoins is 0 or negative. Verify that Bob IDE tasks do not fail due to lack of budget.
                </span>
              </div>
            )}
            {state.bobcoins.remaining > 0 && state.bobcoins.remaining <= 5 && (
              <div className="p-3 rounded-lg bg-amber-950/60 border border-amber-500/40 text-amber-200 text-body-sm flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-400 flex-shrink-0" />
                <span>
                  <strong>Critical Bobcoin balance:</strong> Only {state.bobcoins.remaining} Bobcoins remaining.
                </span>
              </div>
            )}
            {state.bobcoins.remaining > 5 && state.bobcoins.remaining <= 10 && (
              <div className="p-3 rounded-lg bg-yellow-950/40 border border-yellow-500/30 text-yellow-200 text-body-sm flex items-center gap-2">
                <Info size={16} className="text-yellow-400 flex-shrink-0" />
                <span>
                  <strong>Low Bobcoin balance:</strong> {state.bobcoins.remaining} Bobcoins remaining. Plan remaining tasks carefully.
                </span>
              </div>
            )}
          </>
        )}

        {/* Input area */}
        <div className="p-4 rounded-lg surface space-y-3">
          <div className="flex items-start gap-2.5 text-caption text-slate-400">
            <Info size={15} className="text-indigo-400 mt-0.5 flex-shrink-0" />
            <p>
              Check <strong>Bob IDE → Settings → General</strong> or your hackathon admin dashboard for your current balance.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="text-caption font-medium block mb-1 text-slate-300">
                Total Allocation
              </label>
              <input
                type="number"
                readOnly
                value={40}
                className="input input-mono text-xs bg-slate-900/50 text-slate-400"
              />
            </div>

            <div>
              <label className="text-caption font-medium block mb-1 text-slate-300">
                Current Bobcoins Used *
              </label>
              <input
                type="number"
                min="0"
                placeholder="e.g. 14"
                value={state.bobcoins.used !== null ? state.bobcoins.used : ""}
                onChange={(e) => {
                  const val = e.target.value === "" ? null : Math.max(0, parseInt(e.target.value) || 0);
                  const rem = val !== null ? 40 - val : null;
                  setState({
                    ...state,
                    bobcoins: {
                      ...state.bobcoins,
                      used: val,
                      remaining: rem,
                    },
                  });
                }}
                className="input input-mono text-xs"
              />
            </div>

            <div>
              <label className="text-caption font-medium block mb-1 text-slate-300">
                Calculated Remaining
              </label>
              <input
                type="text"
                readOnly
                value={state.bobcoins.remaining !== null ? `${state.bobcoins.remaining} Bobcoins` : "Enter usage"}
                className="input input-mono text-xs bg-slate-900/50 text-slate-400"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => saveStateToServer(state)}
              disabled={saving}
              className="btn btn-primary btn-sm">
              {saving ? "Saving..." : "Update Bobcoin Record"}
            </button>
          </div>
        </div>
      </section>

      {/* 6. IBMid Verification (Requirement 7) */}
      <section className="card p-6 space-y-5" id="section-ibmid">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-4"
          style={{ borderColor: "var(--color-border-default)" }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.25)" }}>
              <UserCheck size={18} className="text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-heading-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                  6. IBMid Verification
                </h3>
                {renderStatusBadge(state.ibmid.status)}
              </div>
              <p className="text-caption mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
                The IBMid used for Bob IDE/hackathon participation should correspond to the email registered for the hackathon.
              </p>
            </div>
          </div>
        </div>

        {/* Security / Privacy Warning */}
        <div className="p-3.5 rounded-lg flex items-start gap-2.5 bg-slate-900/60 border border-slate-800 text-xs text-slate-400">
          <ShieldCheck size={16} className="text-emerald-400 mt-0.5 flex-shrink-0" />
          <div>
            <strong className="text-slate-200">Security Guarantee:</strong> RepoPilot never collects, requests, or stores IBM account passwords, private tokens, or authentication credentials. This form tracks identity verification metadata only.
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-caption font-medium block mb-1 text-slate-300">
              IBMid Email Address *
            </label>
            <input
              type="email"
              placeholder="e.g. developer@company.com"
              value={state.ibmid.ibmidEmail}
              onChange={(e) => {
                const updated = {
                  ...state,
                  ibmid: { ...state.ibmid, ibmidEmail: e.target.value },
                };
                setState(updated);
              }}
              className="input input-mono text-xs"
            />
          </div>

          <div>
            <label className="text-caption font-medium block mb-1 text-slate-300">
              Hackathon Registration Email *
            </label>
            <input
              type="email"
              placeholder="e.g. developer@company.com"
              value={state.ibmid.hackathonEmail}
              onChange={(e) => {
                const updated = {
                  ...state,
                  ibmid: { ...state.ibmid, hackathonEmail: e.target.value },
                };
                setState(updated);
              }}
              className="input input-mono text-xs"
            />
          </div>
        </div>

        {/* Live Match Status */}
        <div className="surface p-4 rounded-lg flex items-center justify-between">
          <span className="text-caption font-medium text-slate-300">
            Email Correspondence Status:
          </span>
          {(() => {
            const ibm = state.ibmid.ibmidEmail.trim().toLowerCase();
            const hack = state.ibmid.hackathonEmail.trim().toLowerCase();
            if (!ibm || !hack) {
              return (
                <span className="badge badge-default flex items-center gap-1">
                  <HelpCircle size={11} /> Not verified (both emails required)
                </span>
              );
            }
            if (ibm === hack) {
              return (
                <span className="badge badge-verified flex items-center gap-1">
                  <CheckCircle2 size={11} /> Verified (Emails Match)
                </span>
              );
            }
            return (
              <span className="badge badge-danger flex items-center gap-1">
                <AlertTriangle size={11} /> Mismatch Detected
              </span>
            );
          })()}
        </div>

        <div className="flex justify-end pt-1">
          <button
            onClick={() => saveStateToServer(state)}
            disabled={saving}
            className="btn btn-primary btn-sm">
            {saving ? "Saving..." : "Save IBMid Verification"}
          </button>
        </div>
      </section>

      {/* 7. Supported Bob Version (Requirement 8) */}
      <section className="card p-6 space-y-5" id="section-bob-version">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-4"
          style={{ borderColor: "var(--color-border-default)" }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(244,63,94,0.15)", border: "1px solid rgba(244,63,94,0.25)" }}>
              <Tag size={18} className="text-rose-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-heading-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                  7. Bob IDE Version
                </h3>
                {renderStatusBadge(state.bobVersion.status)}
              </div>
              <p className="text-caption mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
                Use a supported IBM Bob IDE version for the hackathon.
              </p>
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-lg flex items-start gap-2.5 bg-slate-900/60 border border-slate-800 text-xs text-slate-300">
          <Info size={16} className="text-rose-400 mt-0.5 flex-shrink-0" />
          <p>
            Verify the current supported Bob IDE version against the official hackathon instructions before submission.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="text-caption font-medium block mb-1 text-slate-300">
              Installed Bob Version *
            </label>
            <input
              type="text"
              placeholder="e.g. 2.0.2"
              value={state.bobVersion.installedVersion}
              onChange={(e) => {
                const updated = {
                  ...state,
                  bobVersion: { ...state.bobVersion, installedVersion: e.target.value },
                };
                setState(updated);
              }}
              className="input input-mono text-xs"
            />
          </div>

          <div className="surface p-3 rounded-lg">
            <span className="text-[11px] text-slate-400 block mb-1">Supported Versions</span>
            <div className="flex flex-wrap gap-1">
              {(state.bobVersion.requirement.supportedVersions || DEFAULT_BOB_VERSION_REQUIREMENT.supportedVersions || []).map((ver) => (
                <span key={ver} className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-xs text-indigo-300">
                  {ver}
                </span>
              ))}
            </div>
          </div>

          <div className="surface p-3 rounded-lg flex flex-col justify-center">
            <span className="text-[11px] text-slate-400 block mb-1">Validation Status</span>
            <div>{renderStatusBadge(state.bobVersion.status)}</div>
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            onClick={() => saveStateToServer(state)}
            disabled={saving}
            className="btn btn-primary btn-sm">
            {saving ? "Saving..." : "Verify Bob Version"}
          </button>
        </div>
      </section>

      {/* ── Submission Evidence Export Section (Requirement 13) ── */}
      <section className="card p-6 surface-elevated space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-heading-sm font-semibold text-slate-100 flex items-center gap-2">
              <Download size={18} className="text-indigo-400" />
              Export Compliance Report
            </h3>
            <p className="text-caption text-slate-400 mt-0.5">
              Generate official audit and submission records for the IBM Bob 2.0 Hackathon.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExportDownload("markdown")}
              className="btn btn-primary btn-sm gap-1.5">
              <Download size={13} /> Export Markdown
            </button>
            <button
              onClick={() => handleExportDownload("json")}
              className="btn btn-secondary btn-sm gap-1.5">
              Export JSON
            </button>
          </div>
        </div>

        <p className="text-caption text-slate-500">
          Exported reports adhere strictly to hackathon guidelines. Tokens, passwords, and private secrets are never included.
        </p>
      </section>
    </div>
  );
}
