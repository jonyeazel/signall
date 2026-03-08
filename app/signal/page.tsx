"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Shell, MetricCard, LessonCard } from "../shell";
import { C, card, saveScore } from "../shared";
import { AlertCircle } from "lucide-react";

type Phase = "intro" | "playing" | "reveal";

type StreamValue = {
  value: number;
  isSpike: boolean;
  isTell: boolean;
  alertedCorrectly?: boolean;
  missed?: boolean;
};

function generateStream(): StreamValue[] {
  const stream: StreamValue[] = [];
  const length = 30;

  for (let i = 0; i < length; i++) {
    let val: number;
    do {
      val = Math.round((Math.random() * 4 + 1) * 10) / 10;
    } while (val % 1 === 0.5);

    stream.push({
      value: val,
      isSpike: false,
      isTell: false,
    });
  }

  const spikePositions: number[] = [];
  const minGap = 4;

  while (spikePositions.length < 4) {
    const pos = Math.floor(Math.random() * (length - 4)) + 3;
    const valid = spikePositions.every((p) => Math.abs(p - pos) >= minGap);
    if (valid && pos >= 3 && pos < length - 1) {
      spikePositions.push(pos);
    }
  }

  spikePositions.sort((a, b) => a - b);

  spikePositions.forEach((pos) => {
    stream[pos].value = Math.round((Math.random() * 2 + 8) * 10) / 10;
    stream[pos].isSpike = true;

    const tellPos = pos - 2;
    if (tellPos >= 0) {
      const tellValues = [1.5, 2.5, 3.5, 4.5];
      stream[tellPos].value = tellValues[Math.floor(Math.random() * tellValues.length)];
      stream[tellPos].isTell = true;
    }
  });

  return stream;
}

// --- Tell detector agent ---
function agentShouldAlert(
  stream: StreamValue[],
  currentIndex: number,
  alertActive: number
): boolean {
  if (alertActive > 0) return false;

  const tellIndex = currentIndex - 1;
  if (tellIndex >= 0) {
    const val = stream[tellIndex].value;
    const isTell = val % 1 === 0.5 && val >= 1 && val <= 5;
    if (isTell) {
      return Math.random() > 0.1;
    }
  }

  if (Math.random() < 0.05) {
    return true;
  }

  return false;
}

// Waveform chart constants
const CHART_WIDTH = 400;
const CHART_HEIGHT = 200;
const CHART_PADDING_X = 32;
const CHART_PADDING_TOP = 16;
const CHART_PADDING_BOTTOM = 24;
const STREAM_LENGTH = 30;
const VALUE_MIN = 0;
const VALUE_MAX = 10;

function valueToY(value: number): number {
  const plotHeight = CHART_HEIGHT - CHART_PADDING_TOP - CHART_PADDING_BOTTOM;
  const normalized = (value - VALUE_MIN) / (VALUE_MAX - VALUE_MIN);
  return CHART_HEIGHT - CHART_PADDING_BOTTOM - normalized * plotHeight;
}

function indexToX(index: number, width: number): number {
  const plotWidth = width - CHART_PADDING_X * 2;
  return CHART_PADDING_X + (index / (STREAM_LENGTH - 1)) * plotWidth;
}

