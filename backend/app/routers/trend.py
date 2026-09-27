from fastapi import APIRouter
from app.schemas.api_models import TrendRequest, TrendResponse, StanceItem
from app.agents.scrapers import scraper_hub
from app.agents.verifier import verifier_agent
from app.agents.summarizer import summarizer_agent
from app.core.cache import trend_cache
from datetime import datetime

router = APIRouter(prefix="/api/trend", tags=["Trend Engine"])

@router.post("/generate", response_model=TrendResponse)
def generate_trend_card(req: TrendRequest):
    """
    Module 1: Production GD & Interview Trend Engine.
    1. Checks local cache unless refresh=True.
    2. Runs legal scraper hub (RSS, Reddit, YouTube).
    3. Verifies claims and empirical stats.
    4. Generates 3-stance card with Gemma 4 12B.
    5. Caches and returns final card.
    """
    topic = req.topic.strip()

    # Step 1: Check Cache
    if not req.refresh:
        cached_result = trend_cache.get(topic)
        if cached_result:
            stances = [StanceItem(**s) for s in cached_result.get("stances", [])]
            return TrendResponse(
                topic=topic,
                stances=stances,
                generated_at=cached_result.get("generated_at", datetime.utcnow().isoformat()),
                cached=True
            )

    # Step 2: Scrape Legal Data Sources
    scraped_items = scraper_hub.aggregate_sources(topic)

    # Step 3: Verifier Agent (filters noise & extracts metrics)
    verified_claims = verifier_agent.verify_items(topic, scraped_items)

    # Step 4: Summarizer Agent (Gemma 4 12B synthesis)
    summary_data = summarizer_agent.generate_gd_card(topic, verified_claims)

    stances = [StanceItem(**s) for s in summary_data.get("stances", [])]
    now_iso = datetime.utcnow().isoformat()

    response_payload = {
        "topic": topic,
        "stances": [s.model_dump() for s in stances],
        "generated_at": now_iso,
        "cached": False
    }

    # Step 5: Save to local cache
    trend_cache.set(topic, response_payload)

    return TrendResponse(
        topic=topic,
        stances=stances,
        generated_at=now_iso,
        cached=False
    )
