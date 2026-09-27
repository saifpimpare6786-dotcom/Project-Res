"use client";

import { useState, useEffect } from "react";

interface QuestionItem {
  id: number;
  company_name: string;
  role: string;
  question_text: string;
  round_type: string;
  reported_year: number;
  upvotes: number;
  tags: string[];
}

interface CompanyCount {
  company_name: string;
  count: number;
}

export default function QuestionBankPage() {
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [companies, setCompanies] = useState<CompanyCount[]>([]);
  const [filterCompany, setFilterCompany] = useState("");
  const [filterRound, setFilterRound] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // New question form state
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [newCompany, setNewCompany] = useState("");
  const [newRole, setNewRole] = useState("Software Engineer");
  const [newQuestion, setNewQuestion] = useState("");
  const [newRound, setNewRound] = useState("technical");
  const [newTags, setNewTags] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Fetch questions
  function loadQuestions() {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterCompany) params.append("company", filterCompany);
    if (filterRound && filterRound !== "all") params.append("round_type", filterRound);
    if (searchQuery) params.append("search", searchQuery);

    fetch(`http://127.0.0.1:8000/api/questions?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        setQuestions(data.questions || []);
      })
      .catch((err) => console.log("Failed to load questions:", err))
      .finally(() => setLoading(false));
  }

  // Fetch unique company chips
  function loadCompanies() {
    fetch("http://127.0.0.1:8000/api/questions/companies")
      .then((res) => res.json())
      .then((data) => setCompanies(data || []))
      .catch((err) => console.log("Failed to load company counts:", err));
  }

  useEffect(() => {
    loadQuestions();
  }, [filterCompany, filterRound]);

  useEffect(() => {
    loadCompanies();
  }, []);

  // Upvote Handler
  async function handleUpvote(id: number) {
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/questions/${id}/upvote`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setQuestions((prev) =>
          prev.map((q) => (q.id === id ? { ...q, upvotes: data.upvotes } : q))
        );
      }
    } catch {
      alert("Failed to register upvote.");
    }
  }

  // Submit Handler
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newCompany.trim() || !newQuestion.trim()) return;
    setSubmitting(true);
    try {
      const tagList = newTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const res = await fetch("http://127.0.0.1:8000/api/questions/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: newCompany,
          role: newRole,
          question_text: newQuestion,
          round_type: newRound,
          reported_year: 2025,
          tags: tagList,
        }),
      });

      if (!res.ok) throw new Error("Submission failed");

      setShowSubmitModal(false);
      setNewCompany("");
      setNewQuestion("");
      setNewTags("");
      loadQuestions();
      loadCompanies();
    } catch (err: any) {
      alert("Error submitting question: " + err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container" style={{ paddingBottom: "4rem" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem", marginBottom: "2rem" }}>
        <div>
          <div style={{ display: "inline-flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
            <span className="badge badge-purple">Module 5</span>
            <span className="badge badge-cyan">Crowdsourced Question Bank</span>
            <span className="badge" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#34d399", border: "1px solid rgba(16, 185, 129, 0.3)" }}>
              SQLite Local Persistence
            </span>
          </div>
          <h1 style={{ fontSize: "2.25rem", fontWeight: 800, marginBottom: "0.5rem" }}>
            Company-Specific <span className="gradient-text">Historical Question Bank</span>
          </h1>
          <p className="text-muted" style={{ maxWidth: "720px" }}>
            Real interview questions, algorithmic challenges, and GD topics reported by seniors and previous batches
            across Tier-1 engineering and placement drives.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowSubmitModal(!showSubmitModal)}
          className="btn btn-primary"
          style={{ padding: "0.75rem 1.75rem", fontWeight: 700 }}
        >
          {showSubmitModal ? "✕ Close Form" : "➕ Report a Question"}
        </button>
      </div>

      {/* Submission Card (Expandable) */}
      {showSubmitModal && (
        <div className="glass-panel" style={{ padding: "1.75rem", marginBottom: "2rem", border: "1px solid var(--accent-cyan)" }}>
          <h3 style={{ fontSize: "1.2rem", fontWeight: 800, marginBottom: "0.5rem", color: "var(--accent-cyan)" }}>
            Contribute a Placement Interview or GD Question
          </h3>
          <p className="text-muted" style={{ fontSize: "0.85rem", marginBottom: "1.25rem" }}>
            Stored locally in your SQLite question repository with community voting.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="grid-3" style={{ gap: "1rem", marginBottom: "1rem" }}>
              <div>
                <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", display: "block", marginBottom: "0.3rem" }}>
                  Company Name
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Goldman Sachs, Microsoft"
                  value={newCompany}
                  onChange={(e) => setNewCompany(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", display: "block", marginBottom: "0.3rem" }}>
                  Target Role
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. SDE-1, Technology Analyst"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", display: "block", marginBottom: "0.3rem" }}>
                  Round Type
                </label>
                <select
                  className="input-field"
                  value={newRound}
                  onChange={(e) => setNewRound(e.target.value)}
                  style={{ background: "var(--bg-card)", color: "var(--text-main)" }}
                >
                  <option value="technical">Technical Round</option>
                  <option value="GD">Group Discussion (GD)</option>
                  <option value="PI">Personal / HR Interview (PI)</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", display: "block", marginBottom: "0.3rem" }}>
                Question Text or GD Topic
              </label>
              <textarea
                className="input-field"
                style={{ height: "90px" }}
                placeholder="What was the exact question or discussion topic asked?"
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                required
              />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
              <div style={{ flex: 1, minWidth: "260px" }}>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Tags separated by commas (e.g. System Design, Redis, Concurrency)"
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                />
              </div>

              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? "Saving..." : "Submit Question"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter and Search Panel */}
      <div className="glass-panel" style={{ padding: "1.25rem 1.5rem", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
          {/* Search Field */}
          <div style={{ flex: 1, minWidth: "240px" }}>
            <input
              type="text"
              className="input-field"
              placeholder="🔍 Search questions by keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadQuestions()}
            />
          </div>

          {/* Round Filter Tabs */}
          <div style={{ display: "flex", gap: "0.4rem" }}>
            {[
              { id: "all", label: "All Rounds" },
              { id: "technical", label: "💻 Technical" },
              { id: "GD", label: "🗣️ GD" },
              { id: "PI", label: "🎯 PI / HR" },
            ].map((r) => (
              <button
                key={r.id}
                type="button"
                className="badge"
                style={{
                  cursor: "pointer",
                  background: filterRound === r.id ? "var(--accent-purple)" : "rgba(255,255,255,0.04)",
                  color: filterRound === r.id ? "#fff" : "var(--text-muted)",
                  border: "1px solid var(--border-subtle)",
                  padding: "0.5rem 0.85rem",
                  fontWeight: 600,
                }}
                onClick={() => setFilterRound(r.id)}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Search Button */}
          <button type="button" className="btn btn-secondary" onClick={loadQuestions}>
            Filter
          </button>
        </div>
      </div>

      {/* Company Quick-Filter Chips */}
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "2rem", alignItems: "center" }}>
        <span style={{ fontSize: "0.8rem", color: "var(--text-dim)", fontWeight: 600 }}>Filter Company:</span>
        <button
          type="button"
          className="badge"
          style={{
            cursor: "pointer",
            background: filterCompany === "" ? "rgba(6, 182, 212, 0.2)" : "rgba(255, 255, 255, 0.04)",
            color: filterCompany === "" ? "var(--accent-cyan)" : "var(--text-muted)",
            border: "1px solid var(--border-subtle)",
            padding: "0.3rem 0.65rem",
          }}
          onClick={() => setFilterCompany("")}
        >
          All Companies
        </button>

        {companies.map((c) => (
          <button
            key={c.company_name}
            type="button"
            className="badge"
            style={{
              cursor: "pointer",
              background: filterCompany.toLowerCase() === c.company_name.toLowerCase() ? "rgba(6, 182, 212, 0.2)" : "rgba(255, 255, 255, 0.04)",
              color: filterCompany.toLowerCase() === c.company_name.toLowerCase() ? "var(--accent-cyan)" : "var(--text-muted)",
              border: "1px solid var(--border-subtle)",
              padding: "0.3rem 0.65rem",
            }}
            onClick={() => setFilterCompany(c.company_name)}
          >
            {c.company_name} <span style={{ opacity: 0.6 }}>({c.count})</span>
          </button>
        ))}
      </div>

      {/* Questions List */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-dim)" }}>
          Loading questions...
        </div>
      ) : questions.length === 0 ? (
        <div className="glass-panel" style={{ padding: "3rem", textAlign: "center" }}>
          <p className="text-muted">No questions found matching your filter criteria.</p>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setFilterCompany("");
              setFilterRound("all");
              setSearchQuery("");
            }}
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {questions.map((q) => (
            <div
              key={q.id}
              className="glass-panel"
              style={{
                padding: "1.5rem",
                border: "1px solid var(--border-subtle)",
                transition: "border-color 0.2s ease",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.75rem", marginBottom: "0.75rem" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.2rem" }}>
                    <strong style={{ fontSize: "1.15rem", color: "var(--text-main)" }}>
                      {q.company_name}
                    </strong>
                    <span style={{ fontSize: "0.85rem", color: "var(--text-dim)" }}>• {q.role}</span>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <span
                    className="badge"
                    style={{
                      background: q.round_type.toLowerCase() === "gd" ? "rgba(244, 63, 94, 0.15)" : q.round_type.toLowerCase() === "technical" ? "rgba(6, 182, 212, 0.15)" : "rgba(168, 85, 247, 0.15)",
                      color: q.round_type.toLowerCase() === "gd" ? "#fb7185" : q.round_type.toLowerCase() === "technical" ? "#38bdf8" : "#c084fc",
                      border: "1px solid currentColor",
                      fontWeight: 700,
                    }}
                  >
                    {q.round_type}
                  </span>
                  <span className="badge" style={{ background: "rgba(255,255,255,0.04)", color: "var(--text-dim)" }}>
                    {q.reported_year}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleUpvote(q.id)}
                    className="badge"
                    style={{
                      cursor: "pointer",
                      background: "rgba(16, 185, 129, 0.15)",
                      color: "#34d399",
                      border: "1px solid rgba(16, 185, 129, 0.3)",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.3rem",
                      fontWeight: 700,
                      padding: "0.35rem 0.65rem",
                    }}
                  >
                    ▲ {q.upvotes}
                  </button>
                </div>
              </div>

              <p style={{ fontSize: "1.05rem", color: "var(--text-main)", lineHeight: 1.6, margin: "0 0 1rem 0" }}>
                "{q.question_text}"
              </p>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                {q.tags.map((t) => (
                  <span
                    key={t}
                    className="badge"
                    style={{ background: "rgba(255, 255, 255, 0.03)", color: "var(--text-dim)", fontSize: "0.75rem" }}
                  >
                    #{t}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
