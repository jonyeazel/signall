"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { Play, X, Copy, Check, ExternalLink } from "lucide-react";
import {
  C as darkC,
  ENVIRONMENTS,
  ENV_GROUPS,
  getScores,
  type EnvScore,
} from "./shared";

// --- Gold accent ---
const GOLD = "#C9A96E";
const GOLD_DIM = "rgba(201, 169, 110, 0.25)";

// --- Light palette (default) ---
const t = {
  bg: "#F5F3EF",
  surface: "#FFFFFF",
  border: "#E4E0DA",
  borderActive: "#C8C4BC",
  textPrimary: "#191919",
  textSecondary: "#6B6B68",
  textTertiary: "#9B9B98",
  accent: "#E05A00",
  panelBg: "#ECEAE4",
};

const API_URL = "https://jonyeazel-cognitive-primitives-bandit.hf.space";

// --- Avatar ---
function Avatar({ index }: { index: number }) {
  return (
    <div
      style={{
        width: "28px",
        height: "28px",
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "11px",
        fontWeight: 600,
        letterSpacing: "-0.02em",
        background: "#E05A00",
        color: "#fff",
        flexShrink: 0,
      }}
    >
      {String(index + 1).padStart(2, "0")}
    </div>
  );
}

export default function Home() {
  const [scores, setScores] = useState<Record<string, EnvScore>>({});
  const [expandedCard, setExpandedCard] = useState<number | null>(null);
  const [playingMode, setPlayingMode] = useState<"play" | "agent" | null>(null);
  const [copied, setCopied] = useState(false);

  const copyEndpoint = useCallback(() => {
    navigator.clipboard.writeText(API_URL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  useEffect(() => {
    setScores(getScores());
  }, []);

  const closeExpanded = useCallback(() => {
    setExpandedCard(null);
    setPlayingMode(null);
    setScores(getScores());
  }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeExpanded();
      if (expandedCard === null && !e.metaKey && !e.ctrlKey) {
        const num = e.key === "0" ? 10 : parseInt(e.key);
        if (num >= 1 && num <= 10) setExpandedCard(num - 1);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [expandedCard, closeExpanded]);

  const completedCount = ENVIRONMENTS.filter((e) => scores[e.id]).length;
  const avgEfficiency = completedCount > 0
    ? Math.round(Object.values(scores).reduce((s, v) => s + v.best, 0) / completedCount)
    : 0;

  return (
    <div
      style={{
        position: "fixed",
        inset: "12px",
        background: t.bg,
        borderRadius: "24px",
        border: `1px solid ${GOLD_DIM}`,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Overlay */}
      <div
        className={`card-overlay ${expandedCard !== null ? "card-overlay-visible" : ""}`}
        onClick={closeExpanded}
        style={{ background: "rgba(0,0,0,0.4)" }}
      />

      {/* Expanded card */}
      {expandedCard !== null && (() => {
        const xEnv = ENVIRONMENTS[expandedCard];
        const xScore = scores[xEnv.id];
        const xGroup = ENV_GROUPS.find((g) => g.envs.includes(xEnv));

        // Playing mode — iframe
        if (playingMode) {
          const embedUrl = `${xEnv.path}?embed=true${playingMode === "agent" ? "&agent=true" : ""}`;
          return (
            <div className="slide-card-expanded">
              <div style={{ width: "100%", height: "100%", background: darkC.bg, borderRadius: "24px", border: `1px solid ${GOLD_DIM}`, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderBottom: `1px solid ${darkC.border}`, flexShrink: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <Avatar index={expandedCard} />
                    <span style={{ fontSize: "13px", fontWeight: 600, color: darkC.textPrimary }}>{xEnv.name}</span>
                    <span style={{ fontSize: "10px", color: GOLD, letterSpacing: "0.04em", textTransform: "uppercase" }}>{xGroup?.label}</span>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button onClick={() => setPlayingMode(playingMode === "agent" ? "play" : "agent")} style={{ height: "28px", padding: "0 12px", borderRadius: "8px", border: `1px solid ${darkC.border}`, background: "transparent", color: darkC.textSecondary, fontSize: "11px", fontWeight: 500 }}>
                      {playingMode === "agent" ? "Switch to Play" : "Switch to Agent"}
                    </button>
                    <button onClick={closeExpanded} style={{ background: "none", border: "none", color: darkC.textTertiary, padding: "4px" }}>
                      <X size={18} strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
                <iframe src={embedUrl} style={{ flex: 1, border: "none", borderRadius: "0 0 24px 24px" }} />
              </div>
            </div>
          );
        }

        // Info mode
        return (
          <div className="slide-card-expanded">
            <div style={{ width: "100%", height: "100%", background: t.surface, borderRadius: "24px", border: `1px solid ${GOLD_DIM}`, padding: "48px", display: "flex", flexDirection: "column", position: "relative" }}>
              <div style={{ position: "absolute", top: 0, left: "48px", right: "48px", height: "1px", background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }} />
              <button onClick={closeExpanded} style={{ position: "absolute", top: "20px", right: "20px", background: "none", border: "none", color: t.textTertiary, padding: "8px" }}>
                <X size={20} strokeWidth={1.5} />
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "32px" }}>
                <Avatar index={expandedCard} />
                <div style={{ fontSize: "11px", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: GOLD }}>{xGroup?.label}</div>
              </div>

              <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <h2 style={{ fontSize: "48px", fontWeight: 600, color: t.textPrimary, letterSpacing: "-0.03em", lineHeight: 1.1, margin: "0 0 16px 0" }}>{xEnv.name}</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "32px" }}>
                  {xEnv.useCases.map((uc, j) => (
                    <div key={j} style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "16px", color: t.textSecondary }}>
                      <span style={{ color: GOLD, fontSize: "6px" }}>●</span>{uc}
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", gap: "32px", marginBottom: "32px" }}>
                  <div>
                    <div style={{ fontSize: "36px", fontWeight: 600, color: t.accent, lineHeight: 1 }}>{xScore?.best ?? 0}%</div>
                    <div style={{ fontSize: "11px", color: t.textTertiary, marginTop: "6px" }}>best</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "36px", fontWeight: 600, color: t.textPrimary, lineHeight: 1 }}>{xScore?.attempts ?? 0}</div>
                    <div style={{ fontSize: "11px", color: t.textTertiary, marginTop: "6px" }}>runs</div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "12px" }}>
                  <button onClick={() => setPlayingMode("play")} style={{ display: "inline-flex", alignItems: "center", gap: "8px", height: "44px", padding: "0 24px", background: t.accent, color: "#fff", border: "none", borderRadius: "16px", fontSize: "13px", fontWeight: 500, fontFamily: "inherit" }}>
                    Play
                  </button>
                  <button onClick={() => setPlayingMode("agent")} style={{ display: "inline-flex", alignItems: "center", gap: "8px", height: "44px", padding: "0 24px", background: "transparent", color: t.textSecondary, border: `1px solid ${t.border}`, borderRadius: "16px", fontSize: "13px", fontWeight: 500, fontFamily: "inherit" }}>
                    <Play size={13} strokeWidth={2} />
                    Watch agent
                  </button>
                </div>
              </div>
              <div style={{ position: "absolute", bottom: 0, left: "48px", right: "48px", height: "1px", background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }} />
            </div>
          </div>
        );
      })()}

      {/* --- Main content --- */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "24px 32px 0", overflow: "hidden" }}>
        {/* Top bar: brand + stats */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "17px", fontWeight: 700, color: t.accent }}>[~]</span>
            <span style={{ fontSize: "14px", fontWeight: 600, color: t.textPrimary }}>Signall</span>
          </div>
          {completedCount > 0 && (
            <div style={{ display: "flex", gap: "12px", alignItems: "baseline" }}>
              <span style={{ fontSize: "18px", fontWeight: 600, color: t.textPrimary }}>{avgEfficiency}%</span>
              <span style={{ fontSize: "10px", color: t.textTertiary }}>{completedCount}/10</span>
            </div>
          )}
        </div>

        {/* Content: headline + body + cards */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: "24px", minHeight: 0 }}>
          {/* Hero */}
          <div style={{ textAlign: "center", maxWidth: "640px" }}>
            <h1 style={{ fontSize: "38px", fontWeight: 600, color: t.textPrimary, letterSpacing: "-0.03em", lineHeight: 1.15, margin: "0 0 12px 0" }}>
              Train AI agents that <span style={{ color: t.accent }}>think</span> before they <span style={{ color: t.accent }}>act</span>
            </h1>
            <p style={{ fontSize: "15px", lineHeight: 1.6, color: t.textSecondary, margin: 0 }}>
              Your agents train here. Pick a skill. Watch the learning curve climb.
            </p>
          </div>

          {/* Card grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "10px", width: "100%", maxWidth: "920px" }}>
            {ENVIRONMENTS.map((env, i) => {
              const envScore = scores[env.id];
              const group = ENV_GROUPS.find((g) => g.envs.includes(env));
              return (
                <div
                  key={env.id}
                  onClick={() => setExpandedCard(i)}
                  style={{
                    background: t.surface,
                    border: `1px solid ${t.border}`,
                    borderRadius: "16px",
                    padding: "14px",
                    display: "flex",
                    flexDirection: "column",
                    cursor: "pointer",
                    minHeight: "130px",
                    position: "relative",
                  }}
                >
                  <div style={{ position: "absolute", top: 0, left: "16px", right: "16px", height: "1px", background: `linear-gradient(90deg, transparent, ${GOLD_DIM}, transparent)` }} />
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Avatar index={i} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: "12px", fontWeight: 600, color: t.textPrimary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{env.name}</div>
                      <div style={{ fontSize: "9px", color: GOLD, letterSpacing: "0.04em", textTransform: "uppercase" }}>{group?.label}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "3px", marginTop: "10px", flex: 1 }}>
                    {env.useCases.map((uc, j) => (
                      <div key={j} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "10px", color: t.textTertiary, lineHeight: 1.3 }}>
                        <span style={{ color: GOLD, fontSize: "4px", flexShrink: 0 }}>●</span>{uc}
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginTop: "8px" }}>
                    <div style={{ fontSize: "18px", fontWeight: 600, color: t.accent, letterSpacing: "-0.02em" }}>{envScore?.best ?? 0}%</div>
                    <div style={{ fontSize: "10px", color: t.textTertiary }}>{envScore?.attempts ?? 0} runs</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* --- Dock: brand + API endpoint + CTA --- */}
      <div style={{ flexShrink: 0, padding: "0 32px 20px", display: "flex", justifyContent: "center" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            background: t.panelBg,
            border: `1px solid ${GOLD_DIM}`,
            borderRadius: "20px",
            padding: "6px 8px",
            maxWidth: "760px",
            width: "100%",
          }}
        >
          {/* Logo pill */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "0 12px", height: "36px", borderRadius: "14px", background: t.surface, flexShrink: 0, border: `1px solid ${GOLD_DIM}` }}>
            <span style={{ fontSize: "13px", fontWeight: 700, color: t.accent }}>[~]</span>
            <span style={{ fontSize: "11px", fontWeight: 600, color: t.textSecondary }}>Signall</span>
          </div>

          <div style={{ width: "1px", height: "20px", background: GOLD_DIM, margin: "0 6px", flexShrink: 0 }} />

          {/* API endpoint — inline, always visible */}
          <button
            onClick={copyEndpoint}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              gap: "8px",
              height: "36px",
              padding: "0 12px",
              borderRadius: "10px",
              background: t.surface,
              border: `1px solid ${t.border}`,
              color: t.textTertiary,
              fontSize: "11px",
              fontFamily: "var(--font-mono, monospace)",
              textAlign: "left",
              overflow: "hidden",
              minWidth: 0,
            }}
          >
            <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#4ADE80", flexShrink: 0 }} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
              {API_URL.replace("https://", "")}
            </span>
            {copied ? <Check size={12} strokeWidth={2} style={{ color: "#4ADE80", flexShrink: 0 }} /> : <Copy size={12} strokeWidth={1.5} style={{ flexShrink: 0 }} />}
          </button>

          {/* Docs link */}
          <a
            href={`${API_URL}/docs`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex", alignItems: "center", gap: "4px",
              height: "36px", padding: "0 12px", borderRadius: "10px",
              background: t.surface, border: `1px solid ${t.border}`,
              color: t.textSecondary, fontSize: "11px", fontWeight: 500,
              textDecoration: "none", flexShrink: 0,
            }}
          >
            Docs <ExternalLink size={10} strokeWidth={1.5} />
          </a>

          <div style={{ width: "1px", height: "20px", background: GOLD_DIM, margin: "0 6px", flexShrink: 0 }} />

          {/* CTA */}
          <Link href="/bandit?demo=true" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "0 16px", height: "36px", borderRadius: "14px", background: t.accent, color: "#fff", fontSize: "12px", fontWeight: 500, textDecoration: "none", flexShrink: 0, fontFamily: "inherit" }}>
            <Play size={12} strokeWidth={2} />
            Watch AI Learn
          </Link>
        </div>
      </div>
    </div>
  );
}
