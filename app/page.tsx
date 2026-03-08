"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { useRef } from "react";
import { Play, X, Copy, Check, ExternalLink, ChevronRight, Square, Activity } from "lucide-react";
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
  const [docsOpen, setDocsOpen] = useState(false);
  const [trainOpen, setTrainOpen] = useState(false);
  const [tryResult, setTryResult] = useState<Record<string, string>>({});

  // --- Training drawer state ---
  type HFEpisode = { episode: number; efficiency: number; reward: number };
  type HFLog = { total_episodes: number; total_steps: number; sessions: number; best_efficiency: number; avg_recent_efficiency: number; uptime_seconds: number; recent_episodes: HFEpisode[] };
  type TrainResult = { episode: number; totalReward: number; efficiency: number };
  type TrainAgent = { estimates: number[]; pullCounts: number[]; totalRewards: number[]; epsilon: number };

  const [hfLog, setHfLog] = useState<HFLog | null>(null);
  const [hfStatus, setHfStatus] = useState<"loading" | "live" | "offline">("loading");
  const [trainRunning, setTrainRunning] = useState(false);
  const [trainResults, setTrainResults] = useState<TrainResult[]>([]);
  const [trainAgent, setTrainAgent] = useState<TrainAgent>({ estimates: Array(6).fill(0), pullCounts: Array(6).fill(0), totalRewards: Array(6).fill(0), epsilon: 1.0 });
  const [trainMeans] = useState(() => { const m = [3.2, 5.8, 7.1, 4.5, 6.3, 2.9]; for (let i = m.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [m[i], m[j]] = [m[j], m[i]]; } return m; });
  const [trainVariances] = useState(() => Array.from({ length: 6 }, () => 1.5 + Math.random() * 2));
  const trainRunRef = useRef(false);
  const trainAgentRef = useRef<TrainAgent>({ estimates: Array(6).fill(0), pullCounts: Array(6).fill(0), totalRewards: Array(6).fill(0), epsilon: 1.0 });
  const [tryLoading, setTryLoading] = useState<string | null>(null);

  const tryEndpoint = useCallback(async (id: string, method: string, path: string, body?: object) => {
    setTryLoading(id);
    try {
      const opts: RequestInit = { method };
      if (body) {
        opts.headers = { "Content-Type": "application/json" };
        opts.body = JSON.stringify(body);
      }
      const r = await fetch(`${API_URL}${path}`, opts);
      const data = await r.json();
      setTryResult((prev) => ({ ...prev, [id]: JSON.stringify(data, null, 2) }));
    } catch (err) {
      setTryResult((prev) => ({ ...prev, [id]: `Error: ${err}` }));
    }
    setTryLoading(null);
  }, []);

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
      if (e.key === "Escape") { closeExpanded(); setDocsOpen(false); setTrainOpen(false); }
      if (expandedCard === null && !e.metaKey && !e.ctrlKey) {
        const num = e.key === "0" ? 10 : parseInt(e.key);
        if (num >= 1 && num <= 10) setExpandedCard(num - 1);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [expandedCard, closeExpanded]);

  // HuggingFace polling
  useEffect(() => {
    async function fetchHF() {
      try {
        const r = await fetch(`${API_URL}/training-log`);
        if (r.ok) { setHfLog(await r.json()); setHfStatus("live"); } else setHfStatus("offline");
      } catch { setHfStatus("offline"); }
    }
    fetchHF();
    const iv = setInterval(fetchHF, 8000);
    return () => clearInterval(iv);
  }, []);

  // Local training loop
  const startTrain = useCallback(() => {
    const fresh = { estimates: Array(6).fill(0), pullCounts: Array(6).fill(0), totalRewards: Array(6).fill(0), epsilon: 1.0 };
    trainAgentRef.current = fresh;
    setTrainAgent(fresh);
    setTrainResults([]);
    setTrainRunning(true);
    trainRunRef.current = true;
  }, []);

  const stopTrain = useCallback(() => { setTrainRunning(false); trainRunRef.current = false; }, []);

  useEffect(() => {
    if (!trainRunning) return;
    let ep = 0;
    const step = () => {
      if (!trainRunRef.current || ep >= 80) { setTrainRunning(false); trainRunRef.current = false; return; }
      const a = { ...trainAgentRef.current, estimates: [...trainAgentRef.current.estimates], pullCounts: [...trainAgentRef.current.pullCounts], totalRewards: [...trainAgentRef.current.totalRewards], epsilon: Math.max(0.05, 1.0 - ep * 0.02) };
      let reward = 0;
      for (let r = 0; r < 25; r++) {
        const choice = Math.random() < a.epsilon ? Math.floor(Math.random() * 6) : a.estimates.indexOf(Math.max(...a.estimates));
        let u1 = 0, u2 = 0; while (u1 === 0) u1 = Math.random(); while (u2 === 0) u2 = Math.random();
        const val = trainMeans[choice] + Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2) * Math.sqrt(trainVariances[choice]);
        reward += val; a.pullCounts[choice]++; a.totalRewards[choice] += val; a.estimates[choice] = a.totalRewards[choice] / a.pullCounts[choice];
      }
      trainAgentRef.current = a; setTrainAgent({ ...a });
      setTrainResults(prev => [...prev, { episode: ep + 1, totalReward: reward, efficiency: Math.round((reward / (Math.max(...trainMeans) * 25)) * 100) }]);
      ep++; setTimeout(step, 60);
    };
    step();
  }, [trainRunning, trainMeans, trainVariances]);

  const completedCount = ENVIRONMENTS.filter((e) => scores[e.id]).length;
  const avgEfficiency = completedCount > 0
    ? Math.round(Object.values(scores).reduce((s, v) => s + v.best, 0) / completedCount)
    : 0;

  return (
    <>
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
              <div style={{ width: "100%", height: "100%", background: t.bg, borderRadius: "24px", border: `1px solid ${GOLD_DIM}`, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderBottom: `1px solid ${t.border}`, flexShrink: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <Avatar index={expandedCard} />
                    <span style={{ fontSize: "13px", fontWeight: 600, color: t.textPrimary }}>{xEnv.name}</span>
                    <span style={{ fontSize: "10px", color: GOLD, letterSpacing: "0.04em", textTransform: "uppercase" }}>{xGroup?.label}</span>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button onClick={() => setPlayingMode(playingMode === "agent" ? "play" : "agent")} style={{ height: "28px", padding: "0 12px", borderRadius: "8px", border: `1px solid ${t.border}`, background: "transparent", color: t.textSecondary, fontSize: "11px", fontWeight: 500 }}>
                      {playingMode === "agent" ? "Switch to Play" : "Switch to Agent"}
                    </button>
                    <button onClick={closeExpanded} style={{ background: "none", border: "none", color: t.textTertiary, padding: "4px" }}>
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
                    minHeight: "110px",
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
                  <div style={{ fontSize: "10px", color: t.textTertiary, lineHeight: 1.4, marginTop: "8px", flex: 1 }}>
                    {env.capability}
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

          {/* Docs button */}
          <button
            onClick={() => { setDocsOpen((d) => !d); setTrainOpen(false); }}
            style={{
              display: "flex", alignItems: "center", gap: "4px",
              height: "36px", padding: "0 12px", borderRadius: "10px",
              background: docsOpen ? t.accent : t.surface,
              border: `1px solid ${docsOpen ? t.accent : t.border}`,
              color: docsOpen ? "#fff" : t.textSecondary,
              fontSize: "11px", fontWeight: 500, flexShrink: 0,
            }}
          >
            Docs
          </button>

          {/* Train button */}
          <button
            onClick={() => { setTrainOpen((d) => !d); setDocsOpen(false); }}
            style={{
              display: "flex", alignItems: "center", gap: "4px",
              height: "36px", padding: "0 12px", borderRadius: "10px",
              background: trainOpen ? t.accent : t.surface,
              border: `1px solid ${trainOpen ? t.accent : t.border}`,
              color: trainOpen ? "#fff" : t.textSecondary,
              fontSize: "11px", fontWeight: 500, flexShrink: 0,
            }}
          >
            <Activity size={12} strokeWidth={1.5} />
            Train
          </button>

          <div style={{ width: "1px", height: "20px", background: GOLD_DIM, margin: "0 6px", flexShrink: 0 }} />

          {/* CTA */}
          <Link href="/bandit?demo=true" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "0 16px", height: "36px", borderRadius: "14px", background: t.accent, color: "#fff", fontSize: "12px", fontWeight: 500, textDecoration: "none", flexShrink: 0, fontFamily: "inherit" }}>
            <Play size={12} strokeWidth={2} />
            Watch AI Learn
          </Link>
        </div>
      </div>

    </div>

      {/* --- API Docs Drawer (outside viewport panel) --- */}
      <div className={`docs-drawer ${docsOpen ? "docs-drawer-open" : ""}`}>
        <div style={{
          height: "100%",
          background: t.surface,
          borderRadius: "20px",
          border: `1px solid ${GOLD_DIM}`,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}>
          {/* Drawer header */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "20px 24px",
            borderBottom: `1px solid ${t.border}`,
            flexShrink: 0,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#4ADE80" }} />
              <span style={{ fontSize: "13px", fontWeight: 600, color: t.textPrimary }}>API Reference</span>
              <span style={{ fontSize: "10px", color: "#8B7A52", letterSpacing: "0.04em", fontWeight: 500 }}>OPENENV 1.0</span>
            </div>
            <button onClick={() => setDocsOpen(false)} style={{ background: "none", border: "none", color: t.textTertiary, padding: "4px" }}>
              <X size={16} strokeWidth={1.5} />
            </button>
          </div>

          {/* Drawer content */}
          <div style={{ flex: 1, overflow: "auto", padding: "20px 24px" }}>
            {/* Endpoint */}
            <div style={{ marginBottom: "20px" }}>
              <div style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: t.textSecondary, marginBottom: "6px" }}>Base URL</div>
              <button
                onClick={copyEndpoint}
                style={{
                  width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 12px", background: "#F5F3EF", border: `1px solid ${t.border}`, borderRadius: "10px",
                  color: "#3D3D3A", fontSize: "11px", fontFamily: "var(--font-mono, monospace)", textAlign: "left",
                }}
              >
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{API_URL}</span>
                {copied ? <Check size={12} strokeWidth={2} style={{ color: "#4ADE80", flexShrink: 0 }} /> : <Copy size={12} strokeWidth={1.5} style={{ flexShrink: 0 }} />}
              </button>
            </div>

            {/* Validation badge */}
            <div style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "10px 14px", borderRadius: "10px",
              background: "rgba(74, 222, 128, 0.06)", border: "1px solid rgba(74, 222, 128, 0.15)",
              marginBottom: "24px",
            }}>
              <Check size={12} strokeWidth={2} style={{ color: "#22A55B" }} />
              <span style={{ fontSize: "11px", color: "#22A55B", fontWeight: 500 }}>OpenEnv Validated · 6/6</span>
            </div>

            {/* Endpoints */}
            {[
              {
                id: "reset",
                method: "POST",
                path: "/reset",
                desc: "Start a new episode. Returns initial observation with round count and score.",
                example: {},
                tryFn: () => tryEndpoint("reset", "POST", "/reset", {}),
              },
              {
                id: "step",
                method: "POST",
                path: "/step",
                desc: "Pull arm 0–5. Returns reward, running score, and done flag after 25 rounds.",
                example: { action: { source_id: 3 } },
                tryFn: () => tryEndpoint("step", "POST", "/step", { action: { source_id: Math.floor(Math.random() * 6) } }),
              },
              {
                id: "state",
                method: "GET",
                path: "/state",
                desc: "Returns episode ID and step count for the current session.",
                tryFn: () => tryEndpoint("state", "GET", "/state"),
              },
              {
                id: "schema",
                method: "GET",
                path: "/schema",
                desc: "Returns typed schemas for BanditAction and BanditObservation.",
                tryFn: () => tryEndpoint("schema", "GET", "/schema"),
              },
              {
                id: "mcp",
                method: "POST",
                path: "/mcp",
                desc: "Model Context Protocol. Any LLM can discover and call environment tools.",
                example: { jsonrpc: "2.0", method: "tools/list", id: 1 },
                tryFn: () => tryEndpoint("mcp", "POST", "/mcp", { jsonrpc: "2.0", method: "tools/list", id: 1 }),
              },
              {
                id: "health",
                method: "GET",
                path: "/health",
                desc: "Returns healthy when the environment is running and accepting connections.",
                tryFn: () => tryEndpoint("health", "GET", "/health"),
              },
            ].map((ep, epIdx) => (
              <div key={ep.id} style={{ paddingBottom: "20px", marginBottom: "20px", borderBottom: epIdx < 5 ? `1px solid ${t.border}` : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <span style={{
                    fontSize: "9px", fontWeight: 700, letterSpacing: "0.04em",
                    padding: "2px 6px", borderRadius: "4px",
                    background: ep.method === "POST" ? "rgba(224, 90, 0, 0.1)" : "rgba(34, 165, 91, 0.1)",
                    color: ep.method === "POST" ? t.accent : "#1A7A40",
                  }}>
                    {ep.method}
                  </span>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: t.textPrimary, fontFamily: "var(--font-mono, monospace)" }}>
                    {ep.path}
                  </span>
                </div>
                <div style={{ fontSize: "11px", color: t.textSecondary, marginBottom: "8px" }}>{ep.desc}</div>

                {ep.example && (
                  <pre style={{
                    fontSize: "10px", lineHeight: 1.5, color: "#3D3D3A",
                    background: "#F5F3EF", border: `1px solid ${t.border}`, borderRadius: "8px",
                    padding: "10px 12px", margin: "0 0 8px 0", overflow: "auto",
                    fontFamily: "var(--font-mono, monospace)",
                  }}>
                    {JSON.stringify(ep.example, null, 2)}
                  </pre>
                )}

                <button
                  onClick={ep.tryFn}
                  disabled={tryLoading === ep.id}
                  style={{
                    display: "flex", alignItems: "center", gap: "5px",
                    height: "28px", padding: "0 10px", borderRadius: "6px",
                    background: "transparent", border: `1px solid ${t.border}`,
                    color: tryLoading === ep.id ? t.textTertiary : t.accent,
                    fontSize: "10px", fontWeight: 600,
                  }}
                >
                  {tryLoading === ep.id ? "Loading..." : <>Try it <ChevronRight size={10} strokeWidth={2} /></>}
                </button>

                {tryResult[ep.id] && (
                  <pre style={{
                    fontSize: "10px", lineHeight: 1.4, color: "#1A6B3A",
                    background: "rgba(34, 165, 91, 0.06)", border: "1px solid rgba(34, 165, 91, 0.18)",
                    borderRadius: "8px", padding: "10px 12px", margin: "8px 0 0 0",
                    overflow: "auto", maxHeight: "120px",
                    fontFamily: "var(--font-mono, monospace)",
                  }}>
                    {tryResult[ep.id]}
                  </pre>
                )}
              </div>
            ))}

            {/* Quick start */}
            <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: "20px", marginTop: "8px" }}>
              <div style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: GOLD, marginBottom: "10px" }}>Quick Start</div>
              <pre style={{
                fontSize: "10px", lineHeight: 1.6, color: "#3D3D3A",
                background: "#F5F3EF", border: `1px solid ${t.border}`, borderRadius: "8px",
                padding: "14px 16px", margin: 0, overflow: "auto",
                fontFamily: "var(--font-mono, monospace)",
              }}>
{`from openenv.core import GenericEnvClient

async with GenericEnvClient(
    base_url="${API_URL}"
) as client:
    obs = await client.reset()
    for _ in range(25):
        result = await client.step(
            {"source_id": best_arm}
        )
        print(result.reward)`}
              </pre>
            </div>
          </div>
        </div>
      </div>

      {/* --- Training Drawer --- */}
      <div className={`train-drawer ${trainOpen ? "train-drawer-open" : ""}`}>
        <div style={{ height: "100%", background: t.surface, borderRadius: "20px", border: `1px solid ${GOLD_DIM}`, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: `1px solid ${t.border}`, flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: hfStatus === "live" ? "#22A55B" : hfStatus === "loading" ? t.textTertiary : t.accent }} />
              <span style={{ fontSize: "13px", fontWeight: 600, color: t.textPrimary }}>Training</span>
              <span style={{ fontSize: "10px", color: t.textTertiary }}>
                {hfStatus === "live" ? "HuggingFace connected" : hfStatus === "loading" ? "connecting..." : "offline"}
              </span>
            </div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              {!trainRunning ? (
                <button onClick={startTrain} style={{ display: "flex", alignItems: "center", gap: "4px", height: "28px", padding: "0 10px", borderRadius: "8px", background: t.accent, color: "#fff", border: "none", fontSize: "10px", fontWeight: 600 }}>
                  <Play size={10} strokeWidth={2} /> Train
                </button>
              ) : (
                <button onClick={stopTrain} style={{ display: "flex", alignItems: "center", gap: "4px", height: "28px", padding: "0 10px", borderRadius: "8px", background: "transparent", color: t.textSecondary, border: `1px solid ${t.border}`, fontSize: "10px", fontWeight: 600 }}>
                  <Square size={10} strokeWidth={2} /> Stop
                </button>
              )}
              <button onClick={() => setTrainOpen(false)} style={{ background: "none", border: "none", color: t.textTertiary, padding: "4px" }}>
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>
          </div>

          {/* Content */}
          {(() => {
            // Compute all metrics once
            const isLive = hfLog && !trainRunning;
            const episodes = isLive ? hfLog.total_episodes : trainResults.length;
            const steps = isLive ? hfLog.total_steps : trainResults.length * 25;
            const bestEff = isLive ? hfLog.best_efficiency : (trainResults.length > 0 ? Math.max(...trainResults.map(r => r.efficiency)) : 0);
            const avgEff = isLive ? hfLog.avg_recent_efficiency : (trainResults.length >= 5 ? Math.round(trainResults.slice(-5).reduce((s, r) => s + r.efficiency, 0) / 5) : (trainResults[trainResults.length - 1]?.efficiency ?? 0));
            const totalPulls = trainAgent.pullCounts.reduce((a, b) => a + b, 0);
            const epsilon = trainAgent.epsilon;
            const bestArmIdx = trainMeans.indexOf(Math.max(...trainMeans));
            const bestArmEst = trainAgent.estimates[bestArmIdx];
            const bestArmTrue = trainMeans[bestArmIdx];
            const convergenceGap = bestArmEst > 0 ? Math.abs(bestArmEst - bestArmTrue) : bestArmTrue;
            const exploitRate = totalPulls > 0 ? Math.round((trainAgent.pullCounts[bestArmIdx] / totalPulls) * 100) : 0;

            // Chart data
            const hfEff = hfLog?.recent_episodes.map(e => e.efficiency) ?? [];
            const localEff = trainResults.map(r => r.efficiency);
            const showLoc = trainRunning || (trainResults.length > 0 && hfEff.length === 0);
            const chartData = showLoc ? localEff : hfEff;
            const chartLabel = showLoc ? "Local" : "HuggingFace";

            // Episode data
            const hfEps = hfLog?.recent_episodes ?? [];
            const episodeList = showLoc ? trainResults.slice(-6).reverse() : hfEps.slice(-6).reverse();

            const mc = (label: string, value: string | number, desc: string, isAccent?: boolean) => (
              <div style={{ background: t.bg, border: `1px solid ${t.border}`, borderRadius: "10px", padding: "10px 12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "2px" }}>
                  <div style={{ fontSize: "8px", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: t.textTertiary }}>{label}</div>
                </div>
                <div style={{ fontSize: "20px", fontWeight: 600, color: isAccent ? t.accent : t.textPrimary, letterSpacing: "-0.02em", lineHeight: 1.1, marginBottom: "4px" }}>{value}</div>
                <div style={{ fontSize: "9px", color: t.textTertiary, lineHeight: 1.3 }}>{desc}</div>
              </div>
            );

            return (
              <div style={{ flex: 1, overflow: "auto", padding: "16px 20px" }}>
                {/* Primary metrics — 2x2 grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", marginBottom: "12px" }}>
                  {mc("Episodes", episodes, "Complete training runs")}
                  {mc("Best Score", `${bestEff}%`, "Highest single-episode efficiency", true)}
                  {mc("Avg Recent", `${avgEff}%`, "Moving average of last 5 runs")}
                  {mc("Total Steps", steps.toLocaleString(), "Individual decisions the agent made")}
                </div>

                {/* Agent intelligence metrics — 2x2 grid */}
                {totalPulls > 0 && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", marginBottom: "12px" }}>
                    {mc("Exploit Rate", `${exploitRate}%`, "How often agent picks its best option")}
                    {mc("Convergence", convergenceGap < 0.5 ? "Locked" : `Δ${convergenceGap.toFixed(1)}`, convergenceGap < 0.5 ? "Agent found the true best arm" : "Gap between estimate and reality")}
                    {mc("Epsilon", epsilon.toFixed(2), epsilon > 0.5 ? "Still exploring broadly" : epsilon > 0.1 ? "Narrowing down choices" : "Committed to best option")}
                    {mc("Sessions", isLive ? `${hfLog.sessions}` : "1", "Unique agents that have connected")}
                  </div>
                )}

                {/* Learning curve */}
                {chartData.length > 0 ? (
                  <div style={{ background: t.bg, border: `1px solid ${t.border}`, borderRadius: "10px", padding: "12px 14px", marginBottom: "12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <span style={{ fontSize: "8px", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: t.textTertiary }}>Learning Curve</span>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <div style={{ width: "4px", height: "4px", borderRadius: "50%", background: showLoc ? t.textTertiary : "#22A55B" }} />
                        <span style={{ fontSize: "8px", color: t.textTertiary }}>{chartLabel}</span>
                      </div>
                    </div>
                    {(() => {
                      const w = 380, h = 90, pl = 28, pr = 8, pt = 4, pb = 14, cw = w - pl - pr, ch = h - pt - pb;
                      const pts = chartData.map((eff, i) => `${pl + (i / Math.max(chartData.length - 1, 1)) * cw},${pt + ch - (Math.min(eff, 100) / 100) * ch}`);
                      const avg: string[] = [];
                      for (let i = 0; i < chartData.length; i++) {
                        const sl = chartData.slice(Math.max(0, i - 4), i + 1);
                        avg.push(`${pl + (i / Math.max(chartData.length - 1, 1)) * cw},${pt + ch - (Math.min(sl.reduce((s, v) => s + v, 0) / sl.length, 100) / 100) * ch}`);
                      }
                      return (
                        <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: "auto" }}>
                          {[0, 50, 100].map(v => { const y = pt + ch - (v / 100) * ch; return <g key={v}><line x1={pl} y1={y} x2={w - pr} y2={y} stroke={t.border} strokeWidth={0.5} /><text x={pl - 4} y={y + 3} textAnchor="end" fill={t.textTertiary} fontSize={7}>{v}</text></g>; })}
                          <polyline points={pts.join(" ")} fill="none" stroke={t.accent} strokeWidth={1} opacity={0.2} />
                          {avg.length > 1 && <polyline points={avg.join(" ")} fill="none" stroke={t.accent} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />}
                        </svg>
                      );
                    })()}
                  </div>
                ) : (
                  <div style={{ background: t.bg, border: `1px solid ${t.border}`, borderRadius: "10px", padding: "24px 16px", textAlign: "center", color: t.textTertiary, fontSize: "11px", marginBottom: "12px" }}>
                    Press Train or run <span style={{ fontFamily: "var(--font-mono)", color: t.textSecondary }}>train_agent.py</span>
                  </div>
                )}

                {/* Agent knowledge — arm estimates */}
                {totalPulls > 0 && (
                  <div style={{ background: t.bg, border: `1px solid ${t.border}`, borderRadius: "10px", padding: "12px 14px", marginBottom: "12px" }}>
                    <div style={{ fontSize: "8px", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: t.textTertiary, marginBottom: "4px" }}>
                      Accuracy per option
                    </div>
                    <div style={{ fontSize: "9px", color: t.textTertiary, marginBottom: "8px", lineHeight: 1.4 }}>
                      6 options exist. Each bar shows how close the agent&apos;s guess (dark) is to the real value (light). Closer = smarter.
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      {trainMeans.map((trueMean, i) => {
                        const est = trainAgent.estimates[i];
                        const isBest = i === bestArmIdx;
                        const pulls = trainAgent.pullCounts[i];
                        return (
                          <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{ fontSize: "9px", fontWeight: 600, color: isBest ? t.accent : t.textTertiary, width: "10px" }}>{String.fromCharCode(65 + i)}</span>
                            <div style={{ flex: 1, position: "relative", height: "8px" }}>
                              <div style={{ position: "absolute", top: 0, left: 0, height: "100%", width: `${Math.min(100, trueMean / 10 * 100)}%`, background: t.border, borderRadius: "2px" }} />
                              <div style={{ position: "absolute", top: 0, left: 0, height: "100%", width: `${Math.min(100, est / 10 * 100)}%`, background: isBest ? t.accent : t.textTertiary, borderRadius: "2px", opacity: 0.7 }} />
                            </div>
                            <span style={{ fontSize: "8px", color: t.textSecondary, width: "48px", textAlign: "right" }}>
                              {pulls > 0 ? est.toFixed(1) : "—"}/{trueMean.toFixed(1)}
                            </span>
                            <span style={{ fontSize: "7px", color: t.textTertiary, width: "24px", textAlign: "right" }}>
                              {pulls}×
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Recent runs */}
                {episodeList.length > 0 && (
                  <div style={{ background: t.bg, border: `1px solid ${t.border}`, borderRadius: "10px", padding: "12px 14px" }}>
                    <div style={{ fontSize: "8px", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: t.textTertiary, marginBottom: "4px" }}>Score history</div>
                    <div style={{ fontSize: "9px", color: t.textTertiary, marginBottom: "6px", lineHeight: 1.4 }}>
                      Each bar is one complete game. Higher % = the agent made better decisions. A rising trend means it&apos;s learning.
                    </div>
                    {episodeList.map((ep, i) => {
                      const eff = "efficiency" in ep ? ep.efficiency : 0;
                      const epNum = "episode" in ep ? ep.episode : i;
                      return (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "3px 0" }}>
                          <span style={{ fontSize: "9px", color: t.textTertiary, width: "18px", flexShrink: 0 }}>{epNum}</span>
                          <div style={{ flex: 1, height: "4px", background: t.border, borderRadius: "2px", overflow: "hidden" }}>
                            <div style={{ width: `${Math.min(eff, 100)}%`, height: "100%", background: t.accent, borderRadius: "2px" }} />
                          </div>
                          <span style={{ fontSize: "10px", fontWeight: 500, color: t.textPrimary, width: "28px", textAlign: "right", flexShrink: 0 }}>{eff}%</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>
    </>
  );
}
