"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Shell, MetricCard, LessonCard } from "../shell";
import { C, card, buttonStyle, ghostButton, saveScore, isDemoMode, getNextDemoPath } from "../shared";
import { ArrowRight, RotateCcw, Play } from "lucide-react";

type Phase = "intro" | "playing" | "reveal";

type Round = {
  sequence: number[];
  answer: number;
  choices: number[];
  rule: string;
};

function generateRound(roundIndex: number): Round {
  const rules = [
    () => {
      const increment = Math.floor(Math.random() * 5) + 2;
      const start = Math.floor(Math.random() * 10) + 1;
      const seq = Array.from({ length: 6 }, (_, i) => start + i * increment);
      return { sequence: seq.slice(0, 5), answer: seq[5], rule: `Add ${increment}` };
    },
    () => {
      const increment = Math.floor(Math.random() * 7) + 3;
      const start = Math.floor(Math.random() * 15) + 1;
      const seq = Array.from({ length: 6 }, (_, i) => start + i * increment);
      return { sequence: seq.slice(0, 5), answer: seq[5], rule: `Add ${increment}` };
    },
    () => {
      const multiplier = Math.floor(Math.random() * 2) + 2;
      const start = Math.floor(Math.random() * 3) + 1;
      const seq = Array.from({ length: 6 }, (_, i) => start * Math.pow(multiplier, i));
      return { sequence: seq.slice(0, 5), answer: seq[5], rule: `Multiply by ${multiplier}` };
    },
    () => {
      const add = Math.floor(Math.random() * 4) + 2;
      const sub = Math.floor(Math.random() * 2) + 1;
      const start = Math.floor(Math.random() * 10) + 5;
      const seq: number[] = [start];
      for (let i = 1; i < 6; i++) {
        seq.push(seq[i - 1] + (i % 2 === 1 ? add : -sub));
      }
      return { sequence: seq.slice(0, 5), answer: seq[5], rule: `Alternating +${add}/-${sub}` };
    },
    () => {
      const offset = Math.floor(Math.random() * 3);
      const seq = Array.from({ length: 6 }, (_, i) => (i + 1 + offset) * (i + 1 + offset));
      return { sequence: seq.slice(0, 5), answer: seq[5], rule: "Perfect squares" };
    },
    () => {
      const a = Math.floor(Math.random() * 3) + 1;
      const b = Math.floor(Math.random() * 3) + 1;
      const seq: number[] = [a, b];
      for (let i = 2; i < 6; i++) {
        seq.push(seq[i - 1] + seq[i - 2]);
      }
      return { sequence: seq.slice(0, 5), answer: seq[5], rule: "Fibonacci-like" };
    },
    () => {
      const offset = Math.floor(Math.random() * 2);
      const seq = Array.from({ length: 6 }, (_, i) => {
        const n = i + 1 + offset;
        return (n * (n + 1)) / 2;
      });
      return { sequence: seq.slice(0, 5), answer: seq[5], rule: "Triangular numbers" };
    },
    () => {
      const inc1 = Math.floor(Math.random() * 3) + 1;
      const inc2 = Math.floor(Math.random() * 4) + 2;
      const start1 = Math.floor(Math.random() * 5) + 1;
      const start2 = Math.floor(Math.random() * 5) + 10;
      const seq: number[] = [];
      for (let i = 0; i < 6; i++) {
        if (i % 2 === 0) {
          seq.push(start1 + (i / 2) * inc1);
        } else {
          seq.push(start2 + Math.floor(i / 2) * inc2);
        }
      }
      return { sequence: seq.slice(0, 5), answer: seq[5], rule: "Two interleaved sequences" };
    },
  ];

  const { sequence, answer, rule } = rules[roundIndex]();

  const wrongAnswers = new Set<number>();
  wrongAnswers.add(answer + 1);
  wrongAnswers.add(answer - 1);
  wrongAnswers.add(answer + Math.floor(Math.random() * 5) + 2);
  wrongAnswers.add(answer - Math.floor(Math.random() * 5) - 2);
  wrongAnswers.add(Math.abs(answer * 2 - sequence[4]));

  const wrongs = Array.from(wrongAnswers)
    .filter((n) => n !== answer && n > 0)
    .slice(0, 3);

  while (wrongs.length < 3) {
    const candidate = answer + Math.floor(Math.random() * 20) - 10;
    if (candidate !== answer && candidate > 0 && !wrongs.includes(candidate)) {
      wrongs.push(candidate);
    }
  }

  const choices = [answer, ...wrongs.slice(0, 3)].sort(() => Math.random() - 0.5);

  return { sequence, answer, choices, rule };
}

// --- Pattern analysis agent ---

