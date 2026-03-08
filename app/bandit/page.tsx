"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Shell, MetricCard, LessonCard } from "../shell";
import { C, card, metaLabel, buttonStyle, ghostButton, saveScore, isDemoMode, getNextDemoPath, isAgentEmbed } from "../shared";
import { RotateCcw, ArrowRight, Play } from "lucide-react";

const SOURCE_NAMES = ["Alpha", "Beta", "Gamma", "Delta", "Epsilon", "Zeta"];
const BASE_MEANS = [3.2, 5.8, 7.1, 4.5, 6.3, 2.9];
const TOTAL_ROUNDS = 25;

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
  const standardNormal = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return mean + standardNormal * Math.sqrt(variance);
}

type SourceData = {
  trueMean: number;
  variance: number;
  pulls: number[];
};

type GameState = {
  sources: SourceData[];
  round: number;
  totalScore: number;
  history: { sourceIndex: number; reward: number }[];
};

function initGame(): GameState {
  const shuffledMeans = shuffle(BASE_MEANS);
  return {
    sources: shuffledMeans.map((mean) => ({
      trueMean: mean,
      variance: 1.5 + Math.random() * 2,
      pulls: [],
    })),
    round: 0,
    totalScore: 0,
    history: [],
  };
}

function computeOptimalScore(sources: SourceData[]): number {
  const bestMean = Math.max(...sources.map((s) => s.trueMean));
  return bestMean * TOTAL_ROUNDS;
}

type BehaviorType = "Heavy exploiter" | "Heavy explorer" | "Balanced" | "Gradual settler";

function analyzeBehavior(history: { sourceIndex: number; reward: number }[]): BehaviorType {
  if (history.length < TOTAL_ROUNDS) return "Balanced";

  const uniqueSources = new Set(history.map((h) => h.sourceIndex)).size;
  const firstHalf = history.slice(0, Math.floor(TOTAL_ROUNDS / 2));
  const secondHalf = history.slice(Math.floor(TOTAL_ROUNDS / 2));

  const uniqueFirst = new Set(firstHalf.map((h) => h.sourceIndex)).size;
  const uniqueSecond = new Set(secondHalf.map((h) => h.sourceIndex)).size;

  if (uniqueSources <= 2) return "Heavy exploiter";
  if (uniqueSources >= 5 && uniqueSecond >= 4) return "Heavy explorer";
  if (uniqueFirst > uniqueSecond + 1) return "Gradual settler";
  return "Balanced";
}

// --- Epsilon-greedy agent ---

function epsilonGreedyChoice(
  sources: SourceData[],
  round: number,
  epsilon: number = 0.15
): number {
  // First 6 rounds: explore each source once
  if (round < 6) return round;

  // Epsilon chance to explore randomly
  if (Math.random() < epsilon) {
    return Math.floor(Math.random() * sources.length);
  }

  // Exploit: pick source with highest average
  let bestIndex = 0;
  let bestAvg = -Infinity;
  for (let i = 0; i < sources.length; i++) {
    if (sources[i].pulls.length > 0) {
      const avg =
        sources[i].pulls.reduce((a, b) => a + b, 0) / sources[i].pulls.length;
      if (avg > bestAvg) {
        bestAvg = avg;
        bestIndex = i;
      }
    }
  }
  return bestIndex;
}

