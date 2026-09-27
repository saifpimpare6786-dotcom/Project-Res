# GD & Placement Prep Platform — Full Product & Technical Spec

**Status:** Pre-build spec, v1.0
**Purpose of this document:** This file is meant to be handed directly to a coding agent (Google Antigravity, or any SKILL.md-compatible agent) as the single source of truth for what to build, how the pieces fit together, and which tools to use. Read this entire file before writing any code. Where a decision is marked `[ASSUMPTION]`, treat it as a reasonable default but flag it back to the human if it materially changes scope.

---

## Table of Contents

1. Problem & Vision
2. Users & Core Use Cases
3. Design Principles
4. System Architecture Overview
5. Tech Stack Reference (with repo links)
6. Multi-Agent Orchestration
7. Module Specifications (8 modules)
8. Data & Privacy Architecture
9. Frontend Architecture
10. Security, Legality & Quality
11. Build Roadmap (phased)
12. Open Assumptions Log
13. Appendix: Full Repo/Tool Reference Table

---

## 1. Problem & Vision

Indian college students preparing for placement-season Group Discussions (GDs) and Personal Interviews (PIs) face a specific, recurring problem: **they get very little lead time** (often hours) before a GD/PI round, and they lack a fast way to gather (a) current, citable real-world data points relevant to the topic/company, and (b) structured practice with feedback.

**Vision:** A single local-first platform that:
- Surfaces current, citable talking points for GD topics and JD-specific company context, sourced legally and quickly.
- Scores and improves a student's resume against a specific JD (ATS-style + LLM-qualitative).
- Runs realistic, private mock interviews with posture/confidence/articulation feedback.
- Gives placement cells a clean, low-friction way to collect and reuse resumes without students editing on shared Google Docs.
- Does all of this on free/open-source tooling, running primarily on the student's own machine via a local LLM (Ollama), so it stays free to run at scale and keeps sensitive session data private.

## 2. Users & Core Use Cases

**Primary user: Student preparing for placements.**
- "I have a GD in 2 hours on `<topic>` — give me structured, citable talking points."
- "Here's my resume and this JD — how well do I match, what's missing, how do I fix it?"
- "Give me a mock interview for this JD, on my camera/mic, and tell me how I did — privately."
- "Give me relevant case studies / guesstimation practice related to this JD's domain."
- "What questions has this company historically asked?"

**Secondary user: Placement cell / Training & Placement Officer (TPO).**
- "Show me anonymized aggregate readiness stats across my batch."
- "Let me pull a shortlisted student's finalized resume directly, without emailing back and forth."
- "Post multiple JDs for one company visit and let students self-match."

## 3. Design Principles

These principles should govern every implementation decision, not just be read once:

1. **Local-first for anything sensitive.** Camera/mic/video/audio from mock interviews, and raw interview transcripts, are processed and stored **only on the student's device**. They are never uploaded. Only small, structured, already-anonymized outputs (a score, a rank, a tag) sync to any shared backend.
2. **Multi-agent, not single-agent.** No single "do everything" prompt. Each capability is a distinct agent node with a narrow job, coordinated through shared state (see Section 6).
3. **Grounded outputs over free generation.** Anywhere the platform gives the student a "fact" (case study detail, company news, stat), it must be retrieved from an actual source document/article and cited — not generated from the model's parametric memory. This is non-negotiable for the Case Study and Company Research modules.
4. **Free/open-source-first tool selection.** Every tool in this stack (Section 5) is free at the tier this project needs. Paid upgrades (e.g., Supabase Pro) are optional scaling levers, not requirements.
5. **Fast, cheap routing before expensive generation.** Any binary/typed decision (relevance? route to which agent? escalate?) goes through the lightweight Laya decision model before touching the larger generative model. This keeps the system fast and cheap to run on a single laptop.
6. **Legal, citable sourcing only.** No scraping of platforms whose ToS prohibits it (see Section 10.3). Prefer sources a GD panelist would respect anyway (news wires, official company communications, open APIs).
7. **Privacy is a feature, not an afterthought.** Anonymity in peer benchmarking, explicit consent for camera/mic use, and a clear "what leaves your device vs. what doesn't" story should be visible to the user in the UI, not just true in the backend.

