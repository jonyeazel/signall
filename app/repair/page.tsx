"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Shell, MetricCard, LessonCard } from "../shell";
import { C, card, buttonStyle, ghostButton, saveScore, isDemoMode, getNextDemoPath, isAgentEmbed } from "../shared";
import { ArrowRight, RotateCcw, Search, Target, Play } from "lucide-react";

type Phase = "intro" | "playing" | "reveal";
type ComponentStatus = "untested" | "pass" | "fail";

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
    if (mid + offset <= high && statuses[mid + offset] === "untested") {
      testIndex = mid + offset;
      break;
    }
    if (mid - offset >= low && statuses[mid - offset] === "untested") {
      testIndex = mid - offset;
      break;
    }
    offset++;
  }

  return { action: "test", index: testIndex };
}

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
  const [demoMode, setDemoMode] = useState(false);
  const [agentEmbed, setAgentEmbed] = useState(false);
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
        window.location.href = getNextDemoPath("repair");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [demoMode, phase]);

  const efficiency = useMemo(() => {
    if (isCorrect === false) return 0;
    if (isCorrect === true && testCount > 0) {
      return Math.round((OPTIMAL_TESTS / testCount) * 100);
    }
    return 0;
  }, [isCorrect, testCount]);

  // Agent auto-play
  useEffect(() => {
    if (!agentMode || phase !== "playing" || identifiedIndex !== null) return;

    agentTimerRef.current = setTimeout(() => {
      const decision = binarySearchChoice(statuses, brokenIndex);
      setSelectedComponent(decision.index);

      // Brief pause to show selection, then act
      setTimeout(() => {
        if (decision.action === "test") {
          // Test the component
          const newStatuses = [...statuses];
          const fails = brokenIndex <= decision.index;
          newStatuses[decision.index] = fails ? "fail" : "pass";
          setStatuses(newStatuses);
          setTestCount((c) => c + 1);
        } else {
          // Identify the component
          setIdentifiedIndex(decision.index);
          const correct = decision.index === brokenIndex;
          setIsCorrect(correct);
          saveScore(
            "repair",
            correct ? Math.round((OPTIMAL_TESTS / Math.max(1, testCount)) * 100) : 0
          );
          setTimeout(() => setPhase("reveal"), 400);
        }
        setSelectedComponent(null);
      }, 200);
    }, 400);

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
      saveScore(
        "repair",
        correct ? Math.round((OPTIMAL_TESTS / Math.max(1, testCount)) * 100) : 0
      );
      setPhase("reveal");
    },
    [brokenIndex, testCount, agentMode]
  );

  if (phase === "intro") {
    return (
      <Shell env="The Repair">
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
            A pipeline of six components runs in series: A through F. One
            component has failed, causing all downstream components to fail as
            well.
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
            Test components to determine their status. When you've identified
            the broken component, mark it. Fewer tests means higher efficiency.
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
            Optimal strategy uses ~3 tests through binary search.
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
    return (
      <Shell env="The Repair">
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

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "48px",
            justifyContent: "center",
          }}
        >
          {COMPONENTS.map((comp, index) => {
            const status = statuses[index];
            const isSelected = selectedComponent === index;
            let borderLeftColor: string = C.border;
            if (status === "pass") borderLeftColor = "#22A55B";
            if (status === "fail") borderLeftColor = "#E05A00";
            if (isSelected) borderLeftColor = C.accent;

            return (
              <div key={comp} style={{ display: "flex", alignItems: "center" }}>
                <div
                  style={{
                    ...card,
                    width: "64px",
                    height: "80px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    borderLeft: `3px solid ${borderLeftColor}`,
                    paddingLeft: "13px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "18px",
                      fontWeight: 600,
                      color: C.textPrimary,
                      marginBottom: "8px",
                    }}
                  >
                    {comp}
                  </span>
                  <span
                    style={{
                      fontSize: "10px",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      color:
                        status === "pass"
                          ? "#22A55B"
                          : status === "fail"
                          ? "#E05A00"
                          : C.textTertiary,
                    }}
                  >
                    {status === "untested" ? "—" : status}
                  </span>
                </div>
                {index < 5 && (
                  <span
                    style={{
                      color: C.textTertiary,
                      fontSize: "14px",
                      margin: "0 4px",
                    }}
                  >
                    →
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {!agentMode && (
          <>
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
          </>
        )}

        {agentMode && (
          <div
            style={{
              textAlign: "center",
              fontSize: "12px",
              color: C.textTertiary,
            }}
          >
            Binary search agent
          </div>
        )}
      </Shell>
    );
  }

  // Reveal phase
  return (
    <Shell env="The Repair">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          marginBottom: "16px",
          justifyContent: "center",
        }}
      >
        {COMPONENTS.map((comp, index) => {
          const isBroken = index === brokenIndex;
          const isDownstream = index > brokenIndex;
          let bg = "rgba(74, 222, 128, 0.1)";
          let color = "#22A55B";
          if (isBroken) { bg = "rgba(224, 90, 0, 0.1)"; color = "#E05A00"; }
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
              {index < 5 && (
                <span style={{ color: C.textTertiary, fontSize: "12px", margin: "0 2px" }}>→</span>
              )}
            </div>
          );
        })}
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
        <MetricCard label="Efficiency" value={`${efficiency}%`} />
        <MetricCard label="Tests" value={testCount.toString()} />
        <MetricCard label="Optimal" value={OPTIMAL_TESTS.toString()} muted />
      </div>

      <LessonCard term="In the real world">
        When a revenue pipeline breaks — conversion drops, latency spikes, costs surge — diagnosing the root cause fast is the difference between minutes and days of lost income. Autonomous incident response requires exactly this causal reasoning.
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
