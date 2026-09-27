from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class SystemHealthResponse(BaseModel):
    status: str
    app_version: str
    environment: str
    ollama_connected: bool
    available_models: List[str]
    chroma_collections: List[str]
    mediapipe_available: bool

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
    fit_label: str  # "Best Match", "High Potential", "Stretch Role"
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

class RouteClassificationRequest(BaseModel):
    query: str

class RouteClassificationResponse(BaseModel):
    query: str
    selected_module: str
