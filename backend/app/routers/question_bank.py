import sqlite3
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query
from app.core.config import settings
from app.core.router import fast_router
from app.schemas.api_models import (
    QuestionBankItem, QuestionSubmissionRequest, QuestionBankResponse
)

router = APIRouter(prefix="/api/questions", tags=["Question Bank"])

@router.get("", response_model=QuestionBankResponse)
def get_questions(
    company: Optional[str] = Query(None, description="Filter by company name"),
    round_type: Optional[str] = Query(None, description="GD, PI, or technical"),
    role: Optional[str] = Query(None, description="Role keyword"),
    search: Optional[str] = Query(None, description="Keyword search in question text")
):
    """
    Module 5: Historical Question Bank.
    Fetches real campus placement questions with filtering and search.
    """
    conn = sqlite3.connect(settings.SQLITE_PATH)
    cursor = conn.cursor()

    query = "SELECT id, company_name, role, question_text, round_type, reported_year, upvotes, tags FROM question_bank WHERE 1=1"
    params = []

    if company and company.strip():
        query += " AND LOWER(company_name) LIKE ?"
        params.append(f"%{company.strip().lower()}%")

    if round_type and round_type.strip():
        query += " AND LOWER(round_type) = ?"
        params.append(round_type.strip().lower())

    if role and role.strip():
        query += " AND LOWER(role) LIKE ?"
        params.append(f"%{role.strip().lower()}%")

    if search and search.strip():
        query += " AND LOWER(question_text) LIKE ?"
        params.append(f"%{search.strip().lower()}%")

    query += " ORDER BY upvotes DESC, reported_year DESC"

    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()

    items = []
    for r in rows:
        tags_list = [t.strip() for t in r[7].split(",") if t.strip()] if r[7] else []
        items.append(QuestionBankItem(
            id=r[0],
            company_name=r[1],
            role=r[2] or "Engineering",
            question_text=r[3],
            round_type=r[4] or "Technical",
            reported_year=r[5] or 2025,
            upvotes=r[6] or 0,
            tags=tags_list
        ))

    return QuestionBankResponse(
        total_count=len(items),
        questions=items
    )

@router.get("/companies")
def get_distinct_companies():
    """
    Returns unique company names and question counts for filter chips.
    """
    conn = sqlite3.connect(settings.SQLITE_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        SELECT company_name, COUNT(*) as count
        FROM question_bank
        GROUP BY company_name
        ORDER BY count DESC
    """)
    rows = cursor.fetchall()
    conn.close()

    return [{"company_name": r[0], "count": r[1]} for r in rows]

@router.post("/submit", response_model=QuestionBankItem)
def submit_question(req: QuestionSubmissionRequest):
    """
    Submit a newly reported campus recruitment question.
    Uses Laya fast router to infer or validate round type if missing.
    """
    company = req.company_name.strip()
    question = req.question_text.strip()
    if not company or not question:
        raise HTTPException(status_code=400, detail="Company name and question text are required.")

    round_type = req.round_type or "PI"
    # Auto-infer GD round if topic starts with GD
    if "gd" in question.lower() or "group discussion" in question.lower():
        round_type = "GD"
    elif any(k in question.lower() for k in ["design", "algorithm", "binary tree", "sql", "complexity", "database"]):
        round_type = "technical"

    tags = req.tags or []
    if round_type not in tags:
        tags.append(round_type)

    tags_str = ",".join(tags)

    conn = sqlite3.connect(settings.SQLITE_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO question_bank (company_name, role, question_text, round_type, reported_year, upvotes, tags)
        VALUES (?, ?, ?, ?, ?, 1, ?)
    """, (company, req.role or "Software Engineer", question, round_type, req.reported_year or 2025, tags_str))
    
    new_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return QuestionBankItem(
        id=new_id,
        company_name=company,
        role=req.role or "Software Engineer",
        question_text=question,
        round_type=round_type,
        reported_year=req.reported_year or 2025,
        upvotes=1,
        tags=tags
    )

@router.post("/{question_id}/upvote")
def upvote_question(question_id: int):
    """
    Increments upvote count for a verified helpful question.
    """
    conn = sqlite3.connect(settings.SQLITE_PATH)
    cursor = conn.cursor()
    cursor.execute("UPDATE question_bank SET upvotes = upvotes + 1 WHERE id = ?", (question_id,))
    if cursor.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="Question not found.")

    cursor.execute("SELECT upvotes FROM question_bank WHERE id = ?", (question_id,))
    new_upvotes = cursor.fetchone()[0]
    conn.commit()
    conn.close()

    return {"id": question_id, "upvotes": new_upvotes, "status": "upvoted"}
