# Tools & Libraries Reference

Companion to `details.md`. This file covers every external tool/library the platform uses: what it is, how to install it, and a minimal usage example. Read `details.md` first for how each tool fits into the overall architecture — this file is the "how do I actually call this thing" reference.

---

## 1. Ollama — local LLM runtime

**Repo:** https://github.com/ollama/ollama
**What it does:** Runs LLMs locally and exposes them over a simple local API. This is the engine everything generative in the project runs on.

**Install (macOS/Linux):**
```bash
curl -fsSL https://ollama.com/install.sh | sh
```
Windows: download the installer from https://ollama.com/download.

**Pull the models this project needs:**
```bash
ollama pull gemma4:12b        # confirm exact tag on ollama.com/library once published there
ollama pull nomic-embed-text  # for embeddings
```

**Basic usage (Python):**
```python
import ollama

response = ollama.chat(model="gemma4:12b", messages=[
    {"role": "user", "content": "Summarize this GD topic in 3 stances."}
])
print(response["message"]["content"])
```

**Embeddings:**
```python
emb = ollama.embeddings(model="nomic-embed-text", prompt="market sizing framework")
vector = emb["embedding"]
```

**Project usage:** every generation-heavy agent (Summarizer, Verifier, Resume Parser, Interview Conductor, Grounded Answer Agent) calls Ollama's `gemma4:12b`. The Case Study Retriever Agent uses `nomic-embed-text` to embed queries and documents before vector search.

---

## 2. Gemma 4 12B — the model itself

**Source:** Google DeepMind, served via Ollama (above) or Hugging Face (`google/gemma-4-12b`, exact repo name to confirm at build time).
**What it does:** Encoder-free multimodal model (text, image, audio, video in one decoder-only transformer), 256K context, Apache 2.0. Handles resume review, briefing generation, and — critically — can take mock-interview camera/mic input directly without separate vision/transcription models.

**No separate install** beyond pulling it through Ollama (Section 1). If you need the raw Hugging Face weights for anything outside Ollama:
```bash
pip install huggingface_hub
huggingface-cli download google/gemma-4-12b
```

