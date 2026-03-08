"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Shell, MetricCard, LessonCard } from "../shell";
import { C, card, buttonStyle, ghostButton, saveScore, isDemoMode, getNextDemoPath } from "../shared";
import { ArrowRight, RotateCcw, Play } from "lucide-react";

type Phase = "intro" | "playing" | "reveal";
type ConfidenceLevel = 25 | 50 | 75 | 100;

interface Scenario {
  question: string;
  options: string[];
  correctIndex: number;
  difficulty: "easy" | "medium" | "hard" | "guess";
}

interface RoundResult {
  scenario: Scenario;
  confidence: ConfidenceLevel;
  selectedIndex: number;
  correct: boolean;
  points: number;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function generateScenarios(): Scenario[] {
  const templates: Array<{
    question: string;
    options: string[];
    correctIndex: number;
    difficulty: "easy" | "medium" | "hard" | "guess";
  }> = [
    {
      question: "What comes next: 3, 6, 12, 24, ?",
      options: ["48", "36", "30", "28"],
      correctIndex: 0,
      difficulty: "easy",
    },
    {
      question:
        "Component C fails. Pipeline: A → B → C → D. Which others fail?",
      options: ["D only", "B and D", "All downstream", "None"],
      correctIndex: 0,
      difficulty: "easy",
    },
    {
      question:
        "Source X sampled twice: 7.2, 3.1. Source Y once: 5.5. Which is likely better?",
      options: ["X", "Y", "Equal", "Not enough data"],
      correctIndex: 3,
      difficulty: "hard",
    },
    {
      question:
        "Budget: 30. Item A: 20 cost, 4 value. Item B: 15 cost, 3 value. Item C: 18 cost, 5 value. Best purchase?",
      options: ["A", "B", "C", "B and then save"],
      correctIndex: 2,
      difficulty: "medium",
    },
    {
      question:
        "Partner rejected a fair deal, accepted one favoring them. Their strategy is likely:",
      options: ["Greedy", "Fair", "Random", "Generous"],
      correctIndex: 0,
      difficulty: "medium",
    },
    {
      question: "What comes next: 2, 6, 12, 20, 30, ?",
      options: ["42", "40", "36", "44"],
      correctIndex: 0,
      difficulty: "medium",
    },
    {
      question:
        "You see 3 cells ahead. Path A is clear. Path B has a wall at cell 2. Which is better?",
      options: ["A", "B", "Same", "Need more info"],
      correctIndex: 0,
      difficulty: "easy",
    },
    {
      question:
        "Values: 3.1, 4.2, 2.5. Pattern suggests gradual change. Next value likely:",
      options: ["3.0", "8.5", "2.0", "Similar to previous"],
      correctIndex: 3,
      difficulty: "hard",
    },
    {
      question: "Fibonacci: 1, 1, 2, 3, 5, 8, ?",
      options: ["13", "11", "10", "12"],
      correctIndex: 0,
      difficulty: "easy",
    },
    {
      question:
        "You have 10 tests to find 1 broken component among 100. Best strategy?",
      options: ["Test randomly", "Binary search", "Test sequentially", "Test in groups of 10"],
      correctIndex: 1,
      difficulty: "medium",
    },
    {
      question: "A coin landed heads 7 times in a row. Probability of heads next flip?",
      options: ["Lower than 50%", "Higher than 50%", "Exactly 50%", "Cannot determine"],
      correctIndex: 2,
      difficulty: "medium",
    },
    {
      question:
        "You optimized for metric A, but metric B dropped. This is likely:",
      options: ["A bug", "A tradeoff", "Random noise", "Measurement error"],
      correctIndex: 1,
      difficulty: "hard",
    },
  ];

  // Shuffle and pick 8
  const shuffled = shuffleArray(templates);
  return shuffled.slice(0, 8).map((t) => {
    // Shuffle options but track correct answer
    const correctAnswer = t.options[t.correctIndex];
    const shuffledOptions = shuffleArray(t.options);
    const newCorrectIndex = shuffledOptions.indexOf(correctAnswer);
    return {
      question: t.question,
      options: shuffledOptions,
      correctIndex: newCorrectIndex,
      difficulty: t.difficulty,
    };
  });
}

const CONFIDENCE_LABELS: Record<ConfidenceLevel, string> = {
  25: "Low",
  50: "Medium",
  75: "High",
  100: "Certain",
};

// --- Calibrated reasoning agent ---

function getAgentConfidence(difficulty: "easy" | "medium" | "hard" | "guess"): ConfidenceLevel {
  switch (difficulty) {
    case "easy":
      return 100;
    case "medium":
      return 75;
    case "hard":
      return 50;
    case "guess":
      return 25;
  }
}

export default function MetaPage() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [selectedConfidence, setSelectedConfidence] =
    useState<ConfidenceLevel | null>(null);
  const [results, setResults] = useState<RoundResult[]>([]);
  const [showingResult, setShowingResult] = useState(false);
  const [lastResult, setLastResult] = useState<RoundResult | null>(null);
  const [agentMode, setAgentMode] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
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
        window.location.href = getNextDemoPath("meta");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [demoMode, phase]);

  const totalPoints = useMemo(() => {
    return results.reduce((sum, r) => sum + r.points, 0);
  }, [results]);

  const accuracy = useMemo(() => {
    if (results.length === 0) return 0;
    const correct = results.filter((r) => r.correct).length;
    return Math.round((correct / results.length) * 100);
  }, [results]);

  const calibration = useMemo(() => {
    if (results.length === 0) return 0;
    // Group by confidence level and check actual accuracy
    const groups: Record<ConfidenceLevel, { total: number; correct: number }> = {
      25: { total: 0, correct: 0 },
      50: { total: 0, correct: 0 },
      75: { total: 0, correct: 0 },
      100: { total: 0, correct: 0 },
    };
    results.forEach((r) => {
      groups[r.confidence].total++;
      if (r.correct) groups[r.confidence].correct++;
    });
    // Calculate calibration error
    let totalError = 0;
    let counted = 0;
    (Object.keys(groups) as unknown as ConfidenceLevel[]).forEach((conf) => {
      const g = groups[conf];
      if (g.total > 0) {
        const actualAcc = g.correct / g.total;
        const expectedAcc = conf / 100;
        totalError += Math.abs(actualAcc - expectedAcc);
        counted++;
      }
    });
    if (counted === 0) return 100;
    const avgError = totalError / counted;
    return Math.round((1 - avgError) * 100);
  }, [results]);

  // Agent auto-play
  useEffect(() => {
    if (!agentMode || phase !== "playing" || showingResult) return;
    if (currentRound >= scenarios.length) return;

    const scenario = scenarios[currentRound];

    agentTimerRef.current = setTimeout(() => {
      // Agent sets confidence based on difficulty
      const confidence = getAgentConfidence(scenario.difficulty);
      setSelectedConfidence(confidence);

      // Brief pause, then select the correct answer
      setTimeout(() => {
        const answerIndex = scenario.correctIndex;
        setSelectedAnswer(answerIndex);

        // Brief pause to show selection, then submit
        setTimeout(() => {
          const correct = answerIndex === scenario.correctIndex;
          const points = correct
            ? confidence
            : -Math.round(confidence / 2);

          const result: RoundResult = {
            scenario,
            confidence,
            selectedIndex: answerIndex,
            correct,
            points,
          };

          setLastResult(result);
          setResults((prev) => [...prev, result]);
          setShowingResult(true);
          setSelectedAnswer(null);
        }, 200);
      }, 300);
    }, 400);

    return () => {
      if (agentTimerRef.current) clearTimeout(agentTimerRef.current);
    };
  }, [agentMode, phase, showingResult, currentRound, scenarios]);

  // Agent auto-advance from result screen
  useEffect(() => {
    if (!agentMode || phase !== "playing" || !showingResult) return;

    agentTimerRef.current = setTimeout(() => {
      if (currentRound >= 7) {
        saveScore("meta", Math.round(Math.max(0, (totalPoints + (lastResult?.points || 0)) / 800 * 100)));
        setPhase("reveal");
      } else {
        setCurrentRound((c) => c + 1);
        setSelectedConfidence(null);
        setShowingResult(false);
        setLastResult(null);
      }
    }, 800);

    return () => {
      if (agentTimerRef.current) clearTimeout(agentTimerRef.current);
    };
  }, [agentMode, phase, showingResult, currentRound, totalPoints, lastResult]);

  const handleBegin = useCallback((withAgent: boolean = false) => {
    setScenarios(generateScenarios());
    setCurrentRound(0);
    setSelectedConfidence(null);
    setResults([]);
    setShowingResult(false);
    setLastResult(null);
    setAgentMode(withAgent);
    setSelectedAnswer(null);
    setPhase("playing");
  }, []);

  const selectAnswer = useCallback(
    (answerIndex: number) => {
      if (agentMode) return;
      if (selectedConfidence === null) return;

      const scenario = scenarios[currentRound];
      const correct = answerIndex === scenario.correctIndex;
      const points = correct
        ? selectedConfidence
        : -Math.round(selectedConfidence / 2);

      const result: RoundResult = {
        scenario,
        confidence: selectedConfidence,
        selectedIndex: answerIndex,
        correct,
        points,
      };

      setLastResult(result);
      setResults((prev) => [...prev, result]);
      setShowingResult(true);
    },
    [selectedConfidence, scenarios, currentRound, agentMode]
  );

  const nextRound = useCallback(() => {
    if (agentMode) return;
    if (currentRound >= 7) {
      saveScore("meta", Math.round(Math.max(0, (totalPoints + (lastResult?.points || 0)) / 800 * 100)));
      setPhase("reveal");
    } else {
      setCurrentRound((c) => c + 1);
      setSelectedConfidence(null);
      setShowingResult(false);
      setLastResult(null);
    }
  }, [currentRound, totalPoints, lastResult, agentMode]);

  if (phase === "intro") {
    return (
      <Shell env="The Meta">
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
            Eight rounds. Each presents a quick decision scenario. Before
            answering, predict your confidence. Scoring rewards both accuracy
            and calibration.
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
            Correct answers earn points equal to your confidence level. Wrong
            answers cost half your confidence level. Know when you know and when
            you don't.
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
            Perfect score: 800 points (all correct at "Certain").
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
    const scenario = scenarios[currentRound];

    if (showingResult && lastResult) {
      return (
        <Shell env="The Meta">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "24px",
            }}
          >
            <span style={{ fontSize: "13px", color: C.textSecondary }}>
              {agentMode && (
                <span style={{ color: C.accent, marginRight: "8px" }}>Agent</span>
              )}
              Round {currentRound + 1} / 8
            </span>
            <span style={{ fontSize: "13px", color: C.textTertiary }}>
              Total: {totalPoints} pts
            </span>
          </div>

          <div
            style={{
              ...card,
              padding: "32px",
              marginBottom: "24px",
              textAlign: "center",
            }}
          >
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
              <span style={{ fontSize: "24px", color: lastResult.correct ? "#4ADE80" : "#E05A00" }}>
                {lastResult.correct ? "+" : "−"}
              </span>
            </div>
            <div
              style={{
                fontSize: "32px",
                fontWeight: 600,
                color: lastResult.correct ? "#4ADE80" : C.accent,
                marginBottom: "8px",
              }}
            >
              {lastResult.points > 0 ? "+" : ""}
              {lastResult.points} pts
            </div>
            <div style={{ fontSize: "14px", color: C.textSecondary }}>
              {lastResult.correct
                ? `Correct at ${CONFIDENCE_LABELS[lastResult.confidence]} confidence`
                : `Incorrect at ${CONFIDENCE_LABELS[lastResult.confidence]} confidence`}
            </div>
          </div>

          <div style={{ ...card, padding: "24px", marginBottom: "24px" }}>
            <div
              style={{
                fontSize: "13px",
                color: C.textTertiary,
                marginBottom: "12px",
              }}
            >
              {scenario.question}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {scenario.options.map((opt, i) => {
                const isCorrect = i === scenario.correctIndex;
                const isSelected = i === lastResult.selectedIndex;
                let bg: string = C.surface;
                let borderColor: string = C.border;
                if (isCorrect) {
                  bg = "rgba(74, 222, 128, 0.1)";
                  borderColor = "#4ADE80";
                } else if (isSelected) {
                  bg = "rgba(224, 90, 0, 0.1)";
                  borderColor = "#E05A00";
                }
                return (
                  <div
                    key={i}
                    style={{
                      padding: "12px 16px",
                      background: bg,
                      border: `1px solid ${borderColor}`,
                      borderRadius: "16px",
                      fontSize: "14px",
                      color: C.textPrimary,
                    }}
                  >
                    {opt}
                  </div>
                );
              })}
            </div>
          </div>

          {!agentMode && (
            <button style={buttonStyle} onClick={nextRound}>
              {currentRound >= 7 ? "See Results" : "Next Round"}
              <ArrowRight size={16} strokeWidth={2} />
            </button>
          )}

          {agentMode && (
            <div
              style={{
                textAlign: "center",
                fontSize: "12px",
                color: C.textTertiary,
              }}
            >
              Calibrated reasoning agent
            </div>
          )}
        </Shell>
      );
    }

    return (
      <Shell env="The Meta">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
          }}
        >
          <span style={{ fontSize: "13px", color: C.textSecondary }}>
            {agentMode && (
              <span style={{ color: C.accent, marginRight: "8px" }}>Agent</span>
            )}
            Round {currentRound + 1} / 8
          </span>
          <span style={{ fontSize: "13px", color: C.textTertiary }}>
            Total: {totalPoints} pts
          </span>
        </div>

        <div style={{ ...card, padding: "32px", marginBottom: "24px" }}>
          <p
            style={{
              fontSize: "15px",
              lineHeight: 1.7,
              color: C.textPrimary,
              margin: 0,
            }}
          >
            {scenario.question}
          </p>
        </div>

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
            Your Confidence
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            {([25, 50, 75, 100] as ConfidenceLevel[]).map((level) => (
              <button
                key={level}
                onClick={() => !agentMode && setSelectedConfidence(level)}
                disabled={agentMode}
                style={{
                  flex: 1,
                  height: "44px",
                  background:
                    selectedConfidence === level ? C.accent : C.surface,
                  color: selectedConfidence === level ? "#FFFFFF" : C.textSecondary,
                  border: `1px solid ${selectedConfidence === level ? C.accent : C.border}`,
                  borderRadius: "16px",
                  fontSize: "13px",
                  fontWeight: 500,
                  fontFamily: "inherit",
                  cursor: agentMode ? "default" : "pointer",
                }}
              >
                {CONFIDENCE_LABELS[level]}
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
              opacity: selectedConfidence === null ? 0.5 : 1,
            }}
          >
            Your Answer
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: agentMode ? "24px" : "0" }}>
            {scenario.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => selectAnswer(i)}
                disabled={selectedConfidence === null || agentMode}
                style={{
                  padding: "16px",
                  background: selectedAnswer === i ? C.accent : C.surface,
                  border: `1px solid ${selectedAnswer === i ? C.accent : C.border}`,
                  borderRadius: "16px",
                  fontSize: "14px",
                  color: selectedAnswer === i ? "#FFFFFF" : C.textPrimary,
                  textAlign: "left",
                  fontFamily: "inherit",
                  cursor: (selectedConfidence === null || agentMode) ? "not-allowed" : "pointer",
                  opacity: selectedConfidence === null ? 0.5 : 1,
                  transition: "border-color 150ms ease-out",
                }}
                onMouseEnter={(e) => {
                  if (selectedConfidence !== null && !agentMode && selectedAnswer !== i) {
                    e.currentTarget.style.borderColor = C.borderActive;
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedAnswer !== i) {
                    e.currentTarget.style.borderColor = C.border;
                  }
                }}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {agentMode && (
          <div
            style={{
              textAlign: "center",
              fontSize: "12px",
              color: C.textTertiary,
            }}
          >
            Calibrated reasoning agent
          </div>
        )}
      </Shell>
    );
  }

  // Reveal phase
  return (
    <Shell env="The Meta">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "12px",
          marginBottom: "16px",
        }}
      >
        <MetricCard label="Points" value={totalPoints.toString()} />
        <MetricCard label="Accuracy" value={`${accuracy}%`} />
        <MetricCard label="Calibration" value={`${calibration}%`} />
      </div>

      <div style={{ fontSize: "13px", color: C.textSecondary, marginBottom: "16px" }}>
        {calibration >= 80 ? "Well-calibrated — confidence matched accuracy." : calibration >= 60 ? "Moderate calibration — some over/underconfidence." : "Poor calibration — confidence didn't match performance."}
      </div>

      <LessonCard term="In the real world">
        Risk management is metacognition applied to capital. Knowing when you're confident enough to deploy resources — and when to hedge — is the difference between profitable autonomy and catastrophic failure. Every autonomous economic agent needs calibrated self-assessment.
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
