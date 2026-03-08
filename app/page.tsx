"use client";

import Link from "next/link";
import { useEffect, useState, useCallback, useRef } from "react";
import {
  Play, X, Sun, Moon, LayoutGrid, Presentation,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import {
  C as darkC,
  ENVIRONMENTS,
  ENV_GROUPS,
  getScores,
  type EnvScore,
} from "./shared";

// --- Gold accent for trim details ---
const GOLD = "#C9A96E";
const GOLD_DIM = "rgba(201, 169, 110, 0.25)";

// --- Palettes ---

const lightC = {
  bg: "#F5F3EF",
  surface: "#FFFFFF",
  border: "#E4E0DA",
  borderActive: "#C8C4BC",
  textPrimary: "#191919",
  textSecondary: "#6B6B68",
  textTertiary: "#9B9B98",
  accent: "#E05A00",
  panelBg: "#ECEAE4",
} as const;

const darkPalette = {
  ...darkC,
  panelBg: "#08080A",
} as const;

type ViewMode = "grid" | "slideshow";

// --- Avatar: always orange ---
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
  const [hoveredDock, setHoveredDock] = useState<number | null>(null);
  const [isDark, setIsDark] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [slideIndex, setSlideIndex] = useState(0);

  const t = isDark ? darkPalette : lightC;

  useEffect(() => {
    setScores(getScores());
  }, []);

  const closeExpanded = useCallback(() => {
    setExpandedCard(null);
    setPlayingMode(null);
    // Refresh scores in case a game was played
    setScores(getScores());
  }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeExpanded();
      if (expandedCard === null && !e.metaKey && !e.ctrlKey) {
        const num = e.key === "0" ? 10 : parseInt(e.key);
        if (num >= 1 && num <= 10) {
          const idx = num - 1;
          if (viewMode === "slideshow") {
            setSlideIndex(idx);
            
          } else {
            setExpandedCard(idx);
          }
        }
      }
      if (viewMode === "slideshow" && expandedCard === null) {
        if (e.key === "ArrowRight") { setSlideIndex((p) => (p + 1) % ENVIRONMENTS.length);  }
        if (e.key === "ArrowLeft") { setSlideIndex((p) => (p - 1 + ENVIRONMENTS.length) % ENVIRONMENTS.length);  }
      }
      if (e.key === "g" && expandedCard === null) setViewMode("grid");
      if (e.key === "s" && expandedCard === null) setViewMode("slideshow");
      if (e.key === "t" && expandedCard === null) setIsDark((d) => !d);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [viewMode, expandedCard, closeExpanded]);

  // No auto-cycle — slideshow only advances on user input

  const completedCount = ENVIRONMENTS.filter((e) => scores[e.id]).length;
  const totalRuns = Object.values(scores).reduce((s, v) => s + v.attempts, 0);
  const avgEfficiency = completedCount > 0
    ? Math.round(Object.values(scores).reduce((s, v) => s + v.best, 0) / completedCount)
    : 0;

  const slideEnv = ENVIRONMENTS[slideIndex];
  const slideScore = scores[slideEnv?.id];
  const slideGroup = ENV_GROUPS.find((g) => g.envs.includes(slideEnv));

  const toggleBtn = (active: boolean): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "32px",
    height: "32px",
    borderRadius: "10px",
    background: active ? `${t.accent}18` : "transparent",
    border: "none",
    color: active ? t.accent : t.textTertiary,
    padding: 0,
  });

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
      />

      {/* Expanded card */}
      {expandedCard !== null && (() => {
        const xEnv = ENVIRONMENTS[expandedCard];
        const xScore = scores[xEnv.id];
        const xGroup = ENV_GROUPS.find((g) => g.envs.includes(xEnv));

        // Playing mode — embed the game
        if (playingMode) {
          const embedUrl = `${xEnv.path}?embed=true${playingMode === "agent" ? "&agent=true" : ""}`;
          return (
            <div className="slide-card-expanded">
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  background: t.surface,
                  borderRadius: "24px",
                  border: `1px solid ${GOLD_DIM}`,
                  position: "relative",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {/* Gold trim */}
                <div style={{ position: "absolute", top: 0, left: "48px", right: "48px", height: "1px", background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`, zIndex: 2 }} />

                {/* Header bar */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 20px",
                    borderBottom: `1px solid ${t.border}`,
                    flexShrink: 0,
                    zIndex: 1,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <Avatar index={expandedCard} />
                    <span style={{ fontSize: "12px", fontWeight: 600, color: t.textPrimary }}>{xEnv.name}</span>
                    <span style={{ fontSize: "9px", color: GOLD, letterSpacing: "0.04em", textTransform: "uppercase" }}>{xGroup?.label}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {/* Switch mode button */}
                    <button
                      onClick={() => setPlayingMode(playingMode === "agent" ? "play" : "agent")}
                      style={{
                        display: "flex", alignItems: "center", gap: "6px",
                        height: "28px", padding: "0 12px",
                        background: "transparent", border: `1px solid ${t.border}`,
                        borderRadius: "8px", fontSize: "10px", fontWeight: 500,
                        color: t.textTertiary, fontFamily: "inherit",
                      }}
                    >
                      {playingMode === "agent" ? "Switch to Play" : "Switch to Agent"}
                    </button>
                    <button
                      onClick={closeExpanded}
                      style={{ background: "none", border: "none", color: t.textTertiary, cursor: "pointer", padding: "4px" }}
                    >
                      <X size={16} strokeWidth={1.5} />
                    </button>
                  </div>
                </div>

                {/* Embedded game */}
                <iframe
                  key={`${xEnv.id}-${playingMode}`}
                  src={embedUrl}
                  style={{
                    flex: 1,
                    width: "100%",
                    border: "none",
                    borderRadius: "0 0 24px 24px",
                    background: isDark ? "#0E0E10" : "#F5F3EF",
                  }}
                />
              </div>
            </div>
          );
        }

        // Info mode — card details
        return (
          <div className="slide-card-expanded">
            <div
              style={{
                width: "100%",
                height: "100%",
                background: t.surface,
                borderRadius: "24px",
                border: `1px solid ${GOLD_DIM}`,
                padding: "48px",
                display: "flex",
                flexDirection: "column",
                position: "relative",
              }}
            >
              {/* Gold trim line at top */}
              <div style={{ position: "absolute", top: 0, left: "48px", right: "48px", height: "1px", background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }} />

              <button
                onClick={closeExpanded}
                style={{ position: "absolute", top: "20px", right: "20px", background: "none", border: "none", color: t.textTertiary, cursor: "pointer", padding: "8px" }}
              >
                <X size={20} strokeWidth={1.5} />
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "32px" }}>
                <Avatar index={expandedCard} />
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: GOLD }}>{xGroup?.label}</div>
                </div>
              </div>

              <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <h2 style={{ fontSize: "48px", fontWeight: 600, color: t.textPrimary, letterSpacing: "-0.03em", lineHeight: 1.1, margin: "0 0 16px 0" }}>
                  {xEnv.name}
                </h2>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "32px" }}>
                  {xEnv.useCases.map((uc, j) => (
                    <div key={j} style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "15px", color: t.textSecondary, lineHeight: 1.4 }}>
                      <span style={{ color: GOLD, fontSize: "7px", flexShrink: 0 }}>●</span>
                      {uc}
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
                  <button
                    onClick={() => setPlayingMode("play")}
                    style={{ display: "inline-flex", alignItems: "center", gap: "8px", height: "44px", padding: "0 24px", background: t.accent, color: "#fff", border: "none", borderRadius: "16px", fontSize: "13px", fontWeight: 500, fontFamily: "inherit" }}
                  >
                    Play
                  </button>
                  <button
                    onClick={() => setPlayingMode("agent")}
                    style={{ display: "inline-flex", alignItems: "center", gap: "8px", height: "44px", padding: "0 24px", background: "transparent", color: t.textSecondary, border: `1px solid ${t.border}`, borderRadius: "16px", fontSize: "13px", fontWeight: 500, fontFamily: "inherit" }}
                  >
                    <Play size={13} strokeWidth={2} />
                    Watch agent
                  </button>
                </div>
              </div>

              {/* Gold trim line at bottom */}
              <div style={{ position: "absolute", bottom: 0, left: "48px", right: "48px", height: "1px", background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }} />
            </div>
          </div>
        );
      })()}

      {/* --- Main content --- */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "24px 32px 0", overflow: "hidden" }}>
        {/* Top bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "17px", fontWeight: 700, color: t.accent }}>[~]</span>
            <span style={{ fontSize: "14px", fontWeight: 600, color: t.textPrimary }}>Signall</span>
            {/* Gold separator dot */}
            <span style={{ fontSize: "10px", color: GOLD }}>·</span>
            <span style={{ fontSize: "10px", color: t.textTertiary, letterSpacing: "0.04em" }}>cognition with rails</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ display: "flex", gap: "2px", background: isDark ? "#151517" : "#E8E5DF", borderRadius: "12px", padding: "3px" }}>
              <button style={toggleBtn(viewMode === "grid")} onClick={() => setViewMode("grid")} title="Grid view">
                <LayoutGrid size={14} strokeWidth={1.5} />
              </button>
              <button style={toggleBtn(viewMode === "slideshow")} onClick={() => setViewMode("slideshow")} title="Slideshow view">
                <Presentation size={14} strokeWidth={1.5} />
              </button>
            </div>
            <button
              onClick={() => setIsDark((d) => !d)}
              style={{ ...toggleBtn(false), background: isDark ? "#151517" : "#E8E5DF", borderRadius: "10px" }}
              title={isDark ? "Light mode" : "Dark mode"}
            >
              {isDark ? <Sun size={14} strokeWidth={1.5} /> : <Moon size={14} strokeWidth={1.5} />}
            </button>
            {completedCount > 0 && (
              <div style={{ display: "flex", gap: "12px", alignItems: "baseline", marginLeft: "8px" }}>
                <span style={{ fontSize: "18px", fontWeight: 600, color: t.textPrimary }}>{avgEfficiency}%</span>
                <span style={{ fontSize: "10px", color: t.textTertiary }}>{completedCount}/10</span>
              </div>
            )}
          </div>
        </div>

        {/* Content area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: "28px", minHeight: 0 }}>

          {/* ===== GRID VIEW ===== */}
          {viewMode === "grid" && (
            <>
              {/* Hero */}
              <div style={{ textAlign: "center" }}>
                {/* Trust pills — above headline */}
                <div style={{ display: "flex", gap: "8px", justifyContent: "center", marginBottom: "16px" }}>
                  {["OpenEnv", "HuggingFace", "Real-Time"].map((label) => (
                    <span key={label} style={{ fontSize: "10px", fontWeight: 500, color: GOLD, letterSpacing: "0.04em", padding: "4px 12px", borderRadius: "100px", border: `1px solid ${GOLD_DIM}`, background: isDark ? "rgba(201, 169, 110, 0.06)" : "rgba(201, 169, 110, 0.08)" }}>
                      {label}
                    </span>
                  ))}
                </div>
                <h1 style={{ fontSize: "38px", fontWeight: 600, color: t.textPrimary, letterSpacing: "-0.03em", lineHeight: 1.15, margin: "0 0 12px 0" }}>
                  Train AI agents that <span style={{ color: t.accent }}>think</span> before they <span style={{ color: t.accent }}>act</span>
                </h1>
                <p style={{ fontSize: "16px", lineHeight: 1.5, color: t.textSecondary, margin: 0, maxWidth: "600px", marginLeft: "auto", marginRight: "auto" }}>
                  Agents that master 10 cognitive skills outperform specialists on any task. Each environment isolates one skill. Together they produce general intelligence.
                </p>
              </div>

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
                      {/* Gold trim — thin top edge */}
                      <div style={{ position: "absolute", top: 0, left: "16px", right: "16px", height: "1px", background: `linear-gradient(90deg, transparent, ${GOLD_DIM}, transparent)` }} />

                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <Avatar index={i} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: "12px", fontWeight: 600, color: t.textPrimary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {env.name}
                          </div>
                          <div style={{ fontSize: "9px", color: GOLD, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                            {group?.label}
                          </div>
                        </div>
                      </div>
                      <div style={{ marginTop: "10px", flex: 1, display: "flex", flexDirection: "column", gap: "3px" }}>
                        {env.useCases.map((uc, j) => (
                          <div key={j} style={{ fontSize: "10px", color: t.textTertiary, lineHeight: 1.3, display: "flex", alignItems: "baseline", gap: "5px" }}>
                            <span style={{ color: GOLD, fontSize: "6px", flexShrink: 0, marginTop: "2px" }}>●</span>
                            {uc}
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
            </>
          )}

          {/* ===== SLIDESHOW VIEW ===== */}
          {viewMode === "slideshow" && (<>
            {/* Slideshow headline */}
            <div style={{ textAlign: "center", marginBottom: "-4px" }}>
              <div style={{ display: "flex", gap: "8px", justifyContent: "center", marginBottom: "10px" }}>
                {["OpenEnv", "HuggingFace", "Real-Time"].map((label) => (
                  <span key={label} style={{ fontSize: "9px", fontWeight: 500, color: GOLD, letterSpacing: "0.04em", padding: "3px 10px", borderRadius: "100px", border: `1px solid ${GOLD_DIM}`, background: isDark ? "rgba(201, 169, 110, 0.06)" : "rgba(201, 169, 110, 0.08)" }}>
                    {label}
                  </span>
                ))}
              </div>
              <h1 style={{ fontSize: "28px", fontWeight: 600, color: t.textPrimary, letterSpacing: "-0.03em", lineHeight: 1.2, margin: 0 }}>
                Train AI agents that <span style={{ color: t.accent }}>think</span> before they <span style={{ color: t.accent }}>act</span>
              </h1>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "24px", width: "100%", margin: "0 auto" }}>
              <button
                onClick={() => { setSlideIndex((p) => (p - 1 + ENVIRONMENTS.length) % ENVIRONMENTS.length);  }}
                style={{ width: "40px", height: "40px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: t.surface, border: `1px solid ${t.border}`, color: t.textSecondary, flexShrink: 0 }}
              >
                <ChevronLeft size={18} strokeWidth={1.5} />
              </button>

              <Link
                href={slideEnv.path}
                key={`slide-${slideIndex}`}
                className="card-content-fade"
                style={{
                  width: "56vw",
                  height: "56vh",
                  flexShrink: 0,
                  background: t.surface,
                  borderRadius: "20px",
                  border: `1px solid ${t.border}`,
                  padding: "32px 40px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  position: "relative",
                  overflow: "hidden",
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                {/* Gold trim — top */}
                <div style={{ position: "absolute", top: 0, left: "40px", right: "40px", height: "1px", background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }} />

                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <Avatar index={slideIndex} />
                  <div>
                    <div style={{ fontSize: "12px", fontWeight: 600, color: t.textPrimary }}>{slideEnv.name}</div>
                    <div style={{ fontSize: "10px", color: GOLD, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                      {slideGroup?.label}
                    </div>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: "140px", fontWeight: 700, color: isDark ? `${t.border}55` : `${t.border}88`, lineHeight: 0.85, letterSpacing: "-0.06em", marginBottom: "16px" }}>
                    {String(slideIndex + 1).padStart(2, "0")}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "12px" }}>
                    {slideEnv.useCases.map((uc, j) => (
                      <div key={j} style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "16px", color: t.textSecondary, lineHeight: 1.3 }}>
                        <span style={{ color: GOLD, fontSize: "6px", flexShrink: 0 }}>●</span>
                        {uc}
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: "24px", marginTop: "8px" }}>
                    <div>
                      <span style={{ fontSize: "32px", fontWeight: 600, color: t.accent }}>{slideScore?.best ?? 0}%</span>
                      <span style={{ fontSize: "12px", color: t.textTertiary, marginLeft: "8px" }}>best</span>
                    </div>
                    <div>
                      <span style={{ fontSize: "32px", fontWeight: 600, color: t.textPrimary }}>{slideScore?.attempts ?? 0}</span>
                      <span style={{ fontSize: "12px", color: t.textTertiary, marginLeft: "8px" }}>runs</span>
                    </div>
                  </div>
                </div>

                {/* Gold trim — bottom */}
                <div style={{ position: "absolute", bottom: 0, left: "40px", right: "40px", height: "1px", background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }} />
              </Link>

              <button
                onClick={() => { setSlideIndex((p) => (p + 1) % ENVIRONMENTS.length);  }}
                style={{ width: "40px", height: "40px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: t.surface, border: `1px solid ${t.border}`, color: t.textSecondary, flexShrink: 0 }}
              >
                <ChevronRight size={18} strokeWidth={1.5} />
              </button>
            </div>
          </>)}
        </div>
      </div>

      {/* --- Command Center Dock --- */}
      <div style={{ flexShrink: 0, padding: "0 32px 20px", display: "flex", justifyContent: "center" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            background: isDark ? "#151517" : "#E8E5DF",
            border: `1px solid ${GOLD_DIM}`,
            borderRadius: "20px",
            padding: "6px 8px",
            maxWidth: "720px",
            width: "100%",
          }}
        >
          {/* Logo pill */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "0 12px", height: "36px", borderRadius: "14px", background: t.surface, flexShrink: 0, border: `1px solid ${GOLD_DIM}` }}>
            <span style={{ fontSize: "13px", fontWeight: 700, color: t.accent }}>[~]</span>
            <span style={{ fontSize: "11px", fontWeight: 600, color: t.textSecondary }}>Signall</span>
          </div>

          {/* Gold divider */}
          <div style={{ width: "1px", height: "20px", background: GOLD_DIM, margin: "0 4px", flexShrink: 0 }} />

          {/* Environment nodes */}
          <div style={{ display: "flex", gap: "2px", flex: 1, justifyContent: "center" }}>
            {ENVIRONMENTS.map((env, i) => {
              const hasDone = !!(scores[env.id]?.best);
              const isHovered = hoveredDock === i;
              return (
                <button
                  key={env.id}
                  onClick={() => {
                    if (viewMode === "slideshow") {
                      setSlideIndex(i);
                      
                    } else {
                      setExpandedCard(i);
                    }
                  }}
                  onMouseEnter={() => setHoveredDock(i)}
                  onMouseLeave={() => setHoveredDock(null)}
                  title={env.name}
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "transparent",
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
                      background: hasDone ? t.accent : t.textTertiary,
                    }}
                  />
                  {isHovered && (
                    <div style={{
                      position: "absolute",
                      bottom: "100%",
                      left: "50%",
                      transform: "translateX(-50%)",
                      marginBottom: "8px",
                      padding: "5px 10px",
                      background: t.surface,
                      border: `1px solid ${GOLD_DIM}`,
                      borderRadius: "8px",
                      fontSize: "10px",
                      fontWeight: 500,
                      color: t.textPrimary,
                      whiteSpace: "nowrap",
                      pointerEvents: "none",
                      zIndex: 50,
                    }}>
                      {env.name}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Gold divider */}
          <div style={{ width: "1px", height: "20px", background: GOLD_DIM, margin: "0 4px", flexShrink: 0 }} />

          {/* Single CTA */}
          <Link href="/bandit?demo=true" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "0 16px", height: "36px", borderRadius: "14px", background: t.accent, color: "#fff", fontSize: "12px", fontWeight: 500, textDecoration: "none", flexShrink: 0, fontFamily: "inherit" }}>
            <Play size={12} strokeWidth={2} />
            Watch AI Learn
          </Link>
        </div>
      </div>
    </div>
  );
}
