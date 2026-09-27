"use client";

import { useState } from "react";

export default function CompanyPage() {
  const [company, setCompany] = useState("Infosys");

  return (
    <div className="container">
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ display: "inline-flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
          <span className="badge badge-emerald">Module 3</span>
          <span className="badge badge-purple">Phase 2 Planned</span>
        </div>
        <h1 style={{ fontSize: "2.25rem", fontWeight: 800, marginBottom: "0.5rem" }}>
          Company Research <span className="gradient-text">Briefings</span>
        </h1>
        <p className="text-muted" style={{ maxWidth: "750px" }}>
          Citable talking points, latest press releases, strategic tech investments, and culture keywords
          culled directly from verified corporate newsrooms via Firecrawl and RSS feeds.
        </p>
      </div>

      <div className="glass-panel" style={{ padding: "1.75rem", marginBottom: "2rem" }}>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <input
            type="text"
            className="input-field"
            style={{ flex: 1, minWidth: "280px" }}
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Enter company name (e.g. TCS, Google, Infosys)..."
          />
          <button className="btn btn-primary">Generate Briefing Card</button>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: "2rem", borderLeft: "4px solid var(--accent-emerald)" }}>
        <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "0.75rem" }}>
          Briefing Architecture (Module 3 Roadmap)
        </h3>
        <p className="text-muted" style={{ fontSize: "0.95rem", lineHeight: 1.7 }}>
          When active, this module queries company press releases and financial announcements through Firecrawl,
          runs fact-verification through Gemma 4 12B, and structures them into three pillars:
          <strong> Growth Drivers & Recent Contracts</strong>, <strong>Core Tech Stack Priorities</strong>, and <strong>Values & Culture Keywords</strong>.
        </p>
      </div>
    </div>
  );
}
