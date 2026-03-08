"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Shell, MetricCard, LessonCard } from "../shell";
import { C, card, buttonStyle, ghostButton, saveScore, isDemoMode, getNextDemoPath, isAgentEmbed } from "../shared";
import { ArrowRight, RotateCcw, Play, Check, X } from "lucide-react";

type Phase = "intro" | "playing" | "reveal";
type GamePhase = 1 | 2;
type Outcome = "Win" | "Loss";

interface DataPoint {
  featureA: number;
  featureB: number;
  outcome: Outcome;
}

interface TransferDataPoint {
  featureA: number;
  featureB: number;
  outcome: Outcome;
  prediction?: Outcome;
}

// Generate a random threshold between 4 and 7
function generateThreshold(): number {
  return Math.floor(Math.random() * 4) + 4; // 4, 5, 6, or 7
}

// Generate Phase 1 data points with the rule: Feature A > threshold = Win
function generatePhase1Data(threshold: number): DataPoint[] {
  const data: DataPoint[] = [];

  // Ensure we have good coverage of both outcomes
  // 3 wins (above threshold) and 3 losses (at or below threshold)
  const wins = [threshold + 1, threshold + 2, threshold + 3].slice(0, 3);
  const losses = [threshold - 1, threshold, threshold - 2].filter(v => v >= 1).slice(0, 3);

  // Fill remaining losses if needed
  while (losses.length < 3) {
    const val = Math.floor(Math.random() * (threshold)) + 1;
    if (!losses.includes(val)) losses.push(val);
  }

  wins.forEach(a => {
    data.push({
      featureA: Math.min(10, a),
      featureB: Math.floor(Math.random() * 10) + 1,
      outcome: "Win"
    });
  });

  losses.forEach(a => {
    data.push({
      featureA: Math.max(1, a),
      featureB: Math.floor(Math.random() * 10) + 1,
      outcome: "Loss"
    });
  });

  // Shuffle
  for (let i = data.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [data[i], data[j]] = [data[j], data[i]];
  }

  return data;
}

// Generate Phase 2 data points (test data)
function generatePhase2Data(threshold: number): TransferDataPoint[] {
  const data: TransferDataPoint[] = [];

  // 2 wins, 2 losses to test
  const wins = [threshold + 1, threshold + Math.floor(Math.random() * 3) + 1];
  const losses = [threshold, threshold - Math.floor(Math.random() * 2) - 1];

  wins.forEach(a => {
    data.push({
      featureA: Math.min(10, a),
      featureB: Math.floor(Math.random() * 10) + 1,
      outcome: "Win"
    });
  });

  losses.forEach(a => {
    data.push({
      featureA: Math.max(1, a),
      featureB: Math.floor(Math.random() * 10) + 1,
      outcome: "Loss"
    });
  });

  // Shuffle
  for (let i = data.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [data[i], data[j]] = [data[j], data[i]];
  }

  return data;
}

// Phase 1 labels
const PHASE1_LABELS = { featureA: "Feature A", featureB: "Feature B" };
// Phase 2 labels (different surface, same structure)
const PHASE2_LABELS = { featureA: "Score", featureB: "Speed" };

