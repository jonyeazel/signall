"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Shell, MetricCard, LessonCard } from "../shell";
import { C, card, buttonStyle, ghostButton, saveScore, isDemoMode, getNextDemoPath } from "../shared";
import { ArrowRight, RotateCcw, AlertCircle, Play } from "lucide-react";

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
// Looks for tell values (half-integers like 1.5, 2.5, 3.5, 4.5)
// When a tell is detected, alerts 2 steps later (when spike comes)
// Has some false positive rate (~10%) to simulate imperfect detection
function agentShouldAlert(
  stream: StreamValue[],
  currentIndex: number,
  alertActive: number
): boolean {
  if (alertActive > 0) return false;

  // Check if 2 positions back was a tell
  const tellIndex = currentIndex - 1; // We're about to move to currentIndex+1, so check currentIndex-1
  if (tellIndex >= 0) {
    const val = stream[tellIndex].value;
    const isTell = val % 1 === 0.5 && val >= 1 && val <= 5;
    if (isTell) {
      // ~10% chance to NOT alert (false negative simulation, but mostly we catch it)
      return Math.random() > 0.1;
    }
  }

  // Small false positive rate (~5%) - occasionally alert randomly
  if (Math.random() < 0.05) {
    return true;
  }

  return false;
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
  const [demoMode, setDemoMode] = useState(false);
  const agentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check demo mode on mount
  useEffect(() => {
    setDemoMode(isDemoMode());
  }, []);

  // Auto-start agent in demo
  useEffect(() => {
    if (demoMode && phase === "intro") {
      handleBegin(true);
    }
  }, [demoMode, phase]);

  // Auto-advance in demo after reveal
  useEffect(() => {
    if (demoMode && phase === "reveal") {
      const timer = setTimeout(() => {
        window.location.href = getNextDemoPath("signal");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [demoMode, phase]);

  // Agent auto-play
  useEffect(() => {
    if (!agentMode || phase !== "playing") return;
    if (currentIndex >= stream.length - 1) return;

    agentTimerRef.current = setTimeout(() => {
      // Agent decides whether to alert
      const shouldAlert = agentShouldAlert(stream, currentIndex, alertActive);

      if (shouldAlert) {
        setAlertActive(2);
      }

      // Brief pause then advance
      setTimeout(() => {
        // Process next step (similar to handleNext)
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

        // Check if done
        if (nextIndex >= stream.length - 1) {
          const finalEfficiency = Math.max(
            0,
            Math.min(100, Math.round(((newCorrect * 25) - (newFalse * 10)) / 100 * 100))
          );
          saveScore("signal", finalEfficiency);
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
      let finalCorrect = correctAlerts;
      let finalFalse = falseAlerts;
      let finalMissed = missedSpikes;

      if (alertActive === 1) {
        finalFalse++;
      }

      const efficiency = Math.max(
        0,
        Math.min(100, Math.round(((finalCorrect * 25) - (finalFalse * 10)) / 100 * 100))
      );
      saveScore("signal", efficiency);
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

  if (phase === "intro") {
    return (
      <Shell env="The Signal">
        <div style={{ ...card, padding: "48px 32px" }}>
          <p
            style={{
              fontSize: "15px",
              lineHeight: 1.7,
              color: C.textSecondary,
              margin: 0,
              marginBottom: "32px",
            }}
          >
            A stream of 30 data values will appear. Most are noise (1-5).
            Hidden among them are 4 spikes (8-10). Each spike is preceded
            by a tell exactly 2 positions before it. The tell is any value
            ending in .5. Predict spikes by clicking Alert before they appear.
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

  if (phase === "reveal") {
    return (
      <Shell env="The Signal">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "12px",
            marginBottom: "16px",
          }}
        >
          <MetricCard label="Correct" value={`${correctAlerts}`} />
          <MetricCard label="False" value={`${falseAlerts}`} />
          <MetricCard label="Efficiency" value={`${efficiency}%`} />
        </div>

        <div style={{ fontSize: "13px", color: C.textSecondary, marginBottom: "16px" }}>
          {correctAlerts === 4 ? "Perfect detection — all tells spotted." : `${missedSpikes} spike${missedSpikes !== 1 ? "s" : ""} missed. The .5 tell precedes each spike by 2 positions.`}
        </div>

        <LessonCard term="In the real world">
          Fraud detection systems scan millions of transactions for faint signals. Market analysts filter noise to find actionable intelligence. Autonomous agents in finance must distinguish meaningful patterns from random fluctuation — at scale, in real time.
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

  const currentValue = stream[currentIndex];
  const history = stream.slice(0, currentIndex);
  const remaining = stream.length - currentIndex - 1;

  return (
    <Shell env="The Signal">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "24px",
        }}
      >
        <div style={{ fontSize: "13px", color: C.textSecondary }}>
          {agentMode && (
            <span style={{ color: C.accent, marginRight: "8px" }}>Agent</span>
          )}
          Position {currentIndex + 1} / {stream.length}
        </div>
        <div style={{ fontSize: "13px", color: C.textSecondary }}>
          Remaining: {remaining}
        </div>
      </div>

      <div
        style={{
          ...card,
          padding: "48px",
          textAlign: "center",
          marginBottom: "24px",
        }}
      >
        <div
          style={{
            fontSize: "64px",
            fontWeight: 600,
            color: currentValue.value >= 8 ? "#C62828" : C.textPrimary,
            letterSpacing: "-0.02em",
            lineHeight: 1,
          }}
        >
          {currentValue.value.toFixed(1)}
        </div>
        {alertActive > 0 && (
          <div
            style={{
              marginTop: "16px",
              fontSize: "13px",
              color: C.accent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
            }}
          >
            <AlertCircle size={16} strokeWidth={2} />
            Alert active ({alertActive} step{alertActive > 1 ? "s" : ""} remaining)
          </div>
        )}
      </div>

      {history.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: "4px",
            marginBottom: "24px",
            overflowX: "auto",
            paddingBottom: "8px",
          }}
        >
          {history.slice(-12).map((v, i) => (
            <div
              key={i}
              style={{
                padding: "8px 10px",
                fontSize: "13px",
                background: v.isSpike
                  ? v.alertedCorrectly
                    ? "#E8F5E9"
                    : "#FFEBEE"
                  : C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: "16px",
                color: v.isSpike
                  ? v.alertedCorrectly
                    ? "#2E7D32"
                    : "#C62828"
                  : C.textTertiary,
                flexShrink: 0,
              }}
            >
              {v.value.toFixed(1)}
            </div>
          ))}
        </div>
      )}

      {!agentMode && (
        <div style={{ display: "flex", gap: "12px" }}>
          <button
            style={{
              ...buttonStyle,
              background: alertActive > 0 ? C.border : C.accent,
              flex: 1,
            }}
            onClick={handleAlert}
            disabled={alertActive > 0}
          >
            <AlertCircle size={16} strokeWidth={2} />
            Alert
          </button>
          <button
            style={{
              ...buttonStyle,
              background: "transparent",
              color: C.textSecondary,
              border: `1px solid ${C.border}`,
              flex: 1,
            }}
            onClick={handleNext}
          >
            Next
            <ArrowRight size={16} strokeWidth={2} />
          </button>
        </div>
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
          Tell-detection agent
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "12px",
          marginTop: "24px",
        }}
      >
        <div style={{ ...card, padding: "16px", textAlign: "center" }}>
          <div style={{ fontSize: "11px", color: C.textTertiary, marginBottom: "4px" }}>
            Correct
          </div>
          <div style={{ fontSize: "18px", fontWeight: 600, color: "#2E7D32" }}>
            {correctAlerts}
          </div>
        </div>
        <div style={{ ...card, padding: "16px", textAlign: "center" }}>
          <div style={{ fontSize: "11px", color: C.textTertiary, marginBottom: "4px" }}>
            False
          </div>
          <div style={{ fontSize: "18px", fontWeight: 600, color: C.textPrimary }}>
            {falseAlerts}
          </div>
        </div>
        <div style={{ ...card, padding: "16px", textAlign: "center" }}>
          <div style={{ fontSize: "11px", color: C.textTertiary, marginBottom: "4px" }}>
            Missed
          </div>
          <div style={{ fontSize: "18px", fontWeight: 600, color: "#C62828" }}>
            {missedSpikes}
          </div>
        </div>
      </div>
    </Shell>
  );
}
