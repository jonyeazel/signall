"use client";

import Link from "next/link";
import { useEffect, useState, useCallback, useRef } from "react";
import { Play, X } from "lucide-react";
import {
  C,
  ENVIRONMENTS,
  ENV_GROUPS,
  getScores,
  type EnvScore,
  buttonStyle,
} from "./shared";

export default function Home() {
  const [scores, setScores] = useState<Record<string, EnvScore>>({});
  const [activeCard, setActiveCard] = useState<number>(0);
  const [expandedCard, setExpandedCard] = useState<number | null>(null);
  const [cycleKey, setCycleKey] = useState(0);
  const cycleRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setScores(getScores());
  }, []);

  // Auto-cycle
  useEffect(() => {
    if (expandedCard !== null) return;
    cycleRef.current = setInterval(() => {
      setActiveCard((prev) => (prev + 1) % ENVIRONMENTS.length);
      setCycleKey((k) => k + 1);
    }, 4000);
    return () => {
      if (cycleRef.current) clearInterval(cycleRef.current);
    };
  }, [expandedCard]);

  const selectCard = useCallback(
    (i: number) => {
      setActiveCard(i);
      setCycleKey((k) => k + 1);
      if (cycleRef.current) clearInterval(cycleRef.current);
      cycleRef.current = setInterval(() => {
        setActiveCard((prev) => (prev + 1) % ENVIRONMENTS.length);
        setCycleKey((k) => k + 1);
      }, 4000);
    },
    []
  );

  const closeExpanded = useCallback(() => setExpandedCard(null), []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpandedCard(null);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const completedCount = ENVIRONMENTS.filter((e) => scores[e.id]).length;
  const avgEfficiency =
    completedCount > 0
      ? Math.round(
          Object.values(scores).reduce((s, v) => s + v.best, 0) / completedCount
        )
      : 0;

  const env = ENVIRONMENTS[activeCard];
  const score = scores[env.id];
  const group = ENV_GROUPS.find((g) => g.envs.includes(env));

  return (
    <div style={{ height: "100vh", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      {/* Overlay */}
      <div
        className={`card-overlay ${expandedCard !== null ? "card-overlay-visible" : ""}`}
        onClick={closeExpanded}
      />

      {/* Expanded card */}
      {expandedCard !== null && (() => {
        const xEnv = ENVIRONMENTS[expandedCard];
        const xScore = scores[xEnv.id];
        const xGroup = ENV_GROUPS.find((g) => g.envs.includes(xEnv));
        return (
          <div className="slide-card-expanded">
            <div
              style={{
                width: "100%",
                height: "100%",
                background: C.surface,
                borderRadius: "24px",
                border: `1px solid ${C.border}`,
                padding: "48px",
                display: "flex",
                flexDirection: "column",
                position: "relative",
              }}
            >
              <button
                onClick={closeExpanded}
                style={{ position: "absolute", top: "20px", right: "20px", background: "none", border: "none", color: C.textTertiary, cursor: "pointer", padding: "8px" }}
              >
                <X size={20} strokeWidth={1.5} />
              </button>

              <div style={{ fontSize: "96px", fontWeight: 700, color: C.border, lineHeight: 0.85, letterSpacing: "-0.04em", marginBottom: "24px" }}>
                {String(expandedCard + 1).padStart(2, "0")}
              </div>

              <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div style={{ fontSize: "11px", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: C.accent, marginBottom: "12px" }}>
                  {xGroup?.label} &middot; {xEnv.station}
                </div>
                <h2 style={{ fontSize: "42px", fontWeight: 600, color: C.textPrimary, letterSpacing: "-0.03em", lineHeight: 1.1, margin: "0 0 12px 0" }}>
                  {xEnv.name}
                </h2>
                <p style={{ fontSize: "16px", lineHeight: 1.6, color: C.textSecondary, margin: "0 0 28px 0", maxWidth: "440px" }}>
                  {xEnv.capability}
                </p>

                {xScore && (
                  <div style={{ display: "flex", gap: "24px", marginBottom: "28px" }}>
                    <div>
                      <div style={{ fontSize: "32px", fontWeight: 600, color: C.accent, lineHeight: 1 }}>{xScore.best}%</div>
                      <div style={{ fontSize: "11px", color: C.textTertiary, marginTop: "4px" }}>best</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "32px", fontWeight: 600, color: C.textPrimary, lineHeight: 1 }}>{xScore.attempts}</div>
                      <div style={{ fontSize: "11px", color: C.textTertiary, marginTop: "4px" }}>{xScore.attempts === 1 ? "run" : "runs"}</div>
                    </div>
                  </div>
                )}

                <div style={{ display: "flex", gap: "12px" }}>
                  <Link href={xEnv.path} style={{ ...buttonStyle, textDecoration: "none", height: "44px", padding: "0 24px" }}>
                    Play
                  </Link>
                  <Link
                    href={`${xEnv.path}?demo=true`}
                    style={{ ...buttonStyle, textDecoration: "none", height: "44px", padding: "0 24px", background: "transparent", color: C.textSecondary, border: `1px solid ${C.border}` }}
                  >
                    <Play size={13} strokeWidth={2} />
                    Watch agent
                  </Link>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Main content — single viewport */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "32px 48px 0" }}>
        {/* Top bar: logo + stats */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "18px", fontWeight: 700, color: C.accent, letterSpacing: "-0.02em" }}>
              [~]
            </span>
            <div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                <span style={{ fontSize: "15px", fontWeight: 600, color: C.textPrimary, letterSpacing: "0.01em" }}>
                  Signall
                </span>
                <span style={{ fontSize: "10px", color: C.textTertiary, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  OpenEnv Agentic Training
                </span>
              </div>
              <div style={{ fontSize: "11px", fontStyle: "italic", color: C.textTertiary, marginTop: "1px", letterSpacing: "0.02em" }}>
                cognition with rails
              </div>
            </div>
          </div>

          {completedCount > 0 && (
            <div style={{ display: "flex", gap: "20px", alignItems: "baseline" }}>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: "24px", fontWeight: 600, color: C.textPrimary, letterSpacing: "-0.02em" }}>{avgEfficiency}%</span>
                <span style={{ fontSize: "10px", color: C.textTertiary, marginLeft: "4px" }}>avg</span>
              </div>
              <span style={{ fontSize: "10px", color: C.textTertiary }}>{completedCount}/10 complete</span>
            </div>
          )}
        </div>

        {/* Hero: copy left, card right */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "64px", alignItems: "center", flex: 1 }}>
          {/* Left */}
          <div>
            <h1 style={{ fontSize: "40px", fontWeight: 600, color: C.textPrimary, letterSpacing: "-0.03em", lineHeight: 1.12, margin: "0 0 20px 0" }}>
              The training ground for<br />
              <span style={{ color: C.accent }}>autonomous agents</span>
            </h1>
            <p style={{ fontSize: "15px", lineHeight: 1.7, color: C.textSecondary, margin: "0 0 32px 0", maxWidth: "360px" }}>
              10 cognitive primitives. Every economic skill decomposes into them.
              Master the building blocks — the rest transfers.
            </p>
            <div style={{ display: "flex", gap: "10px" }}>
              <Link href="/bandit?demo=true" style={{ ...buttonStyle, textDecoration: "none", height: "44px", padding: "0 24px", fontSize: "13px" }}>
                <Play size={14} strokeWidth={2} />
                Run full demo
              </Link>
              <Link
                href="/train"
                style={{ ...buttonStyle, textDecoration: "none", height: "44px", padding: "0 24px", fontSize: "13px", background: "transparent", color: C.textSecondary, border: `1px solid ${C.border}` }}
              >
                Live training
              </Link>
            </div>
          </div>

          {/* Right: single card with crossfade */}
          <div style={{ display: "flex", justifyContent: "center" }}>
            <div
              onClick={() => { setExpandedCard(activeCard); }}
              style={{
                width: "300px",
                aspectRatio: "4/5",
                background: `linear-gradient(160deg, #222226 0%, ${C.surface} 40%, #18181C 100%)`,
                borderRadius: "20px",
                border: `1px solid ${C.border}`,
                padding: "32px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                cursor: "pointer",
                position: "relative",
                overflow: "hidden",
                transition: "border-color 200ms ease-out, box-shadow 200ms ease-out",
                boxShadow: "0 12px 48px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(224, 90, 0, 0.04)",
              }}
              className="env-card"
            >
              {/* Content with fade transition */}
              <div key={`card-${activeCard}`} className="card-content-fade" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: "100%" }}>
                {/* Number */}
                <div style={{ fontSize: "56px", fontWeight: 700, color: `${C.border}88`, lineHeight: 0.9, letterSpacing: "-0.04em" }}>
                  {String(activeCard + 1).padStart(2, "0")}
                </div>

                {/* Content */}
                <div>
                  <div style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.accent, marginBottom: "8px" }}>
                    {group?.label} &middot; {env.station}
                  </div>
                  <div style={{ fontSize: "20px", fontWeight: 600, color: C.textPrimary, letterSpacing: "-0.02em", marginBottom: "6px" }}>
                    {env.name}
                  </div>
                  <div style={{ fontSize: "13px", color: C.textSecondary, lineHeight: 1.5 }}>
                    {env.capability}
                  </div>
                  {score && (
                    <div style={{ marginTop: "14px", fontSize: "24px", fontWeight: 600, color: C.accent, letterSpacing: "-0.02em" }}>
                      {score.best}%
                    </div>
                  )}
                </div>
              </div>

              {/* Progress bar — bottom edge, respects card radius */}
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: "3px",
                  borderRadius: "0 0 20px 20px",
                  overflow: "hidden",
                }}
              >
                <div
                  key={`c-${cycleKey}`}
                  style={{
                    height: "100%",
                    background: C.accent,
                    animation: "cycle-progress 4s linear forwards",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom rail — anchored to viewport bottom */}
      <div style={{ padding: "0 64px 32px", flexShrink: 0 }}>
        <div style={{ position: "relative", height: "48px" }}>
          {/* Track */}
          <div style={{ position: "absolute", top: "12px", left: "3%", right: "3%", height: "2px", background: C.border }} />

          {/* Stations */}
          {ENVIRONMENTS.map((e, i) => {
            const isActive = i === activeCard;
            const hasScore = !!scores[e.id];
            // Inset first/last stations to prevent label clipping
            const rawPercent = (i / (ENVIRONMENTS.length - 1)) * 100;
            const left = `${3 + (rawPercent / 100) * 94}%`;

            return (
              <button
                key={e.id}
                title={`${e.station} — ${e.name}`}
                onClick={() => selectCard(i)}
                style={{
                  position: "absolute",
                  left,
                  top: 0,
                  transform: "translateX(-50%)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    width: isActive ? "12px" : "6px",
                    height: isActive ? "12px" : "6px",
                    borderRadius: "50%",
                    background: isActive || hasScore ? C.accent : "transparent",
                    border: isActive || hasScore ? "none" : `1px solid ${C.textTertiary}`,
                    boxShadow: isActive ? `0 0 10px ${C.accent}` : "none",
                    transition: "all 200ms ease-out",
                    marginTop: isActive ? "6px" : "9px",
                  }}
                />
                <div
                  style={{
                    marginTop: "4px",
                    fontSize: isActive ? "9px" : "8px",
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? C.accent : C.textTertiary,
                    whiteSpace: "nowrap",
                    transition: "all 200ms ease-out",
                    letterSpacing: "0.02em",
                  }}
                >
                  {e.station}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
