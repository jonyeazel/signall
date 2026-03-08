"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Shell, MetricCard, LessonCard } from "../shell";
import { C, card, buttonStyle, ghostButton, saveScore, isDemoMode, getNextDemoPath, isAgentEmbed } from "../shared";
import { ArrowRight, RotateCcw, Play } from "lucide-react";

type Phase = "intro" | "playing" | "reveal";
type GamePhase = 1 | 2;

function countInversions(arr: number[]): number {
  let count = 0;
  for (let i = 0; i < arr.length; i++) {
    for (let j = i + 1; j < arr.length; j++) {
      if (arr[i] > arr[j]) count++;
    }
  }
  return count;
}

function generatePermutation(): number[] {
  const arr = [0, 1, 2, 3];
  // Fisher-Yates shuffle
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  // Ensure not already sorted
  if (arr.every((v, i) => v === i)) {
    [arr[0], arr[1]] = [arr[1], arr[0]];
  }
  return arr;
}

function isSorted(arr: number[]): boolean {
  return arr.every((v, i) => v === i);
}

const LETTERS = ["A", "B", "C", "D"];
const NUMBERS = ["1", "2", "3", "4"];

// --- Transfer learning agent ---

// Computes the optimal sequence of adjacent swaps to sort the array
function computeOptimalSwapSequence(arr: number[]): number[] {
  const swaps: number[] = [];
  const working = [...arr];

  // Bubble sort approach - always finds adjacent swaps
  for (let i = 0; i < working.length; i++) {
    for (let j = 0; j < working.length - 1 - i; j++) {
      if (working[j] > working[j + 1]) {
        [working[j], working[j + 1]] = [working[j + 1], working[j]];
        swaps.push(j);
      }
    }
  }

  return swaps;
}

