"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { C, buttonStyle, ghostButton, card } from "../shared";
import Link from "next/link";
import { ArrowLeft, Play, Square, ExternalLink } from "lucide-react";

const HF_SPACE = "https://jonyeazel-cognitive-primitives-bandit.hf.space";

type HFLog = {
  total_episodes: number;
  total_steps: number;
  sessions: number;
  best_efficiency: number;
  avg_recent_efficiency: number;
  uptime_seconds: number;
  recent_episodes: { episode: number; efficiency: number; reward: number }[];
};

const NUM_SOURCES = 6;
const ROUNDS_PER_EPISODE = 25;
const BASE_MEANS = [3.2, 5.8, 7.1, 4.5, 6.3, 2.9];

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

type EpisodeResult = {
  episode: number;
  totalReward: number;
  efficiency: number;
  bestArmPulls: number;
  explorationRate: number;
};

type AgentState = {
  estimates: number[];
  pullCounts: number[];
  totalRewards: number[];
  epsilon: number;
};

function initAgent(): AgentState {
  return {
    estimates: new Array(NUM_SOURCES).fill(0),
    pullCounts: new Array(NUM_SOURCES).fill(0),
    totalRewards: new Array(NUM_SOURCES).fill(0),
    epsilon: 1.0,
  };
}

function runEpisode(
  agent: AgentState,
  episodeNum: number,
  means: number[],
  variances: number[]
): { result: EpisodeResult; updatedAgent: AgentState } {
  const newAgent = {
    estimates: [...agent.estimates],
    pullCounts: [...agent.pullCounts],
    totalRewards: [...agent.totalRewards],
    epsilon: Math.max(0.05, 1.0 - episodeNum * 0.02),
  };

  let totalReward = 0;
  const bestArm = means.indexOf(Math.max(...means));
  let bestArmPulls = 0;
  let switches = 0;
  let lastChoice = -1;

  for (let round = 0; round < ROUNDS_PER_EPISODE; round++) {
    let choice: number;
    if (Math.random() < newAgent.epsilon) {
      choice = Math.floor(Math.random() * NUM_SOURCES);
    } else {
      choice = 0;
      let bestEstimate = -Infinity;
      for (let i = 0; i < NUM_SOURCES; i++) {
        if (newAgent.estimates[i] > bestEstimate) {
          bestEstimate = newAgent.estimates[i];
          choice = i;
        }
      }
    }

    const reward = gaussianRandom(means[choice], variances[choice]);
    totalReward += reward;
    newAgent.pullCounts[choice]++;
    newAgent.totalRewards[choice] += reward;
    newAgent.estimates[choice] = newAgent.totalRewards[choice] / newAgent.pullCounts[choice];
    if (choice === bestArm) bestArmPulls++;
    if (lastChoice !== -1 && choice !== lastChoice) switches++;
    lastChoice = choice;
  }

  const optimalReward = Math.max(...means) * ROUNDS_PER_EPISODE;
  const efficiency = Math.round((totalReward / optimalReward) * 100);

  return {
    result: { episode: episodeNum + 1, totalReward, efficiency, bestArmPulls, explorationRate: Math.round((switches / (ROUNDS_PER_EPISODE - 1)) * 100) },
    updatedAgent: newAgent,
  };
}

function LearningCurve({ results, maxEpisodes }: { results: EpisodeResult[]; maxEpisodes: number }) {
  const width = 600;
  const height = 150;
  const padLeft = 36;
  const padRight = 12;
  const padTop = 6;
  const padBot = 20;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBot;

  if (results.length === 0) return null;

  const points = results.map((r, i) => {
    const x = padLeft + (i / Math.max(maxEpisodes - 1, 1)) * chartW;
    const y = padTop + chartH - (Math.min(r.efficiency, 100) / 100) * chartH;
    return `${x},${y}`;
  });

  const avgPoints: string[] = [];
  for (let i = 0; i < results.length; i++) {
    const window = results.slice(Math.max(0, i - 4), i + 1);
    const avg = window.reduce((s, r) => s + r.efficiency, 0) / window.length;
    const x = padLeft + (i / Math.max(maxEpisodes - 1, 1)) * chartW;
    const y = padTop + chartH - (Math.min(avg, 100) / 100) * chartH;
    avgPoints.push(`${x},${y}`);
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "auto" }}>
      {[0, 25, 50, 75, 100].map((v) => {
        const y = padTop + chartH - (v / 100) * chartH;
        return (
          <g key={v}>
            <line x1={padLeft} y1={y} x2={width - padRight} y2={y} stroke={C.border} strokeWidth={0.5} />
            <text x={padLeft - 5} y={y + 3} textAnchor="end" fill={C.textTertiary} fontSize={8}>{v}</text>
          </g>
        );
      })}
      <polyline points={points.join(" ")} fill="none" stroke={C.accent} strokeWidth={1} opacity={0.25} />
      {avgPoints.length > 1 && (
        <polyline points={avgPoints.join(" ")} fill="none" stroke={C.accent} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      )}
      {avgPoints.length > 0 && (() => {
        const last = avgPoints[avgPoints.length - 1].split(",");
        return <circle cx={Number(last[0])} cy={Number(last[1])} r={3.5} fill={C.accent} style={{ filter: `drop-shadow(0 0 6px ${C.accent})` }} />;
      })()}
      <text x={width / 2} y={height - 2} textAnchor="middle" fill={C.textTertiary} fontSize={8}>Episodes</text>
    </svg>
  );
}

