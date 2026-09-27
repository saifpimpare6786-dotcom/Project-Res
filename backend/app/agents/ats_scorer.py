from typing import Dict, Any, List
from app.schemas.api_models import ATSScoreBreakdown

class ATSScorerAgent:
    """
    Module 2 Deterministic ATS Scoring Engine.
    Strictly rule-based, transparent, and explainable algorithm.
    No LLM hallucination in numeric grading.
    """

    def calculate_score(
        self,
        resume_profile: Dict[str, Any],
        jd_requirements: Dict[str, Any]
    ) -> Dict[str, Any]:
        resume_skills = set(resume_profile.get("skills", []))
        req_skills = set(jd_requirements.get("required_skills", []))
        pref_skills = set(jd_requirements.get("preferred_skills", []))
        all_jd_skills = req_skills.union(pref_skills)

        # 1. Skill Matching
        if not all_jd_skills:
            matched_skills = list(resume_skills)
            missing_skills = []
            skill_score = 55.0
        else:
            matched_skills = [s for s in all_jd_skills if s in resume_skills]
            missing_skills = [s for s in all_jd_skills if s not in resume_skills]

            matched_req = [s for s in req_skills if s in resume_skills]
            req_ratio = len(matched_req) / max(len(req_skills), 1)

            matched_pref = [s for s in pref_skills if s in resume_skills]
            pref_ratio = len(matched_pref) / max(len(pref_skills), 1) if pref_skills else 1.0

            # 45 pts for required skills + 15 pts for preferred skills
            skill_score = (req_ratio * 45.0) + (pref_ratio * 15.0)

        # 2. Education Match (15 pts max)
        edu_score = 0.0
        if resume_profile.get("has_degree", False):
            edu_score += 10.0
        if resume_profile.get("has_cs_major", False):
            edu_score += 5.0
        elif not jd_requirements.get("requires_cs", False) and resume_profile.get("has_degree", False):
            edu_score += 5.0

        # 3. Action Verbs & Quantified Metrics (15 pts max)
        metrics_count = len(resume_profile.get("metrics", []))
        verbs_count = len(resume_profile.get("action_verbs", []))
        impact_score = min(8.0, metrics_count * 2.0) + min(7.0, verbs_count * 1.75)

        # 4. Keyword Density & Formatting (10 pts max)
        word_count = resume_profile.get("word_count", 0)
        # Optimal resume word count is 200 - 800 words for campus/freshers
        if 150 <= word_count <= 900:
            format_score = 6.0
        else:
            format_score = 3.0

        density_ratio = len(matched_skills) / max(len(resume_skills), 1) if resume_skills else 0.0
        format_score += min(4.0, density_ratio * 4.0)

        overall = round(min(100.0, max(15.0, skill_score + edu_score + impact_score + format_score)), 1)

        breakdown = ATSScoreBreakdown(
            overall_score=overall,
            matched_skills=matched_skills,
            missing_skills=missing_skills,
            keyword_density=round(density_ratio, 2),
            education_match=resume_profile.get("has_degree", False),
            experience_years_match=resume_profile.get("estimated_years_experience", 0) >= jd_requirements.get("min_experience_years", 0)
        )

        return {
            "overall_score": overall,
            "skill_score": round(skill_score, 1),
            "education_score": round(edu_score, 1),
            "impact_score": round(impact_score, 1),
            "format_score": round(format_score, 1),
            "breakdown": breakdown
        }

ats_scorer_agent = ATSScorerAgent()