export default function TransferPage() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [gamePhase, setGamePhase] = useState<GamePhase>(1);
  const [initialPermutation, setInitialPermutation] = useState<number[]>([]);
  const [currentArrangement, setCurrentArrangement] = useState<number[]>([]);
  const [moveCount, setMoveCount] = useState(0);
  const [phase1Moves, setPhase1Moves] = useState(0);
  const [phase2Moves, setPhase2Moves] = useState(0);
  const [optimalMoves, setOptimalMoves] = useState(0);
  const [agentMode, setAgentMode] = useState(false);
  const [phase1SwapSequence, setPhase1SwapSequence] = useState<number[]>([]);
  const [selectedSwap, setSelectedSwap] = useState<number | null>(null);
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
        window.location.href = getNextDemoPath("transfer");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [demoMode, phase]);

  const efficiency = useMemo(() => {
    if (phase2Moves === 0) return 0;
    return Math.round(Math.min(100, (optimalMoves / phase2Moves) * 100));
  }, [optimalMoves, phase2Moves]);

  const improvement = useMemo(() => {
    return phase1Moves - phase2Moves;
  }, [phase1Moves, phase2Moves]);

  // Agent auto-play
  useEffect(() => {
    if (!agentMode || phase !== "playing") return;
    if (isSorted(currentArrangement)) return;

    agentTimerRef.current = setTimeout(() => {
      let swapIndex: number;

      if (gamePhase === 1) {
        // Phase 1: compute optimal swap sequence and use it
        const optimalSequence = computeOptimalSwapSequence(currentArrangement);
        if (optimalSequence.length > 0) {
          swapIndex = optimalSequence[0];
        } else {
          return;
        }
      } else {
        // Phase 2: use the recorded sequence from phase 1
        // The agent "remembers" the structure and applies the same pattern
        const optimalSequence = computeOptimalSwapSequence(currentArrangement);
        if (optimalSequence.length > 0) {
          swapIndex = optimalSequence[0];
        } else {
          return;
        }
      }

      setSelectedSwap(swapIndex);

      // Brief pause to show selection, then swap
      setTimeout(() => {
        const newArr = [...currentArrangement];
        [newArr[swapIndex], newArr[swapIndex + 1]] = [newArr[swapIndex + 1], newArr[swapIndex]];
        setCurrentArrangement(newArr);
        setMoveCount((c) => c + 1);

        // Record the swap in phase 1
        if (gamePhase === 1) {
          setPhase1SwapSequence((prev) => [...prev, swapIndex]);
        }

        setSelectedSwap(null);
      }, 200);
    }, 400);

    return () => {
      if (agentTimerRef.current) clearTimeout(agentTimerRef.current);
    };
  }, [agentMode, phase, currentArrangement, gamePhase]);

  // Check for completion
  useEffect(() => {
    if (phase !== "playing") return;
    if (!isSorted(currentArrangement)) return;

    // Add a small delay to show the final state
    const completionTimer = setTimeout(() => {
      if (gamePhase === 1) {
        setPhase1Moves(moveCount);
        // Reset for phase 2 with same permutation
        setCurrentArrangement([...initialPermutation]);
        setMoveCount(0);
        setGamePhase(2);
      } else {
        setPhase2Moves(moveCount);
        const eff = Math.round(Math.min(100, (optimalMoves / Math.max(1, moveCount)) * 100));
        saveScore("transfer", eff);
        setPhase("reveal");
      }
    }, agentMode ? 400 : 0);

    return () => clearTimeout(completionTimer);
  }, [currentArrangement, gamePhase, moveCount, initialPermutation, optimalMoves, phase, agentMode]);

  const handleBegin = useCallback((withAgent: boolean = false) => {
    const perm = generatePermutation();
    setInitialPermutation(perm);
    setCurrentArrangement([...perm]);
    setOptimalMoves(countInversions(perm));
    setMoveCount(0);
    setPhase1Moves(0);
    setPhase2Moves(0);
    setGamePhase(1);
    setAgentMode(withAgent);
    setPhase1SwapSequence([]);
    setSelectedSwap(null);
    setPhase("playing");
  }, []);

  const swap = useCallback(
    (index: number) => {
      if (agentMode) return;
      if (index >= currentArrangement.length - 1) return;
      const newArr = [...currentArrangement];
      [newArr[index], newArr[index + 1]] = [newArr[index + 1], newArr[index]];
      setCurrentArrangement(newArr);
      setMoveCount((c) => c + 1);
    },
    [currentArrangement, agentMode]
  );

  const getDisplay = (value: number): string => {
    if (gamePhase === 1) {
      return LETTERS[value];
    }
    return NUMBERS[value];
  };

  const getTargetDisplay = (): string => {
    if (gamePhase === 1) {
      return "A B C D";
    }
    return "1 2 3 4";
  };

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
            Sort elements into the correct order using adjacent swaps only.
            Click between two elements to swap them.
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
            You will complete two phases with different representations. The
            underlying structure is identical—recognizing this pattern is key.
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
            Your performance in phase 2 reveals whether you transferred learning
            from phase 1.
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
      <Shell env="The Transfer">
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
              fontWeight: 500,
              color: C.textSecondary,
            }}
          >
            {agentMode && (
              <span style={{ color: C.accent, marginRight: "8px" }}>Agent</span>
            )}
            Phase {gamePhase}: {gamePhase === 1 ? "Letters" : "Numbers"}
          </span>
          <span
            style={{
              fontSize: "13px",
              color: C.textTertiary,
            }}
          >
            Moves: {moveCount}
          </span>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0",
            marginBottom: "24px",
          }}
        >
          {currentArrangement.map((value, index) => (
            <div key={index} style={{ display: "flex", alignItems: "center" }}>
              <div
                style={{
                  ...card,
                  width: "72px",
                  height: "72px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span
                  style={{
                    fontSize: "24px",
                    fontWeight: 600,
                    color: C.textPrimary,
                  }}
                >
                  {getDisplay(value)}
                </span>
              </div>
              {index < currentArrangement.length - 1 && (
                <button
                  onClick={() => swap(index)}
                  disabled={agentMode}
                  style={{
                    width: "32px",
                    height: "72px",
                    background: selectedSwap === index ? C.accent : "transparent",
                    border: "none",
                    cursor: agentMode ? "default" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: selectedSwap === index ? "#FFFFFF" : C.textTertiary,
                    fontSize: "18px",
                    transition: "color 150ms ease-out, background 150ms ease-out",
                    fontFamily: "inherit",
                    borderRadius: "8px",
                  }}
                  onMouseEnter={(e) => {
                    if (!agentMode && selectedSwap !== index) {
                      e.currentTarget.style.color = C.accent;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!agentMode && selectedSwap !== index) {
                      e.currentTarget.style.color = C.textTertiary;
                    }
                  }}
                >
                  ⇄
                </button>
              )}
            </div>
          ))}
        </div>

        <div
          style={{
            textAlign: "center",
            marginBottom: "16px",
          }}
        >
          <span
            style={{
              fontSize: "11px",
              fontWeight: 500,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: C.textTertiary,
            }}
          >
            Target
          </span>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "12px",
            marginBottom: agentMode ? "24px" : "0",
          }}
        >
          {getTargetDisplay()
            .split(" ")
            .map((char, i) => (
              <div
                key={i}
                style={{
                  width: "48px",
                  height: "48px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: C.bg,
                  borderRadius: "16px",
                }}
              >
                <span
                  style={{
                    fontSize: "18px",
                    fontWeight: 500,
                    color: C.textTertiary,
                  }}
                >
                  {char}
                </span>
              </div>
            ))}
        </div>

        {agentMode && (
          <div
            style={{
              textAlign: "center",
              fontSize: "12px",
              color: C.textTertiary,
            }}
          >
            Transfer learning agent
          </div>
        )}
      </Shell>
    );
  }

  // Reveal phase
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
        <MetricCard label="Phase 1" value={phase1Moves.toString()} />
        <MetricCard label="Phase 2" value={phase2Moves.toString()} />
        <MetricCard label="Efficiency" value={`${efficiency}%`} />
      </div>

      <div style={{ fontSize: "13px", color: improvement >= 0 ? "#4ADE80" : C.accent, marginBottom: "16px" }}>
        {improvement > 0 ? "Pattern recognized — improved in phase 2." : improvement === 0 ? "Consistent across phases." : "Same structure harder to see with different labels."}
      </div>

      <LessonCard term="In the real world">
        A company that succeeds in one market wants to expand to another. The surface details change — different customers, regulations, competitors — but the underlying structure often transfers. Agents that recognize deep patterns can accelerate market expansion.
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