const TOTAL_EPISODES = 80;

export default function TrainPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<EpisodeResult[]>([]);
  const [agent, setAgent] = useState<AgentState>(initAgent);
  const [means] = useState(() => shuffle(BASE_MEANS));
  const [variances] = useState(() => Array.from({ length: NUM_SOURCES }, () => 1.5 + Math.random() * 2));
  const runningRef = useRef(false);
  const agentRef = useRef<AgentState>(initAgent());

  const startTraining = useCallback(() => {
    const freshAgent = initAgent();
    agentRef.current = freshAgent;
    setAgent(freshAgent);
    setResults([]);
    setIsRunning(true);
    runningRef.current = true;
  }, []);

  const stopTraining = useCallback(() => {
    setIsRunning(false);
    runningRef.current = false;
  }, []);

  useEffect(() => {
    if (!isRunning) return;
    let episodeNum = 0;
    const step = () => {
      if (!runningRef.current || episodeNum >= TOTAL_EPISODES) {
        setIsRunning(false);
        runningRef.current = false;
        return;
      }
      const { result, updatedAgent } = runEpisode(agentRef.current, episodeNum, means, variances);
      agentRef.current = updatedAgent;
      setAgent({ ...updatedAgent });
      setResults((prev) => [...prev, result]);
      episodeNum++;
      setTimeout(step, 60);
    };
    step();
  }, [isRunning, means, variances]);

  const lastResult = results.length > 0 ? results[results.length - 1] : null;
  const bestEfficiency = results.length > 0 ? Math.max(...results.map((r) => r.efficiency)) : 0;
  const recentAvg = results.length >= 5
    ? Math.round(results.slice(-5).reduce((s, r) => s + r.efficiency, 0) / 5)
    : lastResult?.efficiency ?? 0;
  const bestArmIndex = means.indexOf(Math.max(...means));

  // Fetch live HuggingFace training data
  const [hfLog, setHfLog] = useState<HFLog | null>(null);
  const [hfStatus, setHfStatus] = useState<"loading" | "live" | "offline">("loading");

  useEffect(() => {
    async function fetchHF() {
      try {
        const res = await fetch(`${HF_SPACE}/training-log`);
        if (res.ok) {
          setHfLog(await res.json());
          setHfStatus("live");
        } else {
          setHfStatus("offline");
        }
      } catch {
        setHfStatus("offline");
      }
    }
    fetchHF();
    const interval = setInterval(fetchHF, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", padding: "24px 32px 24px" }}>
      <div style={{ maxWidth: "640px", width: "100%", margin: "0 auto", flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px", flexShrink: 0 }}>
          <Link href="/" className="back-btn" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "32px", height: "32px", borderRadius: "12px", border: `1px solid ${C.border}`, background: C.surface, color: C.textTertiary, textDecoration: "none" }}>
            <ArrowLeft size={14} strokeWidth={1.5} />
          </Link>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
            <span style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: C.accent }}>Signall</span>
            <span style={{ fontSize: "11px", color: C.border }}>/</span>
            <span style={{ fontSize: "11px", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: C.textTertiary }}>Live Training</span>
          </div>
        </div>

        {/* HuggingFace live stats */}
        <div style={{
          ...card,
          padding: "14px 18px",
          marginBottom: "16px",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "6px", height: "6px", borderRadius: "50%",
              background: hfStatus === "live" ? "#4ADE80" : hfStatus === "loading" ? C.textTertiary : "#E05A00",
            }} />
            <span style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: C.textTertiary }}>
              HuggingFace
            </span>
            {hfLog && hfStatus === "live" && (
              <div style={{ display: "flex", gap: "16px", marginLeft: "8px" }}>
                <span style={{ fontSize: "12px", color: C.textSecondary }}>
                  <span style={{ fontWeight: 600, color: C.textPrimary }}>{hfLog.total_episodes}</span> episodes
                </span>
                <span style={{ fontSize: "12px", color: C.textSecondary }}>
                  <span style={{ fontWeight: 600, color: C.textPrimary }}>{hfLog.total_steps}</span> steps
                </span>
                <span style={{ fontSize: "12px", color: C.textSecondary }}>
                  best <span style={{ fontWeight: 600, color: C.accent }}>{hfLog.best_efficiency}%</span>
                </span>
              </div>
            )}
            {hfStatus === "loading" && (
              <span style={{ fontSize: "11px", color: C.textTertiary }}>connecting...</span>
            )}
            {hfStatus === "offline" && (
              <span style={{ fontSize: "11px", color: C.textTertiary }}>offline</span>
            )}
          </div>
          <a
            href={`${HF_SPACE}/training-dashboard`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "10px", color: C.textTertiary, textDecoration: "none" }}
          >
            Dashboard <ExternalLink size={10} strokeWidth={1.5} />
          </a>
        </div>

        {/* Status + controls */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: "13px", color: C.textSecondary, marginBottom: "2px" }}>Epsilon-greedy agent on The Bandit</div>
            <div style={{ fontSize: "11px", color: C.textTertiary }}>
              {isRunning ? `Training — episode ${results.length} / ${TOTAL_EPISODES}` : results.length > 0 ? `Completed — ${results.length} episodes` : `${TOTAL_EPISODES} episodes, epsilon decay 1.0 → 0.05`}
            </div>
          </div>
          {!isRunning ? (
            <button style={{ ...buttonStyle, height: "40px", padding: "0 20px", fontSize: "12px" }} onClick={startTraining}>
              <Play size={13} strokeWidth={2} />
              {results.length > 0 ? "Restart" : "Train"}
            </button>
          ) : (
            <button style={{ ...ghostButton, height: "40px", padding: "0 20px", fontSize: "12px" }} onClick={stopTraining}>
              <Square size={13} strokeWidth={2} />
              Stop
            </button>
          )}
        </div>

        {/* Learning curve — takes remaining space */}
        <div style={{ ...card, padding: "16px 20px", marginBottom: "12px", flex: results.length > 0 ? "0 0 auto" : "1", minHeight: results.length > 0 ? undefined : "160px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {results.length === 0 ? (
            <div style={{ color: C.textTertiary, fontSize: "13px" }}>
              Press Train to watch an agent learn in real time
            </div>
          ) : (
            <div style={{ width: "100%" }}>
              <LearningCurve results={results} maxEpisodes={TOTAL_EPISODES} />
            </div>
          )}
        </div>

        {/* Metrics + estimates side by side when data exists */}
        {results.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            {/* Left: metrics grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "auto auto", gap: "8px" }}>
              <div style={{ ...card, padding: "12px 14px",  }}>
                <div style={{ fontSize: "8px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: C.textTertiary, marginBottom: "4px" }}>Current</div>
                <div style={{ fontSize: "20px", fontWeight: 600, color: C.textPrimary, letterSpacing: "-0.02em" }}>{lastResult?.efficiency ?? 0}%</div>
              </div>
              <div style={{ ...card, padding: "12px 14px",  }}>
                <div style={{ fontSize: "8px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: C.textTertiary, marginBottom: "4px" }}>Avg (5)</div>
                <div style={{ fontSize: "20px", fontWeight: 600, color: C.accent, letterSpacing: "-0.02em" }}>{recentAvg}%</div>
              </div>
              <div style={{ ...card, padding: "12px 14px",  }}>
                <div style={{ fontSize: "8px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: C.textTertiary, marginBottom: "4px" }}>Best</div>
                <div style={{ fontSize: "20px", fontWeight: 600, color: C.textPrimary, letterSpacing: "-0.02em" }}>{bestEfficiency}%</div>
              </div>
              <div style={{ ...card, padding: "12px 14px",  }}>
                <div style={{ fontSize: "8px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: C.textTertiary, marginBottom: "4px" }}>Epsilon</div>
                <div style={{ fontSize: "20px", fontWeight: 600, color: C.textPrimary, letterSpacing: "-0.02em" }}>{agent.epsilon.toFixed(2)}</div>
              </div>
            </div>

            {/* Right: agent estimates */}
            <div style={{ ...card, padding: "14px 16px", display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: "8px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: C.textTertiary, marginBottom: "10px" }}>
                Learned estimates vs reality
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: 1, justifyContent: "center" }}>
                {means.map((trueMean, i) => {
                  const estimate = agent.estimates[i];
                  const pulls = agent.pullCounts[i];
                  const isBest = i === bestArmIndex;
                  const barWidth = Math.max(0, Math.min(100, (estimate / 10) * 100));
                  const trueBarWidth = Math.max(0, Math.min(100, (trueMean / 10) * 100));

                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "10px", fontWeight: 600, color: isBest ? C.accent : C.textTertiary, width: "12px", flexShrink: 0 }}>
                        {String.fromCharCode(65 + i)}
                      </span>
                      <div style={{ flex: 1, position: "relative", height: "12px" }}>
                        <div style={{ position: "absolute", top: 0, left: 0, height: "100%", width: `${trueBarWidth}%`, background: C.border, borderRadius: "3px" }} />
                        <div style={{ position: "absolute", top: 0, left: 0, height: "100%", width: `${barWidth}%`, background: isBest ? C.accent : C.textTertiary, borderRadius: "3px", opacity: 0.8, transition: "width 150ms ease-out" }} />
                      </div>
                      <span style={{ fontSize: "9px", color: C.textSecondary, width: "48px", textAlign: "right", flexShrink: 0 }}>
                        {pulls > 0 ? estimate.toFixed(1) : "—"}/{trueMean.toFixed(1)}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div style={{ fontSize: "8px", color: C.textTertiary, marginTop: "6px" }}>
                {agent.pullCounts.reduce((a, b) => a + b, 0)} pulls
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
