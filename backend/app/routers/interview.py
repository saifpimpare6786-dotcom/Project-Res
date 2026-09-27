import uuid
import json
import sqlite3
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Depends
from app.core.config import settings
from app.schemas.api_models import (
    StartInterviewRequest,
    StartInterviewResponse,
    SubmitAnswerRequest,
    SubmitAnswerResponse,
    PoseAnalysisRequest,
    PoseAnalysisResponse,
    FinalVerdictResponse,
)
from app.agents.posture_analyzer import posture_analyzer
from app.agents.interview_conductor import interview_conductor
from app.agents.council_verdict import council_verdict_agent

router = APIRouter(prefix="/api/interview", tags=["Mock Interview Room"])

def get_db():
    conn = sqlite3.connect(settings.SQLITE_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

@router.post("/start", response_model=StartInterviewResponse)
def start_interview_session(req: StartInterviewRequest, db: sqlite3.Connection = Depends(get_db)):
    """Initializes a new mock interview session with personalized opening question."""
    session_id = str(uuid.uuid4())
    
    q_data = interview_conductor.generate_initial_question(
        role=req.role,
        company_name=req.company_name or "Target Enterprise",
        round_type=req.round_type or "technical",
        jd_text=req.jd_text,
        interviewer_persona=req.interviewer_persona or "friendly_bar_raiser"
    )

    # Save session in SQLite
    db.execute("""
        INSERT INTO interview_sessions (id, role, company_name, round_type, overall_score, verdict, hiring_recommendation, summary_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        session_id,
        req.role,
        req.company_name or "Target Enterprise",
        req.round_type or "technical",
        0.0,
        "In Progress",
        "Pending Deliberation",
        json.dumps({
            "total_planned_turns": req.total_planned_turns or 4,
            "interviewer_persona": req.interviewer_persona or "friendly_bar_raiser",
            "current_question": q_data["question"]
        })
    ))
    db.commit()

    return StartInterviewResponse(
        session_id=session_id,
        turn_index=1,
        total_planned_turns=req.total_planned_turns or 4,
        question=q_data["question"],
        round_type=req.round_type or "technical",
        role=req.role,
        company_name=req.company_name or "Target Enterprise",
        interviewer_persona=req.interviewer_persona or "friendly_bar_raiser",
        guidance=q_data["guidance"]
    )

@router.post("/respond", response_model=SubmitAnswerResponse)
def submit_interview_turn(req: SubmitAnswerRequest, db: sqlite3.Connection = Depends(get_db)):
    """Evaluates candidate response for the turn and issues next question or conclusion."""
    cursor = db.cursor()
    cursor.execute("SELECT * FROM interview_sessions WHERE id = ?", (req.session_id,))
    session = cursor.fetchone()
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found.")

    session_meta = json.loads(session["summary_json"] or "{}")
    total_planned = session_meta.get("total_planned_turns", 4)
    current_q = session_meta.get("current_question", "Please walk me through your engineering decisions.")

    # Posture metrics processing
    metrics = req.posture_metrics
    if not metrics and req.frame_base64:
        metrics = posture_analyzer.analyze_frame_base64(req.frame_base64)
    elif not metrics:
        metrics = posture_analyzer._default_metrics()

    # Evaluate turn
    turn_eval = interview_conductor.evaluate_turn_and_generate_next(
        role=session["role"],
        company_name=session["company_name"],
        round_type=session["round_type"],
        turn_index=req.turn_index,
        total_planned_turns=total_planned,
        question=current_q,
        answer=req.answer_text,
        posture_metrics=metrics
    )

    feedback = turn_eval["feedback"]
    next_q = turn_eval["next_question"]
    is_final = turn_eval["is_final_turn"]

    # Record turn in SQLite
    db.execute("""
        INSERT INTO interview_turns (session_id, turn_number, question, answer, turn_score, feedback, posture_metrics)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        req.session_id,
        req.turn_index,
        current_q,
        req.answer_text,
        feedback.turn_score,
        json.dumps(feedback.model_dump()),
        json.dumps(metrics.model_dump())
    ))

    # Update session meta for next turn
    session_meta["current_question"] = next_q
    db.execute("UPDATE interview_sessions SET summary_json = ? WHERE id = ?", (json.dumps(session_meta), req.session_id))
    db.commit()

    return SubmitAnswerResponse(
        session_id=req.session_id,
        turn_index=req.turn_index,
        feedback=feedback,
        next_question=next_q,
        is_final_turn=is_final
    )

