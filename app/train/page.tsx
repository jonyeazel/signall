"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Play, Square } from "lucide-react";

const HF_SPACE = "https://jonyeazel-cognitive-primitives-bandit.hf.space";
const GOLD = "#C9A96E";
const GOLD_DIM = "rgba(201, 169, 110, 0.25)";

// Light palette to match home page
const C = {
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

const card: React.CSSProperties = {
  background: C.surface,
  border: `1px solid ${C.border}`,
  borderRadius: "16px",
};

const buttonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  height: "44px",
  padding: "0 24px",
  background: C.accent,
  color: "#FFFFFF",
  border: "none",
  borderRadius: "16px",
  fontSize: "13px",
  fontWeight: 500,
  fontFamily: "inherit",
  letterSpacing: "0.01em",
  cursor: "pointer",
};

const ghostButton: React.CSSProperties = {
  ...buttonStyle,
  background: "transparent",
  color: C.textSecondary,
  border: `1px solid ${C.border}`,
};

type HFEpisode = { episode: number; efficiency: number; reward: number };
type HFLog = {
  total_episodes: number;
  total_steps: number;
  sessions: number;
  best_efficiency: number;
  avg_recent_efficiency: number;
  uptime_seconds: number;
  recent_episodes: HFEpisode[];
};

// --- Local simulation (kept for quick in-browser demo) ---

const NUM_SOURCES = 6;
const ROUNDS_PER_EPISODE = 25;
const BASE_MEANS = [3.2, 5.8, 7.1, 4.5, 6.3, 2.9];
const TOTAL_EPISODES = 80;

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function gaussianRandom(mean: number, variance: number): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return mean + Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v) * Math.sqrt(variance);
}

type AgentState = { estimates: number[]; pullCounts: number[]; totalRewards: number[]; epsilon: number; };
type EpisodeResult = { episode: number; totalReward: number; efficiency: number; };

function initAgent(): AgentState {
  return { estimates: new Array(NUM_SOURCES).fill(0), pullCounts: new Array(NUM_SOURCES).fill(0), totalRewards: new Array(NUM_SOURCES).fill(0), epsilon: 1.0 };
}

function runEpisode(agent: AgentState, episodeNum: number, means: number[], variances: number[]): { result: EpisodeResult; updatedAgent: AgentState } {
  const a = { estimates: [...agent.estimates], pullCounts: [...agent.pullCounts], totalRewards: [...agent.totalRewards], epsilon: Math.max(0.05, 1.0 - episodeNum * 0.02) };
  let totalReward = 0;
  for (let round = 0; round < ROUNDS_PER_EPISODE; round++) {
    const choice = Math.random() < a.epsilon ? Math.floor(Math.random() * NUM_SOURCES) : a.estimates.indexOf(Math.max(...a.estimates));
    const reward = gaussianRandom(means[choice], variances[choice]);
    totalReward += reward;
    a.pullCounts[choice]++;
    a.totalRewards[choice] += reward;
    a.estimates[choice] = a.totalRewards[choice] / a.pullCounts[choice];
  }
  return { result: { episode: episodeNum + 1, totalReward, efficiency: Math.round((totalReward / (Math.max(...means) * ROUNDS_PER_EPISODE)) * 100) }, updatedAgent: a };
}

// --- Chart: renders either HF data or local data ---

function LearningCurve({ efficiencies }: { efficiencies: number[] }) {
  const w = 600, h = 140, pl = 36, pr = 12, pt = 8, pb = 20;
  const cw = w - pl - pr, ch = h - pt - pb;
  if (efficiencies.length === 0) return null;

  const points = efficiencies.map((eff, i) => {
    const x = pl + (i / Math.max(efficiencies.length - 1, 1)) * cw;
    const y = pt + ch - (Math.min(eff, 100) / 100) * ch;
    return `${x},${y}`;
  });

  // Moving average
  const avg: string[] = [];
  for (let i = 0; i < efficiencies.length; i++) {
    const slice = efficiencies.slice(Math.max(0, i - 4), i + 1);
    const a = slice.reduce((s, v) => s + v, 0) / slice.length;
    const x = pl + (i / Math.max(efficiencies.length - 1, 1)) * cw;
    const y = pt + ch - (Math.min(a, 100) / 100) * ch;
    avg.push(`${x},${y}`);
  }

  const lastAvg = avg[avg.length - 1]?.split(",");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: "auto" }}>
      {[0, 25, 50, 75, 100].map((v) => {
        const y = pt + ch - (v / 100) * ch;
        return (
          <g key={v}>
            <line x1={pl} y1={y} x2={w - pr} y2={y} stroke={C.border} strokeWidth={0.5} />
            <text x={pl - 5} y={y + 3} textAnchor="end" fill={C.textTertiary} fontSize={8}>{v}</text>
          </g>
        );
      })}
      <polyline points={points.join(" ")} fill="none" stroke={C.accent} strokeWidth={1} opacity={0.2} />
      {avg.length > 1 && <polyline points={avg.join(" ")} fill="none" stroke={C.accent} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />}
      {lastAvg && <circle cx={Number(lastAvg[0])} cy={Number(lastAvg[1])} r={3.5} fill={C.accent} style={{ filter: `drop-shadow(0 0 6px ${C.accent})` }} />}
    </svg>
  );
}

