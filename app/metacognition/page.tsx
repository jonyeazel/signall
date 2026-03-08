"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Shell, MetricCard, LessonCard } from "../shell";
import { C, card, buttonStyle, saveScore } from "../shared";
import { ArrowRight } from "lucide-react";

type Phase = "intro" | "playing" | "reveal";
type BetSize = 10 | 25 | 50 | 100;
type Prediction = "above" | "below";

interface Round {
  sequence: number[];
  threshold: number;
  actualValue: number;
  trend: "up" | "down" | "flat" | "volatile";
  label: string;
}

interface RoundResult {
  round: Round;
  prediction: Prediction;
  betPercent: BetSize;
  betAmount: number;
  correct: boolean;
  pnl: number;
}

const STARTING_BANKROLL = 1000;
const TOTAL_ROUNDS = 8;

const BET_LABELS: Record<BetSize, string> = {
  10: "10%",
  25: "25%",
  50: "50%",
  100: "All in",
};

const DATA_LABELS = [
  "Sales last 3 days",
  "Active users (past hours)",
  "Revenue this week ($K)",
  "Conversion rate (%)",
  "Support tickets",
  "API latency (ms)",
  "Inventory units",
  "Email open rate (%)",
];

function generateRound(roundIndex: number): Round {
  const label = DATA_LABELS[roundIndex % DATA_LABELS.length];
  const seqLength = 3 + Math.floor(Math.random() * 3); // 3-5 values
  const sequence: number[] = [];

  // Random trend type
  const trendTypes: ("up" | "down" | "flat" | "volatile")[] = ["up", "down", "flat", "volatile"];
  const trend = trendTypes[Math.floor(Math.random() * trendTypes.length)];

  // Starting value based on label type
  let baseValue: number;
  let scale: number;

  if (label.includes("%")) {
    baseValue = 10 + Math.random() * 60; // 10-70%
    scale = 5;
  } else if (label.includes("ms")) {
    baseValue = 50 + Math.random() * 150; // 50-200ms
    scale = 15;
  } else if (label.includes("$K")) {
    baseValue = 100 + Math.random() * 400; // 100-500K
    scale = 30;
  } else {
    baseValue = 50 + Math.random() * 200; // 50-250
    scale = 20;
  }

  let current = baseValue;

  for (let i = 0; i < seqLength; i++) {
    sequence.push(Math.round(current));

    switch (trend) {
      case "up":
        current += scale * (0.3 + Math.random() * 0.7);
        break;
      case "down":
        current -= scale * (0.3 + Math.random() * 0.7);
        break;
      case "flat":
        current += scale * (Math.random() - 0.5) * 0.3;
        break;
      case "volatile":
        current += scale * (Math.random() - 0.5) * 2;
        break;
    }
    current = Math.max(1, current); // Keep positive
  }

  // Generate next value following the trend
  let nextValue: number;
  switch (trend) {
    case "up":
      nextValue = current + scale * (0.3 + Math.random() * 0.7);
      break;
    case "down":
      nextValue = current - scale * (0.3 + Math.random() * 0.7);
      break;
    case "flat":
      nextValue = current + scale * (Math.random() - 0.5) * 0.5;
      break;
    case "volatile":
      nextValue = current + scale * (Math.random() - 0.5) * 2.5;
      break;
  }
  nextValue = Math.max(1, Math.round(nextValue));

  // Set threshold near the last value
  const lastValue = sequence[sequence.length - 1];
  const thresholdOffset = scale * (0.2 + Math.random() * 0.3) * (Math.random() > 0.5 ? 1 : -1);
  const threshold = Math.round(lastValue + thresholdOffset);

  return {
    sequence,
    threshold,
    actualValue: nextValue,
    trend,
    label,
  };
}

function generateRounds(): Round[] {
  return Array.from({ length: TOTAL_ROUNDS }, (_, i) => generateRound(i));
}

// --- Agent reasoning ---