function patternAnalysisChoice(sequence: number[], choices: number[]): number {
  // Try to detect the pattern and predict the next number
  const len = sequence.length;

  // Check arithmetic (constant differences)
  const diffs: number[] = [];
  for (let i = 1; i < len; i++) {
    diffs.push(sequence[i] - sequence[i - 1]);
  }
  const allDiffsSame = diffs.every((d) => d === diffs[0]);
  if (allDiffsSame && diffs.length > 0) {
    const prediction = sequence[len - 1] + diffs[0];
    const closest = findClosest(choices, prediction);
    if (closest !== null) return closest;
  }

  // Check geometric (constant ratios)
  if (sequence[0] !== 0) {
    const ratios: number[] = [];
    for (let i = 1; i < len; i++) {
      if (sequence[i - 1] !== 0) {
        ratios.push(sequence[i] / sequence[i - 1]);
      }
    }
    if (ratios.length === len - 1) {
      const avgRatio = ratios.reduce((a, b) => a + b, 0) / ratios.length;
      const allRatiosSimilar = ratios.every((r) => Math.abs(r - avgRatio) < 0.1);
      if (allRatiosSimilar) {
        const prediction = Math.round(sequence[len - 1] * avgRatio);
        const closest = findClosest(choices, prediction);
        if (closest !== null) return closest;
      }
    }
  }

  // Check quadratic (constant second differences)
  if (diffs.length >= 2) {
    const secondDiffs: number[] = [];
    for (let i = 1; i < diffs.length; i++) {
      secondDiffs.push(diffs[i] - diffs[i - 1]);
    }
    const allSecondDiffsSame = secondDiffs.every((d) => d === secondDiffs[0]);
    if (allSecondDiffsSame && secondDiffs.length > 0) {
      const nextDiff = diffs[diffs.length - 1] + secondDiffs[0];
      const prediction = sequence[len - 1] + nextDiff;
      const closest = findClosest(choices, prediction);
      if (closest !== null) return closest;
    }
  }

  // Check Fibonacci-like (each = sum of previous two)
  if (len >= 3) {
    let isFib = true;
    for (let i = 2; i < len; i++) {
      if (sequence[i] !== sequence[i - 1] + sequence[i - 2]) {
        isFib = false;
        break;
      }
    }
    if (isFib) {
      const prediction = sequence[len - 1] + sequence[len - 2];
      const closest = findClosest(choices, prediction);
      if (closest !== null) return closest;
    }
  }

  // Fallback: pick randomly from choices
  return choices[Math.floor(Math.random() * choices.length)];
}

function findClosest(choices: number[], target: number): number | null {
  let closest = choices[0];
  let minDist = Math.abs(choices[0] - target);
  for (const c of choices) {
    const dist = Math.abs(c - target);
    if (dist < minDist) {
      minDist = dist;
      closest = c;
    }
  }
  // Only return if reasonably close
  if (minDist <= 2) {
    return closest;
  }
  return closest; // Return closest anyway as best guess
}

