import os
from pathlib import Path
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent.parent

class Settings(BaseSettings):
    APP_NAME: str = "PrepSphere AI"
    APP_VERSION: str = "0.2.0"  # Phase 4 - Institutional Features
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # Auth settings (Phase 4)
    SECRET_KEY: str = "prepsphere-local-dev-secret-change-in-production-phase4"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 8  # 8-hour sessions for placement day

    # Server settings
    HOST: str = "127.0.0.1"
    PORT: int = 8000
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
    ]

    # Ollama settings
    OLLAMA_HOST: str = os.getenv("OLLAMA_HOST", "http://127.0.0.1:11434")
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "gemma4:12b")
    OLLAMA_EMBED_MODEL: str = os.getenv("OLLAMA_EMBED_MODEL", "nomic-embed-text")

    # Local Storage paths
    DATA_DIR: Path = BASE_DIR / "data"
    SQLITE_PATH: Path = BASE_DIR / "data" / "platform.db"
    CHROMA_DIR: Path = BASE_DIR / "data" / "chroma"

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()

# Ensure data directories exist
settings.DATA_DIR.mkdir(parents=True, exist_ok=True)
settings.CHROMA_DIR.mkdir(parents=True, exist_ok=True)
