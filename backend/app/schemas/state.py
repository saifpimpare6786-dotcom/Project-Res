from typing import TypedDict, List, Dict, Any, Optional

class PlatformState(TypedDict):
    """
    Shared typed state for multi-agent graph orchestration.
    Direct implementation of Details.md Section 6.2 spec.
    """
    # session / identity
    session_id: str
    student_id: Optional[str]          # None in fully-local MVP if no auth yet
    module: str                         # "trend_engine" | "resume_match" | "company_research" |
                                        # "case_study" | "mock_interview" | "question_bank"

    # inputs
    raw_query: Optional[str]            # e.g. GD topic, or free-text ask
    resume_text: Optional[str]
    jd_text: Optional[str]
    company_name: Optional[str]

    # working memory (agents append here)
    scraped_items: List[Dict[str, Any]]         # [{source_url, title, snippet, retrieved_at}]
    verified_claims: List[Dict[str, Any]]       # [{claim, source_url, confidence}]
    retrieved_case_chunks: List[Dict[str, Any]] # [{chunk_text, doc_title, doc_source, page}]
    resume_profile: Optional[Dict[str, Any]]    # parsed structured resume
    jd_requirements: Optional[Dict[str, Any]]   # parsed structured JD
    ats_score: Optional[float]
    llm_qualitative_review: Optional[Dict[str, Any]]
    interview_history: List[Dict[str, Any]]     # [{question, answer_transcript, sub_scores}]
    flags: List[str]                            # anything an agent wants to surface to next node

    # output
    final_output: Optional[Dict[str, Any]]
