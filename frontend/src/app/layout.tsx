import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "PrepSphere AI | GD & Placement Prep Platform",
  description: "Local-first, privacy-grounded Group Discussion & Interview Preparation with Ollama, Gemma 4 12B, and LangGraph multi-agent intelligence.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        <main>{children}</main>
      </body>
    </html>
  );
}
