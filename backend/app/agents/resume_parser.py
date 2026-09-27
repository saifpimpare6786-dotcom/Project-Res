import io
import re
from typing import Dict, Any, List, Optional
from pypdf import PdfReader

# Comprehensive tech & professional skill ontology for placement & ATS matching
COMMON_SKILLS_ONTOLOGY = {
    # Languages
    "python": ["python", "py", "django", "fastapi", "flask"],
    "javascript": ["javascript", "js", "ecmascript"],
    "typescript": ["typescript", "ts"],
    "java": ["java", "spring", "springboot", "spring boot"],
    "c++": ["c++", "cpp"],
    "c#": ["c#", ".net", "dotnet"],
    "golang": ["go", "golang"],
    "sql": ["sql", "mysql", "postgresql", "postgres", "sqlite", "oracle"],
    # Frontend
    "react": ["react", "react.js", "reactjs"],
    "next.js": ["next.js", "nextjs", "next"],
    "vue": ["vue", "vue.js", "vuejs"],
    "angular": ["angular"],
    "html": ["html", "html5"],
    "css": ["css", "css3", "tailwind", "sass", "bootstrap"],
    # Backend & Cloud
    "fastapi": ["fastapi"],
    "node.js": ["node.js", "nodejs", "node", "express"],
    "docker": ["docker", "container", "containers"],
    "kubernetes": ["kubernetes", "k8s"],
    "aws": ["aws", "amazon web services", "ec2", "s3", "lambda"],
    "azure": ["azure"],
    "gcp": ["gcp", "google cloud"],
    "git": ["git", "github", "gitlab"],
    "rest api": ["rest", "restful", "rest api", "apis"],
    "graphql": ["graphql"],
    "ci/cd": ["ci/cd", "ci-cd", "jenkins", "github actions"],
    # Data & AI
    "machine learning": ["machine learning", "ml", "deep learning", "ai", "artificial intelligence"],
    "data structures": ["data structures", "dsa", "algorithms"],
    "system design": ["system design", "distributed systems", "microservices"],
    "pandas": ["pandas", "numpy", "scikit-learn"],
    "pytorch": ["pytorch", "tensorflow"],
    "nlp": ["nlp", "natural language processing", "llm", "transformers"],
}

class ResumeParserAgent:
    """
    Parses unstructured resumes (PDF or text) into a structured profile:
    contact info, education, detected skills, experience, projects, and metrics.
    """

    @staticmethod
    def extract_text_from_pdf(pdf_bytes: bytes) -> str:
        """Extracts plain text from raw PDF file bytes."""
        try:
            reader = PdfReader(io.BytesIO(pdf_bytes))
            text_pages = []
            for i, page in enumerate(reader.pages):
                extracted = page.extract_text()
                if extracted:
                    text_pages.append(extracted)
            return "\n\n".join(text_pages).strip()
        except Exception as e:
            print(f"[ResumeParser] PDF extraction error: {e}")
            return ""

    @staticmethod
    def extract_skills(text: str) -> List[str]:
        """Extracts skills based on canonical ontology matching."""
        text_lower = text.lower()
        detected = []
        for canonical, aliases in COMMON_SKILLS_ONTOLOGY.items():
            for alias in aliases:
                # Word boundary match to prevent partial substring matches
                pattern = r"(?:\b|_)" + re.escape(alias) + r"(?:\b|_)"
                if re.search(pattern, text_lower):
                    if canonical not in detected:
                        detected.append(canonical)
                    break
        return detected

    @staticmethod
    def extract_action_verbs(text: str) -> List[str]:
        """Detects strong engineering action verbs."""
        strong_verbs = [
            "engineered", "architected", "developed", "built", "implemented",
            "optimized", "spearheaded", "designed", "accelerated", "deployed",
            "automated", "scaled", "reduced", "increased", "orchestrated"
        ]
        text_lower = text.lower()
        found = [v for v in strong_verbs if re.search(r"\b" + v + r"\b", text_lower)]
        return found

    @staticmethod
    def extract_metrics(text: str) -> List[str]:
        """Extracts quantifiable outcomes, stats, and percentages."""
        patterns = [
            r"\b\d+(?:\.\d+)?%\b",
            r"\b\d+\s*(?:ms|seconds|minutes|hours)\b",
            r"\b\d+\s*(?:k|m|million|billion|thousand|users|queries|requests|stars|qps)\b",
            r"(?:reduced|increased|boosted|improved)\s+by\s+\d+%",
        ]
        metrics = []
        for pat in patterns:
            matches = re.findall(pat, text, flags=re.IGNORECASE)
            for m in matches:
                if m not in metrics:
                    metrics.append(m)
        return metrics

    def parse(self, resume_text: str, additional_context: Optional[str] = None) -> Dict[str, Any]:
        """
        Parses resume text + optional candidate context into structured profile.
        """
        combined_text = resume_text
        if additional_context and additional_context.strip():
            combined_text += f"\n\nAdditional Candidate Context & Projects:\n{additional_context.strip()}"

        skills = self.extract_skills(combined_text)
        action_verbs = self.extract_action_verbs(combined_text)
        metrics = self.extract_metrics(combined_text)

        text_lower = combined_text.lower()
        has_degree = any(d in text_lower for d in ["b.tech", "b.e", "bachelor", "btech", "m.tech", "master", "degree", "bs", "ms"])
        has_cs = any(cs in text_lower for cs in ["computer science", "information technology", "software engineering", "cse", "it"])

        # Estimate experience
        exp_matches = re.findall(r"(\d+)\+?\s*years?(?:\s+of)?\s+experience", text_lower)
        exp_years = float(exp_matches[0]) if exp_matches else (1.0 if "experience" in text_lower or "intern" in text_lower else 0.0)

        return {
            "raw_text": combined_text,
            "skills": skills,
            "action_verbs": action_verbs,
            "metrics": metrics,
            "has_degree": has_degree,
            "has_cs_major": has_cs,
            "estimated_years_experience": exp_years,
            "word_count": len(combined_text.split()),
            "additional_context_provided": bool(additional_context and additional_context.strip())
        }

resume_parser_agent = ResumeParserAgent()
