"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function Navbar() {
  const pathname = usePathname();
  const [ollamaStatus, setOllamaStatus] = useState<"checking" | "online" | "offline">("checking");
  const [models, setModels] = useState<string[]>([]);

  useEffect(() => {
    async function checkHealth() {
      try {
        const res = await fetch("http://127.0.0.1:8000/api/health");
        if (res.ok) {
          const data = await res.json();
          if (data.ollama_connected) {
            setOllamaStatus("online");
            setModels(data.available_models);
          } else {
            setOllamaStatus("offline");
          }
        } else {
          setOllamaStatus("offline");
        }
      } catch {
        setOllamaStatus("offline");
      }
    }
    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  const navLinks = [
    { href: "/", label: "Overview" },
    { href: "/trend", label: "GD Trend Engine" },
    { href: "/resume", label: "Resume ATS Match" },
    { href: "/company", label: "Company Briefings" },
    { href: "/case-studies", label: "Case Study RAG" },
    { href: "/question-bank", label: "Question Bank" },
    { href: "/interview", label: "Mock Interview Room" },
  ];

  return (
    <header className="app-header">
      <div className="brand-wrapper">
        <div className="brand-icon">⚡</div>
        <div>
          <Link href="/" className="brand-title">
            PrepSphere <span className="gradient-text">AI</span>
          </Link>
          <div style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>
            Local-First GD & Placement Intelligence
          </div>
        </div>
      </div>

      <nav className="nav-links">
        {navLinks.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`nav-link ${isActive ? "active" : ""}`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <div className="privacy-badge" title="Camera/Mic/Transcripts remain 100% on your laptop">
          <span>🔒</span> Local Privacy Enclave
        </div>

        <div
          className="status-badge"
          style={{
            background:
              ollamaStatus === "online"
                ? "rgba(16, 185, 129, 0.12)"
                : ollamaStatus === "checking"
                ? "rgba(245, 158, 11, 0.12)"
                : "rgba(244, 63, 94, 0.12)",
            borderColor:
              ollamaStatus === "online"
                ? "rgba(16, 185, 129, 0.3)"
                : ollamaStatus === "checking"
                ? "rgba(245, 158, 11, 0.3)"
                : "rgba(244, 63, 94, 0.3)",
            color:
              ollamaStatus === "online"
                ? "#34d399"
                : ollamaStatus === "checking"
                ? "#fbbf24"
                : "#f87171",
          }}
        >
          <span
            className="pulse-dot"
            style={{
              background:
                ollamaStatus === "online"
                  ? "#10b981"
                  : ollamaStatus === "checking"
                  ? "#f59e0b"
                  : "#f43f5e",
            }}
          />
          {ollamaStatus === "online"
            ? "Ollama (Gemma 4 12B)"
            : ollamaStatus === "checking"
            ? "Checking Ollama..."
            : "Ollama Offline"}
        </div>
      </div>
    </header>
  );
}
