"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Shell, MetricCard, LessonCard, MiniChart } from "../shell";
import { C, buttonStyle, ghostButton, saveScore } from "../shared";
import { Search, Target } from "lucide-react";

type Phase = "intro" | "playing" | "reveal";
type ComponentStatus = "untested" | "testing" | "pass" | "fail";

const COMPONENTS = ["A", "B", "C", "D", "E", "F"] as const;
const OPTIMAL_TESTS = 3; // ceil(log2(6))

// --- Binary search agent ---

function binarySearchChoice(
  statuses: ComponentStatus[],
  _brokenIndex: number
): { action: "test" | "identify"; index: number } {
  // Find the current search range based on test results
  let low = 0;
  let high = statuses.length - 1;

  // Narrow down based on known results
  for (let i = 0; i < statuses.length; i++) {
    if (statuses[i] === "pass") {
      // If component i passes, the broken one must be after it
      low = Math.max(low, i + 1);
    } else if (statuses[i] === "fail") {
      // If component i fails, the broken one is at or before it
      high = Math.min(high, i);
    }
  }

  // If range is narrowed to one component, identify it
  if (low === high) {
    return { action: "identify", index: low };
  }

  // Find the middle untested component in the current range
  const mid = Math.floor((low + high) / 2);

  // Find the closest untested component to mid
  let testIndex = mid;
  let offset = 0;
  while (offset <= high - low) {
    if (mid + offset <= high && (statuses[mid + offset] === "untested" || statuses[mid + offset] === "testing")) {
      testIndex = mid + offset;
      break;
    }
    if (mid - offset >= low && (statuses[mid - offset] === "untested" || statuses[mid - offset] === "testing")) {
      testIndex = mid - offset;
      break;
    }
    offset++;
  }

  return { action: "test", index: testIndex };
}

// Grid positions for 2x3 layout with flow connections
// Layout:  A → B → C
//          ↓       ↓
//          F ← E ← D
const GRID_POSITIONS = [
  { row: 0, col: 0 }, // A
  { row: 0, col: 1 }, // B
  { row: 0, col: 2 }, // C
  { row: 1, col: 2 }, // D
  { row: 1, col: 1 }, // E
  { row: 1, col: 0 }, // F
];

