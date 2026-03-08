"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { C, buttonStyle, ghostButton, card } from "../shared";
import Link from "next/link";
import { ArrowLeft, Play, Square } from "lucide-react";

// --- Bandit environment (same logic as the game) ---

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

// --- Epsilon-greedy agent that ACTUALLY LEARNS across episodes ---

type AgentState = {
  // Running estimates of each source's mean reward
  estimates: number[];
  // Number of times each source was pulled (across all episodes)
  pullCounts: number[];
  // Total reward from each source (across all episodes)
  totalRewards: number[];
  // Epsilon decays over episodes
  epsilon: number;
};

function initAgent(): AgentState {
  return {
    estimates: new Array(NUM_SOURCES).fill(0),
    pullCounts: new Array(NUM_SOURCES).fill(0),
    totalRewards: new Array(NUM_SOURCES).fill(0),
    epsilon: 1.0, // Start fully exploratory
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
    epsilon: Math.max(0.05, 1.0 - episodeNum * 0.02), // Decay epsilon
  };

  let totalReward = 0;
  const bestArm = means.indexOf(Math.max(...means));
  let bestArmPulls = 0;
  let switches = 0;
  let lastChoice = -1;

  for (let round = 0; round < ROUNDS_PER_EPISODE; round++) {
    let choice: number;

    if (Math.random() < newAgent.epsilon) {
      // Explore
      choice = Math.floor(Math.random() * NUM_SOURCES);
    } else {
      // Exploit: pick arm with highest estimated mean
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

    // Update agent's knowledge
    newAgent.pullCounts[choice]++;
    newAgent.totalRewards[choice] += reward;
    newAgent.estimates[choice] =
      newAgent.totalRewards[choice] / newAgent.pullCounts[choice];

    if (choice === bestArm) bestArmPulls++;
    if (lastChoice !== -1 && choice !== lastChoice) switches++;
    lastChoice = choice;
  }

  const optimalReward = Math.max(...means) * ROUNDS_PER_EPISODE;
  const efficiency = Math.round((totalReward / optimalReward) * 100);

  return {
    result: {
      episode: episodeNum + 1,
      totalReward,
      efficiency,
      bestArmPulls,
      explorationRate: Math.round(
        (switches / (ROUNDS_PER_EPISODE - 1)) * 100
      ),
    },
    updatedAgent: newAgent,
  };
}

// --- Chart component ---

function LearningCurve({ results, maxEpisodes }: { results: EpisodeResult[]; maxEpisodes: number }) {
  const width = 600;
  const height = 200;
  const padLeft = 40;
  const padRight = 16;
  const padTop = 8;
  const padBot = 24;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBot;

  if (results.length === 0) return null;

  const points = results.map((r, i) => {
    const x = padLeft + (i / Math.max(maxEpisodes - 1, 1)) * chartW;
    const y = padTop + chartH - (Math.min(r.efficiency, 100) / 100) * chartH;
    return `${x},${y}`;
  });

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p}`).join(" ");

  // Moving average (window of 5)
  const avgPoints: string[] = [];
  for (let i = 0; i < results.length; i++) {
    const window = results.slice(Math.max(0, i - 4), i + 1);
    const avg = window.reduce((s, r) => s + r.efficiency, 0) / window.length;
    const x = padLeft + (i / Math.max(maxEpisodes - 1, 1)) * chartW;
    const y = padTop + chartH - (Math.min(avg, 100) / 100) * chartH;
    avgPoints.push(`${x},${y}`);
  }
  const avgPathD = avgPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p}`).join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      style={{ width: "100%", height: "auto" }}
    >
      {/* Grid lines */}
      {[0, 25, 50, 75, 100].map((v) => {
        const y = padTop + chartH - (v / 100) * chartH;
        return (
          <g key={v}>
            <line x1={padLeft} y1={y} x2={width - padRight} y2={y} stroke={C.border} strokeWidth={0.5} />
            <text x={padLeft - 6} y={y + 3} textAnchor="end" fill={C.textTertiary} fontSize={9}>
              {v}
            </text>
          </g>
        );
      })}

      {/* Raw data */}
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={C.accent}
        strokeWidth={1}
        opacity={0.3}
      />

      {/* Moving average */}
      {avgPoints.length > 1 && (
        <polyline
          points={avgPoints.join(" ")}
          fill="none"
          stroke={C.accent}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {/* Current point glow */}
      {avgPoints.length > 0 && (() => {
        const last = avgPoints[avgPoints.length - 1].split(",");
        return (
          <circle
            cx={Number(last[0])}
            cy={Number(last[1])}
            r={4}
            fill={C.accent}
            style={{ filter: `drop-shadow(0 0 6px ${C.accent})` }}
          />
        );
      })()}

      {/* X-axis label */}
      <text x={width / 2} y={height - 2} textAnchor="middle" fill={C.textTertiary} fontSize={9}>
        Episodes
      </text>
    </svg>
  );
}

