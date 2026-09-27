import sqlite3
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, Query
from app.core.config import settings
from app.core.auth import get_current_tpo, get_current_student
from app.schemas.api_models import BatchAnalyticsResponse, TPOStudentRecord

router = APIRouter(prefix="/api/admin", tags=["TPO Analytics Dashboard - Module 8"])


def get_db():
    conn = sqlite3.connect(settings.SQLITE_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


@router.get("/dashboard", response_model=BatchAnalyticsResponse)
def get_batch_analytics(
    batch: Optional[str] = Query(None, description="Filter by graduation batch, e.g. '2025'"),
    branch: Optional[str] = Query(None, description="Filter by branch/dept, e.g. 'CSE'"),
    company_name: Optional[str] = Query(None, description="Filter by company applied to"),
    current_tpo: dict = Depends(get_current_tpo),
    db: sqlite3.Connection = Depends(get_db)
):
    """
    TPO-only analytics dashboard.
    Returns named student records for shortlisting + aggregate batch stats.
    Spec 8.3 §2: TPOs see full names; students see only their own data.
    """
    cursor = db.cursor()

    # Build student query with optional filters
    student_query = "SELECT * FROM students WHERE role = 'student'"
    student_params = []
    if batch:
        student_query += " AND batch = ?"
        student_params.append(batch)
    if branch:
        student_query += " AND branch = ?"
        student_params.append(branch)
    cursor.execute(student_query, student_params)
    all_students = cursor.fetchall()

    tpo_records: List[TPOStudentRecord] = []
    ats_scores_all = []
    interview_scores_all = []
    readiness_scores_all = []
    companies_applied = []
    readiness_dist = {"Strong Hire": 0, "Hire": 0, "Lean Hire": 0, "Lean No Hire": 0, "No Hire": 0}
    students_with_resume = 0
    students_with_interview = 0

    for s in all_students:
        sid = s["id"]

        # Latest resume
        cursor.execute("SELECT id, status, ats_score FROM resumes WHERE student_id = ? ORDER BY last_updated DESC LIMIT 1", (sid,))
        resume_row = cursor.fetchone()
        resume_status = "No Resume"
        if resume_row:
            resume_status = resume_row["status"].capitalize()
            students_with_resume += 1

        # Latest score record
        score_query = "SELECT * FROM anonymized_scores WHERE student_id = ?"
        score_params = [sid]
        if company_name:
            score_query += " AND company_name = ?"
            score_params.append(company_name)
        score_query += " ORDER BY computed_at DESC LIMIT 1"
        cursor.execute(score_query, score_params)
        score_row = cursor.fetchone()

        ats_score = score_row["ats_score"] if score_row else None
        interview_score = score_row["interview_score"] if score_row else None
        overall_readiness = score_row["overall_readiness"] if score_row else None
        company = score_row["company_name"] if score_row else None
        role = score_row["role"] if score_row else None

        if score_row:
            students_with_interview += 1
            if company and company not in companies_applied:
                companies_applied.append(company)

        if ats_score is not None:
            ats_scores_all.append(ats_score)
        if interview_score is not None:
            interview_scores_all.append(interview_score)
        if overall_readiness is not None:
            readiness_scores_all.append(overall_readiness)
            if overall_readiness >= 85:
                readiness_dist["Strong Hire"] += 1
            elif overall_readiness >= 78:
                readiness_dist["Hire"] += 1
            elif overall_readiness >= 70:
                readiness_dist["Lean Hire"] += 1
            elif overall_readiness >= 60:
                readiness_dist["Lean No Hire"] += 1
            else:
                readiness_dist["No Hire"] += 1

        # Latest interview session
        cursor.execute("SELECT hiring_recommendation FROM interview_sessions WHERE overall_score > 0 ORDER BY created_at DESC LIMIT 1")
        int_row = cursor.fetchone()

        tpo_records.append(TPOStudentRecord(
            student_id=sid,
            name=s["name"],
            email=s["email"],
            batch=s["batch"],
            branch=s["branch"],
            ats_score=ats_score,
            interview_score=interview_score,
            overall_readiness=overall_readiness,
            resume_status=resume_status,
            company_name=company,
            role=role,
            computed_at=score_row["computed_at"] if score_row else None
        ))

    # Sort by overall readiness descending for shortlisting priority
    tpo_records.sort(key=lambda x: x.overall_readiness or 0, reverse=True)

    return BatchAnalyticsResponse(
        total_students=len(all_students),
        students_with_resume=students_with_resume,
        students_with_interview=students_with_interview,
        batch_average_ats=round(sum(ats_scores_all) / len(ats_scores_all), 1) if ats_scores_all else 0.0,
        batch_average_interview=round(sum(interview_scores_all) / len(interview_scores_all), 1) if interview_scores_all else 0.0,
        batch_average_readiness=round(sum(readiness_scores_all) / len(readiness_scores_all), 1) if readiness_scores_all else 0.0,
        top_companies_applied=companies_applied[:8],
        readiness_distribution=readiness_dist,
        students=tpo_records
    )


@router.get("/students/{student_id}/resumes")
def get_student_resumes_for_tpo(
    student_id: str,
    current_tpo: dict = Depends(get_current_tpo),
    db: sqlite3.Connection = Depends(get_db)
):
    """
    TPO shortlisting: fetch a shortlisted student's submitted resumes.
    Spec 7.7: TPO can pull finalized student resumes directly.
    """
    cursor = db.cursor()
    cursor.execute("SELECT id, name, email, batch, branch FROM students WHERE id = ?", (student_id,))
    student = cursor.fetchone()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    cursor.execute("""
        SELECT id, title, status, ats_score, version, last_updated, created_at
        FROM resumes WHERE student_id = ? AND status = 'submitted'
        ORDER BY last_updated DESC
    """, (student_id,))
    resumes = [dict(r) for r in cursor.fetchall()]

    return {
        "student": dict(student),
        "submitted_resumes": resumes
    }


@router.get("/students/{student_id}/resumes/{resume_id}/full")
def get_student_resume_full(
    student_id: str,
    resume_id: str,
    current_tpo: dict = Depends(get_current_tpo),
    db: sqlite3.Connection = Depends(get_db)
):
    """TPO pulls full text of a submitted student resume for shortlisting."""
    cursor = db.cursor()
    cursor.execute("""
        SELECT r.*, s.name, s.email, s.batch, s.branch
        FROM resumes r JOIN students s ON r.student_id = s.id
        WHERE r.id = ? AND r.student_id = ? AND r.status = 'submitted'
    """, (resume_id, student_id))
    row = cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Submitted resume not found.")
    return dict(row)


@router.get("/jds")
def list_all_jds_tpo(
    current_tpo: dict = Depends(get_current_tpo),
    db: sqlite3.Connection = Depends(get_db)
):
    """TPO view of all JDs including inactive ones."""
    cursor = db.cursor()
    cursor.execute("SELECT * FROM jd_bank ORDER BY created_at DESC")
    return [dict(r) for r in cursor.fetchall()]


@router.patch("/jds/{jd_id}/toggle")
def toggle_jd_active(
    jd_id: str,
    current_tpo: dict = Depends(get_current_tpo),
    db: sqlite3.Connection = Depends(get_db)
):
    """Enable or disable a JD posting."""
    cursor = db.cursor()
    cursor.execute("SELECT id, active FROM jd_bank WHERE id = ?", (jd_id,))
    row = cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="JD not found.")
    new_active = 0 if row["active"] else 1
    db.execute("UPDATE jd_bank SET active = ? WHERE id = ?", (new_active, jd_id))
    db.commit()
    return {"jd_id": jd_id, "active": bool(new_active)}


@router.get("/analytics/summary")
def get_quick_analytics(
    current_tpo: dict = Depends(get_current_tpo),
    db: sqlite3.Connection = Depends(get_db)
):
    """Quick aggregate stats for the TPO header dashboard widget."""
    cursor = db.cursor()
    cursor.execute("SELECT COUNT(*) FROM students WHERE role='student'")
    total_students = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM resumes WHERE status='submitted'")
    submitted_resumes = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM interview_sessions WHERE hiring_recommendation IN ('Strong Hire', 'Hire')")
    strong_candidates = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM jd_bank WHERE active=1")
    active_jds = cursor.fetchone()[0]
    cursor.execute("SELECT AVG(overall_readiness) FROM anonymized_scores WHERE overall_readiness IS NOT NULL")
    avg_readiness_row = cursor.fetchone()
    avg_readiness = round(avg_readiness_row[0], 1) if avg_readiness_row and avg_readiness_row[0] else 0.0

    return {
        "total_students": total_students,
        "submitted_resumes": submitted_resumes,
        "strong_candidates": strong_candidates,
        "active_jds": active_jds,
        "batch_avg_readiness": avg_readiness
    }