function getAgentPrediction(round: Round): { prediction: Prediction; confidence: BetSize } {
  const seq = round.sequence;
  const last = seq[seq.length - 1];
  const threshold = round.threshold;

  // Calculate trend direction
  let upMoves = 0;
  let downMoves = 0;
  for (let i = 1; i < seq.length; i++) {
    if (seq[i] > seq[i - 1]) upMoves++;
    else if (seq[i] < seq[i - 1]) downMoves++;
  }

  // Calculate average change
  const changes = seq.slice(1).map((v, i) => v - seq[i]);
  const avgChange = changes.reduce((a, b) => a + b, 0) / changes.length;

  // Predict next value based on trend
  const predictedNext = last + avgChange;

  // Determine prediction
  const prediction: Prediction = predictedNext > threshold ? "above" : "below";

  // Determine confidence based on trend clarity
  const trendStrength = Math.abs(upMoves - downMoves) / (seq.length - 1);
  const changeConsistency = Math.abs(avgChange) / (Math.abs(last - seq[0]) / seq.length + 1);

  let confidence: BetSize;
  if (trendStrength > 0.8 && changeConsistency > 0.5) {
    confidence = 100;
  } else if (trendStrength > 0.5) {
    confidence = 50;
  } else if (trendStrength > 0.3) {
    confidence = 25;
  } else {
    confidence = 10;
  }

  return { prediction, confidence };
}

