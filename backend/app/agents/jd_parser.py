import re
from typing import Dict, Any, List
from app.agents.resume_parser import COMMON_SKILLS_ONTOLOGY

class JDParserAgent:
    """
    Extracts structured requirements from Job Description (JD) text:
    required skills, preferred skills, degree qualifications, and role specifics.
    """

    @staticmethod
    def extract_jd_skills(text: str) -> Dict[str, List[str]]:
        """Separates required core skills vs preferred/bonus skills."""
        text_lower = text.lower()
        all_detected = []
        for canonical, aliases in COMMON_SKILLS_ONTOLOGY.items():
            for alias in aliases:
                pattern = r"(?:\b|_)" + re.escape(alias) + r"(?:\b|_)"
                if re.search(pattern, text_lower):
                    if canonical not in all_detected:
                        all_detected.append(canonical)
                    break

        # Check for preferred / bonus sections
        bonus_headers = ["bonus", "nice to have", "good to have", "preferred", "plus"]
        preferred_skills = []
        required_skills = []

        lines = text.split("\n")
        in_bonus_section = False
        for line in lines:
            line_l = line.lower()
            if any(b in line_l for b in bonus_headers):
                in_bonus_section = True
            elif any(r in line_l for r in ["requirements", "required", "qualifications", "must have", "responsibilities"]):
                in_bonus_section = False

            for skill in all_detected:
                if skill in line_l:
                    if in_bonus_section:
                        if skill not in preferred_skills:
                            preferred_skills.append(skill)
                    else:
                        if skill not in required_skills:
                            required_skills.append(skill)

        # Fallback if no specific section headings were found
        if not required_skills:
            required_skills = all_detected
        else:
            # Add any remaining detected skills
            for s in all_detected:
                if s not in required_skills and s not in preferred_skills:
                    required_skills.append(s)

        return {
            "required_skills": required_skills,
            "preferred_skills": preferred_skills,
            "all_skills": all_detected
        }

    def parse(self, jd_text: str, company_name: str = "") -> Dict[str, Any]:
        """Parses JD into structured requirements."""
        text_lower = jd_text.lower()
        skills_info = self.extract_jd_skills(jd_text)

        # Education requirements
        requires_degree = any(d in text_lower for d in ["degree", "bachelor", "b.tech", "b.e", "btech", "master", "bs", "ms"])
        requires_cs = any(cs in text_lower for cs in ["computer science", "it", "information technology", "related field", "engineering"])

        # Experience requirements
        exp_matches = re.findall(r"(\d+)\+?\s*years?(?:\s+of)?\s+experience", text_lower)
        min_years = float(exp_matches[0]) if exp_matches else 0.0

        # Extract role title if available
        first_line = jd_text.strip().split("\n")[0][:80]
        role_title = first_line if "role:" in first_line.lower() or "title:" in first_line.lower() or "engineer" in first_line.lower() else "Target Engineering Role"
        role_title = re.sub(r"^(role|title|position):\s*", "", role_title, flags=re.IGNORECASE).strip()

        return {
            "raw_text": jd_text,
            "company_name": company_name or "Target Company",
            "role_title": role_title,
            "required_skills": skills_info["required_skills"],
            "preferred_skills": skills_info["preferred_skills"],
            "all_skills": skills_info["all_skills"],
            "requires_degree": requires_degree,
            "requires_cs": requires_cs,
            "min_experience_years": min_years,
        }

jd_parser_agent = JDParserAgent()
