from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import Dict, Any, List
from app.schemas.api_models import (
    ResumeMatchRequest, ResumeMatchResponse,
    MultiJDMatchRequest, MultiJDMatchResponse, JDRankingResult,
    PDFUploadResponse
)
from app.agents.resume_parser import resume_parser_agent
from app.agents.jd_parser import jd_parser_agent
from app.agents.ats_scorer import ats_scorer_agent
from app.agents.qualitative_reviewer import qualitative_reviewer_agent

router = APIRouter(prefix="/api/resume", tags=["Resume Matcher"])

@router.post("/upload-pdf", response_model=PDFUploadResponse)
async def upload_resume_pdf(file: UploadFile = File(...)):
    """
    Extracts text from an uploaded PDF resume using pypdf.
    """
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    try:
        content = await file.read()
        extracted_text = resume_parser_agent.extract_text_from_pdf(content)
        if not extracted_text:
            raise HTTPException(status_code=400, detail="Could not extract text from the provided PDF. It might be scanned/image-only.")

        return PDFUploadResponse(
            filename=file.filename,
            extracted_text=extracted_text,
            character_count=len(extracted_text),
            word_count=len(extracted_text.split())
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF parsing failed: {str(e)}")

@router.post("/match", response_model=ResumeMatchResponse)
def match_resume(req: ResumeMatchRequest):
    """
    Module 2: Resume ATS Score + JD Match pipeline.
    1. Parses resume text + optional context into structured profile.
    2. Parses JD text into structured requirements.
    3. Runs transparent, deterministic ATS scorer.
    4. Runs LLM qualitative reviewer for STAR/XYZ feedback & narrative.
    """
    # 1. Parse Resume
    resume_profile = resume_parser_agent.parse(
        resume_text=req.resume_text,
        additional_context=req.additional_context
    )

    # 2. Parse JD
    jd_profile = jd_parser_agent.parse(
        jd_text=req.jd_text,
        company_name=req.company_name or "Target Company"
    )

    # 3. Deterministic ATS Scoring
    ats_result = ats_scorer_agent.calculate_score(resume_profile, jd_profile)

    # 4. LLM Qualitative Review
    review = qualitative_reviewer_agent.review(
        resume_profile=resume_profile,
        jd_requirements=jd_profile,
        ats_score_data=ats_result
    )

    return ResumeMatchResponse(
        ats_score=ats_result["overall_score"],
        ats_breakdown=ats_result["breakdown"],
        qualitative_review=review
    )

@router.post("/multi-match", response_model=MultiJDMatchResponse)
def multi_match_resume(req: MultiJDMatchRequest):
    """
    Module 2: Multi-JD Matching & Ranking.
    Ranks multiple company roles against a student's resume.
    """
    if not req.jds:
        raise HTTPException(status_code=400, detail="At least one JD is required for matching.")

    # 1. Parse Candidate Resume once
    resume_profile = resume_parser_agent.parse(
        resume_text=req.resume_text,
        additional_context=req.additional_context
    )

    ranking_items: List[JDRankingResult] = []
    details_map: Dict[str, ResumeMatchResponse] = {}

    for idx, jd in enumerate(req.jds):
        jd_profile = jd_parser_agent.parse(jd.jd_text, jd.company_name)
        ats_res = ats_scorer_agent.calculate_score(resume_profile, jd_profile)
        review = qualitative_reviewer_agent.review(resume_profile, jd_profile, ats_res, skip_llm=(idx > 0))

        score = ats_res["overall_score"]
        # Label fit tier
        if score >= 75:
            fit_label = "Best Match"
        elif score >= 55:
            fit_label = "High Potential"
        else:
            fit_label = "Stretch Role"

        ranking_items.append(JDRankingResult(
            id=jd.id,
            company_name=jd.company_name,
            role_title=jd.role_title,
            ats_score=score,
            fit_label=fit_label,
            matched_skills_count=len(ats_res["breakdown"].matched_skills),
            missing_skills_count=len(ats_res["breakdown"].missing_skills),
            matched_skills=ats_res["breakdown"].matched_skills,
            missing_skills=ats_res["breakdown"].missing_skills
        ))

        details_map[jd.id] = ResumeMatchResponse(
            ats_score=score,
            ats_breakdown=ats_res["breakdown"],
            qualitative_review=review
        )

    # Sort descending by ATS score
    ranking_items.sort(key=lambda x: x.ats_score, reverse=True)
    best = ranking_items[0]

    return MultiJDMatchResponse(
        ranked_jds=ranking_items,
        best_match_id=best.id,
        best_match_title=f"{best.role_title} @ {best.company_name}",
        details=details_map
    )
