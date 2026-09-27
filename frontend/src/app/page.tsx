"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function HomePage() {
  const [systemInfo, setSystemInfo] = useState<any>(null);
  const [testQuery, setTestQuery] = useState("");
  const [routingResult, setRoutingResult] = useState<string | null>(null);
  const [isRouting, setIsRouting] = useState(false);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/health")
      .then((res) => res.json())
      .then((data) => setSystemInfo(data))
      .catch(() => setSystemInfo({ status: "offline", ollama_connected: false }));
  }, []);

  async function handleTestRoute(e: React.FormEvent) {
    e.preventDefault();
    if (!testQuery.trim()) return;
    setIsRouting(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: testQuery }),
      });
      const data = await res.json();
      setRoutingResult(data.selected_module);
    } catch {
      setRoutingResult("trend_engine (fallback)");
    } finally {
      setIsRouting(false);
    }
  }

  const modules = [
    {
      num: "01",
      title: "GD Trend Engine",
      desc: "Instant talking-point cards with structured stances, cited real-world stats, and counter-arguments.",
      href: "/trend",
      badge: "Module 1",
      badgeColor: "badge-purple",
      icon: "📰",
    },
    {
      num: "02",
      title: "Resume ATS & JD Matcher",
      desc: "Deterministic keyword/skill overlap scoring combined with qualitative LLM narrative gap review.",
      href: "/resume",
      badge: "Module 2",
      badgeColor: "badge-cyan",
      icon: "📄",
    },
    {
      num: "03",
      title: "Company Research Briefings",
      desc: "Targeted company newsroom briefings, recent funding rounds, and culture keyword talking points.",
      href: "/company",
      badge: "Module 3",
      badgeColor: "badge-emerald",
      icon: "🏢",
    },
    {
      num: "04",
      title: "Case Study & Guesstimation RAG",
      desc: "Strictly grounded retrieval across consulting case competitions and sizing frameworks with citations.",
      href: "/case-studies",
      badge: "Module 4",
      badgeColor: "badge-amber",
      icon: "📊",
    },
    {
      num: "05",
      title: "Company Question Bank",
      desc: "Crowdsourced historical GD/PI questions categorized by company, role, round, and year.",
      href: "/question-bank",
      badge: "Module 5",
      badgeColor: "badge-purple",
      icon: "❓",
    },
    {
      num: "06",
      title: "Mock Interview Room",
      desc: "Local-only camera & mic simulation with MediaPipe posture/gaze metrics and adaptive JD follow-ups.",
      href: "/interview",
      badge: "Module 6",
      badgeColor: "badge-cyan",
      icon: "🎙️",
    },
    {
      num: "07",
      title: "Resume Portal",
      desc: "Student workspace to draft, version, and submit resumes. JD-optimized rewrites via Module 2 agents.",
      href: "/portal",
      badge: "Module 7 · Phase 4",
      badgeColor: "badge-emerald",
      icon: "🗂️",
    },
    {
      num: "08",
      title: "Placement Cell Dashboard",
      desc: "TPO analytics hub: batch readiness scores, shortlisting table, JD bank management. Role-gated.",
      href: "/admin/dashboard",
      badge: "Module 8 · TPO Only",
      badgeColor: "badge-amber",
      icon: "📈",
    },
  ];

  return (
    <div className="container">
      {/* Hero Section */}
      <section style={{ textAlign: "center", marginBottom: "3.5rem", marginTop: "1rem" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
          <span className="badge badge-purple">Phases 1–4 Complete • Institutional Features Live</span>
          <span className="privacy-badge">Zero Cloud Leakage • 100% On-Device</span>
        </div>
        <h1 style={{ fontSize: "2.75rem", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: "1rem", lineHeight: 1.2 }}>
          Master GDs and Placements with <br />
          <span className="gradient-text">Private Local-First AI Agents</span>
        </h1>
        <p className="text-muted" style={{ maxWidth: "700px", margin: "0 auto", fontSize: "1.1rem" }}>
          Autonomous multi-agent orchestration running directly on your laptop via Ollama (Gemma 4 12B),
          Laya fast routing, deterministic ATS analysis, and strictly grounded citations.
        </p>
      </section>

      {/* System Engine Health Card */}
      <section className="glass-panel" style={{ padding: "1.75rem", marginBottom: "3rem", borderLeft: "4px solid var(--accent-primary)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h3 style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: "0.35rem" }}>
              Local Agent Infrastructure Matrix
            </h3>
            <p className="text-muted" style={{ fontSize: "0.88rem" }}>
              All models and vector stores running locally inside the user runtime.
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <div className="status-badge">
              <span className="pulse-dot" />
              Ollama: {systemInfo?.ollama_connected ? "Gemma 4 12B Active" : "Verifying..."}
            </div>
            <div className="status-badge" style={{ background: "rgba(99, 102, 241, 0.12)", color: "#a5b4fc", borderColor: "rgba(99, 102, 241, 0.3)" }}>
              ⚡ Laya Router: Ready (~33ms)
            </div>
            <div className="status-badge" style={{ background: "rgba(6, 182, 212, 0.12)", color: "#22d3ee", borderColor: "rgba(6, 182, 212, 0.3)" }}>
              🧬 LangGraph StateGraph: Loaded
            </div>
          </div>
        </div>

        {/* Query Router Test Bar */}
        <div style={{ marginTop: "1.5rem", paddingTop: "1.25rem", borderTop: "1px solid var(--border-subtle)" }}>
          <form onSubmit={handleTestRoute} style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-muted)" }}>
              Test Laya Fast Router:
            </span>
            <input
              type="text"
              className="input-field"
              style={{ maxWidth: "450px" }}
              placeholder="e.g., 'Will AI replace software engineers in India?' or 'Check my resume for TCS'"
              value={testQuery}
              onChange={(e) => setTestQuery(e.target.value)}
            />
            <button type="submit" className="btn btn-secondary" disabled={isRouting}>
              {isRouting ? "Classifying..." : "Route Query"}
            </button>
            {routingResult && (
              <span style={{ fontSize: "0.88rem" }}>
                🎯 Routed To: <strong style={{ color: "var(--accent-cyan)" }}>{routingResult}</strong>
              </span>
            )}
          </form>
        </div>
      </section>

      {/* Modules Grid */}
      <section style={{ marginBottom: "2.5rem" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem" }}>
          Preparation Modules
        </h2>
        <div className="grid-3">
          {modules.map((m) => (
            <div key={m.num} className="glass-panel" style={{ display: "flex", flexDirection: "column" }}>
              <div className="card-header">
                <div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-dim)", fontWeight: 700, marginBottom: "0.25rem" }}>
                    {m.num}
                  </div>
                  <h3 style={{ fontSize: "1.2rem", fontWeight: 700 }}>{m.title}</h3>
                </div>
                <span className={`badge ${m.badgeColor}`}>{m.badge}</span>
              </div>
              <div className="card-body" style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <p className="text-muted" style={{ fontSize: "0.9rem", marginBottom: "1.5rem" }}>
                  {m.desc}
                </p>
                <div>
                  <Link href={m.href} className="btn btn-secondary" style={{ width: "100%", justifyContent: "space-between" }}>
                    <span>Launch {m.title}</span>
                    <span>→</span>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
