from fastapi import APIRouter
from app.schemas.api_models import CaseStudyQueryRequest, CaseStudyAnswerResponse
from app.agents.case_study_rag import case_study_rag_agent, OPEN_ACCESS_CASE_CORPUS

router = APIRouter(prefix="/api/case-study", tags=["Case Study RAG"])

@router.post("/solve", response_model=CaseStudyAnswerResponse)
def solve_case_study(req: CaseStudyQueryRequest):
    """
    Module 4: Case Study & Guesstimation RAG Engine.
    1. Vector similarity search against local ChromaDB with nomic-embed-text.
    2. Grounded Answer Generation with MECE frameworks and inline citations.
    """
    return case_study_rag_agent.solve_case(
        prompt=req.prompt,
        category=req.category or "all",
        framework=req.framework
    )

@router.get("/frameworks")
def list_available_frameworks():
    """
    Returns the indexed open-access consulting frameworks and documents.
    """
    return {
        "total_documents": len(OPEN_ACCESS_CASE_CORPUS),
        "frameworks": [
            {
                "id": c["id"],
                "doc_title": c["doc_title"],
                "source": c["source"],
                "page": c["page"],
                "category": c["category"],
                "topic_tags": c["topic_tags"].split(",")
            }
            for c in OPEN_ACCESS_CASE_CORPUS
        ]
    }
