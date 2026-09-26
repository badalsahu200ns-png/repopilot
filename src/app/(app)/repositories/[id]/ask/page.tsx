"use client";

import { useState, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Send, Loader2, FileText, CheckCircle, AlertCircle, HelpCircle, Info, Cpu } from "lucide-react";
import type { ClassificationLevel, ConfidenceLevel, Evidence } from "@/types";
import { getConfidencePercent } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  classification?: ClassificationLevel;
  confidence?: ConfidenceLevel;
  evidence?: Evidence[];
  recommendations?: string[];
}

const SAMPLE_QUESTIONS = [
  "Where is authentication handled?",
  "What is the main entry point of this application?",
  "How are API routes structured?",
  "Where are tests located?",
  "What database is this project using?",
  "What is the overall architecture of this project?",
];

function ClassificationIcon({ level }: { level: ClassificationLevel }) {
  const map = {
    verified:       { icon: CheckCircle,  color: "var(--color-verified)" },
    inferred:       { icon: Info,         color: "var(--color-inferred)" },
    recommendation: { icon: HelpCircle,   color: "var(--color-recommendation)" },
    unknown:        { icon: AlertCircle,  color: "var(--color-unknown)" },
  };
  const cfg = map[level];
  return <cfg.icon size={13} style={{ color: cfg.color }} />;
}