export default function SequencePage() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [rounds, setRounds] = useState<Round[]>([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [agentMode, setAgentMode] = useState(false);
  const agentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [demoMode, setDemoMode] = useState(false);

  const initGame = useCallback(() => {
    const newRounds = Array.from({ length: 8 }, (_, i) => generateRound(i));
    setRounds(newRounds);
    setCurrentRound(0);
    setScore(0);
    setSelected(null);
    setShowResult(false);
  }, []);

  const handleBegin = useCallback((withAgent: boolean = false) => {
    initGame();
    setAgentMode(withAgent);
    setPhase("playing");
  }, [initGame]);

  const handleChoice = useCallback((choice: number) => {
    if (showResult) return;
    setSelected(choice);
    setShowResult(true);

    const isCorrect = choice === rounds[currentRound].answer;
    if (isCorrect) {
      setScore((s) => s + 1);
    }

    setTimeout(() => {
      if (currentRound < 7) {
        setCurrentRound((r) => r + 1);
        setSelected(null);
        setShowResult(false);
      } else {
        const efficiency = Math.round(((score + (isCorrect ? 1 : 0)) / 8) * 100);
        saveScore("sequence", efficiency);
        setPhase("reveal");
      }
    }, 1000);
  }, [showResult, rounds, currentRound, score]);

  // Agent auto-play
  useEffect(() => {
    if (!agentMode || phase !== "playing" || rounds.length === 0 || showResult) return;

    agentTimerRef.current = setTimeout(() => {
      const round = rounds[currentRound];
      const choice = patternAnalysisChoice(round.sequence, round.choices);
      setSelected(choice);

      // Brief pause to show selection, then submit
      setTimeout(() => {
        setShowResult(true);

        const isCorrect = choice === round.answer;
        if (isCorrect) {
          setScore((s) => s + 1);
        }

        setTimeout(() => {
          if (currentRound < 7) {
            setCurrentRound((r) => r + 1);
            setSelected(null);
            setShowResult(false);
          } else {
            const finalScore = score + (isCorrect ? 1 : 0);
            const efficiency = Math.round((finalScore / 8) * 100);
            saveScore("sequence", efficiency);
            setPhase("reveal");
          }
        }, 1000);
      }, 200);
    }, 400);

    return () => {
      if (agentTimerRef.current) clearTimeout(agentTimerRef.current);
    };
  }, [agentMode, phase, currentRound, rounds, showResult, score]);

  useEffect(() => {
    initGame();
  }, [initGame]);

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
        window.location.href = getNextDemoPath("sequence");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [demoMode, phase]);

  if (phase === "intro") {
    return (
      <Shell env="The Sequence">
        <div style={{ ...card, padding: "48px 32px" }}>
          <p
            style={{
              fontSize: "15px",
              lineHeight: 1.7,
              color: C.textSecondary,
              margin: "0 0 32px 0",
            }}
          >
            You will see 8 number sequences. Each follows a hidden rule. Your
            task is to identify the pattern and select the correct next number
            from four choices. Difficulty increases with each round.
          </p>
          <div style={{ display: "flex", gap: "8px" }}>
            <button style={buttonStyle} onClick={() => handleBegin(false)}>
              Play <ArrowRight size={16} strokeWidth={2} />
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

  if (phase === "playing" && rounds.length > 0) {
    const round = rounds[currentRound];

    return (
      <Shell env="The Sequence">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "32px",
          }}
        >
          <span style={{ fontSize: "13px", color: C.textSecondary }}>
            {agentMode && (
              <span style={{ color: C.accent, marginRight: "8px" }}>Agent</span>
            )}
            Round {currentRound + 1} of 8
          </span>
          <span style={{ fontSize: "13px", color: C.textPrimary, fontWeight: 500 }}>
            Score: {score}
          </span>
        </div>

        <div
          style={{
            display: "flex",
            gap: "8px",
            justifyContent: "center",
            marginBottom: "48px",
          }}
        >
          {round.sequence.map((num, i) => (
            <div
              key={i}
              style={{
                ...card,
                width: "64px",
                height: "64px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "18px",
                fontWeight: 500,
                color: C.textPrimary,
              }}
            >
              {num}
            </div>
          ))}
          <div
            style={{
              ...card,
              width: "64px",
              height: "64px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "24px",
              fontWeight: 500,
              color: C.textTertiary,
              borderColor: C.accent,
              borderWidth: "2px",
            }}
          >
            ?
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "12px",
            marginBottom: agentMode ? "24px" : "0",
          }}
        >
          {round.choices.map((choice) => {
            let borderColor: string = C.border;
            let bg: string = C.surface;

            if (showResult) {
              if (choice === round.answer) {
                borderColor = "#22C55E";
                bg = "#F0FDF4";
              } else if (choice === selected && choice !== round.answer) {
                borderColor = "#EF4444";
                bg = "#FEF2F2";
              }
            } else if (agentMode && choice === selected) {
              borderColor = C.accent;
            }

            return (
              <button
                key={choice}
                onClick={() => !agentMode && handleChoice(choice)}
                disabled={showResult || agentMode}
                style={{
                  background: bg,
                  border: `2px solid ${borderColor}`,
                  borderRadius: "16px",
                  padding: "20px",
                  fontSize: "18px",
                  fontWeight: 500,
                  color: C.textPrimary,
                  cursor: showResult || agentMode ? "default" : "pointer",
                  fontFamily: "inherit",
                  transition: "border-color 150ms ease-out",
                }}
              >
                {choice}
              </button>
            );
          })}
        </div>

        {agentMode && (
          <div
            style={{
              textAlign: "center",
              fontSize: "12px",
              color: C.textTertiary,
            }}
          >
            Pattern analysis agent
          </div>
        )}
      </Shell>
    );
  }

  if (phase === "reveal") {
    const efficiency = Math.round((score / 8) * 100);

    return (
      <Shell env="The Sequence">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "8px",
            marginBottom: "16px",
          }}
        >
          <MetricCard label="Correct" value={`${score}/8`} />
          <MetricCard label="Accuracy" value={`${efficiency}%`} />
        </div>

        <div style={{ marginBottom: "16px" }}>
          <LessonCard term="In the real world">
            Trend prediction powers quantitative finance — detecting price patterns, demand cycles, and supply fluctuations before competitors. An agent that masters induction can identify emerging market opportunities from raw data streams.
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

  return null;
}