export default function SignalPage() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [stream, setStream] = useState<StreamValue[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [alertActive, setAlertActive] = useState(0);
  const [correctAlerts, setCorrectAlerts] = useState(0);
  const [falseAlerts, setFalseAlerts] = useState(0);
  const [missedSpikes, setMissedSpikes] = useState(0);
  const [agentMode, setAgentMode] = useState(false);
  const agentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chartRef = useRef<SVGSVGElement>(null);
  const [chartWidth, setChartWidth] = useState(CHART_WIDTH);

  // Measure chart container width
  useEffect(() => {
    const updateWidth = () => {
      if (chartRef.current?.parentElement) {
        setChartWidth(chartRef.current.parentElement.clientWidth);
      }
    };
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  // Auto-start agent mode on mount
  useEffect(() => {
    if (phase === "intro") {
      handleBegin(true);
    }
  }, [phase]);

  useEffect(() => {
    if (!agentMode || phase !== "playing") return;
    if (currentIndex >= stream.length - 1) return;

    agentTimerRef.current = setTimeout(() => {
      const shouldAlert = agentShouldAlert(stream, currentIndex, alertActive);

      if (shouldAlert) {
        setAlertActive(2);
      }

      setTimeout(() => {
        const nextIndex = currentIndex + 1;
        const nextValue = stream[nextIndex];

        let newCorrect = correctAlerts;
        let newFalse = falseAlerts;
        let newMissed = missedSpikes;
        const currentAlertActive = shouldAlert ? 2 : alertActive;

        if (nextValue.isSpike) {
          if (currentAlertActive > 0) {
            newCorrect++;
            setCorrectAlerts(newCorrect);
            setStream((prev) => {
              const copy = [...prev];
              copy[nextIndex] = { ...copy[nextIndex], alertedCorrectly: true };
              return copy;
            });
          } else {
            newMissed++;
            setMissedSpikes(newMissed);
            setStream((prev) => {
              const copy = [...prev];
              copy[nextIndex] = { ...copy[nextIndex], missed: true };
              return copy;
            });
          }
          setAlertActive(0);
        } else {
          if (currentAlertActive === 1) {
            newFalse++;
            setFalseAlerts(newFalse);
            setAlertActive(0);
          } else if (currentAlertActive > 0) {
            setAlertActive((a) => a - 1);
          }
        }

        setCurrentIndex(nextIndex);

        if (nextIndex >= stream.length - 1) {
          const finalEfficiency = Math.max(
            0,
            Math.min(100, Math.round(((newCorrect * 25) - (newFalse * 10)) / 100 * 100))
          );
          saveScore("signal", finalEfficiency);
          if (window.parent !== window) {
            window.parent.postMessage({ type: "episodeComplete", envId: "signal", efficiency: finalEfficiency }, "*");
          }
          setTimeout(() => setPhase("reveal"), 400);
        }
      }, 200);
    }, 400);

    return () => {
      if (agentTimerRef.current) clearTimeout(agentTimerRef.current);
    };
  }, [agentMode, phase, currentIndex, stream, alertActive, correctAlerts, falseAlerts, missedSpikes]);

  const handleBegin = useCallback((withAgent: boolean = false) => {
    const newStream = generateStream();
    setStream(newStream);
    setCurrentIndex(0);
    setAlertActive(0);
    setCorrectAlerts(0);
    setFalseAlerts(0);
    setMissedSpikes(0);
    setAgentMode(withAgent);
    setPhase("playing");
  }, []);

  const handleAlert = useCallback(() => {
    if (agentMode) return;
    if (alertActive > 0) return;
    setAlertActive(2);
  }, [agentMode, alertActive]);

  const handleNext = useCallback(() => {
    if (agentMode) return;
    if (currentIndex >= stream.length - 1) {
      const finalCorrect = correctAlerts;
      let finalFalse = falseAlerts;
      const finalMissed = missedSpikes;

      if (alertActive === 1) {
        finalFalse++;
      }

      const efficiency = Math.max(
        0,
        Math.min(100, Math.round(((finalCorrect * 25) - (finalFalse * 10)) / 100 * 100))
      );
      saveScore("signal", efficiency);
      if (window.parent !== window) {
        window.parent.postMessage({ type: "episodeComplete", envId: "signal", efficiency }, "*");
      }
      setCorrectAlerts(finalCorrect);
      setFalseAlerts(finalFalse);
      setMissedSpikes(finalMissed);
      setPhase("reveal");
      return;
    }

    const nextIndex = currentIndex + 1;
    const nextValue = stream[nextIndex];

    if (nextValue.isSpike) {
      if (alertActive > 0) {
        setCorrectAlerts((c) => c + 1);
        setStream((prev) => {
          const copy = [...prev];
          copy[nextIndex] = { ...copy[nextIndex], alertedCorrectly: true };
          return copy;
        });
      } else {
        setMissedSpikes((m) => m + 1);
        setStream((prev) => {
          const copy = [...prev];
          copy[nextIndex] = { ...copy[nextIndex], missed: true };
          return copy;
        });
      }
      setAlertActive(0);
    } else {
      if (alertActive === 1) {
        setFalseAlerts((f) => f + 1);
        setAlertActive(0);
      } else if (alertActive > 0) {
        setAlertActive((a) => a - 1);
      }
    }

    setCurrentIndex(nextIndex);
  }, [agentMode, currentIndex, stream, alertActive, correctAlerts, falseAlerts, missedSpikes]);

  const efficiency = Math.max(
    0,
    Math.min(100, Math.round(((correctAlerts * 25) - (falseAlerts * 10)) / 100 * 100))
  );

  const currentValue = stream[currentIndex] || { value: 0, isSpike: false };

  // Build waveform path for seen values
  const buildWaveformPath = () => {
    if (stream.length === 0) return "";
    const points: string[] = [];
    for (let i = 0; i <= currentIndex; i++) {
      const x = indexToX(i, chartWidth);
      const y = valueToY(stream[i].value);
      points.push(`${x},${y}`);
    }
    return points.length > 0 ? `M${points.join(" L")}` : "";
  };

  // Build baseline path for unseen values
  const buildBaselinePath = () => {
    if (stream.length === 0 || currentIndex >= stream.length - 1) return "";
    const baselineY = valueToY(3); // Middle baseline
    const startX = indexToX(currentIndex + 1, chartWidth);
    const endX = indexToX(STREAM_LENGTH - 1, chartWidth);
    return `M${startX},${baselineY} L${endX},${baselineY}`;
  };

  // Reveal phase
  if (phase === "reveal") {
    return (
      <Shell env="signal">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "12px",
            marginBottom: "16px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <MetricCard label="Correct" value={`${correctAlerts}`} />
            <div style={{ fontSize: "9px", color: C.textTertiary, marginTop: "4px", textAlign: "center" }}>
              Spikes correctly predicted
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <MetricCard label="False" value={`${falseAlerts}`} />
            <div style={{ fontSize: "9px", color: C.textTertiary, marginTop: "4px", textAlign: "center" }}>
              Wrong predictions made
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <MetricCard label="Efficiency" value={`${efficiency}%`} />
            <div style={{ fontSize: "9px", color: C.textTertiary, marginTop: "4px", textAlign: "center" }}>
              Detection accuracy
            </div>
          </div>
        </div>

        <div style={{ fontSize: "13px", color: C.textSecondary, marginBottom: "16px" }}>
          {correctAlerts === 4 ? "Perfect detection — all tells spotted." : `${missedSpikes} spike${missedSpikes !== 1 ? "s" : ""} missed. The .5 tell precedes each spike by 2 positions.`}
        </div>

        <LessonCard term="What this teaches">
          <ul style={{ margin: 0, paddingLeft: "16px", lineHeight: 1.8 }}>
            <li>Separate real signals from noise</li>
            <li>Fraud detection runs on this logic</li>
            <li>False positives cost money too</li>
          </ul>
        </LessonCard>
      </Shell>
    );
  }

  // Playing phase - waveform visualization
  return (
    <Shell env="signal">
      {/* Waveform chart container */}
      <div
        style={{
          ...card,
          padding: 0,
          position: "relative",
          marginBottom: "16px",
          overflow: "hidden",
        }}
      >
        <svg
          ref={chartRef}
          width="100%"
          height={CHART_HEIGHT}
          style={{ display: "block" }}
        >
          {/* Alert zone band - shows where alert is active */}
          {alertActive > 0 && currentIndex < stream.length - 1 && (
            <>
              {[1, 2].slice(0, alertActive).map((offset) => {
                const targetIdx = currentIndex + offset;
                if (targetIdx >= stream.length) return null;
                const x = indexToX(targetIdx, chartWidth);
                const width = (chartWidth - CHART_PADDING_X * 2) / (STREAM_LENGTH - 1);
                return (
                  <rect
                    key={offset}
                    x={x - width / 2}
                    y={CHART_PADDING_TOP}
                    width={width}
                    height={CHART_HEIGHT - CHART_PADDING_TOP - CHART_PADDING_BOTTOM}
                    fill="rgba(224, 90, 0, 0.08)"
                  />
                );
              })}
            </>
          )}

          {/* Y-axis grid lines */}
          {[0, 2, 4, 6, 8, 10].map((val) => (
            <g key={val}>
              <line
                x1={CHART_PADDING_X}
                y1={valueToY(val)}
                x2={chartWidth - CHART_PADDING_X}
                y2={valueToY(val)}
                stroke={C.border}
                strokeWidth={val === 0 || val === 10 ? 1 : 0.5}
                strokeDasharray={val === 5 ? "4,4" : undefined}
              />
              <text
                x={CHART_PADDING_X - 8}
                y={valueToY(val)}
                textAnchor="end"
                alignmentBaseline="middle"
                fontSize="10"
                fill={C.textTertiary}
              >
                {val}
              </text>
            </g>
          ))}

          {/* Baseline for unseen values */}
          <path
            d={buildBaselinePath()}
            stroke={C.border}
            strokeWidth={1}
            strokeDasharray="4,4"
            fill="none"
          />

          {/* Correctly alerted spike fills (green area under peak) */}
          {stream.map((v, i) => {
            if (!v.alertedCorrectly || i > currentIndex) return null;
            const x = indexToX(i, chartWidth);
            const y = valueToY(v.value);
            const baseY = valueToY(0);
            const width = (chartWidth - CHART_PADDING_X * 2) / (STREAM_LENGTH - 1) * 0.8;
            return (
              <path
                key={`fill-${i}`}
                d={`M${x - width / 2},${baseY} L${x - width / 2},${y} L${x},${y - 8} L${x + width / 2},${y} L${x + width / 2},${baseY} Z`}
                fill="rgba(34, 165, 91, 0.15)"
              />
            );
          })}

          {/* Waveform line */}
          <path
            d={buildWaveformPath()}
            stroke={C.textPrimary}
            strokeWidth={2}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points */}
          {stream.map((v, i) => {
            if (i > currentIndex) return null;
            const x = indexToX(i, chartWidth);
            const y = valueToY(v.value);
            const isCurrent = i === currentIndex;

            // Missed spike - red dot
            if (v.missed) {
              return (
                <g key={i}>
                  <circle cx={x} cy={y} r={6} fill="#E05A00" />
                  <circle cx={x} cy={y} r={3} fill="#FFFFFF" />
                </g>
              );
            }

            // Correctly alerted spike - green dot
            if (v.alertedCorrectly) {
              return (
                <circle key={i} cx={x} cy={y} r={5} fill="#22A55B" />
              );
            }

            // Current value - glowing dot
            if (isCurrent) {
              return (
                <g key={i}>
                  <circle cx={x} cy={y} r={12} fill="rgba(224, 90, 0, 0.15)" />
                  <circle cx={x} cy={y} r={6} fill={C.accent} />
                </g>
              );
            }

            // Regular point
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r={3}
                fill={v.isSpike ? C.accent : C.textTertiary}
              />
            );
          })}

          {/* Position markers on X axis */}
          {[0, 9, 19, 29].map((idx) => (
            <text
              key={idx}
              x={indexToX(idx, chartWidth)}
              y={CHART_HEIGHT - 6}
              textAnchor="middle"
              fontSize="10"
              fill={C.textTertiary}
            >
              {idx + 1}
            </text>
          ))}
        </svg>

        {/* Current value overlay - right side */}
        <div
          style={{
            position: "absolute",
            right: "24px",
            top: "50%",
            transform: "translateY(-50%)",
            textAlign: "right",
          }}
        >
          <div
            style={{
              fontSize: "48px",
              fontWeight: 600,
              color: currentValue.value >= 8 ? C.accent : C.textPrimary,
              lineHeight: 1,
              letterSpacing: "-0.02em",
            }}
          >
            {currentValue.value.toFixed(1)}
          </div>
          <div
            style={{
              fontSize: "11px",
              color: C.textTertiary,
              marginTop: "4px",
            }}
          >
            {currentIndex + 1} / {stream.length || 30}
          </div>
        </div>

        {/* Alert indicator */}
        {alertActive > 0 && (
          <div
            style={{
              position: "absolute",
              left: "16px",
              top: "16px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 12px",
              background: "rgba(224, 90, 0, 0.1)",
              borderRadius: "8px",
              fontSize: "12px",
              color: C.accent,
              fontWeight: 500,
            }}
          >
            <AlertCircle size={14} strokeWidth={2} />
            Alert {alertActive}
          </div>
        )}

        {/* Agent mode indicator */}
        {agentMode && (
          <div
            style={{
              position: "absolute",
              left: "16px",
              bottom: "12px",
              fontSize: "11px",
              color: C.textTertiary,
            }}
          >
            Tell-detection agent
          </div>
        )}
      </div>

      {/* Compact stats bar */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 16px",
            background: correctAlerts > 0 ? "rgba(34, 165, 91, 0.1)" : C.surface,
            border: `1px solid ${correctAlerts > 0 ? "rgba(34, 165, 91, 0.3)" : C.border}`,
            borderRadius: "8px",
            fontSize: "13px",
            color: correctAlerts > 0 ? "#22A55B" : C.textTertiary,
          }}
        >
          <span style={{ fontWeight: 600 }}>{correctAlerts}</span>
          <span>correct</span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 16px",
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: "8px",
            fontSize: "13px",
            color: falseAlerts > 0 ? C.textPrimary : C.textTertiary,
          }}
        >
          <span style={{ fontWeight: 600 }}>{falseAlerts}</span>
          <span>false</span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 16px",
            background: missedSpikes > 0 ? "rgba(224, 90, 0, 0.1)" : C.surface,
            border: `1px solid ${missedSpikes > 0 ? "rgba(224, 90, 0, 0.3)" : C.border}`,
            borderRadius: "8px",
            fontSize: "13px",
            color: missedSpikes > 0 ? C.accent : C.textTertiary,
          }}
        >
          <span style={{ fontWeight: 600 }}>{missedSpikes}</span>
          <span>missed</span>
        </div>
      </div>
    </Shell>
  );
}
