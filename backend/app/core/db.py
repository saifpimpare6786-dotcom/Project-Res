import sqlite3
import chromadb
from pathlib import Path
from app.core.config import settings

def init_sqlite():
    """Initialize local SQLite tables for Phase 1 persistence."""
    conn = sqlite3.connect(settings.SQLITE_PATH)
    cursor = conn.cursor()

    # Session storage
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sessions (
        session_id TEXT PRIMARY KEY,
        module TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        state_json TEXT
    )
    """)

    # Topic trend cache (TTL caching)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS trend_cache (
        topic TEXT PRIMARY KEY,
        card_json TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # Crowdsourced Question Bank (Module 5)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS question_bank (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_name TEXT NOT NULL,
        role TEXT,
        question_text TEXT NOT NULL,
        round_type TEXT,
        reported_year INTEGER,
        upvotes INTEGER DEFAULT 0,
        tags TEXT
    )
    """)

    conn.commit()
    conn.close()

def get_chroma_client():
    """Get persistent Chroma DB client."""
    return chromadb.PersistentClient(path=str(settings.CHROMA_DIR))

# Run SQLite setup on import
init_sqlite()
chroma_client = get_chroma_client()
case_studies_col = chroma_client.get_or_create_collection("case_studies")
scraped_cache_col = chroma_client.get_or_create_collection("scraped_cache")
