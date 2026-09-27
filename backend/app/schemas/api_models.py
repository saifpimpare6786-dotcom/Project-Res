from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

# System Models
class SystemHealthResponse(BaseModel):
    status: str
    app_version: str
    environment: str
    ollama_connected: bool
    available_models: List[str]
    chroma_collections: List[str]
    mediapipe_available: bool

# Module 1 Models (GD Trend Engine)
class TrendRequest(BaseModel):
    topic: str = Field(..., description="GD topic or current affairs question")
    refresh: bool = Field(False, description="Bypass local cache if True")

class StanceItem(BaseModel):
    position: str
    arguments: List[str] = []
    example: str
    stat: str
    source_url: str

class TrendResponse(BaseModel):
    topic: str
    stances: List[StanceItem]
    generated_at: str
    cached: bool = False

# Module 2 Models (Resume ATS & Multi-JD)
class ResumeMatchRequest(BaseModel):
    resume_text: str = Field(..., description="Raw text of candidate resume")
    jd_text: str = Field(..., description="Job Description text")
    company_name: Optional[str] = None
    additional_context: Optional[str] = Field(None, description="Extra context / graphify memory")

class ATSScoreBreakdown(BaseModel):
    overall_score: float
    matched_skills: List[str]
    missing_skills: List[str]
    keyword_density: float
    education_match: bool
    experience_years_match: bool

class QualitativeReview(BaseModel):
    strengths: List[str]
    critical_gaps: List[str]
    phrasing_improvements: List[str]
    narrative_fit: str

class ResumeMatchResponse(BaseModel):
    ats_score: float
    ats_breakdown: ATSScoreBreakdown
    qualitative_review: QualitativeReview
    ranked_jds: Optional[List[Dict[str, Any]]] = None

class SingleJD(BaseModel):
    id: str = Field(..., description="Unique identifier for JD")
    company_name: str
    role_title: str
    jd_text: str

class MultiJDMatchRequest(BaseModel):
    resume_text: str = Field(..., description="Raw text of candidate resume")
    jds: List[SingleJD] = Field(..., description="List of target JDs to rank against")
    additional_context: Optional[str] = Field(None, description="Extra candidate context")

class JDRankingResult(BaseModel):
    id: str
    company_name: str
    role_title: str
    ats_score: float
    fit_label: str
    matched_skills_count: int
    missing_skills_count: int
    matched_skills: List[str]
    missing_skills: List[str]

class MultiJDMatchResponse(BaseModel):
    ranked_jds: List[JDRankingResult]
    best_match_id: str
    best_match_title: str
    details: Dict[str, ResumeMatchResponse]

class PDFUploadResponse(BaseModel):
    filename: str
    extracted_text: str
    character_count: int
    word_count: int

# Module 3 Models (Company Research Briefing)
class CompanyBriefingRequest(BaseModel):
    company_name: str = Field(..., description="Target company name")
    role: Optional[str] = Field("Software Engineer", description="Target role")
    refresh: bool = Field(False, description="Bypass local cache")

class MetricItem(BaseModel):
    metric: str
    context: str

class ReverseQuestionItem(BaseModel):
    question: str
    rationale: str

class CompanyBriefingResponse(BaseModel):
    company_name: str
    role: str
    headline_summary: str
    recent_growth_and_contracts: List[str]
    tech_stack_priorities: List[str]
    culture_and_values: List[str]
    metrics_and_numbers: List[MetricItem]
    smart_interview_questions: List[ReverseQuestionItem]
    verified_sources: List[str]
    generated_at: str
    cached: bool = False

# Module 4 Models (Case Study & Guesstimation RAG)
class CaseStudyQueryRequest(BaseModel):
    prompt: str = Field(..., description="Case study problem or guesstimate question")
    category: Optional[str] = Field("all", description="'case_study', 'guesstimate', or 'all'")
    framework: Optional[str] = Field(None, description="Preferred framework (e.g., profitability, market_entry)")

class RetrievedChunk(BaseModel):
    doc_title: str
    source: str
    page: str
    category: str
    snippet: str

class CaseStudyAnswerResponse(BaseModel):
    prompt: str
    category: str
    framework_applied: str
    solution_steps: List[Dict[str, Any]]
    final_takeaway: str
    citations: List[RetrievedChunk]
    generated_at: str

# Module 5 Models (Company Historical Question Bank)
class QuestionBankItem(BaseModel):
    id: int
    company_name: str
    role: str
    question_text: str
    round_type: str
    reported_year: int
    upvotes: int
    tags: List[str]

class QuestionSubmissionRequest(BaseModel):
    company_name: str
    role: Optional[str] = "Software Engineer"
    question_text: str
    round_type: Optional[str] = "PI"
    reported_year: Optional[int] = 2025
    tags: Optional[List[str]] = []

class QuestionBankResponse(BaseModel):
    total_count: int
    questions: List[QuestionBankItem]

class RouteClassificationRequest(BaseModel):
    query: str

class RouteClassificationResponse(BaseModel):
    query: str
    selected_module: str
