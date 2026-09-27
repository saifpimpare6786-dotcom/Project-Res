import json
import logging
from typing import Dict, Any, List, Optional
from app.core.llm import ollama_client
from app.schemas.api_models import TurnFeedback, PostureMetrics

logger = logging.getLogger(__name__)

class InterviewConductorAgent:
    """
    Drives the multi-turn mock interview:
    1. Generates JD/company-specific questions.
    2. Evaluates candidate answers per turn for technical depth and STAR structure.
    3. Dynamically branches into targeted follow-ups or next competency dimensions.
    """

    def generate_initial_question(
        self,
        role: str,
        company_name: str,
        round_type: str,
        jd_text: Optional[str] = None,
        interviewer_persona: str = "friendly_bar_raiser"
    ) -> Dict[str, str]:
        """Generates opening question tailored to role, company, and round type."""
        prompt = f"""You are an elite interviewer at {company_name} conducting a {round_type} interview for a {role} position.
Your persona is: {interviewer_persona}.
Target Job Description / Context:
{jd_text or f"Standard Tier-1 hiring expectations for {role} at {company_name}."}

Generate the opening question for Turn 1.
Rules:
1. Make it practical, realistic, and representative of real placement rounds at {company_name}.
2. Do not use generic filler ("Tell me about yourself"). Ask a substantive technical or behavioral scenario question that allows the candidate to demonstrate structured thinking.
3. Respond ONLY in valid JSON matching this exact structure:
{{
  "question": "The question to ask the candidate",
  "guidance": "1 sentence advice for candidate on what strong answers include (e.g. use STAR method, mention specific trade-offs)"
}}"""

        try:
            resp = ollama_client.generate(prompt=prompt, system="You are an expert technical and behavioral interviewer. Output strictly valid JSON.")
            clean = resp.strip()
            if "```json" in clean:
                clean = clean.split("```json")[1].split("```")[0].strip()
            elif "```" in clean:
                clean = clean.split("```")[1].split("```")[0].strip()
            parsed = json.loads(clean)
            if "question" in parsed:
                return {
                    "question": parsed["question"],
                    "guidance": parsed.get("guidance", "Focus on technical specificity, quantifiable outcomes, and clear trade-offs.")
                }
        except Exception as e:
            logger.warning(f"Ollama initial question generation failed or timed out: {e}")

        # Deterministic company & round tailored fallback
        return self._fallback_initial_question(role, company_name, round_type)

    def evaluate_turn_and_generate_next(
        self,
        role: str,
        company_name: str,
        round_type: str,
        turn_index: int,
        total_planned_turns: int,
        question: str,
        answer: str,
        posture_metrics: Optional[PostureMetrics] = None,
        history: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Evaluates current turn answer and determines next question or conclusion.
        """
        is_final = turn_index >= total_planned_turns
        
        posture_summary = ""
        if posture_metrics:
            posture_summary = f"Candidate posture score: {posture_metrics.uprightness_score}%, eye contact: {posture_metrics.eye_contact_score}%, presence label: {posture_metrics.posture_label}."

        prompt = f"""You are an interviewer evaluating a candidate for a {role} role at {company_name} ({round_type} round).
Current Turn: {turn_index} of {total_planned_turns}.
Question Asked:
"{question}"

Candidate's Answer:
"{answer}"

{posture_summary}

Tasks:
1. Score the answer from 0 to 100 based on technical depth, clarity, and structure.
2. Identify 2 specific strengths.
3. Identify 1-2 weaknesses, omissions, or hand-wavy claims.
4. Extract STAR alignment (Situation, Task, Action, Result) if applicable, or how well it was structured.
5. Provide a 1-2 sentence coaching tip.
6. {'Set "next_question": null since this is the final turn.' if is_final else f'Formulate the next follow-up question for Turn {turn_index + 1}. Either probe a detail the candidate mentioned, or shift to a complementary technical/behavioral dimension.'}

Output strictly valid JSON with this exact shape:
{{
  "turn_score": 82.5,
  "strengths": ["...", "..."],
  "weaknesses": ["..."],
  "star_alignment": {{
    "situation": "...",
    "task": "...",
    "action": "...",
    "result": "..."
  }},
  "coaching_tips": "...",
  "next_question": {"null" if is_final else '"..."'}
}}"""

        try:
            resp = ollama_client.generate(prompt=prompt, system="You are an expert interviewer evaluating a student candidate. Output strictly valid JSON.")
            clean = resp.strip()
            if "```json" in clean:
                clean = clean.split("```json")[1].split("```")[0].strip()
            elif "```" in clean:
                clean = clean.split("```")[1].split("```")[0].strip()
            parsed = json.loads(clean)
            if "turn_score" in parsed and "strengths" in parsed:
                return {
                    "feedback": TurnFeedback(
                        turn_score=float(parsed.get("turn_score", 78.0)),
                        strengths=parsed.get("strengths", ["Clear domain knowledge demonstrated"]),
                        weaknesses=parsed.get("weaknesses", ["Could add more quantifiable metrics"]),
                        star_alignment=parsed.get("star_alignment", {}),
                        coaching_tips=parsed.get("coaching_tips", "Structure your answer with clear milestones.")
                    ),
                    "next_question": None if is_final else parsed.get("next_question") or self._fallback_next_question(role, turn_index + 1),
                    "is_final_turn": is_final
                }
        except Exception as e:
            logger.warning(f"Ollama turn evaluation fallback used: {e}")

        # Grounded deterministic fallback evaluation
        return self._fallback_turn_evaluation(role, company_name, turn_index, total_planned_turns, question, answer)

    def _fallback_initial_question(self, role: str, company: str, round_type: str) -> Dict[str, str]:
        if "consult" in round_type.lower() or "case" in round_type.lower():
            return {
                "question": f"A major logistics client of {company} is seeing operating margins shrink from 14% to 8% despite growing revenues. How would you structure your diagnostic framework to isolate the root cause?",
                "guidance": "State clarifying questions, build a mutually exclusive and completely exhaustive (MECE) tree, and state your starting hypothesis."
            }
        elif "behavioral" in round_type.lower() or "hr" in round_type.lower():
            return {
                "question": f"Tell me about a high-pressure technical project where you faced tight deadlines or incomplete requirements. How did you prioritize deliverables and communicate with stakeholders?",
                "guidance": "Use the STAR framework (Situation, Task, Action, Result) and emphasize your individual ownership."
            }
        elif "system" in round_type.lower() or "architect" in round_type.lower():
            return {
                "question": f"Design a resilient, low-latency notification and webhook service capable of handling 50,000 spikes per second. What queuing, deduplication, and retry mechanisms would you implement?",
                "guidance": "Address message loss guarantees, idempotent consumer patterns, and dead-letter queues."
            }
        else: # Technical
            return {
                "question": f"Could you walk me through a complex technical challenge you solved recently? Specifically highlight an architectural trade-off you made between latency, memory, and code maintainability.",
                "guidance": "Explain the alternatives considered, the empirical trade-off rationale, and how you verified performance."
            }

    def _fallback_next_question(self, role: str, next_turn: int) -> str:
        questions = {
            2: f"How did you validate that your solution performed well under peak load or edge-case conditions? What specific metrics or monitoring telemetry did you inspect?",
            3: f"If you had to redesign this system from scratch with 10x higher traffic and strict 99.99% availability SLAs, what would break first and how would you redesign it?",
            4: f"Tell me about a situation where a teammate or tech lead strongly disagreed with your proposed technical approach. How did you resolve the conflict constructively?",
            5: f"What are your top reverse questions for our engineering leadership regarding team ownership, deployment cadence, and tech debt?"
        }
        return questions.get(next_turn, "What lessons from this project have most influenced how you write production code today?")

    def _fallback_turn_evaluation(
        self,
        role: str,
        company: str,
        turn_index: int,
        total_planned_turns: int,
        question: str,
        answer: str
    ) -> Dict[str, Any]:
        words = len(answer.split())
        has_metrics = any(char.isdigit() for char in answer)
        is_final = turn_index >= total_planned_turns
        
        score = 75.0
        if words > 50:
            score += 8.0
        if has_metrics:
            score += 7.0
        if words > 150:
            score += 4.0
        score = min(94.0, score)

        strengths = [
            "Good articulation of technical concepts and architectural components."
        ]
        if has_metrics:
            strengths.append("Incorporated concrete numerical metrics and impact estimates.")
        else:
            strengths.append("Demonstrated solid logical progression from problem to resolution.")

        weaknesses = []
        if not has_metrics:
            weaknesses.append("Did not include quantitative benchmarks (e.g. latency in ms, QPS, or percentage improvement).")
        if words < 60:
            weaknesses.append("Response was brief; consider expanding on trade-offs and edge-case handling.")
        else:
            weaknesses.append("Could further emphasize proactive failure-recovery mechanisms.")

        return {
            "feedback": TurnFeedback(
                turn_score=round(score, 1),
                strengths=strengths,
                weaknesses=weaknesses,
                star_alignment={
                    "situation": "Identified the operational or architectural context clearly.",
                    "task": "Outlined the primary technical goal and constraints.",
                    "action": "Explained hands-on technical steps taken.",
                    "result": "Summarized outcome with production verification."
                },
                coaching_tips="Anchor your claims with concrete numbers and state alternative trade-offs you evaluated before choosing your approach."
            ),
            "next_question": None if is_final else self._fallback_next_question(role, turn_index + 1),
            "is_final_turn": is_final
        }

interview_conductor = InterviewConductorAgent()