export default function RepairPage() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [brokenIndex, setBrokenIndex] = useState<number>(0);
  const [statuses, setStatuses] = useState<ComponentStatus[]>(
    Array(6).fill("untested")
  );
  const [testCount, setTestCount] = useState(0);
  const [identifiedIndex, setIdentifiedIndex] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [agentMode, setAgentMode] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState<number | null>(null);
  const [chartData, setChartData] = useState<number[]>([]);
  const agentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-start agent mode on mount
  useEffect(() => {
    if (phase === "intro") {
      handleBegin(true);
    }
  }, [phase]);

  const efficiency = useMemo(() => {
    if (isCorrect === false) return 0;
    if (isCorrect === true && testCount > 0) {
      return Math.round((OPTIMAL_TESTS / testCount) * 100);
    }
    return 0;
  }, [isCorrect, testCount]);

  // Agent auto-play with slower timing
  useEffect(() => {
    if (!agentMode || phase !== "playing" || identifiedIndex !== null) return;

    agentTimerRef.current = setTimeout(() => {
      const decision = binarySearchChoice(statuses, brokenIndex);
      setSelectedComponent(decision.index);

      // Show "testing" state for dramatic effect
      if (decision.action === "test") {
        setStatuses(prev => {
          const next = [...prev];
          next[decision.index] = "testing";
          return next;
        });
      }

      // Longer pause to show selection, then act
      setTimeout(() => {
        if (decision.action === "test") {
          // Test the component
          const newStatuses = [...statuses];
          const fails = brokenIndex <= decision.index;
          newStatuses[decision.index] = fails ? "fail" : "pass";
          setStatuses(newStatuses);
          setTestCount((c) => c + 1);
          setChartData(prev => [...prev, newStatuses.filter(s => s === "untested").length]);
        } else {
          // Identify the component
          setIdentifiedIndex(decision.index);
          const correct = decision.index === brokenIndex;
          setIsCorrect(correct);
          const efficiency = correct ? Math.round((OPTIMAL_TESTS / Math.max(1, testCount)) * 100) : 0;
          saveScore("repair", efficiency);
          if (window.parent !== window) {
            window.parent.postMessage({ type: "episodeComplete", envId: "repair", efficiency }, "*");
          }
          setTimeout(() => setPhase("reveal"), 600);
        }
        setSelectedComponent(null);
      }, 400);
    }, 800);

    return () => {
      if (agentTimerRef.current) clearTimeout(agentTimerRef.current);
    };
  }, [agentMode, phase, statuses, brokenIndex, identifiedIndex, testCount]);

  const handleBegin = useCallback((withAgent: boolean = false) => {
    const broken = Math.floor(Math.random() * 6);
    setBrokenIndex(broken);
    setStatuses(Array(6).fill("untested"));
    setTestCount(0);
    setIdentifiedIndex(null);
    setIsCorrect(null);
    setAgentMode(withAgent);
    setSelectedComponent(null);
    setPhase("playing");
  }, []);

  const testComponent = useCallback(
    (index: number) => {
      if (agentMode) return;
      if (statuses[index] !== "untested") return;

      const newStatuses = [...statuses];
      // Component fails if it IS the broken one OR any upstream is broken
      const fails = brokenIndex <= index;
      newStatuses[index] = fails ? "fail" : "pass";
      setStatuses(newStatuses);
      setTestCount((c) => c + 1);
    },
    [statuses, brokenIndex, agentMode]
  );

  const identifyComponent = useCallback(
    (index: number) => {
      if (agentMode) return;
      setIdentifiedIndex(index);
      const correct = index === brokenIndex;
      setIsCorrect(correct);
      const efficiency = correct ? Math.round((OPTIMAL_TESTS / Math.max(1, testCount)) * 100) : 0;
      saveScore("repair", efficiency);
      if (window.parent !== window) {
        window.parent.postMessage({ type: "episodeComplete", envId: "repair", efficiency }, "*");
      }
      setPhase("reveal");
    },
    [brokenIndex, testCount, agentMode]
  );

  // Component card for the grid visualization
  const ComponentCard = ({ index, status, isSelected }: { index: number; status: ComponentStatus; isSelected: boolean }) => {
    const comp = COMPONENTS[index];

    // Background colors based on status
    let bg: string = C.surface;
    let borderColor: string = C.border;

    if (status === "pass") {
      bg = "rgba(34, 165, 91, 0.08)";
      borderColor = "#22A55B";
    } else if (status === "fail") {
      bg = "rgba(224, 90, 0, 0.08)";
      borderColor = "#E05A00";
    } else if (status === "testing") {
      bg = "rgba(224, 90, 0, 0.04)";
      borderColor = C.accent;
    }

    if (isSelected) {
      borderColor = C.accent;
    }

    return (
      <div
        style={{
          width: "100px",
          height: "100px",
          background: bg,
          border: `2px solid ${borderColor}`,
          borderRadius: "8px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 150ms ease-out",
          boxShadow: status === "testing" || isSelected
            ? `0 0 0 4px ${C.accent}20`
            : "none",
        }}
      >
        <span
          style={{
            fontSize: "32px",
            fontWeight: 600,
            color: status === "pass"
              ? "#22A55B"
              : status === "fail"
                ? "#E05A00"
                : C.textPrimary,
            marginBottom: "8px",
          }}
        >
          {comp}
        </span>
        <span
          style={{
            fontSize: "11px",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: status === "pass"
              ? "#22A55B"
              : status === "fail"
                ? "#E05A00"
                : status === "testing"
                  ? C.accent
                  : C.textTertiary,
          }}
        >
          {status === "untested" ? "Ready" : status === "testing" ? "Testing..." : status}
        </span>
      </div>
    );
  };

  // Flow line connecting two grid positions
  const FlowLine = ({ from, to, vertical = false }: { from: number; to: number; vertical?: boolean }) => {
    const fromPos = GRID_POSITIONS[from];
    const toPos = GRID_POSITIONS[to];

    // Check if both connected components have been tested (for color)
    const fromStatus = statuses[from];
    const toStatus = statuses[to];
    const isActive = fromStatus !== "untested" || toStatus !== "untested";

    if (vertical) {
      // Vertical line (for C→D or A→F connection shown as just arrows)
      return null; // We'll handle vertical with the grid gap
    }

    // Horizontal arrow
    const isReverse = toPos.col < fromPos.col; // E←D, F←E

    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "32px",
          color: isActive ? C.textSecondary : C.textTertiary,
          fontSize: "18px",
        }}
      >
        {isReverse ? "←" : "→"}
      </div>
    );
  };

  if (phase === "playing") {
    return (
      <Shell env="repair">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "32px",
          }}
        >
          <span
            style={{
              fontSize: "13px",
              color: C.textSecondary,
            }}
          >
            {agentMode && (
              <span style={{ color: C.accent, marginRight: "8px" }}>Agent</span>
            )}
            Tests: {testCount} / 6
          </span>
        </div>

        {/* 2x3 Grid Pipeline Visualization */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "16px",
            marginBottom: "48px",
          }}
        >
          {/* Top row: A → B → C */}
          <div style={{ display: "flex", alignItems: "center", gap: "0" }}>
            <ComponentCard index={0} status={statuses[0]} isSelected={selectedComponent === 0} />
            <FlowLine from={0} to={1} />
            <ComponentCard index={1} status={statuses[1]} isSelected={selectedComponent === 1} />
            <FlowLine from={1} to={2} />
            <ComponentCard index={2} status={statuses[2]} isSelected={selectedComponent === 2} />
          </div>

          {/* Vertical connectors row */}
          <div style={{ display: "flex", justifyContent: "space-between", width: "364px", padding: "0 49px" }}>
            <span style={{ color: C.textTertiary, fontSize: "18px", visibility: "hidden" }}>↓</span>
            <span style={{ color: C.textTertiary, fontSize: "18px" }}>↓</span>
          </div>

          {/* Bottom row: F ← E ← D */}
          <div style={{ display: "flex", alignItems: "center", gap: "0" }}>
            <ComponentCard index={5} status={statuses[5]} isSelected={selectedComponent === 5} />
            <FlowLine from={4} to={5} />
            <ComponentCard index={4} status={statuses[4]} isSelected={selectedComponent === 4} />
            <FlowLine from={3} to={4} />
            <ComponentCard index={3} status={statuses[3]} isSelected={selectedComponent === 3} />
          </div>
        </div>

        <div style={{ opacity: agentMode ? 0 : 1, pointerEvents: agentMode ? "none" : "auto" }}>
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
              Test Component
            </div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {COMPONENTS.map((comp, index) => (
                <button
                  key={comp}
                  style={{
                    ...ghostButton,
                    height: "36px",
                    padding: "0 16px",
                    opacity: statuses[index] !== "untested" ? 0.4 : 1,
                    cursor:
                      statuses[index] !== "untested" ? "not-allowed" : "pointer",
                  }}
                  onClick={() => testComponent(index)}
                  disabled={statuses[index] !== "untested"}
                >
                  <Search size={14} strokeWidth={2} />
                  {comp}
                </button>
              ))}
            </div>
          </div>

          <div>
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
              Identify as Broken
            </div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {COMPONENTS.map((comp, index) => (
                <button
                  key={comp}
                  style={{
                    ...buttonStyle,
                    height: "36px",
                    padding: "0 16px",
                  }}
                  onClick={() => identifyComponent(index)}
                >
                  <Target size={14} strokeWidth={2} />
                  {comp}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div
          style={{
            textAlign: "center",
            fontSize: "12px",
            color: C.textTertiary,
            height: "18px",
            opacity: agentMode ? 1 : 0,
          }}
        >
          Binary search agent
        </div>

        <MiniChart data={chartData} totalSteps={6} yMin={0} yMax={6} />
      </Shell>
    );
  }

  // Reveal phase
  return (
    <Shell env="repair">
      {/* Compact reveal visualization */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "8px",
          marginBottom: "16px",
        }}
      >
        {/* Top row */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {[0, 1, 2].map((index) => {
            const comp = COMPONENTS[index];
            const isBroken = index === brokenIndex;
            const isDownstream = index > brokenIndex;
            let bg = "rgba(74, 222, 128, 0.1)";
            let color = "#22A55B";
            if (isBroken) { bg = "rgba(224, 90, 0, 0.15)"; color = "#E05A00"; }
            if (isDownstream) { bg = C.surface; color = C.textTertiary; }

            return (
              <div key={comp} style={{ display: "flex", alignItems: "center" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: bg,
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: 600,
                    color,
                  }}
                >
                  {comp}
                </div>
                {index < 2 && (
                  <span style={{ color: C.textTertiary, fontSize: "12px", margin: "0 2px" }}>→</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Connector */}
        <div style={{ color: C.textTertiary, fontSize: "12px" }}>↓</div>

        {/* Bottom row (reversed order visually) */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {[5, 4, 3].map((index, i) => {
            const comp = COMPONENTS[index];
            const isBroken = index === brokenIndex;
            const isDownstream = index > brokenIndex;
            let bg = "rgba(74, 222, 128, 0.1)";
            let color = "#22A55B";
            if (isBroken) { bg = "rgba(224, 90, 0, 0.15)"; color = "#E05A00"; }
            if (isDownstream) { bg = C.surface; color = C.textTertiary; }

            return (
              <div key={comp} style={{ display: "flex", alignItems: "center" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: bg,
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: 600,
                    color,
                  }}
                >
                  {comp}
                </div>
                {i < 2 && (
                  <span style={{ color: C.textTertiary, fontSize: "12px", margin: "0 2px" }}>←</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ fontSize: "13px", color: isCorrect ? "#22A55B" : C.accent, textAlign: "center", marginBottom: "16px" }}>
        {isCorrect ? `Correct — ${COMPONENTS[brokenIndex]} was broken.` : `Incorrect — ${COMPONENTS[brokenIndex]} was broken, not ${COMPONENTS[identifiedIndex!]}.`}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "12px",
          marginBottom: "16px",
        }}
      >
        <MetricCard label="Tests" value={testCount.toString()} subtitle="Tests needed to find the fault" />
        <MetricCard label="Optimal" value={OPTIMAL_TESTS.toString()} muted subtitle="Minimum tests via binary search" />
        <MetricCard label="Efficiency" value={`${efficiency}%`} subtitle="Diagnostic efficiency" />
      </div>

      <LessonCard term="What this teaches">
        <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "13px", lineHeight: 1.8 }}>
          <li>Find the root cause fast</li>
          <li>Every outage needs this diagnosis</li>
          <li>Binary search beats random testing</li>
        </ul>
      </LessonCard>
    </Shell>
  );
}
