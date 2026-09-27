import json
import sqlite3
import chromadb
from pathlib import Path
from app.core.config import settings

def init_sqlite():
    """Initialize local SQLite tables for Phase 1 & Phase 2 persistence."""
    conn = sqlite3.connect(settings.SQLITE_PATH)
    cursor = conn.cursor()

    # Session storage
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sessions (
        session_id TEXT PRIMARY KEY,
        module TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        state_json TEXT
    )
    """)

    # Topic trend cache (TTL caching - Module 1)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS trend_cache (
        topic TEXT PRIMARY KEY,
        card_json TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # Company research briefing cache (TTL caching - Module 3)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS company_cache (
        company_name TEXT PRIMARY KEY,
        briefing_json TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # Crowdsourced Question Bank (Module 5)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS question_bank (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_name TEXT NOT NULL,
        role TEXT,
        question_text TEXT NOT NULL,
        round_type TEXT,
        reported_year INTEGER,
        upvotes INTEGER DEFAULT 0,
        tags TEXT
    )
    """)

    # Mock Interview Sessions (Module 6 - Phase 3)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS interview_sessions (
        id TEXT PRIMARY KEY,
        role TEXT NOT NULL,
        company_name TEXT,
        round_type TEXT,
        overall_score REAL,
        verdict TEXT,
        hiring_recommendation TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        summary_json TEXT
    )
    """)

    # Mock Interview Individual Turns (Module 6 - Phase 3)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS interview_turns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        turn_number INTEGER NOT NULL,
        question TEXT NOT NULL,
        answer TEXT,
        turn_score REAL,
        feedback TEXT,
        posture_metrics TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(session_id) REFERENCES interview_sessions(id)
    )
    """)

    # ─── Phase 4: Auth & Institutional Tables ──────────────────────────────────

    # Students table (Module 7 + Module 8)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS students (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        hashed_password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'student',
        batch TEXT,
        branch TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP
    )
    """)

    # Resumes table — student-authored, explicitly saved (Module 7)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS resumes (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        title TEXT,
        content TEXT NOT NULL,
        version INTEGER DEFAULT 1,
        status TEXT DEFAULT 'draft',
        ats_score REAL,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(student_id) REFERENCES students(id)
    )
    """)

    # JD-Optimized Resumes (Module 7 — resume optimization for specific JDs)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS jd_optimized_resumes (
        id TEXT PRIMARY KEY,
        resume_id TEXT NOT NULL,
        jd_id TEXT,
        jd_title TEXT,
        company_name TEXT,
        optimized_content TEXT,
        skill_gaps TEXT,
        optimization_score REAL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(resume_id) REFERENCES resumes(id)
    )
    """)

    # Anonymized Scores (Module 8 — peer benchmarking, privacy-preserved)
    # student_hash = irreversible SHA-256 of student_id (never stores plaintext ID)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS anonymized_scores (
        id TEXT PRIMARY KEY,
        student_hash TEXT NOT NULL,
        student_id TEXT NOT NULL,
        jd_id TEXT,
        company_name TEXT,
        role TEXT,
        ats_score REAL,
        interview_score REAL,
        overall_readiness REAL,
        computed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # JD Bank — shared JD registry for placement season (Module 7/8)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS jd_bank (
        id TEXT PRIMARY KEY,
        company_name TEXT NOT NULL,
        role TEXT NOT NULL,
        jd_text TEXT NOT NULL,
        batch TEXT,
        branch TEXT,
        deadline TEXT,
        active INTEGER DEFAULT 1,
        created_by TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    conn.commit()


    # Seed initial real-world question bank if empty
    cursor.execute("SELECT COUNT(*) FROM question_bank")
    count = cursor.fetchone()[0]
    if count == 0:
        seed_questions = [
            ("Google", "Software Engineer", "Design a distributed rate limiter that supports sliding window counters across multiple regions.", "technical", 2025, 42, "System Design,Distributed Systems,Redis"),
            ("Google", "Associate Product Manager", "How would you design a real-time speech translation feature for YouTube live streams in regional Indian languages?", "PI", 2025, 29, "Product Design,AI,Multilingual"),
            ("Microsoft", "Software Engineer", "Given a binary tree, serialize and deserialize it into a compact string representation. What is the time and space complexity?", "technical", 2025, 38, "DSA,Binary Tree,Serialization"),
            ("Microsoft", "Support Escalation Engineer", "GD Topic: Cloud Sovereign Data Centers in India vs Global Cross-Border Data Flow.", "GD", 2024, 19, "Cloud,GD,Data Privacy"),
            ("Amazon", "SDE-1", "Tell me about a time you had to make a decision without having all the required data. Which Leadership Principle guided you?", "PI", 2025, 54, "Behavioral,Leadership Principles,Bias for Action"),
            ("Amazon", "SDE-1", "Design an Amazon Locker allocation service that handles concurrent package reservations and dynamic expiration.", "technical", 2025, 47, "System Design,Concurrency,APIs"),
            ("Goldman Sachs", "Analyst", "Calculate the probability that in a room of 30 people, at least two share the same birth month and day of the week.", "technical", 2025, 33, "Math,Probability,Puzzles"),
            ("Goldman Sachs", "Software Engineer", "GD Topic: High-Frequency Algorithmic Trading: Market Efficiency Catalyst or Systemic Risk Factor?", "GD", 2024, 25, "FinTech,GD,Risk"),
            ("Infosys", "Specialist Programmer (DSE)", "How would you optimize database reads in a read-heavy microservice? Compare Redis write-through vs cache-aside.", "technical", 2025, 31, "Databases,Caching,Microservices"),
            ("Infosys", "Systems Engineer", "GD Topic: AI Copilots in IT Services: Threat to Fresher Hiring or Opportunity to Accelerate Seniority?", "GD", 2025, 62, "IT Services,GD,AI"),
            ("TCS", "Digital Cadre", "Explain the difference between optimistic concurrency control and pessimistic locking in relational databases.", "technical", 2025, 27, "SQL,Concurrency,Databases"),
            ("TCS", "Prime Cadre", "GD Topic: Electric Vehicles in India: Charging Infrastructure Deficits vs Government Subsidies.", "GD", 2025, 45, "EV,Sustainability,Infrastructure"),
            ("Swiggy", "SDE-1", "Design a dynamic surge pricing and delivery partner matching algorithm for rainy weather spikes.", "technical", 2025, 39, "System Design,Quick Commerce,Algorithms"),
            ("Zomato", "Software Engineer", "GD Topic: 10-Minute Instant Grocery Delivery: Consumer Luxury or Exploitative Labor Model?", "GD", 2025, 51, "Quick Commerce,GD,Labor"),
            ("Deloitte", "Technology Analyst", "A retail client is facing a 25% drop in e-commerce checkout conversions. Walk me through your diagnostic approach.", "PI", 2025, 36, "Consulting,Case Study,E-Commerce"),
            ("McKinsey & Co", "Business Analyst", "Guesstimate: Estimate the annual market size (in INR) of packaged mineral water sold in Tier-1 Indian railway stations.", "PI", 2025, 48, "Guesstimate,Market Sizing,Consulting")
        ]
        cursor.executemany("""
            INSERT INTO question_bank (company_name, role, question_text, round_type, reported_year, upvotes, tags)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, seed_questions)
        conn.commit()

    conn.close()

def get_chroma_client():
    """Get persistent Chroma DB client."""
    return chromadb.PersistentClient(path=str(settings.CHROMA_DIR))

# Run SQLite setup on import
init_sqlite()
chroma_client = get_chroma_client()
case_studies_col = chroma_client.get_or_create_collection("case_studies")
scraped_cache_col = chroma_client.get_or_create_collection("scraped_cache")
