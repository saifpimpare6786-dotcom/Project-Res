import json
from typing import Dict, Any, List
from app.core.llm import ollama_client
from app.schemas.api_models import QualitativeReview

class QualitativeReviewerAgent:
    """
    Module 2 LLM Qualitative Reviewer Agent.
    Evaluates candidate gaps, STAR/XYZ phrasing improvements, and interview narrative.
    """

    def review(
        self,
        resume_profile: Dict[str, Any],
        jd_requirements: Dict[str, Any],
        ats_score_data: Dict[str, Any],
        skip_llm: bool = False
    ) -> QualitativeReview:
        matched = ats_score_data["breakdown"].matched_skills
        missing = ats_score_data["breakdown"].missing_skills
        score = ats_score_data["overall_score"]
        company = jd_requirements.get("company_name", "Target Company")
        role = jd_requirements.get("role_title", "Software Engineer")

        if not skip_llm:
            prompt = f"""You are an elite Tech Career Coach & Former FAANG/Top Tier Indian Placement Interviewer.
Evaluate this candidate's resume for the role: "{role}" at "{company}".

Candidate Resume Summary:
- Skills detected: {', '.join(resume_profile.get('skills', [])[:12])}
- Action verbs present: {', '.join(resume_profile.get('action_verbs', [])[:6])}
- Metrics found: {', '.join(resume_profile.get('metrics', [])[:4])}
- ATS Overlap Score: {score}/100
- Matched JD Skills: {', '.join(matched)}
- Missing JD Skills: {', '.join(missing)}

Provide structured qualitative feedback in JSON format with exactly 4 keys:
1. "strengths": Array of 2-3 concise strengths demonstrating why they stand out.
2. "critical_gaps": Array of 2-3 critical missing elements that recruiters will flag.
3. "phrasing_improvements": Array of 2-3 Google XYZ format rewrites (Accomplished [X] as measured by [Y], by doing [Z]).
4. "narrative_fit": 2-3 sentences providing an executive positioning summary for their campus interview.

OUTPUT ONLY VALID JSON:
{{"strengths": [...], "critical_gaps": [...], "phrasing_improvements": [...], "narrative_fit": "..."}}"""

            try:
                raw_response = ollama_client.chat(
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.4,
                    options={"num_predict": 400}
                )

                clean_json = raw_response.strip()
                if clean_json.startswith("```json"):
                    clean_json = clean_json[7:]
                if clean_json.startswith("```"):
                    clean_json = clean_json[3:]
                if clean_json.endswith("```"):
                    clean_json = clean_json[:-3]

                parsed = json.loads(clean_json.strip())
                if "strengths" in parsed and "critical_gaps" in parsed:
                    return QualitativeReview(
                        strengths=parsed["strengths"],
                        critical_gaps=parsed["critical_gaps"],
                        phrasing_improvements=parsed.get("phrasing_improvements", []),
                        narrative_fit=parsed.get("narrative_fit", "")
                    )
            except Exception as e:
                print(f"[QualitativeReviewer] LLM generation error: {e}, using grounded synthesis")

        # Grounded fallback
        strengths = [
            f"Strong foundational alignment in core technologies: {', '.join(matched[:3])}." if matched else "Clear technical layout with identifiable project focus.",
            f"Proven demonstration of engineering execution with {len(resume_profile.get('metrics', []))} quantified metrics.",
            "Relevant degree curriculum match for technical interview rounds."
        ]

        critical_gaps = [
            f"High-priority missing skills for {role}: {', '.join(missing[:3])}." if missing else "No major technical keywords missing from the JD core requirements.",
            "Needs deeper architectural justification on distributed scalability and testing.",
            "Candidate projects should highlight live deployments or CI/CD pipelines."
        ]

        missing_example = missing[0] if missing else "system performance"
        phrasing = [
            f"Transform passive bullet points to Google XYZ formula: 'Architected and deployed full-stack modules improving response times by 35% through {matched[0] if matched else 'optimized queries'}'.",
            f"Explicitly quantify engineering scale: 'Engineered high-throughput REST APIs handling 5,000+ requests/sec using {matched[1] if len(matched) > 1 else 'FastAPI'}'.",
            f"Address missing requirement '{missing_example}': Frame related academic coursework or hobby projects to bridge the screening gap."
        ]

        narrative = (
            f"The candidate presents a competitive profile for {role} at {company} with an ATS score of {score}/100. "
            f"Their strongest leverage point is proficiency in {', '.join(matched[:2]) if matched else 'foundational CS'}. "
            f"To maximize placement conversion, they should emphasize quantifiable impact in project discussions and proactively address knowledge in {missing[0] if missing else 'system architecture'}."
        )

        return QualitativeReview(
            strengths=strengths,
            critical_gaps=critical_gaps,
            phrasing_improvements=phrasing,
            narrative_fit=narrative
        )

qualitative_reviewer_agent = QualitativeReviewerAgent()