export default function AskPage() {
  const { id } = useParams<{ id: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const msgCounter = useRef(0);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendQuestion(question: string) {
    if (!question.trim() || loading) return;
    setError(null);
    const msgId = ++msgCounter.current;
    const userMsg: Message = { id: `u-${msgId}`, role: "user", content: question };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`/api/repositories/${id}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message ?? "Failed to get answer");

      const assistantMsg: Message = {
        id: `a-${msgId}`,
        role: "assistant",
        content:         data.data.content,
        classification:  data.data.classification,
        confidence:      data.data.confidence,
        evidence:        data.data.evidence,
        recommendations: data.data.recommendations,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: unknown) {
      if (err instanceof TypeError && err.message.toLowerCase().includes("fetch")) {
        setError("Unable to connect to RepoPilot API. Please ensure the server is running at http://localhost:3000.");
      } else {
        setError(err instanceof Error ? err.message : "Something went wrong while retrieving your answer.");
      }
      // Remove the user message on error
      setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendQuestion(input);
  }

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* Header */}
      <div className="px-6 pt-4 flex-shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <Link href={`/repositories/${id}`} className="btn btn-ghost btn-sm gap-1.5 -ml-2">
            <ArrowLeft size={14} /> Repository X-Ray
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <Link href={`/repositories/${id}/change`} className="btn btn-secondary btn-sm gap-1.5 no-underline">
              Change Impact
            </Link>
            <Link href={`/tasks/new?repo=${id}`} className="btn btn-primary btn-sm gap-1.5 no-underline">
              <Cpu size={13} /> Create Task
            </Link>
          </div>
        </div>
        {/* Sub-nav */}
        <div className="flex gap-1 overflow-x-auto" style={{ borderBottom: "1px solid var(--color-border-default)" }}>
          {[
            { label: "X-Ray",         href: `/repositories/${id}`,          active: false },
            { label: "Ask Codebase",  href: `/repositories/${id}/ask`,      active: true  },
            { label: "Change Impact", href: `/repositories/${id}/change`,   active: false },
            { label: "Verify",        href: `/repositories/${id}/verify`,   active: false },
          ].map((tab) => (
            <Link key={tab.label} href={tab.href}
              className={`px-4 py-2.5 text-body-sm font-medium no-underline border-b-2 transition-colors whitespace-nowrap ${
                tab.active ? "border-indigo-500" : "border-transparent"
              }`}
              style={{ color: tab.active ? "var(--color-accent-hover)" : "var(--color-text-secondary)" }}>
              {tab.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
        {messages.length === 0 && (
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8 pt-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: "var(--color-accent-muted)", border: "1px solid rgba(99,102,241,0.2)" }}>
                <FileText size={24} style={{ color: "var(--color-accent-hover)" }} />
              </div>
              <h2 className="text-heading-sm mb-2" style={{ color: "var(--color-text-primary)" }}>
                Ask anything about your codebase
              </h2>
              <p className="text-body-sm" style={{ color: "var(--color-text-secondary)" }}>
                Every answer includes source file citations and confidence classification.
              </p>
            </div>

            <div className="mb-4">
              <p className="text-label mb-3" style={{ color: "var(--color-text-tertiary)" }}>Try these questions:</p>
              <div className="flex flex-wrap gap-2">
                {SAMPLE_QUESTIONS.map((q) => (
                  <button key={q} onClick={() => sendQuestion(q)}
                    className="btn btn-secondary btn-sm text-left" style={{ maxWidth: "100%" }}>
                    {q}
                  </button>
                ))}
              </div>
            </div>

            <div className="card p-4 flex items-start gap-3"
              style={{ background: "rgba(20,80,200,0.05)", border: "1px solid rgba(100,150,255,0.15)" }}>
              <Info size={15} className="flex-shrink-0 mt-0.5" style={{ color: "#7ba7ff" }} />
              <div>
                <p className="text-body-sm font-medium mb-0.5" style={{ color: "#7ba7ff" }}>Evidence Classification</p>
                <p className="text-caption" style={{ color: "var(--color-text-tertiary)" }}>
                  Answers are classified as VERIFIED (direct evidence), INFERRED (AI reasoning), 
                  RECOMMENDATION (suggestion), or UNKNOWN (insufficient data).
                </p>
              </div>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} max-w-3xl mx-auto w-full`}>
            {msg.role === "user" ? (
              <div className="max-w-[80%] px-4 py-2.5 rounded-2xl rounded-tr-sm"
                style={{ background: "var(--color-accent)", color: "white" }}>
                <p className="text-body-sm">{msg.content}</p>
              </div>
            ) : (
              <div className="w-full">
                {/* Classification header */}
                {msg.classification && (
                  <div className="flex items-center gap-2 mb-2">
                    <ClassificationIcon level={msg.classification} />
                    <span className={`badge badge-${msg.classification}`}>{msg.classification.toUpperCase()}</span>
                    {msg.confidence && (
                      <>
                        <div className="w-px h-3" style={{ background: "var(--color-border-strong)" }} />
                        <span className="text-caption" style={{ color: "var(--color-text-tertiary)" }}>
                          Confidence: {msg.confidence}
                        </span>
                        <div className="confidence-bar w-16">
                          <div className={`confidence-fill ${msg.confidence}`} style={{ width: `${getConfidencePercent(msg.confidence)}%` }} />
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Answer */}
                <div className="card p-4 mb-3">
                  <p className="text-body-sm whitespace-pre-wrap" style={{ color: "var(--color-text-primary)" }}>{msg.content}</p>
                </div>

                {/* Evidence */}
                {msg.evidence && msg.evidence.length > 0 && (
                  <div className="evidence-panel mb-3">
                    <p className="text-label mb-2" style={{ color: "var(--color-text-tertiary)" }}>Evidence</p>
                    {msg.evidence.map((ev, i) => (
                      <div key={i} className="evidence-item">
                        <CheckCircle size={12} className="flex-shrink-0 mt-0.5" style={{ color: "var(--color-verified)" }} />
                        <div>
                          <div className="inline-code">{ev.file}</div>
                          {ev.symbol && <div className="text-caption mt-0.5" style={{ color: "var(--color-text-tertiary)" }}>{ev.symbol}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Recommendations */}
                {msg.recommendations && msg.recommendations.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {msg.recommendations.map((rec, i) => (
                      <span key={i} className="badge badge-recommendation">{rec}</span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex justify-start max-w-3xl mx-auto w-full">
            <div className="card p-4 flex items-center gap-3">
              <Loader2 size={16} className="animate-spin" style={{ color: "var(--color-accent)" }} />
              <span className="text-body-sm" style={{ color: "var(--color-text-secondary)" }}>
                Searching repository…
              </span>
            </div>
          </div>
        )}

        {error && (
          <div className="max-w-3xl mx-auto w-full flex items-start gap-2.5 p-3 rounded-lg"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <AlertCircle size={14} style={{ color: "var(--color-danger)" }} />
            <p className="text-body-sm" style={{ color: "var(--color-danger)" }}>{error}</p>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 px-6 py-4" style={{ borderTop: "1px solid var(--color-border-default)", background: "var(--color-bg-elevated)" }}>
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto flex items-end gap-3">
          <div className="flex-1">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(e); } }}
              placeholder="Ask about your codebase… (Enter to send, Shift+Enter for newline)"
              rows={1}
              className="input resize-none"
              style={{ minHeight: "44px", maxHeight: "120px" }}
              disabled={loading}
            />
          </div>
          <button type="submit" disabled={loading || !input.trim()} className="btn btn-primary btn-md gap-1.5 flex-shrink-0">
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            Ask
          </button>
        </form>
        <p className="text-caption text-center mt-2" style={{ color: "var(--color-text-tertiary)" }}>
          AI-generated. Always verify with your codebase.
        </p>
      </div>
    </div>
  );
}