export default function TransferPage() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [gamePhase, setGamePhase] = useState<GamePhase>(1);
  const [threshold, setThreshold] = useState<number>(5);
  const [phase1Data, setPhase1Data] = useState<DataPoint[]>([]);
  const [phase2Data, setPhase2Data] = useState<TransferDataPoint[]>([]);
  const [currentPredictionIndex, setCurrentPredictionIndex] = useState(0);
  const [agentMode, setAgentMode] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [agentEmbed, setAgentEmbed] = useState(false);
  const [agentLearnedThreshold, setAgentLearnedThreshold] = useState<number | null>(null);
  const agentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        window.location.href = getNextDemoPath("transfer");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [demoMode, phase]);

  // Agent learns threshold from Phase 1 data
  const learnThreshold = useCallback((data: DataPoint[]): number => {
    // Find the threshold by analyzing wins vs losses
    const wins = data.filter(d => d.outcome === "Win").map(d => d.featureA);
    const losses = data.filter(d => d.outcome === "Loss").map(d => d.featureA);

    const minWin = Math.min(...wins);
    const maxLoss = Math.max(...losses);

    // The threshold is the value where maxLoss <= threshold < minWin
    return maxLoss;
  }, []);

  // Agent auto-play in Phase 2
  useEffect(() => {
    if (!agentMode || phase !== "playing" || gamePhase !== 2) return;
    if (currentPredictionIndex >= phase2Data.length) return;

    agentTimerRef.current = setTimeout(() => {
      const learned = agentLearnedThreshold ?? threshold;
      const currentPoint = phase2Data[currentPredictionIndex];
      const prediction: Outcome = currentPoint.featureA > learned ? "Win" : "Loss";

      makePrediction(prediction);
    }, 800);

    return () => {
      if (agentTimerRef.current) clearTimeout(agentTimerRef.current);
    };
  }, [agentMode, phase, gamePhase, currentPredictionIndex, phase2Data, agentLearnedThreshold, threshold]);

  // Auto-transition from Phase 1 to Phase 2 after delay
  useEffect(() => {
    if (phase === "playing" && gamePhase === 1) {
      const timer = setTimeout(() => {
        // Agent learns the threshold
        if (agentMode) {
          const learned = learnThreshold(phase1Data);
          setAgentLearnedThreshold(learned);
        }
        setGamePhase(2);
      }, agentMode ? 2500 : 2000);
      return () => clearTimeout(timer);
    }
  }, [phase, gamePhase, agentMode, phase1Data, learnThreshold]);

  const correctPredictions = useMemo(() => {
    return phase2Data.filter(d => d.prediction === d.outcome).length;
  }, [phase2Data]);

  const efficiency = useMemo(() => {
    if (phase2Data.length === 0) return 0;
    const completed = phase2Data.filter(d => d.prediction !== undefined).length;
    if (completed === 0) return 0;
    return Math.round((correctPredictions / phase2Data.length) * 100);
  }, [phase2Data, correctPredictions]);

  const handleBegin = useCallback((withAgent: boolean = false) => {
    const t = generateThreshold();
    const p1 = generatePhase1Data(t);
    const p2 = generatePhase2Data(t);

    setThreshold(t);
    setPhase1Data(p1);
    setPhase2Data(p2);
    setCurrentPredictionIndex(0);
    setAgentMode(withAgent);
    setAgentLearnedThreshold(null);
    setGamePhase(1);
    setPhase("playing");
  }, []);

  const makePrediction = useCallback((prediction: Outcome) => {
    if (currentPredictionIndex >= phase2Data.length) return;

    setPhase2Data(prev => {
      const updated = [...prev];
      updated[currentPredictionIndex] = { ...updated[currentPredictionIndex], prediction };
      return updated;
    });

    const nextIndex = currentPredictionIndex + 1;
    setCurrentPredictionIndex(nextIndex);

    // Check if all predictions made
    if (nextIndex >= phase2Data.length) {
      setTimeout(() => {
        const correct = phase2Data.filter((d, i) => {
          const pred = i === currentPredictionIndex ? prediction : d.prediction;
          return pred === d.outcome;
        }).length + (prediction === phase2Data[currentPredictionIndex].outcome ? 0 : 0);

        // Recalculate with final prediction
        const finalData = [...phase2Data];
        finalData[currentPredictionIndex] = { ...finalData[currentPredictionIndex], prediction };
        const finalCorrect = finalData.filter(d => d.prediction === d.outcome).length;
        const eff = Math.round((finalCorrect / finalData.length) * 100);

        saveScore("transfer", eff);
        setPhase("reveal");
      }, agentMode ? 600 : 300);
    }
  }, [currentPredictionIndex, phase2Data, agentMode]);

  const getLabels = () => gamePhase === 1 ? PHASE1_LABELS : PHASE2_LABELS;

  if (phase === "intro") {
    return (
      <Shell env="The Transfer">
        <div style={{ ...card, padding: "48px 32px" }}>
          <p
            style={{
              fontSize: "15px",
              lineHeight: 1.7,
              color: C.textSecondary,
              margin: 0,
              marginBottom: "24px",
            }}
          >
            Study the training data to find the hidden pattern. Then apply what you learned to predict outcomes in a new domain.
          </p>
          <p
            style={{
              fontSize: "15px",
              lineHeight: 1.7,
              color: C.textSecondary,
              margin: 0,
              marginBottom: "24px",
            }}
          >
            The surface details will change but the underlying structure transfers. Recognize deep patterns to succeed.
          </p>
          <p
            style={{
              fontSize: "13px",
              lineHeight: 1.6,
              color: C.textTertiary,
              margin: 0,
              marginBottom: "32px",
            }}
          >
            Your score depends on correct predictions in the transfer phase.
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
    const labels = getLabels();

    return (
      <Shell env="The Transfer">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
          }}
        >
          <span
            style={{
              fontSize: "13px",
              fontWeight: 500,
              color: C.textSecondary,
            }}
          >
            {agentMode && (
              <span style={{ color: C.accent, marginRight: "8px" }}>Agent</span>
            )}
            Phase {gamePhase}: {gamePhase === 1 ? "Learn" : "Transfer"}
          </span>
          {gamePhase === 2 && (
            <span
              style={{
                fontSize: "13px",
                color: C.textTertiary,
              }}
            >
              {currentPredictionIndex} / {phase2Data.length} predicted
            </span>
          )}
        </div>

        {gamePhase === 1 && (
          <>
            <p style={{ fontSize: "13px", color: C.textTertiary, margin: "0 0 16px 0" }}>
              Study the pattern. What determines Win vs Loss?
            </p>
            <div
              style={{
                ...card,
                overflow: "hidden",
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                    <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "11px", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: C.textTertiary }}>
                      {labels.featureA}
                    </th>
                    <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "11px", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: C.textTertiary }}>
                      {labels.featureB}
                    </th>
                    <th style={{ padding: "12px 16px", textAlign: "right", fontSize: "11px", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: C.textTertiary }}>
                      Outcome
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {phase1Data.map((point, i) => (
                    <tr key={i} style={{ borderBottom: i < phase1Data.length - 1 ? `1px solid ${C.border}` : "none" }}>
                      <td style={{ padding: "12px 16px", fontSize: "15px", color: C.textPrimary, fontWeight: 500 }}>
                        {point.featureA}
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: "15px", color: C.textSecondary }}>
                        {point.featureB}
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right" }}>
                        <span style={{
                          fontSize: "13px",
                          fontWeight: 500,
                          color: point.outcome === "Win" ? "#22A55B" : C.accent
                        }}>
                          {point.outcome}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {agentMode && (
              <div style={{ textAlign: "center", fontSize: "12px", color: C.textTertiary, marginTop: "16px" }}>
                Analyzing pattern...
              </div>
            )}
          </>
        )}

        {gamePhase === 2 && (
          <>
            <p style={{ fontSize: "13px", color: C.textTertiary, margin: "0 0 16px 0" }}>
              New domain, same structure. Predict each outcome.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {phase2Data.map((point, i) => {
                const isActive = i === currentPredictionIndex;
                const isPredicted = point.prediction !== undefined;
                const isCorrect = isPredicted && point.prediction === point.outcome;

                return (
                  <div
                    key={i}
                    style={{
                      ...card,
                      padding: "16px",
                      opacity: isPredicted ? 0.6 : 1,
                      borderColor: isActive ? C.accent : C.border,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", gap: "32px" }}>
                        <div>
                          <div style={{ fontSize: "11px", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: C.textTertiary, marginBottom: "4px" }}>
                            {labels.featureA}
                          </div>
                          <div style={{ fontSize: "18px", fontWeight: 500, color: C.textPrimary }}>
                            {point.featureA}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: "11px", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: C.textTertiary, marginBottom: "4px" }}>
                            {labels.featureB}
                          </div>
                          <div style={{ fontSize: "18px", fontWeight: 500, color: C.textSecondary }}>
                            {point.featureB}
                          </div>
                        </div>
                      </div>

                      {isPredicted ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{
                            fontSize: "13px",
                            fontWeight: 500,
                            color: isCorrect ? "#22A55B" : C.accent
                          }}>
                            {point.prediction}
                          </span>
                          {isCorrect ? (
                            <Check size={16} strokeWidth={2} color="#22A55B" />
                          ) : (
                            <X size={16} strokeWidth={2} color={C.accent} />
                          )}
                        </div>
                      ) : isActive && !agentMode ? (
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button
                            onClick={() => makePrediction("Win")}
                            style={{
                              ...ghostButton,
                              height: "36px",
                              padding: "0 16px",
                              fontSize: "13px",
                            }}
                          >
                            Win
                          </button>
                          <button
                            onClick={() => makePrediction("Loss")}
                            style={{
                              ...ghostButton,
                              height: "36px",
                              padding: "0 16px",
                              fontSize: "13px",
                            }}
                          >
                            Loss
                          </button>
                        </div>
                      ) : isActive && agentMode ? (
                        <span style={{ fontSize: "13px", color: C.textTertiary }}>
                          Predicting...
                        </span>
                      ) : (
                        <span style={{ fontSize: "13px", color: C.textTertiary }}>?</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {agentMode && (
              <div style={{ textAlign: "center", fontSize: "12px", color: C.textTertiary, marginTop: "16px" }}>
                Applying learned pattern
              </div>
            )}
          </>
        )}
      </Shell>
    );
  }

  // Reveal phase
  const finalCorrect = phase2Data.filter(d => d.prediction === d.outcome).length;
  const finalEfficiency = Math.round((finalCorrect / phase2Data.length) * 100);

  return (
    <Shell env="The Transfer">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "12px",
          marginBottom: "16px",
        }}
      >
        <MetricCard label="Correct" value={`${finalCorrect}/${phase2Data.length}`} />
        <MetricCard label="Threshold" value={threshold.toString()} />
        <MetricCard label="Efficiency" value={`${finalEfficiency}%`} />
      </div>

      <div style={{ fontSize: "13px", color: finalEfficiency === 100 ? "#22A55B" : finalEfficiency >= 50 ? C.textSecondary : C.accent, marginBottom: "16px" }}>
        {finalEfficiency === 100
          ? "Pattern fully transferred to new domain."
          : finalEfficiency >= 75
            ? "Strong transfer, minor errors in application."
            : finalEfficiency >= 50
              ? "Partial transfer. The rule was: first feature above threshold predicts success."
              : "Transfer failed. Look for what consistently predicts outcomes."}
      </div>

      <LessonCard term="In the real world">
        A company that succeeds in one market wants to expand to another. The surface details change but the underlying structure transfers. Agents that recognize deep patterns can accelerate market expansion.
      </LessonCard>

      {demoMode && (
        <div style={{ fontSize: "12px", color: C.textTertiary, marginTop: "16px" }}>
          Advancing to next environment...
        </div>
      )}

      <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
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