## 4. System Architecture Overview

### 4.1 Local vs. Cloud split

```
┌───────────────────────────── STUDENT'S LAPTOP (local) ─────────────────────────────┐
│                                                                                      │
│  Ollama (local LLM runtime)                                                        │
│    └── Gemma 4 12B (multimodal: text + image + audio, 256K context)                │
│    └── nomic-embed-text (embeddings for RAG)                                        │
│  Laya (local decision/routing model, via `pip install laya`)                       │
│  LangGraph (agent orchestration — runs as part of the local app backend)           │
│  Chroma / LanceDB (local vector store — case studies, scraped-content cache)       │
│  Scrapling / Firecrawl / Playwright / YouTube Transcript API (data collection)     │
│  Mock Interview Room:                                                              │
│    - camera + mic capture                                                          │
│    - MediaPipe (pose/gaze landmarks) — local                                        │
│    - Gemma 4 12B native audio/vision reasoning — local                             │
│    - full session (video/audio/transcript) stored ONLY here, never uploaded        │
│                                                                                      │
│   ↓ only small, structured, already-anonymized JSON goes up ↓                       │
└───────────────────────────────────────┬────────────────────────────────────────────┘
                                         │
┌────────────────────────────────────── CLOUD (Supabase — Phase 2) ──────────────────┐
│  Auth (student + TPO accounts)                                                      │
│  Resume storage (student-authored, explicitly saved/submitted)                     │
│  JD bank / Company question bank                                                    │
│  Anonymized scores + percentile ranks                                               │
│  Placement-cell analytics views                                                     │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

**Phase 1 (MVP, per current decision): fully local.** No Supabase. Auth, resume storage, and any "shared" data live in a local SQLite/local Postgres instance or even flat files during MVP. Supabase is introduced in Phase 2 once multi-user/institutional features (placement cell dashboard, cross-device resume access) are actually needed. Do not build Supabase integration in Phase 1 — build the data access layer behind an interface so swapping local storage for Supabase later is a config change, not a rewrite.

### 4.2 High-level component diagram (textual)

```
[Frontend: Next.js/React]
        │  (calls local backend API)
        ▼
[Local Backend / Orchestration Service]
        │
        ├── LangGraph Agent Graph (see Section 6)
        │     ├── Router Agent (Laya)
        │     ├── Scraper Agents (Scrapling / Firecrawl / Playwright / YT Transcript)
        │     ├── Verifier Agent (fact-check, cite)
        │     ├── Summarizer/Briefing Agent
        │     ├── Resume Parser Agent
        │     ├── ATS Scorer Agent (deterministic) + LLM Qualitative Reviewer Agent
        │     ├── Case Study Retriever Agent (RAG over Chroma/LanceDB)
        │     ├── Interview Conductor Agent (multimodal, stateful, multi-turn)
        │     ├── Posture/Confidence Analyzer Agent (MediaPipe + Gemma 4)
        │     └── Council Agents (optional, for high-stakes verification — Section 6.5)
        │
        ├── Ollama (Gemma 4 12B + embeddings)
        ├── Laya (routing/classification)
        └── Local storage (SQLite/Chroma/LanceDB in Phase 1; Supabase in Phase 2)
