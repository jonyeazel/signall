"use client";

import Link from "next/link";
import { useEffect, useState, useCallback, useRef } from "react";
import { Play, X, Zap, Activity } from "lucide-react";
import {
  C,
  ENVIRONMENTS,
  ENV_GROUPS,
  getScores,
  type EnvScore,
  buttonStyle,
} from "./shared";

// --- Avatar: numbered circle for each environment ---
function Avatar({ index, done }: { index: number; done: boolean }) {
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
        background: done ? C.accent : "transparent",
        color: done ? "#fff" : C.textTertiary,
        border: done ? "none" : `1.5px solid ${C.border}`,
        flexShrink: 0,
        transition: "all 200ms ease-out",
      }}
    >
      {String(index + 1).padStart(2, "0")}
    </div>
  );
}

export default function Home() {
  const [scores, setScores] = useState<Record<string, EnvScore>>({});
  const [expandedCard, setExpandedCard] = useState<number | null>(null);
  const [hoveredDock, setHoveredDock] = useState<number | null>(null);

  useEffect(() => {
    setScores(getScores());
  }, []);

  const closeExpanded = useCallback(() => setExpandedCard(null), []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpandedCard(null);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const completedCount = ENVIRONMENTS.filter((e) => scores[e.id]).length;
  const totalRuns = Object.values(scores).reduce((s, v) => s + v.attempts, 0);
  const avgEfficiency =
    completedCount > 0
      ? Math.round(
          Object.values(scores).reduce((s, v) => s + v.best, 0) / completedCount
        )
      : 0;

  return (
    <div className="viewport-panel">
      {/* Overlay */}
      <div
        className={`card-overlay ${expandedCard !== null ? "card-overlay-visible" : ""}`}
        onClick={closeExpanded}
      />

      {/* Expanded card */}
      {expandedCard !== null &&
        (() => {
          const xEnv = ENVIRONMENTS[expandedCard];
          const xScore = scores[xEnv.id];
          const xGroup = ENV_GROUPS.find((g) => g.envs.includes(xEnv));
          return (
            <div className="slide-card-expanded">
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  background: `linear-gradient(160deg, #1A1A1E 0%, ${C.surface} 50%, #161618 100%)`,
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
                  style={{
                    position: "absolute",
                    top: "20px",
                    right: "20px",
                    background: "none",
                    border: "none",
                    color: C.textTertiary,
                    cursor: "pointer",
                    padding: "8px",
                  }}
                >
                  <X size={20} strokeWidth={1.5} />
                </button>

                {/* Avatar + title */}
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "32px" }}>
                  <Avatar index={expandedCard} done={!!xScore} />
                  <div>
                    <div style={{ fontSize: "11px", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: C.accent }}>
                      {xGroup?.label}
                    </div>
                    <div style={{ fontSize: "13px", color: C.textTertiary }}>{xEnv.station}</div>
                  </div>
                </div>

                <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <h2
                    style={{
                      fontSize: "48px",
                      fontWeight: 600,
                      color: C.textPrimary,
                      letterSpacing: "-0.03em",
                      lineHeight: 1.1,
                      margin: "0 0 16px 0",
                    }}
                  >
                    {xEnv.name}
                  </h2>
                  <p
                    style={{
                      fontSize: "17px",
                      lineHeight: 1.6,
                      color: C.textSecondary,
                      margin: "0 0 32px 0",
                      maxWidth: "440px",
                    }}
                  >
                    {xEnv.capability}
                  </p>

                  {xScore && (
                    <div style={{ display: "flex", gap: "32px", marginBottom: "32px" }}>
                      <div>
                        <div style={{ fontSize: "36px", fontWeight: 600, color: C.accent, lineHeight: 1 }}>
                          {xScore.best}%
                        </div>
                        <div style={{ fontSize: "11px", color: C.textTertiary, marginTop: "6px" }}>best score</div>
                      </div>
                      <div>
                        <div style={{ fontSize: "36px", fontWeight: 600, color: C.textPrimary, lineHeight: 1 }}>
                          {xScore.attempts}
                        </div>
                        <div style={{ fontSize: "11px", color: C.textTertiary, marginTop: "6px" }}>
                          {xScore.attempts === 1 ? "run" : "runs"}
                        </div>
                      </div>
                    </div>
                  )}

                  <div style={{ display: "flex", gap: "12px" }}>
                    <Link href={xEnv.path} style={{ ...buttonStyle, textDecoration: "none", height: "44px", padding: "0 24px" }}>
                      Play
                    </Link>
                    <Link
                      href={`${xEnv.path}?demo=true`}
                      style={{
                        ...buttonStyle,
                        textDecoration: "none",
                        height: "44px",
                        padding: "0 24px",
                        background: "transparent",
                        color: C.textSecondary,
                        border: `1px solid ${C.border}`,
                      }}
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

      {/* --- Main content area --- */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          padding: "24px 32px 0",
          overflow: "hidden",
        }}
      >
        {/* Top bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "17px", fontWeight: 700, color: C.accent }}>
              [~]
            </span>
            <span style={{ fontSize: "14px", fontWeight: 600, color: C.textPrimary, letterSpacing: "0.01em" }}>
              Signall
            </span>
            <span style={{ fontSize: "10px", color: C.textTertiary, letterSpacing: "0.04em" }}>
              cognition with rails
            </span>
          </div>

          {completedCount > 0 && (
            <div style={{ display: "flex", gap: "16px", alignItems: "baseline" }}>
              <span style={{ fontSize: "20px", fontWeight: 600, color: C.textPrimary }}>{avgEfficiency}%</span>
              <span style={{ fontSize: "10px", color: C.textTertiary }}>{completedCount}/10</span>
              <span style={{ fontSize: "10px", color: C.textTertiary }}>{totalRuns} runs</span>
            </div>
          )}
        </div>

        {/* Center content — hero + cards */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            gap: "32px",
            minHeight: 0,
          }}
        >
          {/* Hero text — centered */}
          <div style={{ textAlign: "center", maxWidth: "560px" }}>
            <h1
              style={{
                fontSize: "36px",
                fontWeight: 600,
                color: C.textPrimary,
                letterSpacing: "-0.03em",
                lineHeight: 1.15,
                margin: "0 0 12px 0",
              }}
            >
              Train agents on the primitives.
              <br />
              <span style={{ color: C.accent }}>The rest transfers.</span>
            </h1>
            <p
              style={{
                fontSize: "14px",
                lineHeight: 1.6,
                color: C.textTertiary,
                margin: 0,
              }}
            >
              10 cognitive environments. Every economic skill decomposes into them.
            </p>
          </div>

          {/* Card grid — 5 columns */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              gap: "10px",
              width: "100%",
              maxWidth: "900px",
            }}
          >
            {ENVIRONMENTS.map((env, i) => {
              const envScore = scores[env.id];
              const hasDone = !!envScore;
              const group = ENV_GROUPS.find((g) => g.envs.includes(env));

              return (
                <div
                  key={env.id}
                  className="env-card"
                  onClick={() => setExpandedCard(i)}
                  style={{
                    background: C.surface,
                    border: `1px solid ${C.border}`,
                    borderRadius: "16px",
                    padding: "14px",
                    display: "flex",
                    flexDirection: "column",
                    cursor: "pointer",
                    minHeight: "120px",
                    position: "relative",
                  }}
                >
                  {/* Avatar + name — top left */}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "auto" }}>
                    <Avatar index={i} done={hasDone} />
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: "12px",
                          fontWeight: 600,
                          color: C.textPrimary,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {env.name.replace("The ", "")}
                      </div>
                      <div
                        style={{
                          fontSize: "9px",
                          color: C.textTertiary,
                          letterSpacing: "0.04em",
                          textTransform: "uppercase",
                        }}
                      >
                        {group?.label}
                      </div>
                    </div>
                  </div>

                  {/* Bottom: score or station */}
                  <div style={{ marginTop: "12px" }}>
                    {hasDone ? (
                      <div style={{ fontSize: "20px", fontWeight: 600, color: C.accent, letterSpacing: "-0.02em" }}>
                        {envScore.best}%
                      </div>
                    ) : (
                      <div style={{ fontSize: "11px", color: C.textTertiary }}>
                        {env.station}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* --- Command Center Dock --- */}
      <div
        style={{
          flexShrink: 0,
          padding: "0 32px 20px",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            background: "#151517",
            border: `1px solid ${C.border}`,
            borderRadius: "20px",
            padding: "6px 8px",
            maxWidth: "720px",
            width: "100%",
          }}
        >
          {/* Logo pill */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "0 12px",
              height: "36px",
              borderRadius: "14px",
              background: C.surface,
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: "13px", fontWeight: 700, color: C.accent }}>[~]</span>
            <span style={{ fontSize: "11px", fontWeight: 600, color: C.textSecondary }}>Signall</span>
          </div>

          {/* Divider */}
          <div style={{ width: "1px", height: "20px", background: C.border, margin: "0 4px", flexShrink: 0 }} />

          {/* Environment nodes */}
          <div style={{ display: "flex", gap: "2px", flex: 1, justifyContent: "center" }}>
            {ENVIRONMENTS.map((env, i) => {
              const hasDone = !!scores[env.id];
              const isHovered = hoveredDock === i;

              return (
                <button
                  key={env.id}
                  className={`dock-item ${isHovered ? "dock-item-active" : ""}`}
                  onClick={() => setExpandedCard(i)}
                  onMouseEnter={() => setHoveredDock(i)}
                  onMouseLeave={() => setHoveredDock(null)}
                  title={`${env.name} — ${env.station}`}
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: hasDone ? "rgba(224, 90, 0, 0.08)" : "transparent",
                    border: "none",
                    padding: 0,
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      width: hasDone ? "8px" : "5px",
                      height: hasDone ? "8px" : "5px",
                      borderRadius: "50%",
                      background: hasDone ? C.accent : C.textTertiary,
                      transition: "all 150ms ease-out",
                      boxShadow: hasDone ? `0 0 6px ${C.accent}` : "none",
                    }}
                  />

                  {/* Tooltip on hover */}
                  {isHovered && (
                    <div
                      style={{
                        position: "absolute",
                        bottom: "100%",
                        left: "50%",
                        transform: "translateX(-50%)",
                        marginBottom: "8px",
                        padding: "6px 10px",
                        background: C.surface,
                        border: `1px solid ${C.border}`,
                        borderRadius: "8px",
                        fontSize: "10px",
                        fontWeight: 500,
                        color: C.textPrimary,
                        whiteSpace: "nowrap",
                        pointerEvents: "none",
                        zIndex: 50,
                      }}
                    >
                      {env.name.replace("The ", "")}
                      <span style={{ color: C.textTertiary, marginLeft: "6px" }}>{env.station}</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Divider */}
          <div style={{ width: "1px", height: "20px", background: C.border, margin: "0 4px", flexShrink: 0 }} />

          {/* Action buttons */}
          <Link
            href="/bandit?demo=true"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              height: "36px",
              padding: "0 14px",
              borderRadius: "14px",
              background: C.accent,
              color: "#fff",
              fontSize: "11px",
              fontWeight: 600,
              textDecoration: "none",
              flexShrink: 0,
              letterSpacing: "0.01em",
            }}
          >
            <Zap size={12} strokeWidth={2} />
            Demo
          </Link>

          <Link
            href="/train"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              height: "36px",
              padding: "0 14px",
              borderRadius: "14px",
              background: C.surface,
              color: C.textSecondary,
              fontSize: "11px",
              fontWeight: 600,
              textDecoration: "none",
              flexShrink: 0,
              letterSpacing: "0.01em",
            }}
          >
            <Activity size={12} strokeWidth={2} />
            Train
          </Link>
        </div>
      </div>
    </div>
  );
}
