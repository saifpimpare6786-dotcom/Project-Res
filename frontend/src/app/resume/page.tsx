"use client";

import { useState, useRef } from "react";

interface SingleJDItem {
  id: string;
  company_name: string;
  role_title: string;
  jd_text: string;
}

export default function ResumePage() {
  const [mode, setMode] = useState<"single" | "multi">("single");
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [resumeText, setResumeText] = useState(
    `B.Tech in Computer Science and Engineering. CGPA: 8.8 / 10.
Technical Skills: Python, TypeScript, React, Next.js, FastAPI, SQL, Docker, Git, Data Structures & Algorithms.

Experience & Projects:
- Architected and deployed a microservice-based placement analytics portal using FastAPI and Docker, handling 1,500 daily requests.
- Developed responsive frontends with React and TypeScript, optimizing client-side render latency by 35%.
- Implemented robust REST APIs with automated unit testing and PostgreSQL caching.
- Solved 350+ data structures and algorithm challenges on LeetCode.`
  );

  const [additionalContext, setAdditionalContext] = useState(
    "Led college Google Developer Student Club (GDSC); organized a 48-hour national hackathon with 800+ participants. Deployed open-source AI projects on AWS EC2."
  );

  // Single JD state
  const [companyName, setCompanyName] = useState("Target Tech Corp");
  const [roleTitle, setRoleTitle] = useState("Associate Full-Stack Software Engineer");
  const [jdText, setJdText] = useState(
    `Role: Associate Full-Stack Software Engineer
Company: Target Tech Corp
Requirements:
- Bachelor's degree in Computer Science, IT, or related engineering discipline.
- Strong hands-on proficiency in Python, TypeScript, and React / Next.js.
- Experience with FastAPI or Node.js backend architectures and REST API design.
- Familiarity with containerization tools (Docker, Kubernetes) and AWS cloud deployments.
- Solid grounding in Data Structures, Algorithms, and scalable system design.
Nice to have:
- Experience with CI/CD pipelines, Git workflows, and distributed messaging.`
  );

  // Multi-JD state
  const [multiJDs, setMultiJDs] = useState<SingleJDItem[]>([
    {
      id: "jd-1",
      company_name: "Google / Top Tech",
      role_title: "Full-Stack Software Engineer",
      jd_text: `Requirements: B.Tech in CS. Strong proficiency in Python, React, TypeScript, and Docker. Experience building scalable REST APIs and cloud applications on AWS or GCP. Strong fundamentals in Data Structures and Algorithms.`
    },
    {
      id: "jd-2",
      company_name: "FinTech Innovations",
      role_title: "Backend & Systems Developer",
      jd_text: `Requirements: Degree in Computer Science. Expertise in Python, FastAPI, SQL, and Docker. Deep knowledge of system design, database indexing, and microservices architecture. Kubernetes knowledge is a plus.`
    },
    {
      id: "jd-3",
      company_name: "SaaS ScaleUp",
      role_title: "Frontend & UI/UX Engineer",
      jd_text: `Requirements: Bachelor's degree. Mastery in React, Next.js, TypeScript, HTML, and CSS. Strong state management and responsive UI performance optimization experience. Familiarity with Node.js and REST APIs.`
    }
  ]);

  const [loading, setLoading] = useState(false);
  const [singleResult, setSingleResult] = useState<any>(null);
  const [multiResult, setMultiResult] = useState<any>(null);

  // Handle PDF Upload
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      alert("Please upload a PDF file.");
      return;
    }

    setUploadingPdf(true);
    setPdfFileName(file.name);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://127.0.0.1:8000/api/resume/upload-pdf", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Failed to parse PDF");
      }

      const data = await res.json();
      setResumeText(data.extracted_text);
    } catch (err: any) {
      alert("Error extracting text from PDF: " + err.message);
      setPdfFileName(null);
    } finally {
      setUploadingPdf(false);
    }
  }

  // Handle Single Match
  async function handleSingleMatch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/resume/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume_text: resumeText,
          jd_text: jdText,
          company_name: companyName,
          additional_context: additionalContext,
        }),
      });
      const data = await res.json();
      setSingleResult(data);
      setMultiResult(null);
    } catch {
      alert("Failed to analyze resume. Verify backend server is running.");
    } finally {
      setLoading(false);
    }
  }

  // Handle Multi Match
  async function handleMultiMatch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/resume/multi-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume_text: resumeText,
          jds: multiJDs,
          additional_context: additionalContext,
        }),
      });
      const data = await res.json();
      setMultiResult(data);
      setSingleResult(null);
    } catch {
      alert("Failed to run multi-JD ranking. Verify backend server is running.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container" style={{ paddingBottom: "4rem" }}>
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ display: "inline-flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
          <span className="badge badge-cyan">Module 2</span>
          <span className="badge badge-purple">Deterministic ATS + Qualitative LLM</span>
          <span className="badge" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#34d399", border: "1px solid rgba(16, 185, 129, 0.3)" }}>
            pypdf Extraction Ready
          </span>
        </div>
        <h1 style={{ fontSize: "2.25rem", fontWeight: 800, marginBottom: "0.5rem" }}>
          Resume ATS Scoring & <span className="gradient-text">Role Fit Engine</span>
        </h1>
        <p className="text-muted" style={{ maxWidth: "780px" }}>
          Deterministic, explainable keyword matching combined with Gemma 4 qualitative narrative analysis,
          Google XYZ phrasing enhancements, and multi-role ranking.
        </p>
      </div>

      {/* Mode Switcher */}
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem" }}>
        <button
          type="button"
          onClick={() => setMode("single")}
          className="btn"
          style={{
            background: mode === "single" ? "var(--accent-cyan)" : "var(--bg-card)",
            color: mode === "single" ? "#000" : "var(--text-main)",
            fontWeight: 700,
            border: "1px solid var(--border-subtle)",
          }}
        >
          🎯 Single Target Role Match
        </button>
        <button
          type="button"
          onClick={() => setMode("multi")}
          className="btn"
          style={{
            background: mode === "multi" ? "var(--accent-purple)" : "var(--bg-card)",
            color: mode === "multi" ? "#fff" : "var(--text-main)",
            fontWeight: 700,
            border: "1px solid var(--border-subtle)",
          }}
        >
          📊 Multi-JD Placement Ranking (3 Roles)
        </button>
      </div>

      {/* PDF Upload Banner */}
      <div
        className="glass-panel"
        style={{
          padding: "1.25rem 1.5rem",
          marginBottom: "1.5rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          border: "1px dashed rgba(6, 182, 212, 0.4)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ fontSize: "2rem" }}>📄</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>
              Upload Resume PDF (Auto-Text Extraction)
            </div>
            <div className="text-muted" style={{ fontSize: "0.82rem" }}>
              Local parsing via <code style={{ color: "var(--accent-cyan)" }}>pypdf</code>.
              Your resume never leaves your computer.
            </div>
          </div>
        </div>

        <div>
          <input
            type="file"
            accept=".pdf"
            ref={fileInputRef}
            style={{ display: "none" }}
            onChange={handleFileUpload}
          />
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingPdf}
            style={{ fontSize: "0.88rem" }}
          >
            {uploadingPdf ? "Extracting Text..." : pdfFileName ? `Uploaded: ${pdfFileName}` : "Select Resume (.pdf)"}
          </button>
        </div>
      </div>

      {/* Input Form */}
      <form onSubmit={mode === "single" ? handleSingleMatch : handleMultiMatch}>
        <div className="grid-2" style={{ marginBottom: "1.5rem" }}>
          {/* Left Column: Resume & Extra Context */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div className="glass-panel" style={{ padding: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                <label style={{ fontWeight: 700, fontSize: "0.95rem" }}>Your Resume Content</label>
                <span className="text-dim" style={{ fontSize: "0.8rem" }}>
                  {resumeText.split(/\s+/).filter(Boolean).length} words
                </span>
              </div>
              <textarea
                className="input-field"
                style={{ height: "220px", fontSize: "0.85rem", lineHeight: 1.5 }}
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
              />
            </div>

            {/* Candidate Memory / Graphify Memory */}
            <div className="glass-panel" style={{ padding: "1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                <label style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--accent-purple)" }}>
                  💡 Off-Resume Context & Achievements (Graphify Memory)
                </label>
                <span className="badge badge-purple" style={{ fontSize: "0.72rem" }}>Merged for Review</span>
              </div>
              <p className="text-dim" style={{ fontSize: "0.78rem", marginBottom: "0.5rem" }}>
                Add leadership, hackathons, unlisted projects, or specific achievements to reinforce your ATS score & narrative fit.
              </p>
              <textarea
                className="input-field"
                style={{ height: "90px", fontSize: "0.82rem" }}
                value={additionalContext}
                onChange={(e) => setAdditionalContext(e.target.value)}
                placeholder="e.g. Winner of Smart India Hackathon 2025; President of ACM Student Chapter..."
              />
            </div>
          </div>

          {/* Right Column: Single JD or Multi-JD list */}
          <div>
            {mode === "single" ? (
              <div className="glass-panel" style={{ padding: "1.5rem", height: "100%" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.75rem", gap: "0.5rem" }}>
                  <label style={{ fontWeight: 700, fontSize: "0.95rem" }}>Target Job Description</label>
                  <input
                    type="text"
                    placeholder="Company Name"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    style={{
                      background: "transparent",
                      border: "none",
                      borderBottom: "1px solid var(--border-subtle)",
                      color: "var(--accent-cyan)",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      textAlign: "right",
                      outline: "none",
                      maxWidth: "180px",
                    }}
                  />
                </div>
                <input
                  type="text"
                  placeholder="Target Role Title"
                  value={roleTitle}
                  onChange={(e) => setRoleTitle(e.target.value)}
                  className="input-field"
                  style={{ marginBottom: "0.75rem", fontSize: "0.85rem", padding: "0.5rem 0.75rem" }}
                />
                <textarea
                  className="input-field"
                  style={{ height: "260px", fontSize: "0.85rem", lineHeight: 1.5 }}
                  value={jdText}
                  onChange={(e) => setJdText(e.target.value)}
                />
              </div>
            ) : (
              <div className="glass-panel" style={{ padding: "1.5rem", height: "100%" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                  <label style={{ fontWeight: 700, fontSize: "0.95rem" }}>Multi-JD Target Profiles (3 Roles)</label>
                  <span className="badge badge-purple">{multiJDs.length} JDs Active</span>
                </div>
                <p className="text-muted" style={{ fontSize: "0.82rem", marginBottom: "1rem" }}>
                  Evaluate your resume across distinct campus placement tracks to find which role gives you the highest conversion probability.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {multiJDs.map((jd, idx) => (
                    <div
                      key={jd.id}
                      style={{
                        padding: "0.85rem",
                        background: "rgba(0,0,0,0.25)",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--border-subtle)",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}>
                        <strong style={{ fontSize: "0.88rem", color: "var(--accent-cyan)" }}>
                          #{idx + 1}: {jd.role_title}
                        </strong>
                        <span style={{ fontSize: "0.78rem", color: "var(--text-dim)" }}>{jd.company_name}</span>
                      </div>
                      <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", margin: 0, maxHeight: "40px", overflow: "hidden" }}>
                        {jd.jd_text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ padding: "0.85rem 3rem", fontSize: "1rem", fontWeight: 700 }}
            disabled={loading}
          >
            {loading
              ? mode === "single"
                ? "Running Deterministic ATS & LLM Review..."
                : "Ranking Candidate across 3 JDs..."
              : mode === "single"
              ? "⚡ Run Deterministic ATS & Qualitative Review"
              : "🚀 Evaluate & Rank Roles (Multi-JD)"}
          </button>
        </div>
      </form>

      {/* SINGLE RESULT VIEW */}
      {singleResult && (
        <div className="glass-panel" style={{ padding: "2rem", marginBottom: "2rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1.75rem",
              flexWrap: "wrap",
              gap: "1rem",
              borderBottom: "1px solid var(--border-subtle)",
              paddingBottom: "1.25rem",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                <span className="badge badge-cyan">Evaluation Ready</span>
                <span className="status-badge">Explainable Rule-Based ATS</span>
              </div>
              <h2 style={{ fontSize: "1.6rem", fontWeight: 800 }}>ATS Match Evaluation</h2>
              <p className="text-muted" style={{ fontSize: "0.88rem" }}>
                Targeting: <strong style={{ color: "var(--text-main)" }}>{companyName}</strong> ({roleTitle})
              </p>
            </div>

            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  fontSize: "3rem",
                  fontWeight: 900,
                  lineHeight: 1,
                  color: singleResult.ats_score >= 75 ? "#34d399" : singleResult.ats_score >= 50 ? "#38bdf8" : "#fb7185",
                }}
              >
                {singleResult.ats_score}
                <span style={{ fontSize: "1.2rem", color: "var(--text-dim)", fontWeight: 500 }}> / 100</span>
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-dim)", marginTop: "0.3rem" }}>
                {singleResult.ats_score >= 75 ? "🌟 Strong Shortlist Potential" : "⚠️ Needs Keyword Optimization"}
              </div>
            </div>
          </div>

          {/* Score Component Breakdown Tiles */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "1rem",
              marginBottom: "1.5rem",
            }}
          >
            <div style={{ background: "rgba(255,255,255,0.02)", padding: "1rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
              <div style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--text-dim)", fontWeight: 700 }}>Skill Overlap</div>
              <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--accent-cyan)", marginTop: "0.25rem" }}>
                {singleResult.ats_breakdown.matched_skills.length} Skills Matched
              </div>
            </div>

            <div style={{ background: "rgba(255,255,255,0.02)", padding: "1rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
              <div style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--text-dim)", fontWeight: 700 }}>Keyword Density</div>
              <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#a855f7", marginTop: "0.25rem" }}>
                {Math.round(singleResult.ats_breakdown.keyword_density * 100)}%
              </div>
            </div>

            <div style={{ background: "rgba(255,255,255,0.02)", padding: "1rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
              <div style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--text-dim)", fontWeight: 700 }}>Degree Requirement</div>
              <div style={{ fontSize: "1.25rem", fontWeight: 800, color: singleResult.ats_breakdown.education_match ? "#34d399" : "#fb7185", marginTop: "0.25rem" }}>
                {singleResult.ats_breakdown.education_match ? "✅ Verified Degree" : "⚠️ Missing Degree"}
              </div>
            </div>

            <div style={{ background: "rgba(255,255,255,0.02)", padding: "1rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
              <div style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--text-dim)", fontWeight: 700 }}>Experience Level</div>
              <div style={{ fontSize: "1.25rem", fontWeight: 800, color: singleResult.ats_breakdown.experience_years_match ? "#34d399" : "#38bdf8", marginTop: "0.25rem" }}>
                {singleResult.ats_breakdown.experience_years_match ? "✅ Qualifies" : "Campus / Fresher"}
              </div>
            </div>
          </div>

          {/* Matched vs Missing Skills Chips */}
          <div className="grid-2" style={{ gap: "1.5rem", marginBottom: "1.75rem" }}>
            <div style={{ background: "rgba(16, 185, 129, 0.05)", padding: "1.25rem", borderRadius: "var(--radius-sm)", border: "1px solid rgba(16, 185, 129, 0.2)" }}>
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--accent-emerald)", marginBottom: "0.75rem" }}>
                ✅ Matched Skills & Ontologies ({singleResult.ats_breakdown.matched_skills.length})
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                {singleResult.ats_breakdown.matched_skills.map((skill: string) => (
                  <span key={skill} className="badge badge-emerald">{skill}</span>
                ))}
              </div>
            </div>

            <div style={{ background: "rgba(244, 63, 94, 0.05)", padding: "1.25rem", borderRadius: "var(--radius-sm)", border: "1px solid rgba(244, 63, 94, 0.2)" }}>
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--accent-rose)", marginBottom: "0.75rem" }}>
                ⚠️ Missing Keywords from JD ({singleResult.ats_breakdown.missing_skills.length})
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                {singleResult.ats_breakdown.missing_skills.map((skill: string) => (
                  <span key={skill} className="badge" style={{ background: "rgba(244, 63, 94, 0.15)", color: "#fb7185", border: "1px solid rgba(244, 63, 94, 0.3)" }}>
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Qualitative LLM Review */}
          <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "1.5rem" }}>
            <h3 style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: "0.5rem", color: "var(--accent-purple)" }}>
              Placement Coach Strategic Narrative Review
            </h3>
            <p style={{ fontSize: "0.95rem", color: "var(--text-main)", marginBottom: "1.5rem", fontStyle: "italic", background: "rgba(168, 85, 247, 0.08)", padding: "1rem", borderRadius: "var(--radius-sm)", borderLeft: "3px solid var(--accent-purple)" }}>
              "{singleResult.qualitative_review.narrative_fit}"
            </p>

            <div className="grid-2" style={{ gap: "1.5rem", marginBottom: "1.5rem" }}>
              <div>
                <h4 style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", marginBottom: "0.5rem" }}>
                  Key Strengths
                </h4>
                <ul style={{ paddingLeft: "1.2rem", fontSize: "0.88rem", color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  {singleResult.qualitative_review.strengths.map((str: string, i: number) => (
                    <li key={i}>{str}</li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--accent-rose)", textTransform: "uppercase", marginBottom: "0.5rem" }}>
                  Screening Risks & Critical Gaps
                </h4>
                <ul style={{ paddingLeft: "1.2rem", fontSize: "0.88rem", color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  {singleResult.qualitative_review.critical_gaps.map((gap: string, i: number) => (
                    <li key={i}>{gap}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Google XYZ Formula Phrasing Rewrites */}
            <div style={{ background: "rgba(0,0,0,0.3)", padding: "1.25rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                <h4 style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--accent-cyan)", margin: 0 }}>
                  ⚡ Google XYZ Phrasing Rewrites
                </h4>
                <span className="badge badge-cyan" style={{ fontSize: "0.72rem" }}>
                  Accomplished [X] measured by [Y] by doing [Z]
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {singleResult.qualitative_review.phrasing_improvements.map((phrase: string, i: number) => (
                  <div key={i} style={{ fontSize: "0.85rem", color: "var(--text-main)", background: "rgba(255,255,255,0.02)", padding: "0.6rem 0.8rem", borderRadius: "4px", borderLeft: "2px solid var(--accent-cyan)" }}>
                    {phrase}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MULTI RESULT VIEW */}
      {multiResult && (
        <div className="glass-panel" style={{ padding: "2rem", marginBottom: "2rem" }}>
          <div style={{ marginBottom: "1.75rem", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "1.25rem" }}>
            <span className="badge badge-purple" style={{ marginBottom: "0.5rem" }}>Multi-JD Ranking Engine</span>
            <h2 style={{ fontSize: "1.6rem", fontWeight: 800 }}>Role Fit Benchmark Across 3 Tracks</h2>
            <p className="text-muted" style={{ fontSize: "0.88rem" }}>
              Highest Recommendation: <strong style={{ color: "#34d399" }}>{multiResult.best_match_title}</strong>
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {multiResult.ranked_jds.map((ranked: any, idx: number) => (
              <div
                key={ranked.id}
                style={{
                  padding: "1.5rem",
                  borderRadius: "var(--radius-sm)",
                  background: idx === 0 ? "rgba(16, 185, 129, 0.05)" : "rgba(0,0,0,0.25)",
                  border: idx === 0 ? "1px solid rgba(16, 185, 129, 0.4)" : "1px solid var(--border-subtle)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", marginBottom: "1rem" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                      <span style={{ fontWeight: 800, fontSize: "1.1rem" }}>#{idx + 1} {ranked.role_title}</span>
                      <span className="badge" style={{
                        background: ranked.fit_label === "Best Match" ? "rgba(16, 185, 129, 0.15)" : "rgba(56, 189, 248, 0.15)",
                        color: ranked.fit_label === "Best Match" ? "#34d399" : "#38bdf8",
                        border: "1px solid currentColor"
                      }}>
                        {ranked.fit_label}
                      </span>
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "var(--text-dim)" }}>{ranked.company_name}</div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "2rem", fontWeight: 900, color: ranked.ats_score >= 70 ? "#34d399" : "#38bdf8" }}>
                      {ranked.ats_score} <span style={{ fontSize: "1rem", color: "var(--text-dim)" }}>/ 100</span>
                    </div>
                  </div>
                </div>

                <div className="grid-2" style={{ gap: "1rem" }}>
                  <div>
                    <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--accent-emerald)", marginBottom: "0.3rem" }}>
                      ✅ Matched ({ranked.matched_skills_count})
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                      {ranked.matched_skills.slice(0, 5).map((s: string) => (
                        <span key={s} className="badge badge-emerald" style={{ fontSize: "0.72rem" }}>{s}</span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--accent-rose)", marginBottom: "0.3rem" }}>
                      ⚠️ Missing ({ranked.missing_skills_count})
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                      {ranked.missing_skills.slice(0, 4).map((s: string) => (
                        <span key={s} className="badge" style={{ fontSize: "0.72rem", background: "rgba(244, 63, 94, 0.15)", color: "#fb7185" }}>{s}</span>
                      ))}
                    </div>
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
