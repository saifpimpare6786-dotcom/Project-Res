from typing import Dict, Any, Optional
import os

class FastRouter:
    """
    Wrapper for Laya decision/routing model.
    Used for typed routing, relevance classification, and priority scoring (~33ms latency).
    """
    def __init__(self):
        self.laya_agent = None
        self._initialized = False

    def load(self):
        if self._initialized:
            return
        try:
            import laya
            # Load English checkpoint if possible
            self.laya_agent = laya.load("convaiinnovations/laya")
            self._initialized = True
        except Exception as e:
            print(f"[Router] Note: Laya fast model running in lightweight rule-based fallback mode: {e}")
            self.laya_agent = None
            self._initialized = True

    def route_query(self, query: str) -> str:
        """
        Classify incoming query to one of:
        - trend_engine
        - resume_match
        - company_research
        - case_study
        - mock_interview
        - question_bank
        """
        if self.laya_agent:
            try:
                res = self.laya_agent.predict(
                    state={"body": query},
                    questions={
                        "module": {
                            "type": "choice",
                            "instructions": "Which module should handle this user request?",
                            "criteria": {
                                "trend_engine": "general GD topics, current affairs, trending debate topics",
                                "resume_match": "resume review, ATS score, job description matching",
                                "company_research": "company news, culture, briefings, interview background",
                                "case_study": "consulting cases, market entry, guesstimates",
                                "mock_interview": "practice interview session, mock round",
                                "question_bank": "historical interview questions asked by companies",
                            }
                        }
                    }
                )
                module_choice = res.get("module", {}).get("choice")
                if module_choice:
                    return module_choice
            except Exception as e:
                print(f"[Router] Laya evaluation error: {e}")

        # Deterministic heuristic fallback
        q = query.lower()
        if any(w in q for w in ["resume", "cv", "ats", "score my resume", "jd match"]):
            return "resume_match"
        if any(w in q for w in ["mock", "interview practice", "camera", "gesture", "pose"]):
            return "mock_interview"
        if any(w in q for w in ["case study", "guesstimate", "market size", "market entry"]):
            return "case_study"
        if any(w in q for w in ["past questions", "question bank", "what did they ask", "historical"]):
            return "question_bank"
        if any(w in q for w in ["company", "about google", "about infosys", "about tcs", "funding", "newsroom"]):
            return "company_research"
        return "trend_engine"

    def is_claim_relevant(self, claim: str, topic: str) -> bool:
        """
        Classifies if a scraped claim or snippet is relevant to the topic.
        """
        if self.laya_agent:
            try:
                res = self.laya_agent.predict(
                    state={"claim": claim, "topic": topic},
                    questions={
                        "is_relevant": {
                            "type": "noul",
                            "instructions": f"Is this content relevant to '{topic}' for an Indian GD placement round?"
                        }
                    }
                )
                return res.get("is_relevant", {}).get("answer") is True
            except Exception:
                pass
        return len(claim.strip()) > 30

fast_router = FastRouter()