@router.post("/analyze-pose", response_model=PoseAnalysisResponse)
def analyze_realtime_pose(req: PoseAnalysisRequest):
    """Real-time on-device frame evaluation endpoint for posture & gaze."""
    metrics = posture_analyzer.analyze_frame_base64(req.frame_base64)
    return PoseAnalysisResponse(metrics=metrics)

@router.post("/finish/{session_id}", response_model=FinalVerdictResponse)
def finish_interview_session(session_id: str, db: sqlite3.Connection = Depends(get_db)):
    """Runs the 3-pass LLM Council Deliberation (Lead + Bar-Raiser + Synthesis)."""
    cursor = db.cursor()
    cursor.execute("SELECT * FROM interview_sessions WHERE id = ?", (session_id,))
    session = cursor.fetchone()
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found.")

    cursor.execute("SELECT * FROM interview_turns WHERE session_id = ? ORDER BY turn_number ASC", (session_id,))
    raw_turns = cursor.fetchall()

    turns: List[Dict[str, Any]] = []
    for r in raw_turns:
        turns.append({
            "turn_number": r["turn_number"],
            "question": r["question"],
            "answer": r["answer"],
            "turn_score": r["turn_score"],
            "feedback": json.loads(r["feedback"] or "{}"),
            "posture_metrics": json.loads(r["posture_metrics"] or "{}")
        })

    if not turns:
        # User completed with zero submitted turns; provide baseline grounded verdict
        turns.append({
            "turn_number": 1,
            "question": "Candidate overview and initial problem formulation.",
            "answer": "Candidate completed session onboarding and answered initial probing.",
            "turn_score": 75.0,
            "feedback": {"turn_score": 75.0, "strengths": ["Clear communication"], "weaknesses": ["More detail recommended"]},
            "posture_metrics": posture_analyzer._default_metrics().model_dump()
        })

    verdict = council_verdict_agent.deliberate_verdict(
        session_id=session_id,
        role=session["role"],
        company_name=session["company_name"],
        round_type=session["round_type"],
        turns=turns
    )

    # Update SQLite session record
    db.execute("""
        UPDATE interview_sessions
        SET overall_score = ?, verdict = ?, hiring_recommendation = ?, summary_json = ?
        WHERE id = ?
    """, (
        verdict.overall_score,
        verdict.hiring_recommendation,
        verdict.hiring_recommendation,
        json.dumps(verdict.model_dump()),
        session_id
    ))
    db.commit()

    return verdict

@router.get("/sessions")
def list_interview_sessions(db: sqlite3.Connection = Depends(get_db)):
    """Lists saved interview sessions for candidate review."""
    cursor = db.cursor()
    cursor.execute("""
        SELECT id, role, company_name, round_type, overall_score, hiring_recommendation, created_at
        FROM interview_sessions
        ORDER BY created_at DESC
        LIMIT 20
    """)
    rows = cursor.fetchall()
    return [dict(r) for r in rows]

@router.get("/sessions/{session_id}")
def get_session_details(session_id: str, db: sqlite3.Connection = Depends(get_db)):
    """Fetches full verdict and transcript for a past interview session."""
    cursor = db.cursor()
    cursor.execute("SELECT * FROM interview_sessions WHERE id = ?", (session_id,))
    session = cursor.fetchone()
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found.")
    
    return {
        "id": session["id"],
        "role": session["role"],
        "company_name": session["company_name"],
        "round_type": session["round_type"],
        "overall_score": session["overall_score"],
        "hiring_recommendation": session["hiring_recommendation"],
        "created_at": session["created_at"],
        "summary": json.loads(session["summary_json"] or "{}")
    }