**Multimodal call shape (once wired through Ollama's multimodal API or the HF `transformers` API)** — confirm the exact call signature against Ollama's docs at build time, as multimodal APIs vary by runtime version. Conceptually:
```python
response = ollama.chat(model="gemma4:12b", messages=[
    {"role": "user", "content": "Rate this answer's confidence.",
     "images": ["frame.jpg"], "audio": ["clip.wav"]}
])
```

---

## 3. Laya — fast typed-decision / routing model

**Repo:** https://github.com/NandhaKishorM/laya
**Model hub:** https://huggingface.co/convaiinnovations/laya
**What it does:** Non-autoregressive "System 1" decision model — given a state and a typed question (choice / score / yes-no), it returns a calibrated answer in ~33ms without generating any text. Used for routing and cheap classification so the heavier Gemma 4 model is only called when real generation is needed.

**Install:**
```bash
pip install laya
```

**Basic usage:**
```python
import laya

agent = laya.load("convaiinnovations/laya")  # English checkpoint
# for non-English input, use: laya.load("convaiinnovations/laya-multilingual")

result = agent.predict(
    state={"body": "Layoffs at a fintech startup after funding round falls through."},
    questions={
        "module": {
            "type": "choice",
            "instructions": "Which module should handle this?",
            "criteria": {
                "trend_engine": "general current-events GD content",
                "company_research": "specific to one named company",
            }
        },
        "is_relevant": {
            "type": "noul",
            "instructions": "Is this relevant to Indian job market GD prep?"
        }
    }
)
print(result)
```

**Important:** Laya's docs note it's a strong *base to specialize*, not a strong zero-shot decision engine — calibrate/fine-tune it lightly on your own routing categories once you have real usage data, rather than trusting zero-shot confidence blindly. Keep choice questions under ~20 options per Laya's own guidance.

**Project usage:** the Router Agent (Section 6.4 of `details.md`) and every "is this relevant / how urgent / which category" decision across all modules.

---

## 4. LangGraph — multi-agent orchestration

**Repo:** https://github.com/langchain-ai/langgraph
**What it does:** Graph-based framework for multi-agent systems with shared, typed state and support for cycles (needed for multi-turn interviews) and conditional routing.

**Install:**
```bash
pip install langgraph
```

**Basic usage (skeleton matching `details.md` Section 6.2's state shape):**
```python
from langgraph.graph import StateGraph, END
from typing import TypedDict

class PlatformState(TypedDict):
    raw_query: str
    scraped_items: list
    final_output: dict | None

def router_node(state: PlatformState) -> PlatformState:
    # call Laya here to decide the next node
    return state

def scraper_node(state: PlatformState) -> PlatformState:
    # call Scrapling/Firecrawl here
    return state

graph = StateGraph(PlatformState)
graph.add_node("router", router_node)
graph.add_node("scraper", scraper_node)
graph.set_entry_point("router")
graph.add_edge("router", "scraper")
graph.add_edge("scraper", END)

app = graph.compile()
result = app.invoke({"raw_query": "AI and jobs in India", "scraped_items": [], "final_output": None})
```

**Project usage:** the backbone of every module — each agent in the roster (`details.md` Section 6.3) is a node in one of these graphs.

---

## 5. Chroma — local vector store

**Repo:** https://github.com/chroma-core/chroma
**What it does:** Local embedded vector database for the case-study/guesstimation RAG corpus and the scraped-content cache.

**Install:**
```bash
pip install chromadb
```

**Basic usage:**
```python
import chromadb

client = chromadb.PersistentClient(path="./chroma_data")
collection = client.get_or_create_collection("case_studies")

collection.add(
    documents=["Market entry case: telecom sector expansion..."],
    metadatas=[{"doc_title": "IIM-A Case: Telecom Market Entry", "page": 12}],
    ids=["case_001"]
)

results = collection.query(query_texts=["how to size a new telecom market"], n_results=3)
```

**Project usage:** Module 4 (Case Study/Guesstimation RAG) and Module 1's scraped-content cache.

*Alternative:* **LanceDB** (https://github.com/lancedb/lancedb) — swap in if you need faster large-scale vector search later; not required for MVP.

---

## 6. Scrapling — adaptive web scraper

**Repo:** https://github.com/D4Vinci/Scrapling
**What it does:** Python scraping framework that auto-relocates elements when a site's layout changes, includes stealth fetchers for anti-bot bypass, and a spider framework for larger crawls.

**Install:**
```bash
pip install scrapling
```

**Basic usage:**
```python
from scrapling.fetchers import StealthyFetcher

StealthyFetcher.adaptive = True
page = StealthyFetcher.fetch("https://example-news-site.com/article", headless=True, network_idle=True)

headlines = page.css(".headline::text", auto_save=True)
```

**Project usage:** Scraper Agents pulling from news sites and company blogs (legal sources only — see `details.md` Section 10.3).

---

## 7. Firecrawl — URL to clean markdown

**Repo:** https://github.com/mendableai/firecrawl
**What it does:** Converts a URL into clean, LLM-ready markdown in one call — good for feeding company newsroom pages straight into a summarizer agent.

**Install:**
```bash
pip install firecrawl-py
```

**Basic usage:**
```python
from firecrawl import FirecrawlApp

app = FirecrawlApp(api_key="YOUR_FREE_TIER_KEY")
result = app.scrape_url("https://company.com/newsroom", params={"formats": ["markdown"]})
print(result["markdown"])
```

**Project usage:** Module 3 (Company Research Briefing) — pulling and cleaning company newsroom/press pages.

---

## 8. Playwright — browser automation

**Repo:** https://github.com/microsoft/playwright
**What it does:** Drives a real browser for pages that need JS execution/interaction. Approved for general news/data sites — **not** for logged-in scraping of Instagram/Facebook/X (see `details.md` Section 10.3).

**Install:**
```bash
pip install playwright
playwright install
```

**Basic usage:**
```python
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    page.goto("https://example.com/infinite-scroll-news")
    page.wait_for_selector(".article")
    content = page.content()
    browser.close()
```

**Project usage:** Scraper Agents, for the subset of legal sources that need real browser interaction (infinite scroll, dynamic content).

---

## 9. youtube-transcript-api — transcript retrieval

**Repo:** https://github.com/jdepoix/youtube-transcript-api
**What it does:** Pulls a video's transcript directly without downloading video/audio.

**Install:**
```bash
pip install youtube-transcript-api
```

**Basic usage:**
```python
from youtube_transcript_api import YouTubeTranscriptApi

transcript = YouTubeTranscriptApi.get_transcript("VIDEO_ID")
full_text = " ".join(chunk["text"] for chunk in transcript)
```

**Project usage:** Module 1 — pulling spoken analysis from business/tech news channels as a GD-content source.

---

## 10. PRAW — official Reddit API wrapper

**Repo:** https://github.com/praw-dev/praw
**What it does:** ToS-compliant, official access to Reddit for community sentiment on GD topics.

**Install:**
```bash
pip install praw
```

**Basic usage:**
```python
import praw

reddit = praw.Reddit(
    client_id="YOUR_CLIENT_ID",
    client_secret="YOUR_CLIENT_SECRET",
    user_agent="gd-prep-platform"
)

for post in reddit.subreddit("developersIndia").search("AI jobs", limit=10):
    print(post.title, post.score, post.url)
```
(Register a free app at https://www.reddit.com/prefs/apps to get credentials.)

**Project usage:** Module 1, as a legal alternative to scraping X/Instagram for sentiment.

---

## 11. MediaPipe — pose/gaze landmark detection

**Repo:** https://github.com/google-ai-edge/mediapipe
**What it does:** Local, free, real-time detection of face/pose landmarks from camera frames — feeds structured signals to Gemma 4 rather than asking the LLM to eyeball posture itself.

**Install:**
```bash
pip install mediapipe
```

**Basic usage:**
```python
import mediapipe as mp
import cv2

face_mesh = mp.solutions.face_mesh.FaceMesh()
cap = cv2.VideoCapture(0)

ret, frame = cap.read()
results = face_mesh.process(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
if results.multi_face_landmarks:
    landmarks = results.multi_face_landmarks[0]
    # feed structured landmark data into the Posture/Confidence Analyzer Agent
```

**Project usage:** Module 6 (Mock Interview Room) — all processing stays local, feeding the Posture/Confidence Analyzer Agent.

---

## 12. Supabase — cloud backend (Phase 2 only)

**Repo:** https://github.com/supabase/supabase
**What it does:** Hosted Postgres + Auth + Storage, free tier. Used only for institutional/shared data (Section 8.2 of `details.md`) — never for raw interview media.

**Install (client SDK):**
```bash
pip install supabase
```

**Basic usage:**
```python
from supabase import create_client

supabase = create_client("YOUR_PROJECT_URL", "YOUR_ANON_KEY")

supabase.table("question_bank").insert({
    "company_name": "Acme Corp",
    "question_text": "How would you size the market for X?",
    "round_type": "GD"
}).execute()
```

**Agent-managed schema (optional):** Supabase ships an MCP server so a coding agent can manage tables/policies conversationally instead of hand-writing migrations — set this up in Antigravity when Phase 2 begins:
```bash
npx -y @supabase/mcp-server-supabase@latest
```
(Follow current setup instructions at https://github.com/supabase/supabase — MCP server config format may change; verify against the repo's README at build time.)

**Project usage:** Modules 5, 7, 8 (question bank, resume portal, placement analytics) — Phase 2 only, per the local-first-then-Supabase decision in `details.md`.

---

## 13. vercel-labs/skills — agent skills installer

**Repo:** https://github.com/vercel-labs/skills
**What it does:** CLI for installing reusable SKILL.md instruction packs into coding agents, including Google Antigravity.

**Install/use (no persistent install needed — run via `npx`):**
```bash
# list skills in a repo before installing
npx skills add vercel-labs/agent-skills --list

# install a specific skill to Antigravity
npx skills add vercel-labs/agent-skills --skill frontend-design -a antigravity

# search for skills by keyword
npx skills find ui
```

**Project usage:** installing Context7, Strix, and any UI/design skills into Antigravity before/while building. Always run `--list` or `find` and read the SKILL.md before installing anything from a third-party repo.

---

## 14. Strix — AI vulnerability scanning

**Repo:** https://github.com/usestrix/strix
**What it does:** Autonomous AI pentesting agent — dynamically runs your app, finds vulnerabilities, and validates them with real proof-of-concept exploits (fewer false positives than static analysis alone).

**Install:**
```bash
curl -sSL https://strix.ai/install | bash
```

**Basic usage:**
```bash
export STRIX_LLM="ollama/gemma4:12b"   # or another configured provider
strix --target ./app-directory
```
Results are saved to `strix_runs/<run-name>`.

**Can also be added as an agent skill:**
```bash
npx skills add usestrix/strix -a antigravity
```

**Project usage:** required gate before Phase 4 (Supabase/cloud, real student PII) goes live — see `details.md` Section 10.1.

---

## 15. Context7 — live library docs for the coding agent

**Repo:** https://github.com/upstash/context7
**What it does:** MCP server that feeds the coding agent current, version-accurate documentation for whatever library it's using, instead of relying on stale training knowledge.

**Setup (as an MCP server in Antigravity):**
```bash
npx -y @upstash/context7-mcp
```
Add it to Antigravity's MCP server config (see Antigravity's own docs for the exact config file location) so it's available during code generation.

**Project usage:** wire in at Phase 0 setup, before writing any LangGraph/Supabase code — both move fast enough that stale docs cause real bugs.

---

## 16. Langfuse — agent observability (add once agent count grows)

**Repo:** https://github.com/langfuse/langfuse
**What it does:** Self-hostable tracing dashboard — see which agent fired, what was routed, what prompt went where, and latency per node. This is the concrete implementation of the "LLM console" idea from earlier discussion.

**Install (self-hosted, free):**
```bash
git clone https://github.com/langfuse/langfuse.git
cd langfuse
docker compose up -d
```

**Basic usage (Python SDK):**
```bash
pip install langfuse
```
```python
from langfuse import Langfuse

langfuse = Langfuse(public_key="...", secret_key="...", host="http://localhost:3000")

trace = langfuse.trace(name="gd-trend-request")
trace.span(name="router-agent", input={"query": "AI and jobs"}, output={"module": "trend_engine"})
```

**Project usage:** introduce once you have Modules 1–4 running and debugging multi-agent chains by eye becomes painful.

---

## 17. LLM Council pattern (reference, not a dependency)

**Repo (reference implementation):** https://github.com/karpathy/llm-council
**What it does:** Not a library to install — a pattern to replicate: independent answers → anonymized cross-critique → synthesis by a "chairman" pass. Read the repo for the reference flow, then implement it as a 3-node LangGraph subgraph using Gemma 4 12B for each pass (different prompts/temperature per pass stands in for "different models").

**Project usage:** applied selectively to final GD talking-point sets and final mock-interview verdicts only — see `details.md` Section 6.5 for when to use it.

---

## 18. Next.js — frontend framework

**Repo:** https://github.com/vercel/next.js
**What it does:** React framework for the student/TPO-facing UI.

**Install:**
```bash
npx create-next-app@latest gd-prep-frontend
cd gd-prep-frontend
npm run dev
```

**Project usage:** implements the route map in `details.md` Section 9, talking to the local Python backend over HTTP/WebSocket.

---

## Quick install-everything reference (Python side)

```bash
pip install ollama laya langgraph chromadb scrapling firecrawl-py playwright \
    youtube-transcript-api praw mediapipe supabase langfuse
playwright install
```

Node/CLI tools (`npx`, no persistent install needed): `skills`, `context7-mcp`, Supabase's MCP server.

Always re-check exact package names and current install commands against each repo's README at build time — some (Gemma 4's Ollama tag especially) may shift before you start building.
