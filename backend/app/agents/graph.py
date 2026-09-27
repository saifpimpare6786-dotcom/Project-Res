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
from app.agents.company_researcher import company_researcher_agent
from app.agents.case_study_rag import case_study_rag_agent

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
    valid_modules = ["trend_engine", "resume_match", "company_research", "case_study"]
    if module in valid_modules:
        return module
    return "trend_engine"

def trend_engine_node(state: PlatformState) -> Dict[str, Any]:
    """Module 1: Production GD & Interview Trend Engine Graph Node."""
    topic = state.get("raw_query") or "Technology & AI in India"
    scraped = scraper_hub.aggregate_sources(topic)
    verified = verifier_agent.verify_items(topic, scraped)
    card_data = summarizer_agent.generate_gd_card(topic, verified)
    
    return {
        "scraped_items": scraped,
        "verified_claims": verified,
        "final_output": card_data
    }

def resume_match_node(state: PlatformState) -> Dict[str, Any]:
    """Module 2: Resume ATS Score + JD Match Graph Node."""
    resume_text = state.get("resume_text") or ""
    jd_text = state.get("jd_text") or ""
    company = state.get("company_name") or "Target Company"
    
    resume_prof = resume_parser_agent.parse(resume_text)
    jd_prof = jd_parser_agent.parse(jd_text, company)
    ats_res = ats_scorer_agent.calculate_score(resume_prof, jd_prof)
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

def company_research_node(state: PlatformState) -> Dict[str, Any]:
    """Module 3: Company Research Briefing Graph Node."""
    company = state.get("company_name") or state.get("raw_query") or "Target Company"
    briefing = company_researcher_agent.generate_briefing(company, "Software Engineer")
    return {
        "company_name": company,
        "final_output": briefing
    }

def case_study_node(state: PlatformState) -> Dict[str, Any]:
    """Module 4: Case Study & Guesstimation RAG Graph Node."""
    prompt = state.get("raw_query") or "How to increase profitability for a retail store?"
    ans = case_study_rag_agent.solve_case(prompt)
    return {
        "retrieved_case_chunks": [c.model_dump() for c in ans.citations],
        "final_output": ans.model_dump()
    }

def create_platform_graph():
    """Builds and compiles the expanded LangGraph state graph for Phase 1 & 2."""
    builder = StateGraph(PlatformState)
    builder.add_node("router", router_node)
    builder.add_node("trend_engine", trend_engine_node)
    builder.add_node("resume_match", resume_match_node)
    builder.add_node("company_research", company_research_node)
    builder.add_node("case_study", case_study_node)

    builder.set_entry_point("router")
    builder.add_conditional_edges(
        "router",
        route_condition,
        {
            "trend_engine": "trend_engine",
            "resume_match": "resume_match",
            "company_research": "company_research",
            "case_study": "case_study",
        }
    )
    builder.add_edge("trend_engine", END)
    builder.add_edge("resume_match", END)
    builder.add_edge("company_research", END)
    builder.add_edge("case_study", END)

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
