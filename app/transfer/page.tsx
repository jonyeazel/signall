"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Shell, MetricCard, LessonCard, MiniChart } from "../shell";
import { C, card, saveScore } from "../shared";
import { Check, X } from "lucide-react";

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

// Scatter plot component
function ScatterPlot({
  data,
  labels,
  threshold,
  showThreshold,
  predictedIndex,
  showPredictions,
}: {
  data: (DataPoint | TransferDataPoint)[];
  labels: { featureA: string; featureB: string };
  threshold: number;
  showThreshold: boolean;
  predictedIndex?: number;
  showPredictions?: boolean;
}) {
  const width = 400;
  const height = 280;
  const padding = { top: 24, right: 24, bottom: 40, left: 48 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  // Scale functions (domain 1-10)
  const xScale = (val: number) => padding.left + ((val - 1) / 9) * plotWidth;
  const yScale = (val: number) => padding.top + plotHeight - ((val - 1) / 9) * plotHeight;

  // Grid lines at intervals of 2
  const gridValues = [2, 4, 6, 8, 10];

  // Threshold line X position (threshold is the boundary, so line is at threshold + 0.5)
  const thresholdX = xScale(threshold + 0.5);

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: "block" }}
    >
      {/* Grid lines */}
      {gridValues.map((v) => (
        <g key={v}>
          {/* Vertical grid */}
          <line
            x1={xScale(v)}
            y1={padding.top}
            x2={xScale(v)}
            y2={padding.top + plotHeight}
            stroke={C.border}
            strokeWidth={1}
          />
          {/* Horizontal grid */}
          <line
            x1={padding.left}
            y1={yScale(v)}
            x2={padding.left + plotWidth}
            y2={yScale(v)}
            stroke={C.border}
            strokeWidth={1}
          />
        </g>
      ))}

      {/* Axes */}
      <line
        x1={padding.left}
        y1={padding.top + plotHeight}
        x2={padding.left + plotWidth}
        y2={padding.top + plotHeight}
        stroke={C.textTertiary}
        strokeWidth={1}
      />
      <line
        x1={padding.left}
        y1={padding.top}
        x2={padding.left}
        y2={padding.top + plotHeight}
        stroke={C.textTertiary}
        strokeWidth={1}
      />

      {/* Axis labels */}
      <text
        x={padding.left + plotWidth / 2}
        y={height - 8}
        textAnchor="middle"
        fill={C.textSecondary}
        fontSize={11}
        fontWeight={500}
      >
        {labels.featureA}
      </text>
      <text
        x={14}
        y={padding.top + plotHeight / 2}
        textAnchor="middle"
        fill={C.textSecondary}
        fontSize={11}
        fontWeight={500}
        transform={`rotate(-90, 14, ${padding.top + plotHeight / 2})`}
      >
        {labels.featureB}
      </text>

      {/* Axis tick labels */}
      {[1, 5, 10].map((v) => (
        <g key={`tick-${v}`}>
          <text
            x={xScale(v)}
            y={padding.top + plotHeight + 16}
            textAnchor="middle"
            fill={C.textTertiary}
            fontSize={10}
          >
            {v}
          </text>
          <text
            x={padding.left - 8}
            y={yScale(v) + 3}
            textAnchor="end"
            fill={C.textTertiary}
            fontSize={10}
          >
            {v}
          </text>
        </g>
      ))}

      {/* Threshold line */}
      {showThreshold && (
        <line
          x1={thresholdX}
          y1={padding.top}
          x2={thresholdX}
          y2={padding.top + plotHeight}
          stroke={C.textSecondary}
          strokeWidth={2}
          strokeDasharray="6 4"
          style={{
            opacity: 1,
            transition: "opacity 300ms ease-out",
          }}
        />
      )}

      {/* Data points */}
      {data.map((point, i) => {
        const cx = xScale(point.featureA);
        const cy = yScale(point.featureB);
        const isTransfer = "prediction" in point;
        const hasPrediction = isTransfer && (point as TransferDataPoint).prediction !== undefined;
        const isPending = isTransfer && predictedIndex !== undefined && i >= predictedIndex && !hasPrediction;

        // Determine color based on outcome or prediction
        let fillColor = point.outcome === "Win" ? "#22A55B" : C.accent;
        let opacity = 1;

        if (showPredictions && isTransfer) {
          if (isPending) {
            fillColor = C.textTertiary;
            opacity = 0.4;
          }
        }

        // Show check/X for predictions
        const showResult = showPredictions && hasPrediction;
        const isCorrect = showResult && (point as TransferDataPoint).prediction === point.outcome;

        return (
          <g key={i}>
            <circle
              cx={cx}
              cy={cy}
              r={6}
              fill={fillColor}
              opacity={opacity}
              style={{
                transition: "all 150ms ease-out",
              }}
            />
            {showResult && (
              <g transform={`translate(${cx + 10}, ${cy - 10})`}>
                {isCorrect ? (
                  <Check size={12} strokeWidth={2.5} color="#22A55B" />
                ) : (
                  <X size={12} strokeWidth={2.5} color={C.accent} />
                )}
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export default function TransferPage() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [gamePhase, setGamePhase] = useState<GamePhase>(1);
  const [threshold, setThreshold] = useState<number>(5);
  const [phase1Data, setPhase1Data] = useState<DataPoint[]>([]);
  const [phase2Data, setPhase2Data] = useState<TransferDataPoint[]>([]);
  const [currentPredictionIndex, setCurrentPredictionIndex] = useState(0);
  const [agentMode, setAgentMode] = useState(false);
  const [agentLearnedThreshold, setAgentLearnedThreshold] = useState<number | null>(null);
  const [showThresholdLine, setShowThresholdLine] = useState(false);
  const [chartData, setChartData] = useState<number[]>([]);
  const agentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-start agent mode on mount
  useEffect(() => {
    if (phase === "intro") {
      handleBegin(true);
    }
  }, [phase]);

  // Agent learns threshold from Phase 1 data
  const learnThreshold = useCallback((data: DataPoint[]): number => {
    // Find the threshold by analyzing wins vs losses
    const wins = data.filter(d => d.outcome === "Win").map(d => d.featureA);
    const losses = data.filter(d => d.outcome === "Loss").map(d => d.featureA);

    const maxLoss = Math.max(...losses);

    // The threshold is the value where maxLoss <= threshold < minWin
    return maxLoss;
  }, []);

  // Show threshold line after analysis delay in Phase 1
  useEffect(() => {
    if (phase === "playing" && gamePhase === 1) {
      const timer = setTimeout(() => {
        setShowThresholdLine(true);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [phase, gamePhase]);

  // Agent auto-play in Phase 2
  useEffect(() => {
    if (!agentMode || phase !== "playing" || gamePhase !== 2) return;
    if (currentPredictionIndex >= phase2Data.length) return;

    agentTimerRef.current = setTimeout(() => {
      const learned = agentLearnedThreshold ?? threshold;
      const currentPoint = phase2Data[currentPredictionIndex];
      const prediction: Outcome = currentPoint.featureA > learned ? "Win" : "Loss";

      makePrediction(prediction);
    }, 1200);

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
    setShowThresholdLine(false);
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

    const isCorrect = prediction === phase2Data[currentPredictionIndex].outcome;
    setChartData(prev => [...prev, prev.reduce((s, v) => s + v, 0) + (isCorrect ? 1 : 0)]);

    // Check if all predictions made
    if (nextIndex >= phase2Data.length) {
      setTimeout(() => {
        // Recalculate with final prediction
        const finalData = [...phase2Data];
        finalData[currentPredictionIndex] = { ...finalData[currentPredictionIndex], prediction };
        const finalCorrect = finalData.filter(d => d.prediction === d.outcome).length;
        const eff = Math.round((finalCorrect / finalData.length) * 100);

        saveScore("transfer", eff);
        if (window.parent !== window) {
          window.parent.postMessage({ type: "episodeComplete", envId: "transfer", efficiency: eff }, "*");
        }
        setPhase("reveal");
      }, agentMode ? 600 : 300);
    }
  }, [currentPredictionIndex, phase2Data, agentMode]);

  if (phase === "playing") {
    const predictedCount = phase2Data.filter(d => d.prediction !== undefined).length;

    return (
      <Shell env="transfer">
        {/* Status bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <span
            style={{
              fontSize: "13px",
              fontWeight: 500,
              color: C.textSecondary,
            }}
          >
            {agentMode && <span style={{ color: C.accent, marginRight: "8px" }}>Agent</span>}
            Phase {gamePhase}: {gamePhase === 1 ? "Learn" : "Transfer"}
          </span>
          {gamePhase === 2 && (
            <span style={{ fontSize: "13px", color: C.textTertiary }}>
              {predictedCount} / {phase2Data.length} predicted
            </span>
          )}
        </div>

        {/* Scatter plot area */}
        <div style={{ minHeight: "340px", position: "relative" }}>
          {/* Phase 1 scatter plot */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              opacity: gamePhase === 1 ? 1 : 0,
              transition: "opacity 300ms ease-out",
              pointerEvents: gamePhase === 1 ? "auto" : "none",
            }}
          >
            <div
              style={{
                ...card,
                padding: "16px",
              }}
            >
              <ScatterPlot
                data={phase1Data}
                labels={PHASE1_LABELS}
                threshold={threshold}
                showThreshold={showThresholdLine}
              />
            </div>
            <div
              style={{
                marginTop: "12px",
                fontSize: "12px",
                color: C.textTertiary,
                textAlign: "center",
              }}
            >
              {showThresholdLine ? "Decision boundary found" : "Analyzing pattern..."}
            </div>
          </div>

          {/* Phase 2 scatter plot */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              opacity: gamePhase === 2 ? 1 : 0,
              transition: "opacity 300ms ease-out",
              pointerEvents: gamePhase === 2 ? "auto" : "none",
            }}
          >
            <div
              style={{
                ...card,
                padding: "16px",
              }}
            >
              <ScatterPlot
                data={phase2Data}
                labels={PHASE2_LABELS}
                threshold={agentLearnedThreshold ?? threshold}
                showThreshold={true}
                predictedIndex={currentPredictionIndex}
                showPredictions={true}
              />
            </div>
            <div
              style={{
                marginTop: "12px",
                fontSize: "12px",
                color: C.textTertiary,
                textAlign: "center",
              }}
            >
              Applying learned boundary to new domain
            </div>
          </div>
        </div>

        <MiniChart data={chartData} totalSteps={phase2Data.length || 4} yMin={0} />
      </Shell>
    );
  }

  // Reveal phase
  const finalCorrect = phase2Data.filter(d => d.prediction === d.outcome).length;
  const finalEfficiency = Math.round((finalCorrect / phase2Data.length) * 100);

  return (
    <Shell env="transfer">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "12px",
          marginBottom: "16px",
        }}
      >
        <MetricCard label="Correct" value={`${finalCorrect}/${phase2Data.length}`} subtitle="Predictions correct in new domain" />
        <MetricCard label="Threshold" value={threshold.toString()} subtitle="Decision boundary the agent found" />
        <MetricCard label="Efficiency" value={`${finalEfficiency}%`} subtitle="Transfer accuracy" />
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

      <LessonCard term="What this teaches">
        <ul style={{ margin: 0, paddingLeft: "16px", display: "flex", flexDirection: "column", gap: "6px" }}>
          <li>Apply lessons from one domain to another</li>
          <li>Market expansion requires pattern transfer</li>
          <li>The structure stays, the surface changes</li>
        </ul>
      </LessonCard>
    </Shell>
  );
}
