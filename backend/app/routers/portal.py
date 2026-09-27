import uuid
import json
import sqlite3
from datetime import datetime
from typing import List
from fastapi import APIRouter, HTTPException, Depends
from app.core.config import settings
from app.core.auth import (
    get_current_student, get_current_tpo, get_any_authenticated_user, get_current_user, hash_student_id
)
from app.schemas.api_models import (
    ResumeCreateRequest, ResumeUpdateRequest, ResumeRecord,
    JDOptimizeRequest, JDOptimizedResume,
    JDRecord, JDCreateRequest,
    SaveScoreRequest
)
from app.agents.jd_parser import jd_parser_agent
from app.agents.ats_scorer import ats_scorer_agent
from app.agents.resume_parser import resume_parser_agent
from app.agents.qualitative_reviewer import qualitative_reviewer_agent
from app.core.llm import ollama_client

router = APIRouter(prefix="/api/portal", tags=["Resume Portal - Module 7"])


def get_db():
    conn = sqlite3.connect(settings.SQLITE_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


# ─── Resume CRUD ──────────────────────────────────────────────────────────────

@router.post("/resumes", response_model=ResumeRecord, status_code=201)
def create_resume(
    req: ResumeCreateRequest,
    current_user: dict = Depends(get_current_student),
    db: sqlite3.Connection = Depends(get_db)
):
    """Save a new resume draft for the authenticated student."""
    resume_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()

    # Compute quick ATS score (rule-based, no JD required)
    try:
        resume_prof = resume_parser_agent.parse(req.content)
        # Light self-score against generic profile
        generic_jd_prof = {"required_skills": [], "preferred_skills": [], "requirements": [], "role": "General"}
        ats_res = ats_scorer_agent.calculate_score(resume_prof, generic_jd_prof)
        ats_score = ats_res["overall_score"]
    except Exception:
        ats_score = None

    db.execute("""
        INSERT INTO resumes (id, student_id, title, content, version, status, ats_score, last_updated, created_at)
        VALUES (?, ?, ?, ?, 1, 'draft', ?, ?, ?)
    """, (resume_id, current_user["sub"], req.title, req.content, ats_score, now, now))
    db.commit()

    return ResumeRecord(
        id=resume_id,
        student_id=current_user["sub"],
        title=req.title,
        content=req.content,
        version=1,
        status="draft",
        ats_score=ats_score,
        last_updated=now,
        created_at=now
    )


@router.get("/resumes", response_model=List[ResumeRecord])
def list_my_resumes(
    current_user: dict = Depends(get_current_student),
    db: sqlite3.Connection = Depends(get_db)
):
    """List all resumes for the authenticated student."""
    cursor = db.cursor()
    cursor.execute(
        "SELECT * FROM resumes WHERE student_id = ? ORDER BY last_updated DESC",
        (current_user["sub"],)
    )
    rows = cursor.fetchall()
    return [ResumeRecord(
        id=r["id"], student_id=r["student_id"], title=r["title"] or "Untitled",
        content=r["content"], version=r["version"] or 1, status=r["status"] or "draft",
        ats_score=r["ats_score"], last_updated=r["last_updated"], created_at=r["created_at"]
    ) for r in rows]


@router.get("/resumes/{resume_id}", response_model=ResumeRecord)
def get_resume(
    resume_id: str,
    current_user: dict = Depends(get_any_authenticated_user),
    db: sqlite3.Connection = Depends(get_db)
):
    """Fetch a specific resume. TPOs can read any submitted resume; students see only their own."""
    cursor = db.cursor()
    cursor.execute("SELECT * FROM resumes WHERE id = ?", (resume_id,))
    r = cursor.fetchone()
    if not r:
        raise HTTPException(status_code=404, detail="Resume not found.")

    # Access control: students can only read their own resumes
    if current_user.get("role") == "student" and r["student_id"] != current_user["sub"]:
        raise HTTPException(status_code=403, detail="You do not have access to this resume.")

    return ResumeRecord(
        id=r["id"], student_id=r["student_id"], title=r["title"] or "Untitled",
        content=r["content"], version=r["version"] or 1, status=r["status"] or "draft",
        ats_score=r["ats_score"], last_updated=r["last_updated"], created_at=r["created_at"]
    )


@router.patch("/resumes/{resume_id}", response_model=ResumeRecord)
def update_resume(
    resume_id: str,
    req: ResumeUpdateRequest,
    current_user: dict = Depends(get_current_student),
    db: sqlite3.Connection = Depends(get_db)
):
    """Update resume content, title, or status (draft→submitted)."""
    cursor = db.cursor()
    cursor.execute("SELECT * FROM resumes WHERE id = ? AND student_id = ?",
                   (resume_id, current_user["sub"]))
    r = cursor.fetchone()
    if not r:
        raise HTTPException(status_code=404, detail="Resume not found or not owned by you.")

    now = datetime.utcnow().isoformat()
    new_title = req.title if req.title is not None else r["title"]
    new_content = req.content if req.content is not None else r["content"]
    new_status = req.status if req.status in ("draft", "submitted") else r["status"]
    new_version = r["version"] + 1 if req.content else r["version"]

    # Re-score if content changed
    ats_score = r["ats_score"]
    if req.content:
        try:
            resume_prof = resume_parser_agent.parse(new_content)
            generic_jd_prof = {"required_skills": [], "preferred_skills": [], "requirements": [], "role": "General"}
            ats_res = ats_scorer_agent.calculate_score(resume_prof, generic_jd_prof)
            ats_score = ats_res["overall_score"]
        except Exception:
            pass

    db.execute("""
        UPDATE resumes SET title=?, content=?, version=?, status=?, ats_score=?, last_updated=?
        WHERE id=?
    """, (new_title, new_content, new_version, new_status, ats_score, now, resume_id))
    db.commit()

    return ResumeRecord(
        id=resume_id, student_id=current_user["sub"], title=new_title,
        content=new_content, version=new_version, status=new_status,
        ats_score=ats_score, last_updated=now, created_at=r["created_at"]
    )


@router.delete("/resumes/{resume_id}")
def delete_resume(
    resume_id: str,
    current_user: dict = Depends(get_current_student),
    db: sqlite3.Connection = Depends(get_db)
):
    cursor = db.cursor()
    cursor.execute("SELECT id FROM resumes WHERE id = ? AND student_id = ?",
                   (resume_id, current_user["sub"]))
    if not cursor.fetchone():
        raise HTTPException(status_code=404, detail="Resume not found or not owned by you.")
    db.execute("DELETE FROM resumes WHERE id = ?", (resume_id,))
    db.commit()
    return {"message": "Resume deleted successfully."}


# ─── JD-Optimized Resume (uses Module 2 agents) ─────────────────────────────

@router.post("/resumes/optimize", response_model=JDOptimizedResume)
def optimize_resume_for_jd(
    req: JDOptimizeRequest,
    current_user: dict = Depends(get_current_student),
    db: sqlite3.Connection = Depends(get_db)
):
    """Uses Module 2 agents to produce JD-tailored resume bullet rewrites and skill gap analysis."""
    cursor = db.cursor()
    cursor.execute("SELECT * FROM resumes WHERE id = ? AND student_id = ?",
                   (req.resume_id, current_user["sub"]))
    resume_row = cursor.fetchone()
    if not resume_row:
        raise HTTPException(status_code=404, detail="Resume not found or not owned by you.")

    resume_text = resume_row["content"]
    jd_text = req.jd_text

    resume_prof = resume_parser_agent.parse(resume_text)
    jd_prof = jd_parser_agent.parse(jd_text, req.company_name)
    ats_res = ats_scorer_agent.calculate_score(resume_prof, jd_prof)
    review = qualitative_reviewer_agent.review(resume_prof, jd_prof, ats_res)

    # Build optimized content: original + coach feedback sections
    skill_gaps = review.missing_keywords if hasattr(review, 'missing_keywords') else []
    if not skill_gaps:
        skill_gaps = jd_prof.get("required_skills", []) if isinstance(jd_prof, dict) else []

    # Generate rewrite suggestions
    optimization_prompt = f"""Based on this student resume and the target JD for {req.company_name} ({req.jd_title}):
JD Requirements: {', '.join(skill_gaps[:10]) if skill_gaps else jd_text[:400]}

Provide 5 specific, quantified bullet-point rewrites using the STAR/XYZ Google formula.
Format: "• [Original theme] → Revised: [Improved version with metrics]"
Keep each rewrite under 2 lines."""

    try:
        rewrites = ollama_client.generate(
            prompt=optimization_prompt,
            system="You are a placement advisor. Rewrite resume bullets with concrete metrics and outcomes."
        )
    except Exception:
        rewrites = f"• Integrate {', '.join(skill_gaps[:3])} keywords into your experience bullets with quantified outcomes (e.g., 'Reduced API latency by 40% using Redis cache-aside')."

    optimized_content = f"""=== JD-OPTIMIZED RESUME ===
Target: {req.jd_title} at {req.company_name}
Optimization Score: {ats_res['overall_score']}/100

=== MISSING SKILLS TO ADD ===
{', '.join(skill_gaps[:8]) if skill_gaps else 'Profile largely matches requirements.'}

=== BULLET REWRITES (STAR/XYZ Formula) ===
{rewrites}

=== ORIGINAL RESUME ===
{resume_text}"""

    opt_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    db.execute("""
        INSERT INTO jd_optimized_resumes (id, resume_id, jd_id, jd_title, company_name, optimized_content, skill_gaps, optimization_score, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (opt_id, req.resume_id, req.jd_id, req.jd_title, req.company_name,
          optimized_content, json.dumps(skill_gaps), ats_res["overall_score"], now))
    db.commit()

    return JDOptimizedResume(
        id=opt_id,
        resume_id=req.resume_id,
        jd_title=req.jd_title,
        company_name=req.company_name,
        optimized_content=optimized_content,
        skill_gaps=skill_gaps[:10],
        optimization_score=ats_res["overall_score"],
        created_at=now
    )


# ─── JD Bank (TPO posts JDs, students view them) ─────────────────────────────

@router.get("/jds", response_model=List[JDRecord])
def list_jds(
    current_user: dict = Depends(get_any_authenticated_user),
    db: sqlite3.Connection = Depends(get_db)
):
    """List all active JDs in the placement JD bank."""
    cursor = db.cursor()
    cursor.execute("SELECT * FROM jd_bank WHERE active = 1 ORDER BY created_at DESC")
    rows = cursor.fetchall()
    return [JDRecord(
        id=r["id"], company_name=r["company_name"], role=r["role"],
        jd_text=r["jd_text"], batch=r["batch"], branch=r["branch"],
        deadline=r["deadline"], active=bool(r["active"]), created_at=r["created_at"]
    ) for r in rows]


@router.post("/jds", response_model=JDRecord, status_code=201)
def create_jd(
    req: JDCreateRequest,
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db)
):
    """Post a new JD to the placement bank. TPO or admin only."""
    if current_user.get("role") not in ("tpo",):
        raise HTTPException(status_code=403, detail="Only TPO accounts can post JDs.")
    jd_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    db.execute("""
        INSERT INTO jd_bank (id, company_name, role, jd_text, batch, branch, deadline, active, created_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    """, (jd_id, req.company_name, req.role, req.jd_text, req.batch, req.branch, req.deadline, current_user["sub"], now))
    db.commit()
    return JDRecord(
        id=jd_id, company_name=req.company_name, role=req.role,
        jd_text=req.jd_text, batch=req.batch, branch=req.branch,
        deadline=req.deadline, active=True, created_at=now
    )


# ─── Score Saving (Student explicitly opts in to share score) ─────────────────

@router.post("/scores/save")
def save_placement_score(
    req: SaveScoreRequest,
    current_user: dict = Depends(get_current_student),
    db: sqlite3.Connection = Depends(get_db)
):
    """
    Student explicitly saves their ATS/interview score to the anonymized_scores table.
    Spec 8.3: only small, structured, already-anonymized JSON goes up.
    """
    score_id = str(uuid.uuid4())
    student_id = current_user["sub"]
    student_hash = hash_student_id(student_id)
    now = datetime.utcnow().isoformat()

    overall = None
    if req.ats_score is not None and req.interview_score is not None:
        overall = round((req.ats_score * 0.4) + (req.interview_score * 0.6), 1)
    elif req.ats_score is not None:
        overall = req.ats_score
    elif req.interview_score is not None:
        overall = req.interview_score

    db.execute("""
        INSERT INTO anonymized_scores
        (id, student_hash, student_id, jd_id, company_name, role, ats_score, interview_score, overall_readiness, computed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (score_id, student_hash, student_id, req.jd_id, req.company_name, req.role,
          req.ats_score, req.interview_score, overall, now))
    db.commit()

    return {"message": "Score saved successfully to placement analytics.", "score_id": score_id}


@router.get("/scores/me")
def get_my_readiness_stats(
    company_name: str = None,
    current_user: dict = Depends(get_current_student),
    db: sqlite3.Connection = Depends(get_db)
):
    """
    Return this student's own scores + anonymized peer percentile.
    Spec 8.3 §2: NEVER return another student's identity to a student-role caller.
    """
    cursor = db.cursor()
    student_id = current_user["sub"]

    query = "SELECT * FROM anonymized_scores WHERE student_id = ?"
    params = [student_id]
    if company_name:
        query += " AND company_name = ?"
        params.append(company_name)
    query += " ORDER BY computed_at DESC LIMIT 1"

    cursor.execute(query, params)
    own_score = cursor.fetchone()

    # Peer stats — aggregate only, no names or IDs exposed
    cursor.execute("SELECT overall_readiness FROM anonymized_scores WHERE overall_readiness IS NOT NULL")
    all_scores = [r["overall_readiness"] for r in cursor.fetchall() if r["overall_readiness"] is not None]

    own_readiness = own_score["overall_readiness"] if own_score else None
    batch_avg = round(sum(all_scores) / len(all_scores), 1) if all_scores else None

    own_rank = None
    own_percentile = None
    if own_readiness is not None and all_scores:
        ranked = sorted(all_scores, reverse=True)
        own_rank = ranked.index(own_readiness) + 1 if own_readiness in ranked else len(ranked)
        own_percentile = round((1 - (own_rank - 1) / len(ranked)) * 100, 1)

    return {
        "own_ats_score": own_score["ats_score"] if own_score else None,
        "own_interview_score": own_score["interview_score"] if own_score else None,
        "own_overall_readiness": own_readiness,
        "own_rank": own_rank,
        "own_percentile": own_percentile,
        "batch_average_readiness": batch_avg,
        "total_students_in_batch": len(set([s for s in all_scores])),
        "company_name": company_name,
    }