export default function MetaPage() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [rounds, setRounds] = useState<Round[]>([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [bankroll, setBankroll] = useState(STARTING_BANKROLL);
  const [selectedPrediction, setSelectedPrediction] = useState<Prediction | null>(null);
  const [selectedBet, setSelectedBet] = useState<BetSize | null>(null);
  const [results, setResults] = useState<RoundResult[]>([]);
  const [showingResult, setShowingResult] = useState(false);
  const [lastResult, setLastResult] = useState<RoundResult | null>(null);
  const [agentMode, setAgentMode] = useState(false);
  const agentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-start agent mode on mount
  useEffect(() => {
    if (phase === "intro") {
      handleBegin(true);
    }
  }, [phase]);

  const finalScore = useMemo(() => {
    return Math.round((bankroll / STARTING_BANKROLL) * 100);
  }, [bankroll]);

  const winRate = useMemo(() => {
    if (results.length === 0) return 0;
    const wins = results.filter((r) => r.correct).length;
    return Math.round((wins / results.length) * 100);
  }, [results]);

  const avgBetSize = useMemo(() => {
    if (results.length === 0) return 0;
    const total = results.reduce((sum, r) => sum + r.betPercent, 0);
    return Math.round(total / results.length);
  }, [results]);

  // Agent auto-play
  useEffect(() => {
    if (!agentMode || phase !== "playing" || showingResult) return;
    if (currentRound >= rounds.length) return;

    const round = rounds[currentRound];
    const { prediction, confidence } = getAgentPrediction(round);

    agentTimerRef.current = setTimeout(() => {
      setSelectedPrediction(prediction);

      setTimeout(() => {
        setSelectedBet(confidence);

        setTimeout(() => {
          submitBet(prediction, confidence);
        }, 600);
      }, 800);
    }, 800);

    return () => {
      if (agentTimerRef.current) clearTimeout(agentTimerRef.current);
    };
  }, [agentMode, phase, showingResult, currentRound, rounds]);

  // Agent auto-advance from result screen
  useEffect(() => {
    if (!agentMode || phase !== "playing" || !showingResult) return;

    agentTimerRef.current = setTimeout(() => {
      if (currentRound >= TOTAL_ROUNDS - 1) {
        saveScore("meta", finalScore);
        if (window.parent !== window) {
          window.parent.postMessage({ type: "episodeComplete", envId: "meta", efficiency: finalScore }, "*");
        }
        setPhase("reveal");
      } else {
        setCurrentRound((c) => c + 1);
        setSelectedPrediction(null);
        setSelectedBet(null);
        setShowingResult(false);
        setLastResult(null);
      }
    }, 1200);

    return () => {
      if (agentTimerRef.current) clearTimeout(agentTimerRef.current);
    };
  }, [agentMode, phase, showingResult, currentRound, finalScore]);

  const handleBegin = useCallback((withAgent: boolean = false) => {
    setRounds(generateRounds());
    setCurrentRound(0);
    setBankroll(STARTING_BANKROLL);
    setSelectedPrediction(null);
    setSelectedBet(null);
    setResults([]);
    setShowingResult(false);
    setLastResult(null);
    setAgentMode(withAgent);
    setPhase("playing");
  }, []);

  const submitBet = useCallback(
    (prediction: Prediction, betPercent: BetSize) => {
      const round = rounds[currentRound];
      const betAmount = Math.round((bankroll * betPercent) / 100);
      const isAbove = round.actualValue > round.threshold;
      const correct = (prediction === "above" && isAbove) || (prediction === "below" && !isAbove);
      const pnl = correct ? betAmount : -betAmount;

      const result: RoundResult = {
        round,
        prediction,
        betPercent,
        betAmount,
        correct,
        pnl,
      };

      setLastResult(result);
      setResults((prev) => [...prev, result]);
      setBankroll((b) => Math.max(0, b + pnl));
      setShowingResult(true);
    },
    [rounds, currentRound, bankroll]
  );

  const handleSubmit = useCallback(() => {
    if (agentMode) return;
    if (selectedPrediction === null || selectedBet === null) return;
    submitBet(selectedPrediction, selectedBet);
  }, [selectedPrediction, selectedBet, agentMode, submitBet]);

  const nextRound = useCallback(() => {
    if (agentMode) return;
    if (currentRound >= TOTAL_ROUNDS - 1 || bankroll <= 0) {
      saveScore("meta", finalScore);
      if (window.parent !== window) {
        window.parent.postMessage({ type: "episodeComplete", envId: "meta", efficiency: finalScore }, "*");
      }
      setPhase("reveal");
    } else {
      setCurrentRound((c) => c + 1);
      setSelectedPrediction(null);
      setSelectedBet(null);
      setShowingResult(false);
      setLastResult(null);
    }
  }, [currentRound, bankroll, finalScore, agentMode]);

  // Get current round data
  const round = rounds[currentRound] || null;
  const betAmount = selectedBet ? Math.round((bankroll * selectedBet) / 100) : 0;

  // --- PLAYING PHASE (unified layout for betting + result) ---
  if (phase === "playing" && round) {
    return (
      <Shell env="meta">
        {/* HEADER: Round counter + bankroll — always same structure */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
            height: "20px",
          }}
        >
          <span style={{ fontSize: "13px", color: C.textSecondary }}>
            {/* Agent indicator always rendered, visibility controlled */}
            <span style={{ color: C.accent, marginRight: "8px", opacity: agentMode ? 1 : 0 }}>
              Agent
            </span>
            Round {currentRound + 1} / {TOTAL_ROUNDS}
          </span>
          <span style={{ fontSize: "15px", fontWeight: 500, color: C.textPrimary }}>
            {bankroll.toLocaleString()} pts
          </span>
        </div>

        {/* MAIN CARD AREA: Fixed height container, content swaps inside */}
        <div
          style={{
            ...card,
            padding: "32px",
            marginBottom: "24px",
            minHeight: "180px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          {/* BETTING STATE: Show sequence + question */}
          <div style={{ opacity: showingResult ? 0 : 1, position: showingResult ? "absolute" : "relative", pointerEvents: showingResult ? "none" : "auto" }}>
            <div style={{ fontSize: "13px", color: C.textTertiary, marginBottom: "16px", textAlign: "center" }}>
              {round.label}
            </div>
            <div
              style={{
                display: "flex",
                gap: "16px",
                justifyContent: "center",
                marginBottom: "24px",
              }}
            >
              {round.sequence.map((val, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: "24px",
                    fontWeight: 500,
                    color: C.textPrimary,
                  }}
                >
                  {val}
                </div>
              ))}
              <div
                style={{
                  fontSize: "24px",
                  fontWeight: 500,
                  color: C.textTertiary,
                }}
              >
                ?
              </div>
            </div>
            <div style={{ fontSize: "15px", color: C.textSecondary, textAlign: "center" }}>
              Will the next value be above or below <span style={{ fontWeight: 500, color: C.textPrimary }}>{round.threshold}</span>?
            </div>
          </div>

          {/* RESULT STATE: Show outcome */}
          <div style={{ opacity: showingResult ? 1 : 0, position: showingResult ? "relative" : "absolute", pointerEvents: showingResult ? "auto" : "none", textAlign: "center" }}>
            {lastResult && (
              <>
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "16px",
                    background: lastResult.correct ? "rgba(74, 222, 128, 0.1)" : "rgba(224, 90, 0, 0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 16px",
                  }}
                >
                  <span style={{ fontSize: "24px", color: lastResult.correct ? "#22A55B" : "#E05A00" }}>
                    {lastResult.correct ? "+" : "−"}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: "32px",
                    fontWeight: 600,
                    color: lastResult.correct ? "#22A55B" : C.accent,
                    marginBottom: "8px",
                  }}
                >
                  {lastResult.pnl > 0 ? "+" : ""}
                  {lastResult.pnl.toLocaleString()} pts
                </div>
                <div style={{ fontSize: "14px", color: C.textSecondary }}>
                  Actual value: {lastResult.round.actualValue} — {lastResult.round.actualValue > lastResult.round.threshold ? "above" : "below"} {lastResult.round.threshold}
                </div>
              </>
            )}
          </div>
        </div>

        {/* CONTROLS AREA: Fixed height, content swaps inside */}
        <div style={{ minHeight: "180px", position: "relative" }}>
          {/* BETTING CONTROLS */}
          <div style={{ opacity: showingResult ? 0 : 1, position: showingResult ? "absolute" : "relative", top: 0, left: 0, right: 0, pointerEvents: showingResult ? "none" : "auto" }}>
            {/* Prediction buttons */}
            <div style={{ marginBottom: "24px" }}>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 500,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: C.textTertiary,
                  marginBottom: "12px",
                }}
              >
                Prediction
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                {(["above", "below"] as Prediction[]).map((pred) => (
                  <button
                    key={pred}
                    onClick={() => !agentMode && setSelectedPrediction(pred)}
                    disabled={agentMode}
                    style={{
                      flex: 1,
                      height: "44px",
                      background: selectedPrediction === pred ? C.accent : C.surface,
                      color: selectedPrediction === pred ? "#FFFFFF" : C.textSecondary,
                      border: `1px solid ${selectedPrediction === pred ? C.accent : C.border}`,
                      borderRadius: "16px",
                      fontSize: "13px",
                      fontWeight: 500,
                      fontFamily: "inherit",
                      cursor: agentMode ? "default" : "pointer",
                      textTransform: "capitalize",
                    }}
                  >
                    {pred} {round.threshold}
                  </button>
                ))}
              </div>
            </div>

            {/* Bet size buttons */}
            <div style={{ marginBottom: "24px" }}>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 500,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: C.textTertiary,
                  marginBottom: "12px",
                  opacity: selectedPrediction === null ? 0.5 : 1,
                }}
              >
                Bet Size
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                {([10, 25, 50, 100] as BetSize[]).map((bet) => (
                  <button
                    key={bet}
                    onClick={() => !agentMode && selectedPrediction && setSelectedBet(bet)}
                    disabled={agentMode || selectedPrediction === null}
                    style={{
                      flex: 1,
                      height: "44px",
                      background: selectedBet === bet ? C.accent : C.surface,
                      color: selectedBet === bet ? "#FFFFFF" : C.textSecondary,
                      border: `1px solid ${selectedBet === bet ? C.accent : C.border}`,
                      borderRadius: "16px",
                      fontSize: "13px",
                      fontWeight: 500,
                      fontFamily: "inherit",
                      cursor: (agentMode || selectedPrediction === null) ? "not-allowed" : "pointer",
                      opacity: selectedPrediction === null ? 0.5 : 1,
                    }}
                  >
                    {BET_LABELS[bet]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* RESULT INFO (your bet summary) */}
          <div style={{ opacity: showingResult ? 1 : 0, position: showingResult ? "relative" : "absolute", top: 0, left: 0, right: 0, pointerEvents: showingResult ? "auto" : "none" }}>
            {lastResult && (
              <div style={{ ...card, padding: "24px", marginBottom: "24px" }}>
                <div style={{ fontSize: "13px", color: C.textTertiary, marginBottom: "12px" }}>
                  {lastResult.round.label}: {lastResult.round.sequence.join(", ")}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", color: C.textSecondary }}>
                  <span>You bet: {lastResult.prediction.toUpperCase()} {lastResult.round.threshold}</span>
                  <span>Stake: {BET_LABELS[lastResult.betPercent]} ({lastResult.betAmount.toLocaleString()} pts)</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM ACTION AREA: Fixed height, always rendered */}
        <div style={{ height: "44px", display: "flex", alignItems: "center" }}>
          {/* Submit button (betting state) */}
          <div style={{ opacity: (!showingResult && !agentMode) ? 1 : 0, position: "absolute", pointerEvents: (!showingResult && !agentMode) ? "auto" : "none" }}>
            <button
              style={{
                ...buttonStyle,
                opacity: (selectedPrediction === null || selectedBet === null) ? 0.5 : 1,
                cursor: (selectedPrediction === null || selectedBet === null) ? "not-allowed" : "pointer",
              }}
              onClick={handleSubmit}
              disabled={selectedPrediction === null || selectedBet === null}
            >
              {selectedBet ? `Bet ${betAmount.toLocaleString()} pts` : "Place Bet"}
              <ArrowRight size={16} strokeWidth={2} />
            </button>
          </div>

          {/* Next round button (result state, non-agent) */}
          <div style={{ opacity: (showingResult && !agentMode) ? 1 : 0, position: (showingResult && !agentMode) ? "relative" : "absolute", pointerEvents: (showingResult && !agentMode) ? "auto" : "none" }}>
            <button style={buttonStyle} onClick={nextRound}>
              {currentRound >= TOTAL_ROUNDS - 1 || bankroll <= 0 ? "See Results" : "Next Round"}
              <ArrowRight size={16} strokeWidth={2} />
            </button>
          </div>

          {/* Agent mode indicator — always rendered, visibility controlled */}
          <div
            style={{
              textAlign: "center",
              fontSize: "12px",
              color: C.textTertiary,
              width: "100%",
              opacity: agentMode ? 1 : 0,
              pointerEvents: "none",
            }}
          >
            Trend analysis agent
          </div>
        </div>
      </Shell>
    );
  }

  // --- REVEAL PHASE ---
  return (
    <Shell env="meta">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "12px",
          marginBottom: "16px",
        }}
      >
        <MetricCard label="Efficiency" value={`${finalScore}%`} subtitle="Final bankroll vs starting" />
        <MetricCard label="Win Rate" value={`${winRate}%`} subtitle="Correct predictions made" />
        <MetricCard label="Avg Bet" value={`${avgBetSize}%`} subtitle="Mean confidence per bet" />
      </div>

      <div style={{ fontSize: "13px", color: C.textSecondary, marginBottom: "16px" }}>
        {finalScore >= 150 ? "Exceptional returns — strong trend reading and bet sizing." : finalScore >= 100 ? "Capital preserved. Room for more aggressive conviction plays." : finalScore >= 50 ? "Drawdown occurred. Review bet sizing on uncertain signals." : "Significant losses. Consider smaller bets when trends are unclear."}
      </div>

      <LessonCard term="What this teaches">
        <ul style={{ margin: 0, paddingLeft: "16px", display: "flex", flexDirection: "column", gap: "6px" }}>
          <li>Bet big when confident, small when unsure</li>
          <li>Overconfidence destroys returns</li>
          <li>Knowing what you don't know is a skill</li>
        </ul>
      </LessonCard>
    </Shell>
  );
}
