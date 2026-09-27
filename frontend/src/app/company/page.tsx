"use client";

import { useState } from "react";

interface Metric {
  metric: string;
  context: string;
}

interface ReverseQuestion {
  question: string;
  rationale: string;
}

interface BriefingData {
  company_name: string;
  role: string;
  headline_summary: string;
  recent_growth_and_contracts: string[];
  tech_stack_priorities: string[];
  culture_and_values: string[];
  metrics_and_numbers: Metric[];
  smart_interview_questions: ReverseQuestion[];
  verified_sources: string[];
  generated_at: string;
  cached: boolean;
}

export default function CompanyPage() {
  const [company, setCompany] = useState("Infosys");
  const [role, setRole] = useState("Specialist Programmer");
  const [loading, setLoading] = useState(false);
  const [briefing, setBriefing] = useState<BriefingData | null>(null);

  const presets = [
    { name: "Infosys", role: "Specialist Programmer" },
    { name: "TCS", role: "Digital Software Engineer" },
    { name: "Google", role: "Software Engineer" },
    { name: "Amazon", role: "SDE-1" },
    { name: "Swiggy", role: "Associate Product Manager" },
    { name: "Goldman Sachs", role: "Analyst" },
  ];

  async function fetchBriefing(compName: string, roleTitle: string, refresh: boolean = false) {
    if (!compName.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/company/briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: compName,
          role: roleTitle,
          refresh: refresh,
        }),
      });
      if (!res.ok) throw new Error("Failed to fetch briefing");
      const data = await res.json();
      setBriefing(data);
    } catch {
      alert("Failed to connect to Company Research Engine. Ensure backend is running.");
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    fetchBriefing(company, role, false);
  }

  return (
    <div className="container" style={{ paddingBottom: "4rem" }}>
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ display: "inline-flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
          <span className="badge badge-emerald">Module 3</span>
          <span className="badge badge-purple">Company Research Dossier</span>
          <span className="badge" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#34d399", border: "1px solid rgba(16, 185, 129, 0.3)" }}>
            Newsroom RSS & Press Scraping
          </span>
        </div>
        <h1 style={{ fontSize: "2.25rem", fontWeight: 800, marginBottom: "0.5rem" }}>
          Company Intelligence & <span className="gradient-text">Research Briefings</span>
        </h1>
        <p className="text-muted" style={{ maxWidth: "780px" }}>
          Citable strategic talking points, recent enterprise contracts, engineering architecture priorities, and
          custom reverse-questions to impress your campus placement interview panel.
        </p>
      </div>

      {/* Preset Chips */}
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.25rem", alignItems: "center" }}>
        <span style={{ fontSize: "0.82rem", color: "var(--text-dim)", fontWeight: 600 }}>Quick Presets:</span>
        {presets.map((p) => (
          <button
            key={p.name}
            type="button"
            className="badge"
            style={{
              cursor: "pointer",
              background: company.toLowerCase() === p.name.toLowerCase() ? "rgba(6, 182, 212, 0.2)" : "rgba(255, 255, 255, 0.04)",
              color: company.toLowerCase() === p.name.toLowerCase() ? "var(--accent-cyan)" : "var(--text-muted)",
              border: "1px solid var(--border-subtle)",
              padding: "0.35rem 0.75rem",
            }}
            onClick={() => {
              setCompany(p.name);
              setRole(p.role);
              fetchBriefing(p.name, p.role, false);
            }}
          >
            {p.name} ({p.role})
          </button>
        ))}
      </div>

      {/* Search Input Box */}
      <div className="glass-panel" style={{ padding: "1.5rem", marginBottom: "2rem" }}>
        <form onSubmit={handleSearch}>
          <div className="grid-2" style={{ gap: "1rem", marginBottom: "1rem" }}>
            <div>
              <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", display: "block", marginBottom: "0.4rem" }}>
                Target Company Name
              </label>
              <input
                type="text"
                className="input-field"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. TCS, Google, Infosys, Swiggy..."
              />
            </div>
            <div>
              <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", display: "block", marginBottom: "0.4rem" }}>
                Interview Role
              </label>
              <input
                type="text"
                className="input-field"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Software Engineer, SDE-1, Technology Analyst..."
              />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>
              🔒 Sourced strictly via official news syndications & corporate press feeds.
            </span>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={loading}
                onClick={() => fetchBriefing(company, role, true)}
                style={{ fontSize: "0.85rem" }}
              >
                🔄 Force Refresh
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading} style={{ padding: "0.75rem 2rem", fontWeight: 700 }}>
                {loading ? "Aggregating Corporate Intelligence..." : "⚡ Generate Research Dossier"}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Briefing Dossier Output */}
      {briefing && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
          {/* Dossier Header Banner */}
          <div className="glass-panel" style={{ padding: "2rem", borderLeft: "4px solid var(--accent-emerald)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem", marginBottom: "1rem" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.3rem" }}>
                  <span className="badge badge-emerald">Executive Dossier</span>
                  {briefing.cached ? (
                    <span className="badge" style={{ background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8" }}>
                      ⚡ Instant Local Cache
                    </span>
                  ) : (
                    <span className="badge badge-cyan">Fresh Live Syndication</span>
                  )}
                </div>
                <h2 style={{ fontSize: "1.75rem", fontWeight: 800 }}>
                  {briefing.company_name} <span style={{ color: "var(--text-dim)", fontWeight: 500 }}>— {briefing.role} Track</span>
                </h2>
              </div>

              <div style={{ textAlign: "right" }}>
                <span className="text-dim" style={{ fontSize: "0.8rem" }}>
                  Compiled: {new Date(briefing.generated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            </div>

            <p style={{ fontSize: "1rem", color: "var(--text-main)", lineHeight: 1.6, background: "rgba(16, 185, 129, 0.06)", padding: "1rem 1.25rem", borderRadius: "var(--radius-sm)", border: "1px solid rgba(16, 185, 129, 0.15)" }}>
              "{briefing.headline_summary}"
            </p>
          </div>

          {/* 2x2 Grid of Core Intelligence Pillars */}
          <div className="grid-2" style={{ gap: "1.5rem" }}>
            {/* Pillar 1: Recent Growth & Contracts */}
            <div className="glass-panel" style={{ padding: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                <span style={{ fontSize: "1.2rem" }}>📈</span>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--accent-emerald)" }}>
                  Recent Growth & Key Deals
                </h3>
              </div>
              <ul style={{ paddingLeft: "1.2rem", fontSize: "0.88rem", color: "var(--text-main)", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {briefing.recent_growth_and_contracts.map((item, idx) => (
                  <li key={idx} style={{ lineHeight: 1.5 }}>
                    {item.replace(/<[^>]*>?/gm, "")}
                  </li>
                ))}
              </ul>
            </div>

            {/* Pillar 2: Core Tech Stack & Engineering Priorities */}
            <div className="glass-panel" style={{ padding: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                <span style={{ fontSize: "1.2rem" }}>⚙️</span>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--accent-cyan)" }}>
                  Tech Stack & Engineering Focus
                </h3>
              </div>
              <ul style={{ paddingLeft: "1.2rem", fontSize: "0.88rem", color: "var(--text-main)", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {briefing.tech_stack_priorities.map((item, idx) => (
                  <li key={idx} style={{ lineHeight: 1.5 }}>{item}</li>
                ))}
              </ul>
            </div>

            {/* Pillar 3: Values & Culture Keywords */}
            <div className="glass-panel" style={{ padding: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                <span style={{ fontSize: "1.2rem" }}>🤝</span>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--accent-purple)" }}>
                  Culture, Values & Panel Expectations
                </h3>
              </div>
              <ul style={{ paddingLeft: "1.2rem", fontSize: "0.88rem", color: "var(--text-main)", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {briefing.culture_and_values.map((item, idx) => (
                  <li key={idx} style={{ lineHeight: 1.5 }}>{item}</li>
                ))}
              </ul>
            </div>

            {/* Pillar 4: Key Metrics & Empirical Indicators */}
            <div className="glass-panel" style={{ padding: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                <span style={{ fontSize: "1.2rem" }}>📊</span>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--accent-amber)" }}>
                  Empirical Numbers to Cite
                </h3>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {briefing.metrics_and_numbers.map((m, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: "rgba(0,0,0,0.25)",
                      padding: "0.75rem 1rem",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border-subtle)",
                    }}
                  >
                    <span style={{ fontSize: "1.1rem", fontWeight: 800, color: "#fbbf24" }}>{m.metric}</span>
                    <p style={{ margin: "0.2rem 0 0 0", fontSize: "0.82rem", color: "var(--text-muted)" }}>{m.context}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Special Section: Smart Reverse Questions */}
          <div className="glass-panel" style={{ padding: "1.75rem", border: "1px solid rgba(168, 85, 247, 0.4)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
              <div>
                <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--accent-purple)", marginBottom: "0.2rem" }}>
                  💡 High-Caliber Reverse Questions to Ask Your Interviewer
                </h3>
                <p className="text-muted" style={{ fontSize: "0.85rem", margin: 0 }}>
                  Stand out in the final 5 minutes of the interview when asked: "Do you have any questions for us?"
                </p>
              </div>
              <span className="badge badge-purple">High Conviction</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {briefing.smart_interview_questions.map((q, idx) => (
                <div
                  key={idx}
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    padding: "1.1rem 1.25rem",
                    borderRadius: "var(--radius-sm)",
                    borderLeft: "3px solid var(--accent-purple)",
                  }}
                >
                  <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "0.4rem" }}>
                    "{q.question}"
                  </div>
                  <div style={{ fontSize: "0.82rem", color: "var(--text-dim)" }}>
                    <strong style={{ color: "var(--accent-cyan)" }}>Why this wins:</strong> {q.rationale}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sources Section */}
          <div className="glass-panel" style={{ padding: "1rem 1.5rem" }}>
            <div style={{ fontSize: "0.8rem", color: "var(--text-dim)", marginBottom: "0.4rem", fontWeight: 700 }}>
              VERIFIED CITATION SOURCES ({briefing.verified_sources.length}):
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {briefing.verified_sources.map((src, idx) => (
                <a
                  key={idx}
                  href={src}
                  target="_blank"
                  rel="noreferrer"
                  className="badge"
                  style={{ fontSize: "0.75rem", textDecoration: "underline", color: "var(--accent-cyan)", background: "rgba(6, 182, 212, 0.08)" }}
                >
                  🔗 Source [{idx + 1}]
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
