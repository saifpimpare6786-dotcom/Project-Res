"use client";

import { useState } from "react";

interface Stance {
  position: string;
  arguments: string[];
  example: string;
  stat: string;
  source_url: string;
}

export default function TrendPage() {
  const [topic, setTopic] = useState("Will AI replace software engineers in the Indian IT sector?");
  const [loading, setLoading] = useState(false);
  const [stances, setStances] = useState<Stance[] | null>(null);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!topic.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/trend/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, refresh: true }),
      });
      const data = await res.json();
      setStances(data.stances);
    } catch {
      alert("Could not connect to backend service. Ensure backend is running on port 8000.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ display: "inline-flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
          <span className="badge badge-purple">Module 1</span>
          <span className="badge badge-cyan">Legal Sourcing Only</span>
        </div>
        <h1 style={{ fontSize: "2.25rem", fontWeight: 800, marginBottom: "0.5rem" }}>
          GD & Interview <span className="gradient-text">Trend Engine</span>
        </h1>
        <p className="text-muted" style={{ maxWidth: "750px" }}>
          Enter any impending GD topic to generate structured stances, citable empirical data points,
          and grounded counter-arguments gathered from RSS, Reddit APIs, and verified publications.
        </p>
      </div>

      {/* Input Card */}
      <div className="glass-panel" style={{ padding: "1.75rem", marginBottom: "2.5rem" }}>
        <form onSubmit={handleGenerate} style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <input
            type="text"
            className="input-field"
            style={{ flex: 1, minWidth: "300px" }}
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Enter GD topic..."
          />
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Synthesizing Talking Points..." : "Generate GD Prep Card"}
          </button>
        </form>
      </div>

      {/* Results Section */}
      {stances && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ fontSize: "1.35rem", fontWeight: 700 }}>
              Verified Talking Points for: <span style={{ color: "var(--accent-cyan)" }}>{topic}</span>
            </h2>
            <span className="status-badge">
              <span className="pulse-dot" /> Fact-Checked via LangGraph
            </span>
          </div>

          <div className="grid-3">
            {stances.map((stance, idx) => (
              <div key={idx} className="glass-panel" style={{ display: "flex", flexDirection: "column" }}>
                <div className="card-header" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text-main)" }}>
                    {stance.position}
                  </h3>
                </div>
                <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div>
                    <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", marginBottom: "0.25rem" }}>
                      Key Arguments
                    </div>
                    <ul style={{ paddingLeft: "1.2rem", fontSize: "0.88rem", color: "var(--text-muted)" }}>
                      {stance.arguments.map((arg, i) => (
                        <li key={i} style={{ marginBottom: "0.25rem" }}>{arg}</li>
                      ))}
                    </ul>
                  </div>

                  <div style={{ background: "rgba(0,0,0,0.25)", padding: "0.75rem", borderRadius: "var(--radius-sm)" }}>
                    <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--accent-amber)", textTransform: "uppercase", marginBottom: "0.25rem" }}>
                      💡 Real-World Example
                    </div>
                    <p style={{ fontSize: "0.85rem", color: "var(--text-main)" }}>{stance.example}</p>
                  </div>

                  <div style={{ background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.2)", padding: "0.75rem", borderRadius: "var(--radius-sm)" }}>
                    <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--accent-emerald)", textTransform: "uppercase", marginBottom: "0.25rem" }}>
                      📈 Citable Statistic
                    </div>
                    <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "#34d399" }}>{stance.stat}</p>
                  </div>

                  <div style={{ marginTop: "auto", paddingTop: "0.5rem" }}>
                    <a
                      href={stance.source_url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: "0.78rem", color: "var(--accent-purple)", textDecoration: "underline", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}
                    >
                      🔗 Verify Citation: {stance.source_url}
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
