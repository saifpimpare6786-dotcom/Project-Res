"use client";

import { useState, useEffect } from "react";

const API = "http://127.0.0.1:8000";

interface StudentRecord {
  student_id: string; name: string; email: string; batch: string | null; branch: string | null;
  ats_score: number | null; interview_score: number | null; overall_readiness: number | null;
  resume_status: string; company_name: string | null; role: string | null; computed_at: string | null;
}
interface Analytics {
  total_students: number; students_with_resume: number; students_with_interview: number;
  batch_average_ats: number; batch_average_interview: number; batch_average_readiness: number;
  top_companies_applied: string[]; readiness_distribution: Record<string, number>; students: StudentRecord[];
}
interface QuickSummary {
  total_students: number; submitted_resumes: number; strong_candidates: number; active_jds: number; batch_avg_readiness: number;
}
interface JD { id: string; company_name: string; role: string; jd_text: string; deadline: string | null; active: number | boolean; batch: string | null; branch: string | null; created_at: string; }

export default function TPODashboard() {
  const [user, setUser] = useState<any>(null);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [summary, setSummary] = useState<QuickSummary | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [jds, setJDs] = useState<JD[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "students" | "jds" | "users">("overview");

  // Filters
  const [filterBatch, setFilterBatch] = useState("");
  const [filterBranch, setFilterBranch] = useState("");
  const [filterCompany, setFilterCompany] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // JD form
  const [jdForm, setJDForm] = useState({ company_name: "", role: "", jd_text: "", batch: "", branch: "", deadline: "" });
  const [jdSaving, setJDSaving] = useState(false);
  const [showJDForm, setShowJDForm] = useState(false);

  // Selected student for resume pull
  const [selectedStudent, setSelectedStudent] = useState<StudentRecord | null>(null);
  const [studentResumes, setStudentResumes] = useState<any[]>([]);
  const [resumeContent, setResumeContent] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("prepsphere_tpo");
    if (stored) {
      const u = JSON.parse(stored);
      if (u.role === "tpo") {
        setUser(u);
        loadTPOData(u.access_token, "", "", "");
      }
    }
  }, []);

  const login = async () => {
    setLoginLoading(true); setLoginError("");
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Login failed");
      if (data.role !== "tpo") throw new Error("TPO account required for this dashboard.");
      localStorage.setItem("prepsphere_tpo", JSON.stringify(data));
      setUser(data);
      loadTPOData(data.access_token, "", "", "");
    } catch (e: any) { setLoginError(e.message); }
    finally { setLoginLoading(false); }
  };

  const logout = () => { localStorage.removeItem("prepsphere_tpo"); setUser(null); };

  const loadTPOData = async (token: string, batch: string, branch: string, company: string) => {
    try {
      const params = new URLSearchParams();
      if (batch) params.append("batch", batch);
      if (branch) params.append("branch", branch);
      if (company) params.append("company_name", company);

      const [sumRes, anaRes, jdRes, usrRes] = await Promise.all([
        fetch(`${API}/api/admin/analytics/summary`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/admin/dashboard?${params}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/admin/jds`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/auth/users`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (sumRes.ok) setSummary(await sumRes.json());
      if (anaRes.ok) setAnalytics(await anaRes.json());
      if (jdRes.ok) setJDs(await jdRes.json());
      if (usrRes.ok) setAllUsers(await usrRes.json());
    } catch (e) {}
  };

  const applyFilters = () => loadTPOData(user.access_token, filterBatch, filterBranch, filterCompany);

  const pullStudentResumes = async (student: StudentRecord) => {
    setSelectedStudent(student); setStudentResumes([]); setResumeContent(null);
    const res = await fetch(`${API}/api/admin/students/${student.student_id}/resumes`, { headers: { Authorization: `Bearer ${user.access_token}` } });
    if (res.ok) { const d = await res.json(); setStudentResumes(d.submitted_resumes || []); }
  };

  const pullResumeContent = async (studentId: string, resumeId: string) => {
    const res = await fetch(`${API}/api/admin/students/${studentId}/resumes/${resumeId}/full`, { headers: { Authorization: `Bearer ${user.access_token}` } });
    if (res.ok) { const d = await res.json(); setResumeContent(d.content); }
  };

  const postJD = async () => {
    setJDSaving(true);
    try {
      const res = await fetch(`${API}/api/portal/jds`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${user.access_token}` },
        body: JSON.stringify(jdForm)
      });
      if (!res.ok) throw new Error("Failed to post JD");
      setJDForm({ company_name: "", role: "", jd_text: "", batch: "", branch: "", deadline: "" });
      setShowJDForm(false);
      loadTPOData(user.access_token, filterBatch, filterBranch, filterCompany);
    } catch (e: any) { alert("Error: " + e.message); }
    finally { setJDSaving(false); }
  };

  const toggleJD = async (jdId: string) => {
    await fetch(`${API}/api/admin/jds/${jdId}/toggle`, { method: "PATCH", headers: { Authorization: `Bearer ${user.access_token}` } });
    loadTPOData(user.access_token, filterBatch, filterBranch, filterCompany);
  };

  const getReadinessColor = (score: number | null) => {
    if (!score) return "var(--text-dim)";
    if (score >= 85) return "#34d399";
    if (score >= 78) return "#60a5fa";
    if (score >= 70) return "#a78bfa";
    if (score >= 60) return "#f59e0b";
    return "#f87171";
  };

  const getReadinessLabel = (score: number | null) => {
    if (!score) return "Not Assessed";
    if (score >= 85) return "Strong Hire";
    if (score >= 78) return "Hire";
    if (score >= 70) return "Lean Hire";
    if (score >= 60) return "Lean No Hire";
    return "No Hire";
  };

  // ─── Login Screen ───────────────────────────────────────────────────────────
  if (!user) return (
    <div className="container">
      <div style={{ maxWidth: "420px", margin: "3rem auto" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ display: "inline-flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
            <span className="badge badge-purple">Module 8</span>
            <span className="badge badge-green">TPO Only</span>
          </div>
          <h1 style={{ fontSize: "2rem", fontWeight: 800 }}>
            <span className="gradient-text">Placement Cell</span> Dashboard
          </h1>
          <p className="text-muted">Training & Placement Officer access required</p>
        </div>

        <div className="glass-panel" style={{ padding: "2rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <input className="input-field" type="email" placeholder="TPO email address" value={loginForm.email} onChange={e => setLoginForm(p => ({ ...p, email: e.target.value }))} />
            <input className="input-field" type="password" placeholder="Password" value={loginForm.password} onChange={e => setLoginForm(p => ({ ...p, password: e.target.value }))} />
          </div>
          {loginError && <div style={{ marginTop: "0.75rem", padding: "0.6rem", background: "rgba(239,68,68,0.1)", borderRadius: "4px", color: "#f87171", fontSize: "0.88rem" }}>{loginError}</div>}
          <button className="btn btn-primary" style={{ width: "100%", padding: "0.85rem", marginTop: "1.25rem" }} onClick={login} disabled={loginLoading}>
            {loginLoading ? "Signing in..." : "Sign In as TPO"}
          </button>
          <p style={{ fontSize: "0.8rem", color: "var(--text-dim)", marginTop: "0.75rem", textAlign: "center" }}>
            Register a TPO account at <a href="/portal" style={{ color: "#a78bfa" }}>/portal</a> first.
          </p>
        </div>
      </div>
    </div>
  );

  // ─── Dashboard ───────────────────────────────────────────────────────────────
  const filteredStudents = (analytics?.students || []).filter(s =>
    !searchQuery || s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <div style={{ display: "inline-flex", gap: "0.5rem", marginBottom: "0.4rem" }}>
            <span className="badge badge-purple">Module 8</span>
            <span className="badge badge-green">Placement Cell Analytics</span>
          </div>
          <h1 style={{ fontSize: "2rem", fontWeight: 800 }}>
            <span className="gradient-text">Placement Cell</span> Dashboard
          </h1>
          <p className="text-muted">TPO: {user.name} · {user.email}</p>
        </div>
        <button className="btn btn-secondary" onClick={logout}>Sign Out</button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "0.75rem", marginBottom: "1.5rem" }}>
          {[
            { label: "Total Students", val: summary.total_students, icon: "👥", color: "#60a5fa" },
            { label: "Resumes Submitted", val: summary.submitted_resumes, icon: "📄", color: "#34d399" },
            { label: "Strong Candidates", val: summary.strong_candidates, icon: "⭐", color: "#a78bfa" },
            { label: "Active JDs", val: summary.active_jds, icon: "📋", color: "#f59e0b" },
            { label: "Avg Readiness", val: summary.batch_avg_readiness + "/100", icon: "📊", color: "#f87171" },
          ].map(({ label, val, icon, color }) => (
            <div key={label} className="glass-panel" style={{ padding: "1rem", textAlign: "center" }}>
              <div style={{ fontSize: "1.5rem", marginBottom: "0.25rem" }}>{icon}</div>
              <div style={{ fontSize: "1.5rem", fontWeight: 900, color }}>{val}</div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "0.5rem" }}>
        {[["overview", "📊 Analytics"], ["students", "👥 Students"], ["jds", "📋 JD Bank"], ["users", "👤 All Users"]].map(([tab, label]) => (
          <button key={tab} onClick={() => setActiveTab(tab as any)} style={{
            padding: "0.5rem 1rem", border: "none", borderRadius: "var(--radius-sm) var(--radius-sm) 0 0",
            cursor: "pointer", fontWeight: 600, fontSize: "0.88rem",
            background: activeTab === tab ? "rgba(99,102,241,0.2)" : "transparent",
            color: activeTab === tab ? "#f8fafc" : "var(--text-dim)",
            borderBottom: activeTab === tab ? "2px solid #6366f1" : "2px solid transparent",
            transition: "all 0.2s"
          }}>{label}</button>
        ))}
      </div>

      {/* Filters Row */}
      <div className="glass-panel" style={{ padding: "1rem", marginBottom: "1.25rem", display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
        <input className="input-field" placeholder="Batch (e.g. 2025)" value={filterBatch} onChange={e => setFilterBatch(e.target.value)} style={{ maxWidth: "150px" }} />
        <input className="input-field" placeholder="Branch (e.g. CSE)" value={filterBranch} onChange={e => setFilterBranch(e.target.value)} style={{ maxWidth: "150px" }} />
        <input className="input-field" placeholder="Company filter" value={filterCompany} onChange={e => setFilterCompany(e.target.value)} style={{ maxWidth: "180px" }} />
        <button className="btn btn-primary" style={{ padding: "0.5rem 1rem" }} onClick={applyFilters}>Apply Filters</button>
        <button className="btn btn-secondary" style={{ padding: "0.5rem 1rem" }} onClick={() => { setFilterBatch(""); setFilterBranch(""); setFilterCompany(""); loadTPOData(user.access_token, "", "", ""); }}>Clear</button>
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && analytics && (
        <div>
          <div className="grid-2" style={{ gap: "1.5rem", marginBottom: "1.5rem" }}>
            {/* Readiness Distribution */}
            <div className="glass-panel" style={{ padding: "1.5rem" }}>
              <h2 style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: "1rem" }}>Readiness Distribution</h2>
              {Object.entries(analytics.readiness_distribution).map(([label, count]) => (
                <div key={label} style={{ marginBottom: "0.75rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                    <span style={{ color: getReadinessColor(label === "Strong Hire" ? 90 : label === "Hire" ? 80 : label === "Lean Hire" ? 73 : label === "Lean No Hire" ? 63 : 50) }}>{label}</span>
                    <span style={{ fontWeight: 700 }}>{count}</span>
                  </div>
                  <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: "4px", height: "6px" }}>
                    <div style={{ height: "100%", borderRadius: "4px", width: `${analytics.total_students ? (count / analytics.total_students) * 100 : 0}%`, background: getReadinessColor(label === "Strong Hire" ? 90 : label === "Hire" ? 80 : label === "Lean Hire" ? 73 : label === "Lean No Hire" ? 63 : 50), transition: "width 0.8s ease" }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Batch Stats */}
            <div className="glass-panel" style={{ padding: "1.5rem" }}>
              <h2 style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: "1rem" }}>Batch Performance</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {[
                  { label: "Average ATS Score", val: analytics.batch_average_ats, max: 100, color: "#60a5fa" },
                  { label: "Average Interview Score", val: analytics.batch_average_interview, max: 100, color: "#a78bfa" },
                  { label: "Average Overall Readiness", val: analytics.batch_average_readiness, max: 100, color: "#34d399" },
                ].map(({ label, val, max, color }) => (
                  <div key={label}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "0.3rem" }}>
                      <span style={{ color: "var(--text-muted)" }}>{label}</span>
                      <span style={{ fontWeight: 700, color }}>{val}/100</span>
                    </div>
                    <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: "4px", height: "6px" }}>
                      <div style={{ height: "100%", borderRadius: "4px", width: `${val}%`, background: color, transition: "width 0.8s ease" }} />
                    </div>
                  </div>
                ))}
                <div>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.4rem" }}>Top Companies Applied:</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                    {analytics.top_companies_applied.length > 0 ? analytics.top_companies_applied.map(c => (
                      <span key={c} style={{ background: "rgba(99,102,241,0.15)", color: "#a78bfa", padding: "0.2rem 0.5rem", borderRadius: "4px", fontSize: "0.8rem" }}>{c}</span>
                    )) : <span style={{ color: "var(--text-dim)", fontSize: "0.85rem" }}>No data yet</span>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Students Tab */}
      {activeTab === "students" && (
        <div>
          <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem" }}>
            <input className="input-field" placeholder="Search by name or email..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ maxWidth: "350px" }} />
          </div>

          <div className="glass-panel" style={{ padding: "0", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
              <thead>
                <tr style={{ background: "rgba(0,0,0,0.4)", borderBottom: "1px solid var(--border-subtle)" }}>
                  {["Student", "Batch/Branch", "Resume", "ATS", "Interview", "Readiness", "Verdict", "Actions"].map(h => (
                    <th key={h} style={{ padding: "0.75rem 1rem", textAlign: "left", fontWeight: 600, color: "var(--text-muted)", fontSize: "0.78rem", textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length === 0 ? (
                  <tr><td colSpan={8} style={{ padding: "2rem", textAlign: "center", color: "var(--text-dim)" }}>No students found. Students register via the Resume Portal.</td></tr>
                ) : filteredStudents.map((s, i) => (
                  <tr key={s.student_id} style={{ borderBottom: "1px solid var(--border-subtle)", background: i % 2 === 0 ? "transparent" : "rgba(0,0,0,0.15)" }}>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <div style={{ fontWeight: 600 }}>{s.name}</div>
                      <div style={{ fontSize: "0.78rem", color: "var(--text-dim)" }}>{s.email}</div>
                    </td>
                    <td style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontSize: "0.82rem" }}>
                      {s.batch || "—"} / {s.branch || "—"}
                    </td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <span className={`badge ${s.resume_status === "Submitted" ? "badge-green" : s.resume_status === "Draft" ? "badge-purple" : ""}`} style={{ fontSize: "0.72rem" }}>
                        {s.resume_status}
                      </span>
                    </td>
                    <td style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "#60a5fa" }}>{s.ats_score ?? "—"}</td>
                    <td style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "#a78bfa" }}>{s.interview_score ?? "—"}</td>
                    <td style={{ padding: "0.75rem 1rem", fontWeight: 900, color: getReadinessColor(s.overall_readiness) }}>
                      {s.overall_readiness ?? "—"}
                    </td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <span style={{ fontSize: "0.78rem", fontWeight: 600, color: getReadinessColor(s.overall_readiness) }}>
                        {getReadinessLabel(s.overall_readiness)}
                      </span>
                    </td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      {s.resume_status === "Submitted" && (
                        <button className="btn btn-secondary" style={{ fontSize: "0.75rem", padding: "0.3rem 0.6rem" }} onClick={() => pullStudentResumes(s)}>
                          Pull Resume
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Student Resume Modal */}
          {selectedStudent && (
            <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
              <div className="glass-panel" style={{ padding: "2rem", maxWidth: "700px", width: "90%", maxHeight: "80vh", overflowY: "auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
                  <h3 style={{ fontWeight: 700 }}>Resumes — {selectedStudent.name}</h3>
                  <button className="btn btn-secondary" style={{ fontSize: "0.8rem" }} onClick={() => { setSelectedStudent(null); setResumeContent(null); }}>✕ Close</button>
                </div>
                {studentResumes.length === 0 ? (
                  <p style={{ color: "var(--text-dim)" }}>No submitted resumes found.</p>
                ) : studentResumes.map(r => (
                  <div key={r.id} style={{ background: "rgba(0,0,0,0.3)", padding: "0.75rem", borderRadius: "var(--radius-sm)", marginBottom: "0.5rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{r.title}</div>
                        <div style={{ fontSize: "0.78rem", color: "var(--text-dim)" }}>v{r.version} · ATS: {r.ats_score ?? "N/A"}</div>
                      </div>
                      <button className="btn btn-primary" style={{ fontSize: "0.78rem", padding: "0.3rem 0.6rem" }} onClick={() => pullResumeContent(selectedStudent.student_id, r.id)}>
                        View Full
                      </button>
                    </div>
                  </div>
                ))}
                {resumeContent && (
                  <div style={{ marginTop: "1rem" }}>
                    <div style={{ fontWeight: 700, marginBottom: "0.5rem" }}>Resume Content:</div>
                    <pre style={{ fontFamily: "'Courier New', monospace", fontSize: "0.82rem", color: "var(--text-muted)", whiteSpace: "pre-wrap", background: "rgba(0,0,0,0.3)", padding: "1rem", borderRadius: "var(--radius-sm)" }}>
                      {resumeContent}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* JDs Tab */}
      {activeTab === "jds" && (
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
            <button className="btn btn-primary" onClick={() => setShowJDForm(!showJDForm)}>
              {showJDForm ? "Cancel" : "+ Post New JD"}
            </button>
          </div>

          {showJDForm && (
            <div className="glass-panel" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
              <h3 style={{ fontWeight: 700, marginBottom: "1rem" }}>Post a New JD to Placement Bank</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
                <input className="input-field" placeholder="Company Name" value={jdForm.company_name} onChange={e => setJDForm(p => ({ ...p, company_name: e.target.value }))} />
                <input className="input-field" placeholder="Role (e.g. Software Engineer)" value={jdForm.role} onChange={e => setJDForm(p => ({ ...p, role: e.target.value }))} />
                <input className="input-field" placeholder="Target Batch (e.g. 2025)" value={jdForm.batch} onChange={e => setJDForm(p => ({ ...p, batch: e.target.value }))} />
                <input className="input-field" placeholder="Branch (leave blank for all)" value={jdForm.branch} onChange={e => setJDForm(p => ({ ...p, branch: e.target.value }))} />
                <input className="input-field" placeholder="Application Deadline (e.g. 2025-11-30)" value={jdForm.deadline} onChange={e => setJDForm(p => ({ ...p, deadline: e.target.value }))} />
              </div>
              <textarea className="input-field" rows={6} placeholder="Paste full JD text here..." value={jdForm.jd_text} onChange={e => setJDForm(p => ({ ...p, jd_text: e.target.value }))} />
              <button className="btn btn-primary" style={{ marginTop: "0.75rem" }} onClick={postJD} disabled={jdSaving || !jdForm.company_name || !jdForm.jd_text}>
                {jdSaving ? "Posting..." : "Post JD"}
              </button>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {jds.length === 0 ? (
              <div className="glass-panel" style={{ padding: "2rem", textAlign: "center", color: "var(--text-dim)" }}>No JDs posted yet.</div>
            ) : jds.map(j => (
              <div key={j.id} className="glass-panel" style={{ padding: "1.25rem", border: `1px solid ${j.active ? "var(--border-accent)" : "var(--border-subtle)"}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.3rem" }}>
                      <span style={{ fontWeight: 700 }}>{j.company_name}</span>
                      <span className={`badge ${j.active ? "badge-green" : ""}`} style={{ fontSize: "0.72rem" }}>{j.active ? "Active" : "Inactive"}</span>
                    </div>
                    <div style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>{j.role}</div>
                    {j.batch && <div style={{ fontSize: "0.78rem", color: "var(--text-dim)" }}>Batch: {j.batch} {j.branch && `· ${j.branch}`}</div>}
                    {j.deadline && <div style={{ fontSize: "0.78rem", color: "#f59e0b" }}>Deadline: {j.deadline}</div>}
                  </div>
                  <button className="btn btn-secondary" style={{ fontSize: "0.8rem" }} onClick={() => toggleJD(j.id)}>
                    {j.active ? "Deactivate" : "Activate"}
                  </button>
                </div>
                <div style={{ marginTop: "0.75rem", fontSize: "0.82rem", color: "var(--text-dim)", lineHeight: 1.5, maxHeight: "60px", overflow: "hidden" }}>
                  {j.jd_text.slice(0, 200)}...
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Users Tab */}
      {activeTab === "users" && (
        <div className="glass-panel" style={{ padding: "0", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
            <thead>
              <tr style={{ background: "rgba(0,0,0,0.4)", borderBottom: "1px solid var(--border-subtle)" }}>
                {["Name", "Email", "Role", "Batch", "Branch", "Registered", "Last Login"].map(h => (
                  <th key={h} style={{ padding: "0.75rem 1rem", textAlign: "left", fontWeight: 600, color: "var(--text-muted)", fontSize: "0.78rem", textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allUsers.map((u, i) => (
                <tr key={u.id} style={{ borderBottom: "1px solid var(--border-subtle)", background: i % 2 === 0 ? "transparent" : "rgba(0,0,0,0.15)" }}>
                  <td style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>{u.name}</td>
                  <td style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontSize: "0.82rem" }}>{u.email}</td>
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <span className={`badge ${u.role === "tpo" ? "badge-green" : "badge-purple"}`} style={{ fontSize: "0.72rem" }}>{u.role}</span>
                  </td>
                  <td style={{ padding: "0.75rem 1rem", color: "var(--text-dim)" }}>{u.batch || "—"}</td>
                  <td style={{ padding: "0.75rem 1rem", color: "var(--text-dim)" }}>{u.branch || "—"}</td>
                  <td style={{ padding: "0.75rem 1rem", color: "var(--text-dim)", fontSize: "0.78rem" }}>{u.created_at?.slice(0, 10) || "—"}</td>
                  <td style={{ padding: "0.75rem 1rem", color: "var(--text-dim)", fontSize: "0.78rem" }}>{u.last_login?.slice(0, 10) || "Never"}</td>
                </tr>
              ))}
              {allUsers.length === 0 && <tr><td colSpan={7} style={{ padding: "2rem", textAlign: "center", color: "var(--text-dim)" }}>No registered users yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