```

## 5. Tech Stack Reference (with repo links)

| Layer | Tool | Repo / Source | Why |
|---|---|---|---|
| Local LLM runtime | **Ollama** | https://github.com/ollama/ollama | Runs local models, simple API, free |
| Primary local model | **Gemma 4 12B** | https://huggingface.co/google (search "gemma-4-12b"); via `ollama pull gemma4:12b` once available in Ollama's library | Encoder-free multimodal (text+image+audio), 256K context, Apache 2.0, runs on 16GB laptop — covers generation, resume review, and mock-interview audio/vision in one model |
| Fast decision/router model | **Laya** | GitHub: https://github.com/NandhaKishorM/laya · Model hub: https://huggingface.co/convaiinnovations/laya · `pip install laya` | Non-autoregressive typed-decision model, ~33ms latency, Apache 2.0, open weights — used for routing/classification, not generation |
| Agent orchestration | **LangGraph** | https://github.com/langchain-ai/langgraph | Graph-based multi-agent framework with shared typed state — fits multi-turn interview flow and agent-to-agent data sharing |
| Embeddings | **nomic-embed-text** (via Ollama) | https://ollama.com/library/nomic-embed-text | Free, local, good general-purpose embedding model |
| Vector store | **Chroma** (default) or **LanceDB** | https://github.com/chroma-core/chroma · https://github.com/lancedb/lancedb | Local, free, no server dependency required for Chroma's embedded mode |
| General web scraping | **Scrapling** | https://github.com/D4Vinci/Scrapling | Adaptive scraper, survives site layout changes, has an MCP server, free |
| URL-to-clean-markdown | **Firecrawl** | https://github.com/mendableai/firecrawl | Turns arbitrary URLs into LLM-ready markdown; free tier available |
| Browser automation | **Playwright** | https://github.com/microsoft/playwright | For JS-heavy/interactive pages that need a real browser |
| Video/audio transcript source | **youtube-transcript-api** | https://github.com/jdepoix/youtube-transcript-api | Pulls transcripts from news/explainer channels without downloading video |
| Reddit access | **PRAW** (official Reddit API wrapper) | https://github.com/praw-dev/praw | ToS-compliant Reddit access, free tier |
| Posture/gaze analysis | **MediaPipe** | https://github.com/google-ai-edge/mediapipe | Local, free, structured pose/face landmarks — feeds Gemma 4 rather than replacing it |
| Cloud backend (Phase 2) | **Supabase** | https://github.com/supabase/supabase | Auth + Postgres + storage, free tier, has an MCP server for schema management |
| Agent skills installer | **vercel-labs/skills** (`npx skills`) | https://github.com/vercel-labs/skills | Installs reusable SKILL.md instruction packs into Antigravity and other agents |
| Vulnerability scanning | **Strix** | https://github.com/usestrix/strix | Autonomous AI pentesting agent, validates findings with real PoCs, CI/CD integration, free/open-source core |
| Up-to-date library docs for the coding agent | **Context7** | https://github.com/upstash/context7 | MCP server that feeds the coding agent current, version-accurate library docs instead of stale training knowledge |
| Observability (recommended, add when agent count grows) | **Langfuse** | https://github.com/langfuse/langfuse | Free, self-hostable tracing for multi-agent debugging |
| Multi-model deliberation pattern (optional, high-stakes only) | **LLM Council pattern** (Karpathy) | https://github.com/karpathy/llm-council | Reference implementation of independent-answer → cross-critique → synthesis pattern |
| Frontend | **Next.js / React** | https://github.com/vercel/next.js | Per current decision |

`[ASSUMPTION]` Backend language: **Python**, since almost every tool above (LangGraph, Scrapling, Laya, Ollama client, MediaPipe) has first-class Python support. The Next.js frontend talks to a local Python backend (FastAPI recommended — free, async, simple) over a local HTTP/WebSocket API. Flag this back if a different backend language is preferred.

## 6. Multi-Agent Orchestration

### 6.1 Why LangGraph

LangGraph models the system as a **graph of nodes sharing one typed state object**, with support for cycles (needed for multi-turn interviews) and conditional edges (needed for routing decisions). This shared-state model *is* the agent-to-agent communication layer — agents don't need a separate messaging protocol; they read what they need from state and write back what they produce.

### 6.2 Shared state schema (reference shape — adapt per module)

```python
class PlatformState(TypedDict):
    # session / identity
    session_id: str
    student_id: str | None          # None in fully-local MVP if no auth yet
    module: str                      # "trend_engine" | "resume_match" | "company_research" |
                                      # "case_study" | "mock_interview" | "question_bank"

    # inputs
    raw_query: str | None            # e.g. GD topic, or free-text ask
    resume_text: str | None
    jd_text: str | None
    company_name: str | None

    # working memory (agents append here)
    scraped_items: list[dict]        # {source_url, title, snippet, retrieved_at}
    verified_claims: list[dict]      # {claim, source_url, confidence}
    retrieved_case_chunks: list[dict]# {chunk_text, doc_title, doc_source, page}
    resume_profile: dict | None      # parsed structured resume
    jd_requirements: dict | None     # parsed structured JD
    ats_score: float | None
    llm_qualitative_review: dict | None
    interview_history: list[dict]    # [{question, answer_transcript, sub_scores}]
    flags: list[str]                 # anything an agent wants to surface to the next node

    # output
    final_output: dict | None
