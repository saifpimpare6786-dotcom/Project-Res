from fastapi import APIRouter
from app.schemas.api_models import SystemHealthResponse, RouteClassificationRequest, RouteClassificationResponse
from app.core.config import settings
from app.core.llm import ollama_client
from app.core.db import chroma_client
from app.core.router import fast_router

router = APIRouter(prefix="/api", tags=["System"])

@router.get("/health", response_model=SystemHealthResponse)
def health_check():
    """Returns local system diagnostics across Ollama, Chroma, MediaPipe, etc."""
    ollama_ok = ollama_client.is_available()
    models = ollama_client.list_models() if ollama_ok else []
    
    # Check chroma collections
    collections = []
    try:
        cols = chroma_client.list_collections()
        collections = [c.name for c in cols]
    except Exception:
        collections = ["error_reading_chroma"]

    mediapipe_ok = False
    try:
        import mediapipe
        mediapipe_ok = True
    except ImportError:
        mediapipe_ok = False

    return SystemHealthResponse(
        status="healthy" if ollama_ok else "degraded",
        app_version=settings.APP_VERSION,
        environment=settings.ENVIRONMENT,
        ollama_connected=ollama_ok,
        available_models=models,
        chroma_collections=collections,
        mediapipe_available=mediapipe_ok,
    )

@router.post("/route", response_model=RouteClassificationResponse)
def classify_route(req: RouteClassificationRequest):
    """Test fast Laya router categorization."""
    selected = fast_router.route_query(req.query)
    return RouteClassificationResponse(
        query=req.query,
        selected_module=selected
    )
