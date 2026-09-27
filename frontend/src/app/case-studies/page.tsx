"use client";

export default function CaseStudiesPage() {
  return (
    <div className="container">
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ display: "inline-flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
          <span className="badge badge-amber">Module 4</span>
          <span className="badge badge-cyan">ChromaDB Vector Store</span>
        </div>
        <h1 style={{ fontSize: "2.25rem", fontWeight: 800, marginBottom: "0.5rem" }}>
          Case Study & <span className="gradient-text">Guesstimation RAG</span>
        </h1>
        <p className="text-muted" style={{ maxWidth: "750px" }}>
          Strictly grounded answers from openly accessible consulting casebooks and market-sizing guides.
          All factual figures are verified against local ChromaDB embeddings.
        </p>
      </div>

      <div className="glass-panel" style={{ padding: "2rem", borderLeft: "4px solid var(--accent-amber)" }}>
        <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "0.75rem" }}>
          Grounded Ingestion Pipeline
        </h3>
        <p className="text-muted" style={{ fontSize: "0.95rem", lineHeight: 1.7, marginBottom: "1rem" }}>
          In accordance with Section 7.4 of <code>details.md</code>, only open-access consulting guides
          (McKinsey, BCG candidate guides, public competition write-ups) are indexed into local ChromaDB with <code>nomic-embed-text</code>.
        </p>
        <div className="status-badge" style={{ background: "rgba(245, 158, 11, 0.12)", color: "#fbbf24", borderColor: "rgba(245, 158, 11, 0.3)" }}>
          Vector Collection: <code>case_studies</code> Ready
        </div>
      </div>
    </div>
  );
}
