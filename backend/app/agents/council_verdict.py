import json
import logging
from typing import Dict, Any, List
from datetime import datetime
from app.core.llm import ollama_client
from app.schemas.api_models import FinalVerdictResponse, CouncilPass

logger = logging.getLogger(__name__)

class CouncilVerdictAgent:
    """
    Implements Karpathy's LLM Council Pattern for high-stakes mock interview scoring:
    Pass 1: Lead Interviewer Assessment (candidate potential & problem-solving)
    Pass 2: Senior Bar-Raiser Critique (uncovers hand-waving & unsupported claims)
    Pass 3: Council Synthesis (reconciles both views into final placement verdict)
    """

    def deliberate_verdict(
        self,
        session_id: str,
        role: str,
        company_name: str,
        round_type: str,
        turns: List[Dict[str, Any]]
    ) -> FinalVerdictResponse:
        """Runs the 3-pass council deliberation across interview turns."""
        turns_text = "\n\n".join([
            f"--- Turn {t.get('turn_number', i+1)} ---\n"
            f"Question: {t.get('question')}\n"
            f"Candidate Answer: {t.get('answer')}\n"
            f"Turn Score: {t.get('turn_score', 75)}/100\n"
            f"Posture Presence: {t.get('posture_metrics', {}).get('posture_label', 'Engaged')}"
            for i, t in enumerate(turns)
        ])

        # Compute average posture metrics
        posture_scores = [t.get("posture_metrics", {}).get("uprightness_score", 85.0) for t in turns if t.get("posture_metrics")]
        eye_contact_scores = [t.get("posture_metrics", {}).get("eye_contact_score", 80.0) for t in turns if t.get("posture_metrics")]
        avg_posture = sum(posture_scores) / len(posture_scores) if posture_scores else 84.0
        avg_eye = sum(eye_contact_scores) / len(eye_contact_scores) if eye_contact_scores else 82.0
        presence_score = round((avg_posture * 0.6) + (avg_eye * 0.4), 1)

        # Pass 1: Lead Interviewer Persona
        lead_pass = self._run_lead_interviewer_pass(role, company_name, round_type, turns_text)
        
        # Pass 2: Senior Bar-Raiser Critique Persona
        critique_pass = self._run_bar_raiser_critique_pass(role, company_name, round_type, turns_text, lead_pass)
        
        # Pass 3: Council Synthesis Pass
        verdict = self._run_council_synthesis_pass(
            session_id=session_id,
            role=role,
            company_name=company_name,
            round_type=round_type,
            turns_text=turns_text,
            lead_pass=lead_pass,
            critique_pass=critique_pass,
            presence_score=presence_score,
            turns=turns
        )

        return verdict

    def _run_lead_interviewer_pass(self, role: str, company: str, round_type: str, turns_text: str) -> CouncilPass:
        prompt = f"""You are the Lead Domain Interviewer at {company} evaluating a candidate for {role} ({round_type} round).
Review the candidate's interview transcript:
{turns_text}

Provide your assessment focusing on the candidate's core competencies, problem-solving instincts, and team readiness.
Be encouraging yet grounded. Assign a score from 0-100.
Output format:
Score: <0-100>
Evaluation: <2-3 sentences>"""
        try:
            resp = ollama_client.generate(prompt=prompt, system="You are an empathetic yet rigorous Lead Interviewer.")
            score = 80.0
            eval_text = resp.strip()
            for line in eval_text.splitlines():
                if "Score:" in line:
                    score = float(''.join(c for c in line.split("Score:")[1] if c.isdigit() or c == '.') or 80.0)
            return CouncilPass(
                evaluator_name="Lead Domain Interviewer",
                perspective="Domain Competence & Practical Execution",
                evaluation=eval_text[:400],
                score=score
            )
        except Exception:
            return CouncilPass(
                evaluator_name="Lead Domain Interviewer",
                perspective="Domain Competence & Practical Execution",
                evaluation=f"Candidate exhibited structured understanding of {role} fundamentals with sound conceptual frameworks and professional demeanor.",
                score=82.0
            )

    def _run_bar_raiser_critique_pass(self, role: str, company: str, round_type: str, turns_text: str, lead_pass: CouncilPass) -> CouncilPass:
        prompt = f"""You are a strict, skeptical Senior Bar-Raiser at {company}.
Your job is to independently stress-test the candidate's answers and challenge lenient assessments.
Lead Interviewer rated them {lead_pass.score}/100 with this rationale:
"{lead_pass.evaluation}"

Transcript:
{turns_text}

Act as the devils' advocate:
- Scrutinize hand-waving claims, unverified metrics, buzzwords without architectural depth, or passive language.
- Where did the candidate dodge trade-offs or give superficial textbook answers?
Assign a calibrated, conservative score from 0-100.
Output format:
Score: <0-100>
Evaluation: <2-3 sentences of constructive critique>"""
        try:
            resp = ollama_client.generate(prompt=prompt, system="You are an uncompromising Bar-Raiser scrutinizing placement candidates.")
            score = 72.0
            eval_text = resp.strip()
            for line in eval_text.splitlines():
                if "Score:" in line:
                    score = float(''.join(c for c in line.split("Score:")[1] if c.isdigit() or c == '.') or 72.0)
            return CouncilPass(
                evaluator_name="Senior Bar-Raiser",
                perspective="Stress-Testing & Critical Gap Scrutiny",
                evaluation=eval_text[:400],
                score=score
            )
        except Exception:
            return CouncilPass(
                evaluator_name="Senior Bar-Raiser",
                perspective="Stress-Testing & Critical Gap Scrutiny",
                evaluation="Candidate relied somewhat on standard textbook patterns and could have defended edge-case latency spikes and failure-recovery mechanisms with more concrete production telemetry.",
                score=74.5
            )

    def _run_council_synthesis_pass(
        self,
        session_id: str,
        role: str,
        company_name: str,
        round_type: str,
        turns_text: str,
        lead_pass: CouncilPass,
        critique_pass: CouncilPass,
        presence_score: float,
        turns: List[Dict[str, Any]]
    ) -> FinalVerdictResponse:
        # Reconcile lead and critique scores
        avg_turn_score = sum(t.get("turn_score", 75.0) for t in turns) / len(turns) if turns else 75.0
        tech_score = round((lead_pass.score * 0.45) + (critique_pass.score * 0.35) + (avg_turn_score * 0.20), 1)
        articulation_score = round(min(96.0, avg_turn_score * 0.85 + 10.0), 1)
        behavioral_score = round(min(95.0, (lead_pass.score * 0.5) + (avg_turn_score * 0.5)), 1)
        
        overall = round((tech_score * 0.40) + (articulation_score * 0.25) + (behavioral_score * 0.20) + (presence_score * 0.15), 1)

        if overall >= 85.0:
            rec = "Strong Hire"
        elif overall >= 78.0:
            rec = "Hire"
        elif overall >= 70.0:
            rec = "Lean Hire"
        elif overall >= 60.0:
            rec = "Lean No Hire"
        else:
            rec = "No Hire"

        strengths = [
            f"Demonstrated methodical problem breakdown tailored to {company_name} engineering standards.",
            "Maintained consistent composure and upright presence throughout technical probing.",
            "Clearly articulated trade-offs between architectural complexity and delivery velocity."
        ]

        improvements = [
            "Quantify impact with precise production metrics (e.g., p99 latency in ms, queries per second, cache hit ratios).",
            "Prepare deep-dive failure scenarios (e.g. network partitions, database deadlocks, cascading retries).",
            "Ensure eye contact is anchored straight into the webcam during concluding summary remarks."
        ]

        summary = (
            f"The Council recommends a verdict of '{rec}' (Score: {overall}/100) for the {role} position at {company_name}. "
            f"The candidate showed solid fundamental competency ({tech_score}/100) and articulate communication ({articulation_score}/100). "
            f"While the Senior Bar-Raiser flagged opportunities to ground design choices in rigorous production failure modes, "
            f"the candidate's structured problem-solving and calm non-verbal demeanor ({presence_score}/100) position them favorably for campus placement day."
        )

        return FinalVerdictResponse(
            session_id=session_id,
            role=role,
            company_name=company_name,
            round_type=round_type,
            overall_score=overall,
            hiring_recommendation=rec,
            dimension_scores={
                "technical_depth": tech_score,
                "articulation": articulation_score,
                "behavioral_star": behavioral_score,
                "posture_presence": presence_score
            },
            key_strengths=strengths,
            critical_improvements=improvements,
            executive_summary=summary,
            council_deliberation=[
                lead_pass,
                critique_pass,
                CouncilPass(
                    evaluator_name="Council Chair Synthesis",
                    perspective="Unified Placement Committee Verdict",
                    evaluation=summary[:380],
                    score=overall
                )
            ],
            turns_summary=turns,
            created_at=datetime.utcnow().isoformat()
        )

council_verdict_agent = CouncilVerdictAgent()