```

### 6.3 Agent roster

| Agent | Job | Model/tool used | Reads from state | Writes to state |
|---|---|---|---|---|
| Router Agent | Decide which module/agent path a request needs; classify scraped item relevance; classify urgency | Laya | `raw_query`, `scraped_items` | `flags`, routing decision (graph edge) |
| Scraper Agent(s) | Pull raw content from legal sources (news RSS, Reddit API, YouTube transcripts, company blogs) | Scrapling, Firecrawl, Playwright, youtube-transcript-api, PRAW | `raw_query`/`company_name` | `scraped_items` |
| Verifier Agent | Check a scraped claim is well-sourced before it's shown to a student; discard low-confidence items | Gemma 4 12B (small prompt) + Laya (confidence classification) | `scraped_items` | `verified_claims` |
| Summarizer/Briefing Agent | Turn verified claims into a structured "GD talking-point card" or "company briefing" | Gemma 4 12B | `verified_claims` | `final_output` |
| Resume Parser Agent | Extract structured profile (skills, projects, experience) from uploaded resume | Gemma 4 12B (text) | `resume_text` | `resume_profile` |
| JD Parser Agent | Extract structured requirements from JD text | Gemma 4 12B | `jd_text` | `jd_requirements` |
| ATS Scorer Agent | Deterministic keyword/skill overlap score (NOT LLM-based — see Module 7.2) | Plain Python (rule-based) | `resume_profile`, `jd_requirements` | `ats_score` |
| LLM Qualitative Reviewer | Gaps, phrasing suggestions, fit narrative | Gemma 4 12B | `resume_profile`, `jd_requirements`, `ats_score` | `llm_qualitative_review` |
| Case Study Retriever Agent | RAG lookup over the local case-study/guesstimation vector store | Chroma/LanceDB + nomic-embed-text | `raw_query`/`jd_requirements` | `retrieved_case_chunks` |
| Grounded Answer Agent | Answer only from `retrieved_case_chunks`, cite source | Gemma 4 12B | `retrieved_case_chunks` | `final_output` |
| Interview Conductor Agent | Drive the multi-turn mock interview: generate next question, adapt to JD | Gemma 4 12B (multimodal) | `jd_requirements`, `interview_history` | `interview_history` |
| Posture/Confidence Analyzer | Score sitting posture, eye contact, articulation from local camera/mic stream | MediaPipe (landmarks) → Gemma 4 12B (interpretation) | live camera/mic (local only, not in shared state) | `interview_history[i].sub_scores` |
| Council Agents (optional) | Cross-check a high-stakes output (final GD claim set, final interview verdict) via independent-answer → critique → synthesis | 2+ passes of Gemma 4 12B (different prompts/temperature), or a second locally available model if the student has one | any `final_output` candidate | replaces/validates `final_output` |

### 6.4 Routing logic detail

Every incoming request first hits the **Router Agent (Laya)**. Laya is given the state and a fixed set of typed choices (e.g. `module: {trend_engine, resume_match, company_research, case_study, mock_interview, question_bank}`) and returns a calibrated choice — this determines which LangGraph subgraph runs next. Within a subgraph, Laya is used again for smaller decisions (e.g., "is this scraped item relevant?" as a `noul` yes/no question, or "how urgent/important is this claim?" as a `score` question). Only once Laya has filtered/routed does the request reach Gemma 4 12B for actual generation — this keeps expensive generation calls to a minimum on a single laptop's compute budget.

### 6.5 LLM Council pattern (use selectively)

Do **not** apply this to every request — it multiplies compute cost. Apply it only where being wrong costs the student something real:
- Final GD talking-point set (before showing to student)
- Final mock-interview verdict/score

Pattern: (1) generate the candidate output, (2) generate a second, independently-prompted critique pass that tries to find errors/unsupported claims, (3) a synthesis pass reconciles both into the final answer shown to the student. Reference: https://github.com/karpathy/llm-council for the canonical fan-out → critique → synthesize shape.

### 6.6 Observability

Once the agent count grows past the MVP (roughly once Module 4+ is built), wire in **Langfuse** (https://github.com/langfuse/langfuse) to trace which agent fired, what Laya routed, what prompt went to Gemma 4, and latency per node — this is the "LLM console" idea, concretely implemented as a self-hosted tracing dashboard rather than a bespoke build.

---

## 7. Module Specifications

### 7.1 Module 1 — GD & Interview Trend Engine (build first)

**Purpose:** Given a GD topic or a general "what's current" request, produce a structured card of 2–3 stances, each with a real-world example and a cited stat/source, sourced legally and quickly.

**Flow:** `raw_query` → Router (Laya) confirms module → Scraper Agents pull from news RSS / Reddit API / YouTube transcripts / company blogs (NOT Instagram/Facebook/X login-scraping — see Section 10.3) → Verifier Agent checks source quality and discards weak claims → Summarizer Agent produces the talking-point card → (optional) Council pass before returning.

**Data sources (Phase 1, all legal/free):**
- News RSS feeds (Reuters, Economic Times, LiveMint, Business Standard, Google News RSS by keyword)
- Reddit official API via PRAW
- YouTube transcripts of business/tech news channels via youtube-transcript-api
- Company official blogs/newsrooms via Firecrawl

**Output shape:** `{topic, stances: [{position, example, stat, source_url}], generated_at}`

**Caching:** Cache scraped+summarized results per topic in the local vector store for a configurable TTL (e.g. 6–12 hours) — avoids re-scraping the same trending topic repeatedly.

### 7.2 Module 2 — Resume ATS Score + JD Match

**Purpose:** Score a resume against a JD two ways: (a) a transparent, deterministic ATS-style keyword/skill overlap score, (b) an LLM-based qualitative review (gaps, phrasing, fit narrative).

**Important design decision:** The ATS number itself should be **rule-based, not LLM-generated** — real ATS systems are largely keyword/skill matching, and a deterministic score is explainable and trustworthy to a student in a way an opaque LLM number isn't. The LLM's job is the qualitative layer on top (what's missing, how to phrase it better, narrative fit).

**Flow:** `resume_text` + `jd_text` → Resume Parser Agent + JD Parser Agent (parallel) → ATS Scorer Agent (deterministic) → LLM Qualitative Reviewer Agent (reads the deterministic score + both structured profiles) → `final_output`.

**Multi-JD matching (from earlier discussion):** when a company posts several JDs, run this same flow once per JD and rank JDs by combined score for that student — this becomes the "which role fits you" feature. Allow the student to supply extra free-text context not on the resume (the "graphify memory" idea) — store this as additional structured facts merged into `resume_profile` before scoring, so it influences both the ATS overlap and the qualitative review.

### 7.3 Module 3 — Company Research Briefing

**Purpose:** Given a JD/company name, produce a short, cited briefing (recent news, growth/funding signals, culture keywords) the student can use as credible talking points in the interview.

**Flow:** `company_name` → Scraper Agents (Firecrawl on the company newsroom/press page, news RSS filtered by company name) → Verifier Agent → Summarizer Agent → `final_output`.

### 7.4 Module 4 — Case Study & Guesstimation RAG Engine

**Purpose:** Ground case-study and guesstimation answers in an actual retrievable document corpus rather than free generation, with citations.

**Corpus sourcing note:** Build the corpus only from genuinely open-access material — publicly shared case competition write-ups, openly published white papers, consulting firms' publicly shared interview guides (McKinsey/BCG explicitly publish these for candidates), professors' openly licensed teaching notes. Do **not** ingest paywalled/copyrighted case repositories (e.g. Harvard Business Publishing, Ivey, most official IIM case-center material) without a license — this is a real legal boundary, not just a style preference.

**Flow (ingestion, one-time/batch):** PDFs → parse (use the `pdf` skill / a PDF text-extraction library) → chunk → embed via `nomic-embed-text` → store in Chroma/LanceDB with metadata (`doc_title`, `source`, `page`, `topic_tags`).

**Flow (query time):** `raw_query` or `jd_requirements` → Case Study Retriever Agent (vector similarity search) → Grounded Answer Agent (answers *only* from retrieved chunks, cites `doc_title`/page inline) → `final_output`.

**Guesstimation variant:** same pipeline, corpus is guesstimation frameworks/worked examples instead of case narratives; the Grounded Answer Agent's job shifts from "answer the case" to "walk the student through applying the retrieved method to their specific prompt."

### 7.5 Module 5 — Company-Specific Historical Question Bank

**Purpose:** Crowdsourced, tagged database of GD/PI questions previous students report a given company asking.

**Data model (simple, Phase 1 local / Phase 2 Supabase table):**
```
question_bank(
  id, company_name, role, question_text, round_type [GD|PI|technical],
  reported_year, upvotes, tags[]
)
```
No AI agent strictly required here beyond tagging/categorization on submission (can reuse the Router/Laya pattern to auto-tag `round_type` and `role` from free-text submissions).

### 7.6 Module 6 — Mock Interview Room (multimodal, local-only)

**Purpose:** Live mock interview using camera + mic, JD-driven question generation, real-time posture/confidence/articulation feedback — entirely on the student's device.

**Hard privacy requirement (explicit, from product decision):** GD/PI session recordings, live video, audio, and full transcripts **must never leave the student's device**. Only a final structured summary (scores, sub-scores, a small number of tagged improvement areas) may sync to any shared backend, and only if/when the student explicitly chooses to save that summary against a specific JD application.

**Flow:**
1. Student grants camera/mic permission (explicit consent UI, see Section 10.2) and uploads/selects a JD.
2. Interview Conductor Agent (Gemma 4 12B) generates the first question based on `jd_requirements`.
3. Camera frames → MediaPipe → structured pose/gaze landmarks (local). Mic audio → Gemma 4 12B directly (native audio input — no separate transcription model needed given Gemma 4 12B's encoder-free multimodal design; keep Whisper.cpp as an optional local fallback transcriber if audio-only accuracy needs improving).
4. Posture/Confidence Analyzer Agent interprets landmarks + audio prosody into sub-scores (confidence, articulation, eye contact).
5. Interview Conductor Agent reads the answer + sub-scores, decides the next question (follow-up vs. move on) — this is the cyclic part of the LangGraph graph.
6. At session end, a synthesis pass (optionally Council-pattern, Section 6.5) produces the final verdict.
7. Full session stays in local storage; only the final verdict object is offered to the student to optionally save/export or share with the placement cell against a specific JD.

### 7.7 Module 7 — Resume Portal & Placement Cell Workflow (Phase 2, needs Supabase)

**Purpose:** Replace "edit on Google Docs, email to TPO" with: student logs in, edits/saves a resume in-platform, TPO can pull the finalized resume directly when a student is shortlisted, with optional JD-based resume optimization.

**Data model (Supabase, Phase 2):**
```
students(id, name, email, batch, branch)
resumes(id, student_id, content, version, last_updated, status [draft|submitted])
jd_optimized_resumes(id, resume_id, jd_id, optimized_content, skill_gaps[])
```

**Flow:** reuses Module 2's parsing/scoring agents — "optimize for this JD" is the LLM Qualitative Reviewer Agent producing suggested resume edits rather than just a review.

### 7.8 Module 8 — Placement Cell Analytics Dashboard (Phase 2, anonymized peer benchmarking)

**Purpose:** Give students their own score plus a peer percentile/rank **without exposing any peer identity**; give the TPO an aggregate, named view for legitimate shortlisting purposes.

**Access rule (explicit):**
- Student query → returns `{own_score, own_rank, percentile, batch_average}` — never another student's name or identifiable data.
- TPO query → returns full named table (TPOs have a legitimate need to know who's who for shortlisting) — but TPOs should **not** get access to individual mock-interview session content (video/audio/transcript), only the same structured summary objects students chose to save (per Module 6's local-only rule).

**Data model:**
```
anonymized_scores(id, student_hash, jd_id, ats_score, interview_score, computed_at)
```
Rank/percentile computed server-side at query time; never store a precomputed name-to-rank leaderboard that a student-facing endpoint could accidentally leak.

---

## 8. Data & Privacy Architecture

### 8.1 Data that must stay local, always
- Raw mock-interview video and audio
- Raw mock-interview transcripts
- Any camera frame or derived biometric-adjacent signal (posture/gaze landmarks)

### 8.2 Data that may sync to Supabase (Phase 2 only)
- Auth records (email, hashed credentials — handled by Supabase Auth)
- Resume text the student explicitly saves/submits
- JD bank, company question bank entries
- Anonymized score/rank records (Module 8 schema above)
- Optional: case-study corpus embeddings, if the student wants cross-device access (this is student-choice, not raw personal data)

### 8.3 Explicit privacy rules to enforce in code, not just policy
1. The mock interview module's backend process must have no outbound network calls active during a live session (enforce via a build-time check or feature flag, not just convention).
2. Any endpoint that returns peer-comparison data must be reviewed to confirm it cannot return another individual's identity to a student-role caller.
3. Consent UI (Section 10.2) must gate camera/mic access, and must be shown every session, not just once at signup.

## 9. Frontend Architecture (Next.js / React)

`[ASSUMPTION]` — refine once backend API shape is finalized.

**Route map (draft):**
```
/                         → landing / module picker
/trend                    → Module 1: GD trend engine (topic input → talking-point card)
/resume                   → Module 2: upload resume + JD(s) → ATS + qualitative review
/company/[name]           → Module 3: company research briefing
/case-studies             → Module 4: case study / guesstimation practice
/question-bank/[company]  → Module 5: historical questions
/interview                → Module 6: mock interview room (camera/mic UI, local-only processing)
/portal                   → Module 7: resume portal (student view, Phase 2)
/admin/dashboard          → Module 8: TPO analytics (Phase 2, role-gated)
```

**Key shared components:** source-citation chip (used across Modules 1/3/4 to show `doc_title`/`source_url` inline), consent modal (Module 6), score card (reused across Modules 2/6/8 with different data).

## 10. Security, Legality & Quality

### 10.1 Vulnerability scanning
Run **Strix** (https://github.com/usestrix/strix) before any deployment that will handle real student data (resumes, JDs, session summaries). Given this project handles PII, treat a Strix scan as a required gate before Phase 2 (cloud) goes live, not an optional nice-to-have.

### 10.2 Consent for camera/mic
Show an explicit consent screen before every mock-interview session (not just at account creation) stating: what is captured, that it stays on-device, and how to review/delete local session data.

### 10.3 Legal/ethical scraping boundaries — enforce these as hard rules
- **Do not** scrape Instagram, Facebook, or X/Twitter via logged-in/automated browser sessions — this violates their ToS and risks account bans and legal exposure. Use official, rate-limited free-tier APIs only where they exist (X has a limited free API tier), otherwise skip these sources entirely.
- **Do** use: news RSS/APIs, official company blogs/newsrooms, Reddit's official API (PRAW), YouTube transcripts, government/economic data portals.
- Playwright is approved for sites that permit automation (most news sites, public data portals) — not for the three platforms above.

### 10.4 Coding agent accuracy
Wire in **Context7** (https://github.com/upstash/context7) as an MCP server in Antigravity so generated code uses current, version-accurate library APIs rather than stale training-data guesses — this matters especially for fast-moving libraries like LangGraph and Supabase's SDKs.

---

## 11. Build Roadmap (phased)

**Phase 0 — Setup**
- Install Ollama, pull Gemma 4 12B and nomic-embed-text.
- `pip install laya`, set up LangGraph, Chroma.
- Install Context7 + Strix into Antigravity via `npx skills`.
- Scaffold Next.js frontend + FastAPI (or chosen) local backend.

**Phase 1 — MVP, fully local (per current decision)**
- Module 1 (GD Trend Engine) — proves the LangGraph + Laya routing pattern end to end.
- Module 2 (Resume ATS + JD Match) — introduces resume/JD parsing agents.
- Local storage only (SQLite/Chroma) — no Supabase yet.

**Phase 2 — Add grounded knowledge + company intelligence**
- Module 4 (Case Study/Guesstimation RAG) — corpus ingestion pipeline + retrieval agents.
- Module 3 (Company Research Briefing).
- Module 5 (Question Bank) — can launch as a simple local-first crowdsourced table.

**Phase 3 — Mock Interview Room**
- Module 6, built as its own effort given real-time media pipeline complexity.
- Introduce Council pattern for final verdict scoring.

**Phase 4 — Institutional features (Supabase introduced here)**
- Migrate shared/institutional data (auth, resume storage, question bank, anonymized scores) to Supabase.
- Module 7 (Resume Portal) and Module 8 (Placement Cell Dashboard).
- Strix scan gate before this phase goes live with real student data.

**Phase 5 — Scale features**
- Regional language support (leverage Gemma 4's 140+ language coverage and Laya's multilingual checkpoint).
- Spaced-repetition flashcards for GD data points.
- Peer-vs-AI group GD simulation.
- Export/share (PDF prep card, interview feedback export).
- Langfuse observability once agent count/traffic justifies it.

---

## 12. Open Assumptions Log

Flag these back to the human before/while building if they turn out wrong:

1. Backend language assumed **Python** (Section 5 footnote) — not yet explicitly confirmed.
2. Local storage engine for Phase 1 assumed **SQLite** for structured data + **Chroma** (embedded mode) for vectors — not yet explicitly confirmed.
3. Gemma 4 12B availability via Ollama's model library assumed — confirm the exact `ollama pull` tag at build time, as naming may differ from the Hugging Face checkpoint name.
4. Whether MVP needs any auth at all (even local, single-user) is unconfirmed — Phase 1 is described as fully local, possibly single-user only until Phase 4.
5. Exact ATS scoring rules (which keyword-matching algorithm, weighting) are not yet specified — needs a design pass before Module 2 is built.

---

## 13. Appendix: Full Repo/Tool Reference Table

| Tool | Link |
|---|---|
| Ollama | https://github.com/ollama/ollama |
| Laya | https://github.com/NandhaKishorM/laya (hub: https://huggingface.co/convaiinnovations/laya) |
| LangGraph | https://github.com/langchain-ai/langgraph |
| Chroma | https://github.com/chroma-core/chroma |
| LanceDB | https://github.com/lancedb/lancedb |
| Scrapling | https://github.com/D4Vinci/Scrapling |
| Firecrawl | https://github.com/mendableai/firecrawl |
| Playwright | https://github.com/microsoft/playwright |
| youtube-transcript-api | https://github.com/jdepoix/youtube-transcript-api |
| PRAW (Reddit API) | https://github.com/praw-dev/praw |
| MediaPipe | https://github.com/google-ai-edge/mediapipe |
| Supabase | https://github.com/supabase/supabase |
| vercel-labs/skills | https://github.com/vercel-labs/skills |
| Strix | https://github.com/usestrix/strix |
| Context7 | https://github.com/upstash/context7 |
| Langfuse | https://github.com/langfuse/langfuse |
| LLM Council (reference pattern) | https://github.com/karpathy/llm-council |
| Next.js | https://github.com/vercel/next.js |

**End of spec. Coding agent: start at Phase 0, then Module 1 (Section 7.1), using the shared state schema in Section 6.2 as your LangGraph state object.**