export default function BanditPage() {
  const [phase, setPhase] = useState<"intro" | "playing" | "reveal">("intro");
  const [game, setGame] = useState<GameState>(initGame);
  const [selectedSource, setSelectedSource] = useState<number | null>(null);
  const [agentMode, setAgentMode] = useState(false);
  const agentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [agentEmbed, setAgentEmbed] = useState(false);

  // Agent auto-play
  useEffect(() => {
    if (!agentMode || phase !== "playing" || game.round >= TOTAL_ROUNDS) return;

    agentTimerRef.current = setTimeout(() => {
      const choice = epsilonGreedyChoice(game.sources, game.round);
      setSelectedSource(choice);

      // Brief pause to show selection, then pull
      setTimeout(() => {
        const source = game.sources[choice];
        const reward = gaussianRandom(source.trueMean, source.variance);

        setGame((prev) => {
          const newSources = prev.sources.map((s, i) =>
            i === choice ? { ...s, pulls: [...s.pulls, reward] } : s
          );
          const newHistory = [
            ...prev.history,
            { sourceIndex: choice, reward },
          ];
          const newRound = prev.round + 1;
          const newTotal = prev.totalScore + reward;

          if (newRound >= TOTAL_ROUNDS) {
            const optimal = computeOptimalScore(newSources);
            const efficiency = Math.round((newTotal / optimal) * 100);
            saveScore("bandit", efficiency);
            setTimeout(() => setPhase("reveal"), 400);
          }

          return {
            sources: newSources,
            round: newRound,
            totalScore: newTotal,
            history: newHistory,
          };
        });
        setSelectedSource(null);
      }, 200);
    }, 400);

    return () => {
      if (agentTimerRef.current) clearTimeout(agentTimerRef.current);
    };
  }, [agentMode, phase, game.round, game.sources]);

  // Check demo mode on mount
  useEffect(() => {
    setDemoMode(isDemoMode());
  }, []);

  // Check agent embed mode on mount
  useEffect(() => {
    setAgentEmbed(isAgentEmbed());
  }, []);

  // Auto-start agent in demo
  useEffect(() => {
    if (demoMode && phase === "intro") {
      handleBegin(true);
    }
  }, [demoMode, phase]);

  // Auto-start agent in embed mode
  useEffect(() => {
    if (agentEmbed && phase === "intro") {
      handleBegin(true);
    }
  }, [agentEmbed, phase]);

  // Auto-advance in demo after reveal
  useEffect(() => {
    if (demoMode && phase === "reveal") {
      const timer = setTimeout(() => {
        window.location.href = getNextDemoPath("bandit");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [demoMode, phase]);

  const handleBegin = useCallback((withAgent: boolean = false) => {
    setGame(initGame());
    setAgentMode(withAgent);
    setPhase("playing");
    setSelectedSource(null);
  }, []);

  const handlePull = useCallback(() => {
    if (selectedSource === null) return;
    if (game.round >= TOTAL_ROUNDS) return;

    const source = game.sources[selectedSource];
    const reward = gaussianRandom(source.trueMean, source.variance);

    setGame((prev) => {
      const newSources = prev.sources.map((s, i) =>
        i === selectedSource ? { ...s, pulls: [...s.pulls, reward] } : s
      );
      const newHistory = [...prev.history, { sourceIndex: selectedSource, reward }];
      const newRound = prev.round + 1;
      const newTotal = prev.totalScore + reward;

      if (newRound >= TOTAL_ROUNDS) {
        const optimal = computeOptimalScore(newSources);
        const efficiency = Math.round((newTotal / optimal) * 100);
        saveScore("bandit", efficiency);
        setTimeout(() => setPhase("reveal"), 300);
      }

      return {
        sources: newSources,
        round: newRound,
        totalScore: newTotal,
        history: newHistory,
      };
    });
    setSelectedSource(null);
  }, [selectedSource, game.round, game.sources]);

  const optimalScore = useMemo(() => computeOptimalScore(game.sources), [game.sources]);
  const efficiency = useMemo(
    () => Math.round((game.totalScore / optimalScore) * 100),
    [game.totalScore, optimalScore]
  );
  const behavior = useMemo(() => analyzeBehavior(game.history), [game.history]);

  const sortedSourcesForReveal = useMemo(() => {
    return game.sources
      .map((s, i) => ({ ...s, index: i, name: SOURCE_NAMES[i] }))
      .sort((a, b) => b.trueMean - a.trueMean);
  }, [game.sources]);

  const maxMean = useMemo(() => Math.max(...BASE_MEANS), []);
  const minMean = useMemo(() => Math.min(...BASE_MEANS), []);

  if (phase === "intro") {
    return (
      <Shell env="The Bandit">
        <div style={{ ...card, padding: "32px" }}>
          <p
            style={{
              fontSize: "15px",
              lineHeight: 1.7,
              color: C.textSecondary,
              margin: 0,
              marginBottom: "24px",
            }}
          >
            You have 25 rounds to maximize your total score. Six sources exist, each with a hidden
            reward distribution. Some sources pay better on average than others. Each pull reveals
            one sample from that source.
          </p>
          <p
            style={{
              fontSize: "15px",
              lineHeight: 1.7,
              color: C.textSecondary,
              margin: 0,
              marginBottom: "32px",
            }}
          >
            The challenge: explore enough to find good sources, but not so much that you waste
            pulls on bad ones. Exploit your best finds, but not so early that you miss something
            better.
          </p>
          <div style={{ display: "flex", gap: "8px" }}>
            <button style={buttonStyle} onClick={() => handleBegin(false)}>
              Play
              <ArrowRight size={16} strokeWidth={2} />
            </button>
            <button style={ghostButton} onClick={() => handleBegin(true)}>
              <Play size={14} strokeWidth={2} />
              Watch agent
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  if (phase === "playing") {
    const progress = game.round / TOTAL_ROUNDS;

    return (
      <Shell env="The Bandit">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "12px",
          }}
        >
          <span style={metaLabel}>
            {agentMode && (
              <span style={{ color: C.accent, marginRight: "8px" }}>Agent</span>
            )}
            Round {game.round + 1} of {TOTAL_ROUNDS}
          </span>
          <span style={{ fontSize: "15px", fontWeight: 500, color: C.textPrimary }}>
            {game.totalScore.toFixed(1)}
          </span>
        </div>

        <div
          style={{
            height: "2px",
            background: C.border,
            borderRadius: "16px",
            marginBottom: "24px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${progress * 100}%`,
              background: C.accent,
              transition: "width 150ms ease-out",
            }}
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "8px",
            marginBottom: "24px",
          }}
        >
          {game.sources.map((source, i) => {
            const isSelected = selectedSource === i;
            const hasPulls = source.pulls.length > 0;
            const lastReward = hasPulls ? source.pulls[source.pulls.length - 1] : null;
            const avg = hasPulls
              ? source.pulls.reduce((a, b) => a + b, 0) / source.pulls.length
              : null;

            return (
              <button
                key={i}
                onClick={() => !agentMode && setSelectedSource(i)}
                style={{
                  ...card,
                  height: "148px",
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  cursor: "pointer",
                  borderLeft: isSelected ? `3px solid ${C.accent}` : `1px solid ${C.border}`,
                  paddingLeft: isSelected ? "14px" : "16px",
                  textAlign: "left",
                  fontFamily: "inherit",
                }}
              >
                <span style={{ ...metaLabel, marginBottom: "auto" }}>{SOURCE_NAMES[i]}</span>
                {hasPulls ? (
                  <>
                    <span
                      style={{
                        fontSize: "24px",
                        fontWeight: 600,
                        color: C.textPrimary,
                        lineHeight: 1,
                        marginBottom: "4px",
                      }}
                    >
                      {lastReward!.toFixed(1)}
                    </span>
                    <span style={{ fontSize: "13px", color: C.textTertiary }}>
                      avg {avg!.toFixed(1)} ({source.pulls.length})
                    </span>
                  </>
                ) : (
                  <span
                    style={{
                      fontSize: "24px",
                      fontWeight: 600,
                      color: C.textTertiary,
                      lineHeight: 1,
                    }}
                  >
                    —
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {!agentMode && (
          <button
            style={{
              ...buttonStyle,
              width: "100%",
              justifyContent: "center",
              opacity: selectedSource === null ? 0.5 : 1,
              cursor: selectedSource === null ? "not-allowed" : "pointer",
              marginBottom: "24px",
            }}
            onClick={handlePull}
            disabled={selectedSource === null}
          >
            Pull
          </button>
        )}

        {agentMode && (
          <div
            style={{
              textAlign: "center",
              fontSize: "12px",
              color: C.textTertiary,
              marginBottom: "24px",
            }}
          >
            Epsilon-greedy agent training (e=0.15)
          </div>
        )}

        {game.history.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
            {game.history.map((h, i) => {
              const normalizedReward = Math.max(0, Math.min(1, (h.reward - minMean) / (maxMean - minMean)));
              return (
                <div
                  key={i}
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "16px",
                    background: C.accent,
                    opacity: 0.2 + normalizedReward * 0.8,
                  }}
                  title={`${SOURCE_NAMES[h.sourceIndex]}: ${h.reward.toFixed(1)}`}
                />
              );
            })}
          </div>
        )}
      </Shell>
    );
  }

  // Reveal phase
  const top3Sources = sortedSourcesForReveal.slice(0, 3);

  return (
    <Shell env="The Bandit">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "8px",
          marginBottom: "16px",
        }}
      >
        <MetricCard label="Your score" value={game.totalScore.toFixed(1)} />
        <MetricCard label="Perfect play" value={optimalScore.toFixed(1)} muted />
        <MetricCard label="Efficiency" value={`${efficiency}%`} />
      </div>

      <div style={{ fontSize: "13px", color: C.textSecondary, marginBottom: "16px" }}>
        <span style={{ fontWeight: 500, color: C.textPrimary }}>Top sources:</span>{" "}
        {top3Sources.map((s, i) => (
          <span key={s.index}>
            {s.name} ({s.trueMean.toFixed(1)}){i < 2 ? ", " : ""}
          </span>
        ))}
      </div>

      <div style={{ marginBottom: "16px" }}>
        <LessonCard term="In the real world">
          Portfolio managers face this tradeoff daily: exploit a proven strategy or explore new markets. A/B testers balance it with every experiment. Autonomous trading agents must solve this at millisecond scale — the foundation of algorithmic market making.
        </LessonCard>
      </div>

      {demoMode && (
        <div style={{ fontSize: "12px", color: C.textTertiary, marginBottom: "16px" }}>
          Advancing to next environment...
        </div>
      )}

      <div style={{ display: "flex", gap: "8px" }}>
        <button style={buttonStyle} onClick={() => handleBegin(false)}>
          <RotateCcw size={14} strokeWidth={2} />
          Play again
        </button>
        <button style={ghostButton} onClick={() => handleBegin(true)}>
          <Play size={14} strokeWidth={2} />
          Watch agent
        </button>
      </div>
    </Shell>
  );
}
