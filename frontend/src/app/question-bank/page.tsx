"use client";

import { useState } from "react";

export default function QuestionBankPage() {
  const [filterCompany, setFilterCompany] = useState("");

  const sampleQuestions = [
    { company: "TCS Digital", role: "Software Engineer", round: "GD", year: 2025, text: "Should AI regulation be centralized by government or self-monitored by tech conglomerates?", tags: ["AI", "Ethics"] },
    { company: "Infosys DSE", role: "Specialist Programmer", round: "PI", year: 2025, text: "Explain how you would optimize a high-throughput queue during flash sale spikes.", tags: ["System Design", "Microservices"] },
    { company: "Wipro Turbo", role: "Project Engineer", round: "GD", year: 2024, text: "Electric Vehicles in India: Infrastructure hurdles versus sustainability gains.", tags: ["EV", "Sustainability"] },
  ];

  const filtered = filterCompany
    ? sampleQuestions.filter(q => q.company.toLowerCase().includes(filterCompany.toLowerCase()))
    : sampleQuestions;

  return (
    <div className="container">
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ display: "inline-flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
          <span className="badge badge-purple">Module 5</span>
          <span className="badge badge-cyan">Crowdsourced Question Bank</span>
        </div>
        <h1 style={{ fontSize: "2.25rem", fontWeight: 800, marginBottom: "0.5rem" }}>
          Company-Specific <span className="gradient-text">Question Bank</span>
        </h1>
        <p className="text-muted" style={{ maxWidth: "750px" }}>
          Historical GD and interview questions reported by previous batches across major campus recruitment drives.
        </p>
      </div>

      <div className="glass-panel" style={{ padding: "1.25rem", marginBottom: "2rem" }}>
        <input
          type="text"
          className="input-field"
          placeholder="Filter by company name (e.g. TCS, Infosys, Wipro)..."
          value={filterCompany}
          onChange={(e) => setFilterCompany(e.target.value)}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {filtered.map((item, idx) => (
          <div key={idx} className="glass-panel" style={{ padding: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", flexWrap: "wrap", gap: "0.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <strong style={{ fontSize: "1.1rem" }}>{item.company}</strong>
                <span className="text-muted" style={{ fontSize: "0.85rem" }}>• {item.role}</span>
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <span className="badge badge-purple">{item.round}</span>
                <span className="badge badge-cyan">{item.year}</span>
              </div>
            </div>
            <p style={{ fontSize: "1rem", color: "var(--text-main)", marginBottom: "0.75rem" }}>
              "{item.text}"
            </p>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              {item.tags.map(t => (
                <span key={t} className="badge" style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-dim)" }}>
                  #{t}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
