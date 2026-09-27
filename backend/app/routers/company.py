from fastapi import APIRouter
from datetime import datetime
from app.schemas.api_models import (
    CompanyBriefingRequest, CompanyBriefingResponse,
    MetricItem, ReverseQuestionItem
)
from app.agents.company_researcher import company_researcher_agent
from app.core.cache import company_cache

router = APIRouter(prefix="/api/company", tags=["Company Research"])

@router.post("/briefing", response_model=CompanyBriefingResponse)
def get_company_briefing(req: CompanyBriefingRequest):
    """
    Module 3: Company Research Briefing Engine.
    1. Checks local SQLite company_cache with 24hr TTL unless refresh=True.
    2. Runs legal newsroom scraper & verifier.
    3. Synthesizes 4-pillar interview briefing + reverse questions with Gemma 4 12B.
    4. Caches and returns final dossier.
    """
    clean_name = req.company_name.strip()
    role = req.role or "Software Engineer"

    # Step 1: Check cache
    if not req.refresh:
        cached = company_cache.get(clean_name)
        if cached:
            return CompanyBriefingResponse(
                company_name=clean_name,
                role=cached.get("role", role),
                headline_summary=cached.get("headline_summary", ""),
                recent_growth_and_contracts=cached.get("recent_growth_and_contracts", []),
                tech_stack_priorities=cached.get("tech_stack_priorities", []),
                culture_and_values=cached.get("culture_and_values", []),
                metrics_and_numbers=[MetricItem(**m) for m in cached.get("metrics_and_numbers", [])],
                smart_interview_questions=[ReverseQuestionItem(**q) for q in cached.get("smart_interview_questions", [])],
                verified_sources=cached.get("verified_sources", []),
                generated_at=cached.get("generated_at", datetime.utcnow().isoformat()),
                cached=True
            )

    # Step 2: Generate fresh briefing
    briefing_data = company_researcher_agent.generate_briefing(clean_name, role)
    now_iso = datetime.utcnow().isoformat()

    response_payload = {
        "company_name": clean_name,
        "role": role,
        "headline_summary": briefing_data["headline_summary"],
        "recent_growth_and_contracts": briefing_data["recent_growth_and_contracts"],
        "tech_stack_priorities": briefing_data["tech_stack_priorities"],
        "culture_and_values": briefing_data["culture_and_values"],
        "metrics_and_numbers": briefing_data["metrics_and_numbers"],
        "smart_interview_questions": briefing_data["smart_interview_questions"],
        "verified_sources": briefing_data["verified_sources"],
        "generated_at": now_iso,
        "cached": False
    }

    # Step 3: Cache result
    company_cache.set(clean_name, response_payload)

    return CompanyBriefingResponse(
        company_name=clean_name,
        role=role,
        headline_summary=briefing_data["headline_summary"],
        recent_growth_and_contracts=briefing_data["recent_growth_and_contracts"],
        tech_stack_priorities=briefing_data["tech_stack_priorities"],
        culture_and_values=briefing_data["culture_and_values"],
        metrics_and_numbers=[MetricItem(**m) for m in briefing_data["metrics_and_numbers"]],
        smart_interview_questions=[ReverseQuestionItem(**q) for q in briefing_data["smart_interview_questions"]],
        verified_sources=briefing_data["verified_sources"],
        generated_at=now_iso,
        cached=False
    )
