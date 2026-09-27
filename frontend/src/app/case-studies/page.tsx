"use client";

import { useState, useEffect } from "react";

interface Citation {
  doc_title: string;
  source: string;
  page: string;
  category: string;
  snippet: string;
}

interface SolutionStep {
  step_number: number;
  title: string;
  details: string;
  key_equation_or_metric: string;
}

interface CaseStudyResult {
  prompt: string;
  category: string;
  framework_applied: string;
  solution_steps: SolutionStep[];
  final_takeaway: string;
  citations: Citation[];
  generated_at: string;
}

interface FrameworkItem {
  id: string;
  doc_title: string;
  source: string;
  page: string;
  category: string;
  topic_tags: string[];
}

export default function CaseStudiesPage() {
  const [prompt, setPrompt] = useState(
    "A national coffee chain in Bengaluru is facing a 20% margin drop in Tier-1 outlets despite steady customer footfall. Diagnose the root cause and propose solutions."
  );
  const [category, setCategory] = useState<"all" | "case_study" | "guesstimate">("case_study");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CaseStudyResult | null>(null);
  const [frameworks, setFrameworks] = useState<FrameworkItem[]>([]);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/case-study/frameworks")
      .then((res) => res.json())
      .then((data) => setFrameworks(data.frameworks || []))
      .catch((err) => console.log("Frameworks fetch error:", err));
  }, []);

  const samplePrompts = [
    {
      label: "☕ Coffee Chain Margin Drop (Profitability)",
      cat: "case_study" as const,
      text: "A national coffee chain in Bengaluru is facing a 20% margin drop in Tier-1 outlets despite steady customer footfall. Diagnose the root cause and propose solutions.",
    },
    {
      label: "💧 Mineral Water Market Sizing (Guesstimate)",
      cat: "guesstimate" as const,
      text: "Estimate the annual market size (in INR) of packaged mineral water sold in Tier-1 Indian railway stations.",
    },
    {
      label: "🚖 Ride-Hailing Monsoon Drop-off (Tech/Product)",
      cat: "case_study" as const,
      text: "A ride-hailing app in Mumbai experiences a 35% drop in completed rides during heavy monsoon weeks despite surges in ride requests.",
    },
    {
      label: "✈️ Mumbai Airport Flight Volume (Throughput)",
      cat: "guesstimate" as const,
      text: "Estimate the total number of commercial passenger flights landing at Mumbai Chhatrapati Shivaji Maharaj International Airport (BOM) in a 24-hour period.",
    },
  ];

  async function handleSolve(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/case-study/solve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          category,
        }),
      });
      if (!res.ok) throw new Error("Failed to solve case study");
      const data = await res.json();
      setResult(data);
    } catch {
      alert("Failed to solve case study. Verify backend server is running on port 8000.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container" style={{ paddingBottom: "4rem" }}>
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ display: "inline-flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
          <span className="badge badge-amber">Module 4</span>
          <span className="badge badge-cyan">ChromaDB Vector Store</span>
          <span className="badge badge-purple">nomic-embed-text</span>
        </div>
        <h1 style={{ fontSize: "2.25rem", fontWeight: 800, marginBottom: "0.5rem" }}>
          Case Study & <span className="gradient-text">Guesstimation RAG</span>
        </h1>
        <p className="text-muted" style={{ maxWidth: "780px" }}>
          Ground your consulting, strategy, and product interview answers strictly in verified open-access casebooks
          (McKinsey, BCG, Bain candidate guides). No opaque hallucinations; every step cites its source framework.
        </p>
      </div>

      {/* Mode Selector Tabs */}
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.25rem" }}>
        <button
          type="button"
          onClick={() => setCategory("case_study")}
          className="btn"
          style={{
            background: category === "case_study" ? "var(--accent-amber)" : "var(--bg-card)",
            color: category === "case_study" ? "#000" : "var(--text-main)",
            fontWeight: 700,
            border: "1px solid var(--border-subtle)",
          }}
        >
          💼 Management Case Studies (MECE Trees)
        </button>
        <button
          type="button"
          onClick={() => setCategory("guesstimate")}
          className="btn"
          style={{
            background: category === "guesstimate" ? "var(--accent-cyan)" : "var(--bg-card)",
            color: category === "guesstimate" ? "#000" : "var(--text-main)",
            fontWeight: 700,
            border: "1px solid var(--border-subtle)",
          }}
        >
          🔢 Guesstimations (Demographic & Capacity Sizing)
        </button>
      </div>

      {/* Preset Chips */}
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.5rem", alignItems: "center" }}>
        <span style={{ fontSize: "0.82rem", color: "var(--text-dim)", fontWeight: 600 }}>Try Example Cases:</span>
        {samplePrompts.map((p, idx) => (
          <button
            key={idx}
            type="button"
            className="badge"
            style={{
              cursor: "pointer",
              background: "rgba(255, 255, 255, 0.04)",
              color: "var(--text-muted)",
              border: "1px solid var(--border-subtle)",
              padding: "0.35rem 0.75rem",
            }}
            onClick={() => {
              setPrompt(p.text);
              setCategory(p.cat);
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <div className="glass-panel" style={{ padding: "1.75rem", marginBottom: "2rem" }}>
        <form onSubmit={handleSolve}>
          <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", display: "block", marginBottom: "0.5rem" }}>
            Problem Prompt or Market-Sizing Question
          </label>
          <textarea
            className="input-field"
            style={{ height: "110px", fontSize: "0.95rem", lineHeight: 1.5, marginBottom: "1rem" }}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter case prompt (e.g. A manufacturing company faces 15% rising raw material costs...)"
          />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>
              📚 Retrieves from <code>case_studies</code> collection in local ChromaDB.
            </span>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ padding: "0.85rem 2.5rem", fontWeight: 700 }}
            >
              {loading ? "Searching Vectors & Synthesizing MECE..." : "🚀 Solve with Grounded RAG"}
            </button>
          </div>
        </form>
      </div>

      {/* Solution Section */}
      {result && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Header Card */}
          <div className="glass-panel" style={{ padding: "1.75rem", borderLeft: "4px solid var(--accent-amber)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", marginBottom: "0.75rem" }}>
              <div>
                <span className="badge badge-amber" style={{ marginBottom: "0.3rem" }}>
                  {result.framework_applied}
                </span>
                <h2 style={{ fontSize: "1.5rem", fontWeight: 800 }}>Structured Solution Decomposition</h2>
              </div>
              <span className="status-badge">
                <span className="pulse-dot" /> Grounded Vector Retrieval
              </span>
            </div>
            <p className="text-muted" style={{ fontSize: "0.92rem", margin: 0 }}>
              Prompt: <strong style={{ color: "var(--text-main)" }}>"{result.prompt}"</strong>
            </p>
          </div>

          {/* 4-Step Solution Cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {result.solution_steps.map((step) => (
              <div
                key={step.step_number}
                className="glass-panel"
                style={{
                  padding: "1.5rem",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      background: "rgba(245, 158, 11, 0.2)",
                      color: "#fbbf24",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 800,
                      fontSize: "0.9rem",
                    }}
                  >
                    {step.step_number}
                  </div>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-main)", margin: 0 }}>
                    {step.title}
                  </h3>
                </div>

                <p style={{ fontSize: "0.92rem", color: "var(--text-muted)", lineHeight: 1.6, marginBottom: "1rem" }}>
                  {step.details}
                </p>

                <div
                  style={{
                    background: "rgba(0, 0, 0, 0.3)",
                    padding: "0.75rem 1rem",
                    borderRadius: "var(--radius-sm)",
                    borderLeft: "3px solid var(--accent-cyan)",
                    fontSize: "0.85rem",
                  }}
                >
                  <strong style={{ color: "var(--accent-cyan)" }}>Formula / Empirical Metric:</strong>{" "}
                  <code style={{ color: "var(--text-main)", fontFamily: "monospace" }}>
                    {step.key_equation_or_metric}
                  </code>
                </div>
              </div>
            ))}
          </div>

          {/* Final Takeaway */}
          <div className="glass-panel" style={{ padding: "1.5rem", background: "rgba(16, 185, 129, 0.05)", border: "1px solid rgba(16, 185, 129, 0.3)" }}>
            <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--accent-emerald)", textTransform: "uppercase", marginBottom: "0.4rem" }}>
              🎯 Executive Recommendation & Sanity Verdict
            </div>
            <p style={{ fontSize: "1rem", color: "var(--text-main)", lineHeight: 1.6, margin: 0 }}>
              {result.final_takeaway}
            </p>
          </div>

          {/* Citations Box */}
          <div className="glass-panel" style={{ padding: "1.5rem" }}>
            <h4 style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", marginBottom: "0.75rem" }}>
              📖 Grounded Corpus Citations ({result.citations.length} Sources Verified)
            </h4>
            <div className="grid-2" style={{ gap: "1rem" }}>
              {result.citations.map((c, idx) => (
                <div
                  key={idx}
                  style={{
                    background: "rgba(0, 0, 0, 0.25)",
                    padding: "1rem",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.3rem" }}>
                    <strong style={{ fontSize: "0.88rem", color: "var(--accent-amber)" }}>{c.doc_title}</strong>
                    <span className="badge badge-amber" style={{ fontSize: "0.7rem" }}>{c.page}</span>
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-dim)", marginBottom: "0.5rem" }}>
                    Source: {c.source}
                  </div>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: 0, fontStyle: "italic", lineHeight: 1.4 }}>
                    "{c.snippet}"
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Indexed Frameworks Reference Section */}
      <div style={{ marginTop: "3rem" }}>
        <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "0.5rem" }}>
          Indexed Reference Corpus ({frameworks.length} Frameworks in Local ChromaDB)
        </h3>
        <p className="text-muted" style={{ fontSize: "0.85rem", marginBottom: "1rem" }}>
          All frameworks are ingested in accordance with Section 7.4 of <code>details.md</code> (open-access consulting material only).
        </p>

        <div className="grid-3" style={{ gap: "1rem" }}>
          {frameworks.map((f) => (
            <div key={f.id} className="glass-panel" style={{ padding: "1rem", display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}>
                <span className="badge" style={{ fontSize: "0.7rem", background: f.category === "guesstimate" ? "rgba(6, 182, 212, 0.15)" : "rgba(245, 158, 11, 0.15)", color: f.category === "guesstimate" ? "#38bdf8" : "#fbbf24" }}>
                  {f.category}
                </span>
                <span className="text-dim" style={{ fontSize: "0.75rem" }}>{f.page}</span>
              </div>
              <strong style={{ fontSize: "0.9rem", marginBottom: "0.3rem" }}>{f.doc_title}</strong>
              <span style={{ fontSize: "0.78rem", color: "var(--text-dim)", marginBottom: "0.75rem" }}>{f.source}</span>
              <div style={{ marginTop: "auto", display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                {f.topic_tags.map((t) => (
                  <span key={t} className="badge" style={{ fontSize: "0.68rem", background: "rgba(255,255,255,0.03)" }}>
                    #{t}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
