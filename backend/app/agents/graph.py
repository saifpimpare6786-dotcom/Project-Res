import uuid
from typing import Dict, Any
from langgraph.graph import StateGraph, END
from app.schemas.state import PlatformState
from app.core.router import fast_router
from app.agents.scrapers import scraper_hub
from app.agents.verifier import verifier_agent
from app.agents.summarizer import summarizer_agent
from app.agents.resume_parser import resume_parser_agent
from app.agents.jd_parser import jd_parser_agent
from app.agents.ats_scorer import ats_scorer_agent
from app.agents.qualitative_reviewer import qualitative_reviewer_agent

def router_node(state: PlatformState) -> Dict[str, Any]:
    """
    Decides module or next edge using Laya fast decision router (~33ms).
    """
    query = state.get("raw_query") or ""
    current_module = state.get("module")
    if not current_module and query:
        current_module = fast_router.route_query(query)
    elif not current_module:
        current_module = "trend_engine"
    
    return {
        "module": current_module,
        "flags": state.get("flags", []) + [f"routed_to_{current_module}"]
    }

def route_condition(state: PlatformState) -> str:
    """Conditional edge returning the destination node based on module."""
    module = state.get("module", "trend_engine")
    if module in ["trend_engine", "resume_match"]:
        return module
    return "trend_engine"

def trend_engine_node(state: PlatformState) -> Dict[str, Any]:
    """
    Module 1: Production GD & Interview Trend Engine Graph Node.
    1. Scrapes legal sources (RSS, Reddit, YouTube).
    2. Verifies empirical stats & filters noise.
    3. Synthesizes 3-stance talking-point card with citations.
    """
    topic = state.get("raw_query") or "Technology & AI in India"
    
    # 1. Scrape
    scraped = scraper_hub.aggregate_sources(topic)
    
    # 2. Verify
    verified = verifier_agent.verify_items(topic, scraped)
    
    # 3. Summarize
    card_data = summarizer_agent.generate_gd_card(topic, verified)
    
    return {
        "scraped_items": scraped,
        "verified_claims": verified,
        "final_output": card_data
    }

def resume_match_node(state: PlatformState) -> Dict[str, Any]:
    """
    Module 2: Resume ATS Score + JD Match Graph Node.
    1. Parses resume text (+ additional context) into structured profile.
    2. Parses JD into structured requirements.
    3. Calculates deterministic, explainable ATS score.
    4. Generates qualitative LLM narrative review and STAR/XYZ phrasing.
    """
    resume_text = state.get("resume_text") or ""
    jd_text = state.get("jd_text") or ""
    company = state.get("company_name") or "Target Company"
    
    # 1. Parse Resume
    resume_prof = resume_parser_agent.parse(resume_text)
    
    # 2. Parse JD
    jd_prof = jd_parser_agent.parse(jd_text, company)
    
    # 3. ATS Score (Deterministic)
    ats_res = ats_scorer_agent.calculate_score(resume_prof, jd_prof)
    
    # 4. Qualitative Review
    review = qualitative_reviewer_agent.review(resume_prof, jd_prof, ats_res)
    
    final_payload = {
        "ats_score": ats_res["overall_score"],
        "breakdown": ats_res["breakdown"].model_dump(),
        "qualitative_review": review.model_dump(),
    }
    
    return {
        "resume_profile": resume_prof,
        "jd_requirements": jd_prof,
        "ats_score": ats_res["overall_score"],
        "llm_qualitative_review": review.model_dump(),
        "final_output": final_payload
    }

def create_platform_graph():
    """Builds and compiles the core LangGraph state graph for Phase 1."""
    builder = StateGraph(PlatformState)
    builder.add_node("router", router_node)
    builder.add_node("trend_engine", trend_engine_node)
    builder.add_node("resume_match", resume_match_node)

    builder.set_entry_point("router")
    builder.add_conditional_edges(
        "router",
        route_condition,
        {
            "trend_engine": "trend_engine",
            "resume_match": "resume_match",
        }
    )
    builder.add_edge("trend_engine", END)
    builder.add_edge("resume_match", END)

    return builder.compile()

platform_graph = create_platform_graph()

def init_empty_state(raw_query: str = None, module: str = "trend_engine") -> PlatformState:
    """Helper to create a fresh PlatformState object."""
    return PlatformState(
        session_id=str(uuid.uuid4()),
        student_id=None,
        module=module,
        raw_query=raw_query,
        resume_text=None,
        jd_text=None,
        company_name=None,
        scraped_items=[],
        verified_claims=[],
        retrieved_case_chunks=[],
        resume_profile=None,
        jd_requirements=None,
        ats_score=None,
        llm_qualitative_review=None,
        interview_history=[],
        flags=[],
        final_output=None,
    )