// --- Main page ---

export default function TrainPage() {
  // Local simulation state
  const [isRunning, setIsRunning] = useState(false);
  const [localResults, setLocalResults] = useState<EpisodeResult[]>([]);
  const [agent, setAgent] = useState<AgentState>(initAgent);
  const [means] = useState(() => shuffle(BASE_MEANS));
  const [variances] = useState(() => Array.from({ length: NUM_SOURCES }, () => 1.5 + Math.random() * 2));
  const runningRef = useRef(false);
  const agentRef = useRef<AgentState>(initAgent());

  // HuggingFace state
  const [hfLog, setHfLog] = useState<HFLog | null>(null);
  const [hfStatus, setHfStatus] = useState<"loading" | "live" | "offline">("loading");

  // Fetch HF data
  useEffect(() => {
    async function fetchHF() {
      try {
        const res = await fetch(`${HF_SPACE}/training-log`);
        if (res.ok) { setHfLog(await res.json()); setHfStatus("live"); }
        else setHfStatus("offline");
      } catch { setHfStatus("offline"); }
    }
    fetchHF();
    const interval = setInterval(fetchHF, 8000);
    return () => clearInterval(interval);
  }, []);

  // Local training loop
  const startTraining = useCallback(() => {
    const freshAgent = initAgent();
    agentRef.current = freshAgent;
    setAgent(freshAgent);
    setLocalResults([]);
    setIsRunning(true);
    runningRef.current = true;
  }, []);

  const stopTraining = useCallback(() => {
    setIsRunning(false);
    runningRef.current = false;
  }, []);

  useEffect(() => {
    if (!isRunning) return;
    let ep = 0;
    const step = () => {
      if (!runningRef.current || ep >= TOTAL_EPISODES) { setIsRunning(false); runningRef.current = false; return; }
      const { result, updatedAgent } = runEpisode(agentRef.current, ep, means, variances);
      agentRef.current = updatedAgent;
      setAgent({ ...updatedAgent });
      setLocalResults((prev) => [...prev, result]);
      ep++;
      setTimeout(step, 60);
    };
    step();
  }, [isRunning, means, variances]);

  // Derived
  const bestArmIndex = means.indexOf(Math.max(...means));
  const localBest = localResults.length > 0 ? Math.max(...localResults.map((r) => r.efficiency)) : 0;
  const localAvg = localResults.length >= 5 ? Math.round(localResults.slice(-5).reduce((s, r) => s + r.efficiency, 0) / 5) : localResults[localResults.length - 1]?.efficiency ?? 0;

  // Choose which data to show in the chart: HF if available, local if training
  const hfEfficiencies = hfLog?.recent_episodes.map((e) => e.efficiency) ?? [];
  const localEfficiencies = localResults.map((r) => r.efficiency);
  const showLocal = isRunning || (localResults.length > 0 && hfEfficiencies.length === 0);
  const chartData = showLocal ? localEfficiencies : hfEfficiencies;
  const chartLabel = showLocal ? "Local simulation" : "HuggingFace (live)";

  return (
    <div style={{
      position: "fixed",
      inset: "12px",
      background: C.bg,
      borderRadius: "24px",
      border: `1px solid ${GOLD_DIM}`,
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
    }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "24px 32px", overflow: "hidden" }}>
        <div style={{ maxWidth: "720px", width: "100%", margin: "0 auto", flex: 1, display: "flex", flexDirection: "column" }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <Link href="/" className="back-btn" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "32px", height: "32px", borderRadius: "12px", border: `1px solid ${C.border}`, background: C.surface, color: C.textTertiary, textDecoration: "none" }}>
                <ArrowLeft size={14} strokeWidth={1.5} />
              </Link>
              <span style={{ fontSize: "13px", fontWeight: 700, color: C.accent }}>[~]</span>
              <span style={{ fontSize: "14px", fontWeight: 600, color: C.textPrimary }}>Signall</span>
              <span style={{ fontSize: "10px", color: GOLD }}>·</span>
              <span style={{ fontSize: "11px", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: C.textTertiary }}>Training Dashboard</span>
            </div>
            {!isRunning ? (
              <button style={{ ...buttonStyle, height: "36px", padding: "0 18px", fontSize: "12px" }} onClick={startTraining}>
                <Play size={12} strokeWidth={2} />
                {localResults.length > 0 ? "Restart" : "Train"}
              </button>
            ) : (
              <button style={{ ...ghostButton, height: "36px", padding: "0 18px", fontSize: "12px" }} onClick={stopTraining}>
                <Square size={12} strokeWidth={2} />
                Stop
              </button>
            )}
          </div>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px", marginBottom: "16px", flexShrink: 0 }}>
          <div style={{ ...card, padding: "12px 14px", position: "relative" }}>
            <div style={{ position: "absolute", top: 0, left: "14px", right: "14px", height: "1px", background: `linear-gradient(90deg, transparent, ${GOLD_DIM}, transparent)` }} />
            <div style={{ fontSize: "8px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: C.textTertiary, marginBottom: "4px" }}>Episodes</div>
            <div style={{ fontSize: "22px", fontWeight: 600, color: C.textPrimary, letterSpacing: "-0.02em" }}>
              {hfLog ? hfLog.total_episodes : localResults.length}
            </div>
          </div>
          <div style={{ ...card, padding: "12px 14px", position: "relative" }}>
            <div style={{ position: "absolute", top: 0, left: "14px", right: "14px", height: "1px", background: `linear-gradient(90deg, transparent, ${GOLD_DIM}, transparent)` }} />
            <div style={{ fontSize: "8px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: C.textTertiary, marginBottom: "4px" }}>Total Steps</div>
            <div style={{ fontSize: "22px", fontWeight: 600, color: C.textPrimary, letterSpacing: "-0.02em" }}>
              {hfLog ? hfLog.total_steps : localResults.length * ROUNDS_PER_EPISODE}
            </div>
          </div>
          <div style={{ ...card, padding: "12px 14px", position: "relative" }}>
            <div style={{ position: "absolute", top: 0, left: "14px", right: "14px", height: "1px", background: `linear-gradient(90deg, transparent, ${GOLD_DIM}, transparent)` }} />
            <div style={{ fontSize: "8px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: C.textTertiary, marginBottom: "4px" }}>Best</div>
            <div style={{ fontSize: "22px", fontWeight: 600, color: C.accent, letterSpacing: "-0.02em" }}>
              {hfLog ? hfLog.best_efficiency : localBest}%
            </div>
          </div>
          <div style={{ ...card, padding: "12px 14px", position: "relative" }}>
            <div style={{ position: "absolute", top: 0, left: "14px", right: "14px", height: "1px", background: `linear-gradient(90deg, transparent, ${GOLD_DIM}, transparent)` }} />
            <div style={{ fontSize: "8px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: C.textTertiary, marginBottom: "4px" }}>
              {showLocal ? "Avg (5)" : "Avg Recent"}
            </div>
            <div style={{ fontSize: "22px", fontWeight: 600, color: C.textPrimary, letterSpacing: "-0.02em" }}>
              {hfLog && !showLocal ? hfLog.avg_recent_efficiency : localAvg}%
            </div>
          </div>
        </div>

        {/* Learning curve */}
        <div style={{ ...card, padding: "16px 20px", marginBottom: "12px", position: "relative" }}>
          <div style={{ position: "absolute", top: 0, left: "20px", right: "20px", height: "1px", background: `linear-gradient(90deg, transparent, ${GOLD_DIM}, transparent)` }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "8px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: C.textTertiary }}>Learning Curve</span>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: showLocal ? C.textTertiary : "#4ADE80" }} />
              <span style={{ fontSize: "9px", color: C.textTertiary }}>{chartLabel}</span>
            </div>
          </div>
          {chartData.length > 0 ? (
            <LearningCurve efficiencies={chartData} />
          ) : (
            <div style={{ height: "140px", display: "flex", alignItems: "center", justifyContent: "center", color: C.textTertiary, fontSize: "13px" }}>
              {hfStatus === "loading" ? "Connecting to HuggingFace..." : "Press Train or run train_agent.py"}
            </div>
          )}
        </div>

        {/* Bottom section: episode history + agent estimates */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", flex: 1, minHeight: 0 }}>
          {/* Episode history */}
          <div style={{ ...card, padding: "14px 16px", display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
            <div style={{ position: "absolute", top: 0, left: "16px", right: "16px", height: "1px", background: `linear-gradient(90deg, transparent, ${GOLD_DIM}, transparent)` }} />
            <div style={{ fontSize: "8px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: C.textTertiary, marginBottom: "10px" }}>
              Recent Episodes
            </div>
            <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column", gap: "4px" }}>
              {(showLocal ? localResults.slice(-10).reverse() : (hfLog?.recent_episodes ?? []).slice(-10).reverse()).map((ep, i) => {
                const eff = "efficiency" in ep ? ep.efficiency : 0;
                const rew = "totalReward" in ep ? (ep as EpisodeResult).totalReward : (ep as HFEpisode).reward;
                const epNum = "episode" in ep ? ep.episode : i;
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "4px 0" }}>
                    <span style={{ fontSize: "10px", color: C.textTertiary, width: "24px", flexShrink: 0 }}>{epNum}</span>
                    <div style={{ flex: 1, height: "6px", background: C.border, borderRadius: "3px", overflow: "hidden" }}>
                      <div style={{ width: `${Math.min(eff, 100)}%`, height: "100%", background: C.accent, borderRadius: "3px" }} />
                    </div>
                    <span style={{ fontSize: "11px", fontWeight: 500, color: C.textPrimary, width: "36px", textAlign: "right", flexShrink: 0 }}>{eff}%</span>
                    <span style={{ fontSize: "9px", color: C.textTertiary, width: "40px", textAlign: "right", flexShrink: 0 }}>{typeof rew === "number" ? rew.toFixed(0) : rew}</span>
                  </div>
                );
              })}
              {chartData.length === 0 && (
                <div style={{ color: C.textTertiary, fontSize: "11px", textAlign: "center", padding: "20px 0" }}>No episodes yet</div>
              )}
            </div>
          </div>

          {/* Agent estimates (local only, when training) */}
          <div style={{ ...card, padding: "14px 16px", display: "flex", flexDirection: "column", position: "relative" }}>
            <div style={{ position: "absolute", top: 0, left: "16px", right: "16px", height: "1px", background: `linear-gradient(90deg, transparent, ${GOLD_DIM}, transparent)` }} />
            <div style={{ fontSize: "8px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: C.textTertiary, marginBottom: "10px" }}>
              {localResults.length > 0 ? "Agent Estimates vs Reality" : "Connection"}
            </div>
            {localResults.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: 1, justifyContent: "center" }}>
                {means.map((trueMean, i) => {
                  const est = agent.estimates[i];
                  const isBest = i === bestArmIndex;
                  const barW = Math.max(0, Math.min(100, (est / 10) * 100));
                  const trueW = Math.max(0, Math.min(100, (trueMean / 10) * 100));
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "10px", fontWeight: 600, color: isBest ? C.accent : C.textTertiary, width: "12px", flexShrink: 0 }}>{String.fromCharCode(65 + i)}</span>
                      <div style={{ flex: 1, position: "relative", height: "12px" }}>
                        <div style={{ position: "absolute", top: 0, left: 0, height: "100%", width: `${trueW}%`, background: C.border, borderRadius: "3px" }} />
                        <div style={{ position: "absolute", top: 0, left: 0, height: "100%", width: `${barW}%`, background: isBest ? C.accent : C.textTertiary, borderRadius: "3px", opacity: 0.8, transition: "width 150ms ease-out" }} />
                      </div>
                      <span style={{ fontSize: "9px", color: C.textSecondary, width: "48px", textAlign: "right", flexShrink: 0 }}>
                        {agent.pullCounts[i] > 0 ? est.toFixed(1) : "—"}/{trueMean.toFixed(1)}
                      </span>
                    </div>
                  );
                })}
                <div style={{ fontSize: "8px", color: C.textTertiary, marginTop: "4px" }}>
                  {agent.pullCounts.reduce((a, b) => a + b, 0)} pulls · ε={agent.epsilon.toFixed(2)}
                </div>
              </div>
            ) : (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: hfStatus === "live" ? "#4ADE80" : hfStatus === "loading" ? C.textTertiary : C.accent }} />
                  <span style={{ fontSize: "11px", color: C.textSecondary }}>
                    HuggingFace {hfStatus === "live" ? "connected" : hfStatus === "loading" ? "connecting..." : "offline"}
                  </span>
                </div>
                {hfLog && (
                  <>
                    <div style={{ fontSize: "11px", color: C.textTertiary }}>
                      {hfLog.sessions} session{hfLog.sessions !== 1 ? "s" : ""} · uptime {Math.floor(hfLog.uptime_seconds / 60)}m
                    </div>
                    <div style={{ fontSize: "10px", color: C.textTertiary, lineHeight: 1.5 }}>
                      Data source: OpenEnv WebSocket API.
                      Run <span style={{ color: C.textSecondary, fontFamily: "var(--font-mono, monospace)" }}>python train_agent.py</span> to train a real agent against the live Space.
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
