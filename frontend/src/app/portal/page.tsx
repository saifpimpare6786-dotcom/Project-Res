"use client";

import { useState, useEffect } from "react";

const API = "http://127.0.0.1:8000";

interface User {
  user_id: string; name: string; role: string; email: string; access_token: string;
}
interface Resume {
  id: string; title: string; content: string; version: number; status: string;
  ats_score: number | null; last_updated: string;
}
interface JD { id: string; company_name: string; role: string; jd_text: string; deadline: string | null; }
interface OptResult {
  skill_gaps: string[]; optimization_score: number; optimized_content: string; jd_title: string; company_name: string;
}

type Stage = "auth" | "dashboard" | "editor" | "optimize";

export default function PortalPage() {
  const [user, setUser] = useState<User | null>(null);
  const [stage, setStage] = useState<Stage>("auth");

  // Auth form
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({ name: "", email: "", password: "", batch: "2025", branch: "CSE", role: "student" });
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Resume state
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [jds, setJDs] = useState<JD[]>([]);
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null);
  const [editorContent, setEditorContent] = useState("");
  const [editorTitle, setEditorTitle] = useState("My Resume");
  const [editorSaving, setEditorSaving] = useState(false);

  // Optimization
  const [optLoading, setOptLoading] = useState(false);
  const [optResult, setOptResult] = useState<OptResult | null>(null);
  const [selectedJD, setSelectedJD] = useState<JD | null>(null);
  const [customJDText, setCustomJDText] = useState("");

  // Readiness stats
  const [myStats, setMyStats] = useState<any>(null);

  // Score saving
  const [saveScoreData, setSaveScoreData] = useState({ company_name: "", role: "", ats_score: "", interview_score: "" });
  const [scoreSaved, setScoreSaved] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("prepsphere_user");
    if (stored) {
      const u = JSON.parse(stored);
      setUser(u);
      setStage("dashboard");
      loadDashboardData(u.access_token);
    }
  }, []);

  const loadDashboardData = async (token: string) => {
    try {
      const [rRes, jRes, sRes] = await Promise.all([
        fetch(`${API}/api/portal/resumes`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/portal/jds`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/portal/scores/me`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (rRes.ok) setResumes(await rRes.json());
      if (jRes.ok) setJDs(await jRes.json());
      if (sRes.ok) setMyStats(await sRes.json());
    } catch (e) {}
  };

  const handleAuth = async () => {
    setAuthLoading(true);
    setAuthError("");
    try {
      const endpoint = authMode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body = authMode === "login"
        ? { email: form.email, password: form.password }
        : { name: form.name, email: form.email, password: form.password, batch: form.batch, branch: form.branch, role: form.role };

      const res = await fetch(`${API}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Authentication failed");
      localStorage.setItem("prepsphere_user", JSON.stringify(data));
      setUser(data);
      setStage("dashboard");
      loadDashboardData(data.access_token);
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("prepsphere_user");
    setUser(null); setStage("auth"); setResumes([]); setMyStats(null);
  };

  const openEditor = (resume?: Resume) => {
    if (resume) {
      setSelectedResume(resume);
      setEditorContent(resume.content);
      setEditorTitle(resume.title);
    } else {
      setSelectedResume(null);
      setEditorContent(SAMPLE_RESUME);
      setEditorTitle("My Resume — Placement 2025");
    }
    setOptResult(null);
    setStage("editor");
  };

  const saveResume = async () => {
    if (!user) return;
    setEditorSaving(true);
    try {
      const method = selectedResume ? "PATCH" : "POST";
      const url = selectedResume ? `${API}/api/portal/resumes/${selectedResume.id}` : `${API}/api/portal/resumes`;
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${user.access_token}` },
        body: JSON.stringify({ title: editorTitle, content: editorContent })
      });
      if (!res.ok) throw new Error("Save failed.");
      const updated = await res.json();
      setSelectedResume(updated);
      await loadDashboardData(user.access_token);
      alert("Resume saved successfully!");
    } catch (e: any) {
      alert("Error saving: " + e.message);
    } finally {
      setEditorSaving(false);
    }
  };

  const submitResume = async () => {
    if (!user || !selectedResume) return;
    const res = await fetch(`${API}/api/portal/resumes/${selectedResume.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${user.access_token}` },
      body: JSON.stringify({ status: "submitted" })
    });
    if (res.ok) {
      alert("Resume submitted to placement cell!");
      await loadDashboardData(user.access_token);
      setStage("dashboard");
    }
  };

  const optimizeForJD = async () => {
    if (!user || !selectedResume) return;
    if (!selectedJD && !customJDText.trim()) { alert("Select a JD or paste JD text."); return; }
    setOptLoading(true);
    setStage("optimize");
    try {
      const jdText = selectedJD ? selectedJD.jd_text : customJDText;
      const jdTitle = selectedJD ? selectedJD.role : "Target Role";
      const companyName = selectedJD ? selectedJD.company_name : "Target Company";
      const res = await fetch(`${API}/api/portal/resumes/optimize`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${user.access_token}` },
        body: JSON.stringify({ resume_id: selectedResume.id, jd_title: jdTitle, company_name: companyName, jd_text: jdText })
      });
      const data = await res.json();
      setOptResult(data);
    } catch (e: any) {
      alert("Optimization error: " + e.message);
    } finally {
      setOptLoading(false);
    }
  };

  const saveScore = async () => {
    if (!user) return;
    const res = await fetch(`${API}/api/portal/scores/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${user.access_token}` },
      body: JSON.stringify({
        company_name: saveScoreData.company_name,
        role: saveScoreData.role,
        ats_score: saveScoreData.ats_score ? parseFloat(saveScoreData.ats_score) : null,
        interview_score: saveScoreData.interview_score ? parseFloat(saveScoreData.interview_score) : null,
      })
    });
    if (res.ok) {
      setScoreSaved(true);
      await loadDashboardData(user.access_token);
      setTimeout(() => setScoreSaved(false), 3000);
    }
  };

  // ─── RENDER ──────────────────────────────────────────────────────────────────

  if (stage === "auth") return <AuthScreen authMode={authMode} setAuthMode={setAuthMode} form={form} setForm={setForm} authError={authError} authLoading={authLoading} onAuth={handleAuth} />;
  if (!user) return null;

  return (
    <div className="container">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <div style={{ display: "inline-flex", gap: "0.5rem", marginBottom: "0.4rem" }}>
            <span className="badge badge-purple">Module 7</span>
            <span className="badge badge-blue">Resume Portal</span>
            <span className="badge badge-green">{user.role === "tpo" ? "TPO Account" : "Student Portal"}</span>
          </div>
          <h1 style={{ fontSize: "2rem", fontWeight: 800 }}>
            Welcome, <span className="gradient-text">{user.name}</span>
          </h1>
          <p className="text-muted">{user.email} · {user.role.toUpperCase()}</p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          {stage !== "dashboard" && <button className="btn btn-secondary" onClick={() => { setStage("dashboard"); loadDashboardData(user.access_token); }}>← Dashboard</button>}
          <button className="btn btn-secondary" onClick={logout}>Sign Out</button>
        </div>
      </div>

      {/* Dashboard */}
      {stage === "dashboard" && (
        <div>
          {/* Readiness Widget */}
          {myStats && myStats.own_overall_readiness != null && (
            <div className="glass-panel" style={{ padding: "1.5rem", marginBottom: "1.5rem", border: "1px solid var(--border-accent)", display: "flex", gap: "2rem", alignItems: "center" }}>
              <div style={{ textAlign: "center", minWidth: "100px" }}>
                <div style={{ fontSize: "2.5rem", fontWeight: 900, color: "#34d399" }}>{myStats.own_overall_readiness}</div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-dim)", textTransform: "uppercase" }}>My Readiness</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap" }}>
                  {[
                    { label: "My Rank", val: myStats.own_rank ? `#${myStats.own_rank}` : "—" },
                    { label: "Percentile", val: myStats.own_percentile ? `Top ${Math.round(100 - myStats.own_percentile)}%` : "—" },
                    { label: "Batch Average", val: myStats.batch_average_readiness ?? "—" },
                    { label: "ATS Score", val: myStats.own_ats_score ?? "—" },
                    { label: "Interview Score", val: myStats.own_interview_score ?? "—" },
                  ].map(({ label, val }) => (
                    <div key={label}>
                      <div style={{ fontSize: "0.78rem", color: "var(--text-dim)" }}>{label}</div>
                      <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text-main)" }}>{val}</div>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: "0.8rem", color: "var(--text-dim)", marginTop: "0.5rem" }}>
                  Peer comparison is fully anonymized — only your own rank and batch averages are shown, per privacy spec.
                </p>
              </div>
            </div>
          )}

          {/* My Resumes */}
          <div className="grid-2" style={{ gap: "1.5rem", marginBottom: "1.5rem" }}>
            <div className="glass-panel" style={{ padding: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h2 style={{ fontSize: "1.15rem", fontWeight: 700 }}>My Resumes</h2>
                <button className="btn btn-primary" style={{ fontSize: "0.85rem" }} onClick={() => openEditor()}>+ New Resume</button>
              </div>
              {resumes.length === 0 ? (
                <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-dim)" }}>
                  <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📄</div>
                  <p>No resumes yet. Create your first placement resume!</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {resumes.map((r) => (
                    <div key={r.id} style={{ background: "rgba(0,0,0,0.3)", padding: "1rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ fontWeight: 700, marginBottom: "0.25rem" }}>{r.title}</div>
                          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                            <span className={`badge ${r.status === "submitted" ? "badge-green" : "badge-purple"}`} style={{ fontSize: "0.72rem" }}>{r.status}</span>
                            {r.ats_score && <span style={{ fontSize: "0.8rem", color: "#a78bfa" }}>ATS: {r.ats_score}/100</span>}
                            <span style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>v{r.version}</span>
                          </div>
                        </div>
                        <button className="btn btn-secondary" style={{ fontSize: "0.8rem", padding: "0.35rem 0.75rem" }} onClick={() => openEditor(r)}>Edit</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Save Score + Active JDs */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div className="glass-panel" style={{ padding: "1.5rem" }}>
                <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "1rem" }}>Save My Placement Score</h2>
                <p style={{ fontSize: "0.82rem", color: "var(--text-dim)", marginBottom: "1rem" }}>Share your scores anonymously with the batch analytics (opt-in). Only your hash is stored.</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                  <input className="input-field" placeholder="Company (e.g., Google)" value={saveScoreData.company_name} onChange={e => setSaveScoreData(p => ({ ...p, company_name: e.target.value }))} />
                  <input className="input-field" placeholder="Role (e.g., SDE-1)" value={saveScoreData.role} onChange={e => setSaveScoreData(p => ({ ...p, role: e.target.value }))} />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                    <input className="input-field" placeholder="ATS Score" type="number" value={saveScoreData.ats_score} onChange={e => setSaveScoreData(p => ({ ...p, ats_score: e.target.value }))} />
                    <input className="input-field" placeholder="Interview Score" type="number" value={saveScoreData.interview_score} onChange={e => setSaveScoreData(p => ({ ...p, interview_score: e.target.value }))} />
                  </div>
                  <button className="btn btn-primary" onClick={saveScore}>{scoreSaved ? "Score Saved!" : "Save Score Anonymously"}</button>
                </div>
              </div>

              <div className="glass-panel" style={{ padding: "1.5rem" }}>
                <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "1rem" }}>Active JD Bank ({jds.length} roles)</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", maxHeight: "220px", overflowY: "auto" }}>
                  {jds.length === 0 ? (
                    <p style={{ fontSize: "0.85rem", color: "var(--text-dim)" }}>No JDs posted yet. TPO will add them during placement season.</p>
                  ) : jds.map(j => (
                    <div key={j.id} style={{ background: "rgba(0,0,0,0.3)", padding: "0.75rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
                      <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{j.company_name}</div>
                      <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>{j.role}</div>
                      {j.deadline && <div style={{ fontSize: "0.75rem", color: "#f59e0b" }}>Deadline: {j.deadline}</div>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Resume Editor */}
      {stage === "editor" && (
        <div>
          <div className="glass-panel" style={{ padding: "1.5rem", marginBottom: "1.25rem" }}>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginBottom: "1rem" }}>
              <input className="input-field" value={editorTitle} onChange={e => setEditorTitle(e.target.value)} style={{ maxWidth: "350px", fontSize: "1.1rem", fontWeight: 700 }} />
              {selectedResume && (
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <span className={`badge ${selectedResume.status === "submitted" ? "badge-green" : "badge-purple"}`}>{selectedResume.status}</span>
                  {selectedResume.ats_score && <span style={{ fontSize: "0.85rem", color: "#a78bfa" }}>ATS: {selectedResume.ats_score}/100</span>}
                </div>
              )}
            </div>

            <textarea
              className="input-field"
              rows={20}
              value={editorContent}
              onChange={e => setEditorContent(e.target.value)}
              style={{ fontFamily: "'Courier New', monospace", fontSize: "0.88rem", lineHeight: 1.6 }}
            />

            <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem", flexWrap: "wrap" }}>
              <button className="btn btn-primary" onClick={saveResume} disabled={editorSaving}>
                {editorSaving ? "Saving..." : "💾 Save Draft"}
              </button>
              {selectedResume && selectedResume.status !== "submitted" && (
                <button className="btn btn-secondary" style={{ color: "#34d399", borderColor: "#34d399" }} onClick={submitResume}>
                  📨 Submit to Placement Cell
                </button>
              )}
            </div>
          </div>

          {/* JD Optimization Panel */}
          {selectedResume && (
            <div className="glass-panel" style={{ padding: "1.5rem" }}>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.5rem" }}>Optimize for a Specific JD (Module 2 Agents)</h2>
              <p style={{ fontSize: "0.85rem", color: "var(--text-dim)", marginBottom: "1rem" }}>
                The Module 2 pipeline will identify skill gaps and generate STAR/XYZ formula rewrites for this JD.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "0.3rem" }}>From JD Bank</label>
                  <select className="input-field" value={selectedJD?.id || ""} onChange={e => setSelectedJD(jds.find(j => j.id === e.target.value) || null)}>
                    <option value="">-- Select a posted JD --</option>
                    {jds.map(j => <option key={j.id} value={j.id}>{j.company_name} — {j.role}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "0.3rem" }}>Or Paste Custom JD</label>
                  <textarea className="input-field" rows={2} placeholder="Paste JD text here..." value={customJDText} onChange={e => setCustomJDText(e.target.value)} />
                </div>
              </div>
              <button className="btn btn-primary" onClick={optimizeForJD} disabled={optLoading || (!selectedJD && !customJDText.trim())}>
                {optLoading ? "Running Module 2 Pipeline..." : "Optimize with ATS + LLM Agents"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Optimization Results */}
      {stage === "optimize" && (
        <div>
          {optLoading ? (
            <div className="glass-panel" style={{ padding: "3rem", textAlign: "center" }}>
              <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>⚙️</div>
              <div style={{ fontWeight: 700 }}>Running Module 2 Agents: JD Parser → ATS Scorer → LLM Reviewer...</div>
            </div>
          ) : optResult && (
            <div>
              <div className="glass-panel" style={{ padding: "1.5rem", marginBottom: "1.25rem", display: "flex", gap: "2rem", alignItems: "center" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "2.5rem", fontWeight: 900, color: "#a78bfa" }}>{optResult.optimization_score}</div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>JD Match Score</div>
                </div>
                <div>
                  <div style={{ fontWeight: 700, marginBottom: "0.4rem" }}>{optResult.company_name} — {optResult.jd_title}</div>
                  {optResult.skill_gaps.length > 0 && (
                    <>
                      <div style={{ fontSize: "0.82rem", color: "#f87171", marginBottom: "0.3rem", fontWeight: 600 }}>Missing Keywords to Add:</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                        {optResult.skill_gaps.slice(0, 8).map(g => (
                          <span key={g} style={{ background: "rgba(239,68,68,0.12)", color: "#f87171", padding: "0.2rem 0.5rem", borderRadius: "4px", fontSize: "0.8rem" }}>{g}</span>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="glass-panel" style={{ padding: "1.5rem" }}>
                <h3 style={{ fontWeight: 700, marginBottom: "0.75rem" }}>JD-Optimized Resume with STAR Rewrites</h3>
                <pre style={{ fontFamily: "'Courier New', monospace", fontSize: "0.85rem", lineHeight: 1.7, color: "var(--text-muted)", whiteSpace: "pre-wrap", maxHeight: "500px", overflowY: "auto" }}>
                  {optResult.optimized_content}
                </pre>
                <div style={{ marginTop: "1rem", display: "flex", gap: "0.75rem" }}>
                  <button className="btn btn-primary" onClick={() => { setEditorContent(optResult.optimized_content); setStage("editor"); }}>
                    Apply to Editor
                  </button>
                  <button className="btn btn-secondary" onClick={() => setStage("editor")}>Back to Editor</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Auth Screen ──────────────────────────────────────────────────────────────
function AuthScreen({ authMode, setAuthMode, form, setForm, authError, authLoading, onAuth }: any) {
  return (
    <div className="container">
      <div style={{ maxWidth: "480px", margin: "3rem auto" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ display: "inline-flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
            <span className="badge badge-purple">Module 7</span>
            <span className="badge badge-blue">Institutional Portal</span>
          </div>
          <h1 style={{ fontSize: "2rem", fontWeight: 800 }}>
            <span className="gradient-text">Resume Portal</span>
          </h1>
          <p className="text-muted" style={{ fontSize: "0.9rem" }}>
            Secure student & TPO workspace for placement season
          </p>
        </div>

        <div className="glass-panel" style={{ padding: "2rem" }}>
          <div style={{ display: "flex", marginBottom: "1.5rem", background: "rgba(0,0,0,0.3)", borderRadius: "var(--radius-sm)", padding: "3px" }}>
            {["login", "register"].map(m => (
              <button key={m} onClick={() => setAuthMode(m)}
                style={{ flex: 1, padding: "0.5rem", border: "none", borderRadius: "var(--radius-sm)", cursor: "pointer", fontWeight: 600, fontSize: "0.9rem", background: authMode === m ? "rgba(99,102,241,0.3)" : "transparent", color: authMode === m ? "#f8fafc" : "var(--text-muted)", transition: "all 0.2s" }}>
                {m === "login" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {authMode === "register" && (
              <>
                <input className="input-field" placeholder="Full Name" value={form.name} onChange={e => setForm((p: any) => ({ ...p, name: e.target.value }))} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                  <input className="input-field" placeholder="Batch (e.g. 2025)" value={form.batch} onChange={e => setForm((p: any) => ({ ...p, batch: e.target.value }))} />
                  <input className="input-field" placeholder="Branch (e.g. CSE)" value={form.branch} onChange={e => setForm((p: any) => ({ ...p, branch: e.target.value }))} />
                </div>
                <select className="input-field" value={form.role} onChange={e => setForm((p: any) => ({ ...p, role: e.target.value }))}>
                  <option value="student">Student</option>
                  <option value="tpo">Training & Placement Officer (TPO)</option>
                </select>
              </>
            )}
            <input className="input-field" type="email" placeholder="Email address" value={form.email} onChange={e => setForm((p: any) => ({ ...p, email: e.target.value }))} />
            <input className="input-field" type="password" placeholder="Password (min 8 characters)" value={form.password} onChange={e => setForm((p: any) => ({ ...p, password: e.target.value }))} />
          </div>

          {authError && <div style={{ marginTop: "0.75rem", padding: "0.6rem 0.9rem", background: "rgba(239,68,68,0.1)", borderRadius: "4px", color: "#f87171", fontSize: "0.88rem" }}>{authError}</div>}

          <button className="btn btn-primary" style={{ width: "100%", padding: "0.85rem", marginTop: "1.25rem" }} onClick={onAuth} disabled={authLoading}>
            {authLoading ? "Authenticating..." : authMode === "login" ? "Sign In" : "Create Account"}
          </button>

          <div style={{ marginTop: "1rem", textAlign: "center", fontSize: "0.82rem", color: "var(--text-dim)" }}>
            Demo: Register as student or TPO. Data stays in local SQLite.
          </div>
        </div>
      </div>
    </div>
  );
}

const SAMPLE_RESUME = `RAHUL SHARMA
rahul.sharma@college.edu · +91 98765 43210 · linkedin.com/in/rahulsharma

EDUCATION
B.Tech Computer Science Engineering
National Institute of Technology, Trichy | CGPA: 8.7/10 | 2021–2025

TECHNICAL SKILLS
Languages: Python, JavaScript, TypeScript, Java, SQL
Frameworks: React, Next.js, FastAPI, Spring Boot, Node.js
Infrastructure: Docker, Linux, Git, REST APIs, PostgreSQL, Redis

WORK EXPERIENCE

Software Engineering Intern | TechStartup Pvt Ltd | Jun 2024 – Aug 2024
• Built a real-time notification service reducing alert delivery latency by 35%
• Implemented Redis caching layer for high-frequency API endpoints
• Wrote unit and integration tests achieving 92% code coverage

PROJECTS

PrepSphere AI (Personal Project)
• Full-stack placement prep platform using Next.js, FastAPI, and local LLMs
• Integrated MediaPipe for on-device posture analysis during mock interviews

Student Management Portal
• Designed PostgreSQL schema for 5,000+ students, optimized query time by 60%

ACHIEVEMENTS
• Top 5% in TCS National Qualifier Test (NQT) 2024 — All India Rank 420
• LeetCode: 350+ problems solved | Rating: 1,820 (Knight)
• Smart India Hackathon 2023 Finalist — AI Health Monitoring System`;
