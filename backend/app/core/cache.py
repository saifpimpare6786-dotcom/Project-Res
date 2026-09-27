import json
import sqlite3
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from app.core.config import settings

class TrendCache:
    """
    Local SQLite cache for GD Trend Cards with configurable TTL.
    Prevents repeated scraping of the same trending topics.
    """
    def __init__(self, ttl_hours: int = 12):
        self.ttl = timedelta(hours=ttl_hours)

    def get(self, topic: str) -> Optional[Dict[str, Any]]:
        clean_key = topic.strip().lower()
        try:
            conn = sqlite3.connect(settings.SQLITE_PATH)
            cursor = conn.cursor()
            cursor.execute(
                "SELECT card_json, created_at FROM trend_cache WHERE topic = ?",
                (clean_key,)
            )
            row = cursor.fetchone()
            conn.close()

            if row:
                card_json, created_at_str = row
                created_at = datetime.fromisoformat(created_at_str)
                if datetime.utcnow() - created_at < self.ttl:
                    data = json.loads(card_json)
                    data["cached"] = True
                    data["cache_age_minutes"] = int((datetime.utcnow() - created_at).total_seconds() / 60)
                    return data
        except Exception as e:
            print(f"[TrendCache] Read error: {e}")
        return None

    def set(self, topic: str, card_data: Dict[str, Any]):
        clean_key = topic.strip().lower()
        now_str = datetime.utcnow().isoformat()
        try:
            conn = sqlite3.connect(settings.SQLITE_PATH)
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO trend_cache (topic, card_json, created_at)
                VALUES (?, ?, ?)
                ON CONFLICT(topic) DO UPDATE SET
                    card_json=excluded.card_json,
                    created_at=excluded.created_at
                """,
                (clean_key, json.dumps(card_data), now_str)
            )
            conn.commit()
            conn.close()
        except Exception as e:
            print(f"[TrendCache] Write error: {e}")

trend_cache = TrendCache()
