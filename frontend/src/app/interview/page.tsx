"use client";

import { useState } from "react";

export default function InterviewRoomPage() {
  const [consentGranted, setConsentGranted] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);

  return (
    <div className="container">
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ display: "inline-flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
          <span className="badge badge-purple">Module 6</span>
          <span className="privacy-badge">🔒 Strictly Local Media Pipeline</span>
        </div>
        <h1 style={{ fontSize: "2.25rem", fontWeight: 800, marginBottom: "0.5rem" }}>
          Private Mock <span className="gradient-text">Interview Room</span>
        </h1>
        <p className="text-muted" style={{ maxWidth: "750px" }}>
          Interactive multi-turn technical and behavioral practice powered locally by Gemma 4 12B multimodal reasoning
          and MediaPipe posture tracking. Zero video, audio, or transcript data leaves this machine.
        </p>
      </div>

      {!consentGranted ? (
        <div className="glass-panel" style={{ padding: "2.5rem", maxWidth: "700px", margin: "0 auto", border: "1px solid var(--border-accent)" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>🛡️</div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1rem" }}>
            Local Privacy & Sensor Consent
          </h2>
          <p className="text-muted" style={{ fontSize: "0.95rem", lineHeight: 1.7, marginBottom: "1.5rem" }}>
            In accordance with the privacy architecture (Details.md Section 8 & 10.2), camera frames, audio streams,
            and interview transcripts are processed exclusively in your laptop's memory using local models.
            No media packets are ever transmitted over the network.
          </p>

          <div style={{ background: "rgba(0,0,0,0.3)", padding: "1rem 1.25rem", borderRadius: "var(--radius-sm)", marginBottom: "1.75rem", fontSize: "0.88rem" }}>
            <div style={{ color: "#34d399", fontWeight: 600, marginBottom: "0.35rem" }}>✓ What stays on your device:</div>
            <ul style={{ paddingLeft: "1.2rem", color: "var(--text-muted)" }}>
              <li>Full webcam feed and facial mesh landmarks</li>
              <li>Microphone audio and transcription recordings</li>
              <li>Complete multi-turn conversational transcript</li>
            </ul>
          </div>

          <button
            className="btn btn-primary"
            style={{ width: "100%", padding: "0.85rem" }}
            onClick={() => setConsentGranted(true)}
          >
            I Acknowledge & Grant Local Camera/Mic Access
          </button>
        </div>
      ) : (
        <div className="grid-2">
          {/* Video Mock Feed */}
          <div className="glass-panel" style={{ padding: "1.5rem", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <span style={{ fontWeight: 700 }}>Local Video Feed</span>
              <span className="status-badge">
                <span className="pulse-dot" /> MediaPipe Mesh Active
              </span>
            </div>
            <div
              style={{
                height: "320px",
                background: "#080c14",
                borderRadius: "var(--radius-sm)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                border: "1px dashed var(--border-subtle)",
                marginBottom: "1rem",
              }}
            >
              <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>📹</div>
              <div style={{ fontSize: "0.9rem", color: "var(--text-dim)" }}>
                Local Camera Stream (Loopback Verified)
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "space-between" }}>
              <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                Eye Contact: <strong style={{ color: "#34d399" }}>Optimal (88%)</strong>
              </div>
              <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                Posture: <strong style={{ color: "#34d399" }}>Upright & Engaged</strong>
              </div>
            </div>
          </div>

          {/* Interview Conductor Terminal */}
          <div className="glass-panel" style={{ padding: "1.5rem", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <span style={{ fontWeight: 700 }}>Interviewer (Gemma 4 12B)</span>
              <span className="badge badge-purple">Turn 1 / 5</span>
            </div>

            <div style={{ flex: 1, background: "rgba(0,0,0,0.3)", borderRadius: "var(--radius-sm)", padding: "1.25rem", marginBottom: "1rem" }}>
              <p style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-main)", marginBottom: "0.75rem" }}>
                "Could you walk me through an engineering project where you had to make a trade-off between latency and system reliability?"
              </p>
              <div style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>
                Listening for audio stream... (Whisper/Gemma Multimodal)
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button className="btn btn-primary" style={{ flex: 1 }}>
                🎙️ Speak Response
              </button>
              <button className="btn btn-secondary">
                Submit Answer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