// --- Main page ---

const TOTAL_EPISODES = 80;

export default function TrainPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<EpisodeResult[]>([]);
  const [agent, setAgent] = useState<AgentState>(initAgent);
  const [means] = useState(() => shuffle(BASE_MEANS));
  const [variances] = useState(() =>
    Array.from({ length: NUM_SOURCES }, () => 1.5 + Math.random() * 2)
  );
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

  // Training loop
  useEffect(() => {
    if (!isRunning) return;

    let episodeNum = 0;

    const step = () => {
      if (!runningRef.current || episodeNum >= TOTAL_EPISODES) {
        setIsRunning(false);
        runningRef.current = false;
        return;
      }

      const { result, updatedAgent } = runEpisode(
        agentRef.current,
        episodeNum,
        means,
        variances
      );

      agentRef.current = updatedAgent;
      setAgent({ ...updatedAgent });
      setResults((prev) => [...prev, result]);
      episodeNum++;

      setTimeout(step, 60);
    };

    step();
  }, [isRunning, means, variances]);

  const lastResult = results.length > 0 ? results[results.length - 1] : null;
  const bestEfficiency = results.length > 0
    ? Math.max(...results.map((r) => r.efficiency))
    : 0;

  // Moving average of last 5
  const recentAvg = results.length >= 5
    ? Math.round(
        results.slice(-5).reduce((s, r) => s + r.efficiency, 0) / 5
      )
    : lastResult?.efficiency ?? 0;

  const bestArmIndex = means.indexOf(Math.max(...means));

  return (
    <div style={{ minHeight: "100vh", padding: "32px 32px 96px" }}>
      <div style={{ maxWidth: "640px", margin: "0 auto" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "40px",
          }}
        >
          <Link
            href="/"
            className="back-btn"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "36px",
              height: "36px",
              borderRadius: "16px",
              border: `1px solid ${C.border}`,
              background: C.surface,
              color: C.textTertiary,
              textDecoration: "none",
            }}
          >
            <ArrowLeft size={16} strokeWidth={1.5} />
          </Link>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
            <span style={{ fontSize: "11px", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: C.accent }}>
              Signall
            </span>
            <span style={{ fontSize: "11px", color: C.border }}>/</span>
            <span style={{ fontSize: "11px", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: C.textTertiary }}>
              Live Training
            </span>
          </div>
        </div>

        {/* Status + controls */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
          }}
        >
          <div>
            <div style={{ fontSize: "13px", color: C.textSecondary, marginBottom: "4px" }}>
              Epsilon-greedy agent on The Bandit
            </div>
            <div style={{ fontSize: "11px", color: C.textTertiary }}>
              {isRunning
                ? `Training — episode ${results.length} / ${TOTAL_EPISODES}`
                : results.length > 0
                ? `Completed — ${results.length} episodes`
                : `${TOTAL_EPISODES} episodes, epsilon decay 1.0 → 0.05`}
            </div>
          </div>

          {!isRunning ? (
            <button style={buttonStyle} onClick={startTraining}>
              <Play size={14} strokeWidth={2} />
              {results.length > 0 ? "Restart" : "Train"}
            </button>
          ) : (
            <button style={ghostButton} onClick={stopTraining}>
              <Square size={14} strokeWidth={2} />
              Stop
            </button>
          )}
        </div>

        {/* Learning curve */}
        <div
          style={{
            ...card,
            padding: "24px",
            marginBottom: "16px",
          }}
        >
          {results.length === 0 ? (
            <div
              style={{
                height: "200px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: C.textTertiary,
                fontSize: "13px",
              }}
            >
              Press Train to watch an agent learn in real time
            </div>
          ) : (
            <LearningCurve results={results} maxEpisodes={TOTAL_EPISODES} />
          )}
        </div>

        {/* Live metrics */}
        {results.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "8px",
              marginBottom: "16px",
            }}
          >
            <div style={{ ...card, padding: "16px" }}>
              <div style={{ fontSize: "9px", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: C.textTertiary, marginBottom: "6px" }}>
                Current
              </div>
              <div style={{ fontSize: "22px", fontWeight: 600, color: C.textPrimary, letterSpacing: "-0.02em" }}>
                {lastResult?.efficiency ?? 0}%
              </div>
            </div>
            <div style={{ ...card, padding: "16px" }}>
              <div style={{ fontSize: "9px", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: C.textTertiary, marginBottom: "6px" }}>
                Avg (5)
              </div>
              <div style={{ fontSize: "22px", fontWeight: 600, color: C.accent, letterSpacing: "-0.02em" }}>
                {recentAvg}%
              </div>
            </div>
            <div style={{ ...card, padding: "16px" }}>
              <div style={{ fontSize: "9px", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: C.textTertiary, marginBottom: "6px" }}>
                Best
              </div>
              <div style={{ fontSize: "22px", fontWeight: 600, color: C.textPrimary, letterSpacing: "-0.02em" }}>
                {bestEfficiency}%
              </div>
            </div>
            <div style={{ ...card, padding: "16px" }}>
              <div style={{ fontSize: "9px", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: C.textTertiary, marginBottom: "6px" }}>
                Epsilon
              </div>
              <div style={{ fontSize: "22px", fontWeight: 600, color: C.textPrimary, letterSpacing: "-0.02em" }}>
                {agent.epsilon.toFixed(2)}
              </div>
            </div>
          </div>
        )}

        {/* Agent knowledge */}
        {results.length > 0 && (
          <div style={{ ...card, padding: "20px" }}>
            <div style={{ fontSize: "9px", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: C.textTertiary, marginBottom: "12px" }}>
              Agent&apos;s learned estimates vs reality
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {means.map((trueMean, i) => {
                const estimate = agent.estimates[i];
                const pulls = agent.pullCounts[i];
                const isBest = i === bestArmIndex;
                const barWidth = Math.max(0, Math.min(100, (estimate / 10) * 100));
                const trueBarWidth = Math.max(0, Math.min(100, (trueMean / 10) * 100));

                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 500,
                        color: isBest ? C.accent : C.textTertiary,
                        width: "16px",
                        flexShrink: 0,
                      }}
                    >
                      {String.fromCharCode(65 + i)}
                    </span>
                    <div style={{ flex: 1, position: "relative", height: "16px" }}>
                      {/* True mean (background) */}
                      <div
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          height: "100%",
                          width: `${trueBarWidth}%`,
                          background: C.border,
                          borderRadius: "4px",
                        }}
                      />
                      {/* Agent's estimate (foreground) */}
                      <div
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          height: "100%",
                          width: `${barWidth}%`,
                          background: isBest ? C.accent : C.textTertiary,
                          borderRadius: "4px",
                          opacity: 0.8,
                          transition: "width 150ms ease-out",
                        }}
                      />
                    </div>
                    <span style={{ fontSize: "11px", color: C.textSecondary, width: "56px", textAlign: "right", flexShrink: 0 }}>
                      {pulls > 0 ? estimate.toFixed(1) : "—"} / {trueMean.toFixed(1)}
                    </span>
                  </div>
                );
              })}
            </div>
            <div style={{ fontSize: "9px", color: C.textTertiary, marginTop: "8px" }}>
              Orange = agent&apos;s estimate &nbsp;&middot;&nbsp; Grey = true mean &nbsp;&middot;&nbsp; {agent.pullCounts.reduce((a, b) => a + b, 0)} total pulls
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
