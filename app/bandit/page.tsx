"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Shell, MetricCard, LessonCard } from "../shell";
import { C, card, metaLabel, buttonStyle, saveScore } from "../shared";

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
            if (window.parent !== window) {
              window.parent.postMessage({ type: "episodeComplete", envId: "bandit", efficiency }, "*");
            }
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

  // Auto-start agent mode on mount
  useEffect(() => {
    if (phase === "intro") {
      handleBegin(true);
    }
  }, [phase]);

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
        if (window.parent !== window) {
          window.parent.postMessage({ type: "episodeComplete", envId: "bandit", efficiency }, "*");
        }
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
  const sortedSourcesForReveal = useMemo(() => {
    return game.sources
      .map((s, i) => ({ ...s, index: i, name: SOURCE_NAMES[i] }))
      .sort((a, b) => b.trueMean - a.trueMean);
  }, [game.sources]);

  if (phase === "playing") {
    const progress = game.round / TOTAL_ROUNDS;

    return (
      <Shell env="bandit">
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

        <div style={{ marginBottom: "24px", height: "44px" }}>
          {!agentMode ? (
            <button
              style={{
                ...buttonStyle,
                width: "100%",
                justifyContent: "center",
                opacity: selectedSource === null ? 0.5 : 1,
                cursor: selectedSource === null ? "not-allowed" : "pointer",
              }}
              onClick={handlePull}
              disabled={selectedSource === null}
            >
              Pull
            </button>
          ) : (
            <div
              style={{
                textAlign: "center",
                fontSize: "12px",
                color: C.textTertiary,
                lineHeight: "44px",
              }}
            >
              Epsilon-greedy agent training (e=0.15)
            </div>
          )}
        </div>

        {/* Live reward chart */}
        <div style={{ height: "80px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "8px 12px", overflow: "hidden" }}>
          {game.history.length > 0 ? (() => {
            const w = 520, h = 56, pl = 4, pr = 4, pt = 4, pb = 4;
            const cw = w - pl - pr, ch = h - pt - pb;
            const yMin = 0, yMax = 10;
            const points = game.history.map((hist, i) => {
              const x = pl + (i / Math.max(TOTAL_ROUNDS - 1, 1)) * cw;
              const y = pt + ch - ((Math.min(Math.max(hist.reward, yMin), yMax) - yMin) / (yMax - yMin)) * ch;
              return { x, y, sourceIndex: hist.sourceIndex };
            });
            const polyline = points.map(p => `${p.x},${p.y}`).join(" ");
            const last = points[points.length - 1];
            return (
              <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: "100%" }}>
                {/* Grid lines */}
                {[2, 4, 6, 8].map(v => {
                  const y = pt + ch - ((v - yMin) / (yMax - yMin)) * ch;
                  return <line key={v} x1={pl} y1={y} x2={w - pr} y2={y} stroke={C.border} strokeWidth={0.5} />;
                })}
                {/* Reward line */}
                <polyline points={polyline} fill="none" stroke={C.accent} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                {/* Dots colored by source */}
                {points.map((p, i) => (
                  <circle key={i} cx={p.x} cy={p.y} r={3} fill={C.accent} opacity={0.3 + (p.sourceIndex === game.history[i].sourceIndex ? 0.7 : 0.3)} />
                ))}
                {/* Current position glow */}
                {last && <circle cx={last.x} cy={last.y} r={5} fill={C.accent} style={{ filter: `drop-shadow(0 0 4px ${C.accent})` }} />}
              </svg>
            );
          })() : (
            <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: C.textTertiary, fontSize: "11px" }}>
              Reward chart builds as the agent trains
            </div>
          )}
        </div>
      </Shell>
    );
  }

  // Reveal phase
  const top3Sources = sortedSourcesForReveal.slice(0, 3);

  return (
    <Shell env="bandit">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", marginBottom: "16px" }}>
        <div>
          <MetricCard label="Your score" value={game.totalScore.toFixed(1)} />
          <div style={{ fontSize: "9px", color: C.textTertiary, marginTop: "6px", padding: "0 4px" }}>Total reward collected</div>
        </div>
        <div>
          <MetricCard label="Perfect play" value={optimalScore.toFixed(1)} muted />
          <div style={{ fontSize: "9px", color: C.textTertiary, marginTop: "6px", padding: "0 4px" }}>Best possible strategy</div>
        </div>
        <div>
          <MetricCard label="Efficiency" value={`${efficiency}%`} />
          <div style={{ fontSize: "9px", color: C.textTertiary, marginTop: "6px", padding: "0 4px" }}>How close to optimal</div>
        </div>
      </div>

      <div style={{ marginBottom: "16px" }}>
        <div style={{ fontSize: "9px", color: C.textTertiary, marginBottom: "6px", letterSpacing: "0.04em" }}>The agent discovered which sources pay best.</div>
        <div style={{ fontSize: "13px", color: C.textSecondary }}>
          {top3Sources.map((s, i) => (
            <span key={s.index}>{s.name} ({s.trueMean.toFixed(1)}){i < 2 ? " · " : ""}</span>
          ))}
        </div>
      </div>

      <LessonCard term="What this teaches">
        <span style={{ display: "block", marginBottom: "4px" }}>· Balance trying new things vs exploiting winners</span>
        <span style={{ display: "block", marginBottom: "4px" }}>· Every A/B test is this exact tradeoff</span>
        <span style={{ display: "block" }}>· Portfolio managers face this daily</span>
      </LessonCard>
    </Shell>
  );
}
