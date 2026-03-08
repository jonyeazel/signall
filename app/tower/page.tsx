"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Shell, MetricCard, LessonCard } from "../shell";
import { C, card, buttonStyle, ghostButton, saveScore, isDemoMode, getNextDemoPath } from "../shared";
import { ArrowRight, RotateCcw, Lock, Check, X, Play } from "lucide-react";

type TaskStatus = "locked" | "available" | "completed" | "failed";

type Task = {
  id: string;
  status: TaskStatus;
  prerequisites: string[];
  failedAttempt?: boolean;
};

type Phase = "intro" | "playing" | "reveal";

const PRESET_DAGS: [string, string][][] = [
  [["A", "C"], ["B", "C"], ["C", "E"], ["D", "F"], ["E", "F"]],
  [["A", "B"], ["A", "C"], ["B", "D"], ["C", "D"], ["D", "E"], ["E", "F"]],
  [["A", "D"], ["B", "D"], ["B", "E"], ["C", "F"], ["D", "F"], ["E", "F"]],
  [["A", "B"], ["B", "C"], ["C", "D"], ["D", "E"], ["E", "F"]],
  [["A", "C"], ["A", "D"], ["B", "E"], ["C", "F"], ["D", "F"], ["E", "F"]],
];

function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function generateDAG(): { tasks: Task[]; edges: [string, string][] } {
  const baseLabels = ["A", "B", "C", "D", "E", "F"];
  const shuffledLabels = shuffleArray([...baseLabels]);
  const labelMap: Record<string, string> = {};
  baseLabels.forEach((orig, i) => {
    labelMap[orig] = shuffledLabels[i];
  });

  const preset = PRESET_DAGS[Math.floor(Math.random() * PRESET_DAGS.length)];
  const edges: [string, string][] = preset.map(([from, to]) => [
    labelMap[from],
    labelMap[to],
  ]);

  const prereqs: Record<string, string[]> = {};
  shuffledLabels.forEach((label) => {
    prereqs[label] = [];
  });
  edges.forEach(([from, to]) => {
    prereqs[to].push(from);
  });

  const tasks: Task[] = shuffledLabels.map((id) => ({
    id,
    status: "available" as TaskStatus,
    prerequisites: prereqs[id],
  }));

  return { tasks, edges };
}

function topologicalSort(
  tasks: Task[],
  edges: [string, string][]
): string[] {
  const inDegree: Record<string, number> = {};
  const adj: Record<string, string[]> = {};

  tasks.forEach((t) => {
    inDegree[t.id] = 0;
    adj[t.id] = [];
  });

  edges.forEach(([from, to]) => {
    adj[from].push(to);
    inDegree[to]++;
  });

  const queue: string[] = [];
  const result: string[] = [];

  Object.keys(inDegree).forEach((id) => {
    if (inDegree[id] === 0) queue.push(id);
  });

  while (queue.length > 0) {
    const node = queue.shift()!;
    result.push(node);
    adj[node].forEach((neighbor) => {
      inDegree[neighbor]--;
      if (inDegree[neighbor] === 0) queue.push(neighbor);
    });
  }

  return result;
}

// --- Topological sort agent ---
// Tries tasks alphabetically, skips ones with known unmet prereqs
// When a task fails, records the discovered dependency
// Builds up knowledge of the DAG from failures
function agentChooseTask(
  tasks: Task[],
  knownDeps: Map<string, Set<string>>
): string | null {
  const completedIds = tasks
    .filter((t) => t.status === "completed")
    .map((t) => t.id);

  // Get available (not completed) tasks sorted alphabetically
  const available = tasks
    .filter((t) => t.status !== "completed")
    .sort((a, b) => a.id.localeCompare(b.id));

  for (const task of available) {
    // Check if all known prereqs are completed
    const knownPrereqs = knownDeps.get(task.id) || new Set<string>();
    const unmetKnown = [...knownPrereqs].filter((p) => !completedIds.includes(p));
    if (unmetKnown.length === 0) {
      return task.id;
    }
  }

  // If all have known unmet prereqs, just try the first available
  return available.length > 0 ? available[0].id : null;
}

export default function TowerPage() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [turns, setTurns] = useState(0);
  const [discoveredDeps, setDiscoveredDeps] = useState<string[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [edges, setEdges] = useState<[string, string][]>([]);
  const [agentMode, setAgentMode] = useState(false);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [knownDeps, setKnownDeps] = useState<Map<string, Set<string>>>(new Map());
  const agentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [demoMode, setDemoMode] = useState(false);

  const completedCount = tasks.filter((t) => t.status === "completed").length;
  const efficiency = Math.round((6 / Math.max(turns, 6)) * 100);

  // Agent auto-play
  useEffect(() => {
    if (!agentMode || phase !== "playing") return;
    if (completedCount >= 6 || turns >= 12) return;

    agentTimerRef.current = setTimeout(() => {
      const choice = agentChooseTask(tasks, knownDeps);
      if (!choice) return;

      setSelectedTask(choice);

      // Brief pause to show selection, then attempt
      setTimeout(() => {
        const task = tasks.find((t) => t.id === choice);
        if (!task || task.status === "completed") {
          setSelectedTask(null);
          return;
        }

        const completedIds = tasks
          .filter((t) => t.status === "completed")
          .map((t) => t.id);
        const unmetPrereqs = task.prerequisites.filter(
          (p) => !completedIds.includes(p)
        );

        setTurns((t) => t + 1);

        if (unmetPrereqs.length === 0) {
          setTasks((prev) =>
            prev.map((t) =>
              t.id === choice ? { ...t, status: "completed" } : t
            )
          );

          const newCompleted = completedCount + 1;
          if (newCompleted === 6) {
            const finalEfficiency = Math.round((6 / (turns + 1)) * 100);
            saveScore("tower", finalEfficiency);
            setTimeout(() => setPhase("reveal"), 400);
          }
        } else {
          // Record discovered dependencies
          const depStr = `${choice} requires ${unmetPrereqs.join(", ")}`;
          setDiscoveredDeps((prev) =>
            prev.includes(depStr) ? prev : [...prev, depStr]
          );

          // Update known deps for agent
          setKnownDeps((prev) => {
            const newMap = new Map(prev);
            const existing = newMap.get(choice) || new Set<string>();
            unmetPrereqs.forEach((p) => existing.add(p));
            newMap.set(choice, existing);
            return newMap;
          });

          setTasks((prev) =>
            prev.map((t) =>
              t.id === choice ? { ...t, failedAttempt: true } : t
            )
          );
          setTimeout(() => {
            setTasks((prev) =>
              prev.map((t) =>
                t.id === choice ? { ...t, failedAttempt: false } : t
              )
            );
          }, 600);
        }
        setSelectedTask(null);
      }, 200);
    }, 400);

    return () => {
      if (agentTimerRef.current) clearTimeout(agentTimerRef.current);
    };
  }, [agentMode, phase, tasks, turns, completedCount, knownDeps]);

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
        window.location.href = getNextDemoPath("tower");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [demoMode, phase]);

  const handleBegin = useCallback((withAgent: boolean = false) => {
    const { tasks: newTasks, edges: newEdges } = generateDAG();
    setTasks(newTasks);
    setEdges(newEdges);
    setTurns(0);
    setDiscoveredDeps([]);
    setAgentMode(withAgent);
    setSelectedTask(null);
    setKnownDeps(new Map());
    setPhase("playing");
  }, []);

  const handleAttempt = useCallback(
    (taskId: string) => {
      if (agentMode) return;
      if (turns >= 12) return;

      const task = tasks.find((t) => t.id === taskId);
      if (!task || task.status === "completed") return;

      const completedIds = tasks
        .filter((t) => t.status === "completed")
        .map((t) => t.id);
      const unmetPrereqs = task.prerequisites.filter(
        (p) => !completedIds.includes(p)
      );

      setTurns((t) => t + 1);

      if (unmetPrereqs.length === 0) {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId ? { ...t, status: "completed" } : t
          )
        );

        const newCompleted = completedCount + 1;
        if (newCompleted === 6) {
          const finalEfficiency = Math.round((6 / (turns + 1)) * 100);
          saveScore("tower", finalEfficiency);
          setTimeout(() => setPhase("reveal"), 300);
        }
      } else {
        const depStr = `${taskId} requires ${unmetPrereqs.join(", ")}`;
        setDiscoveredDeps((prev) =>
          prev.includes(depStr) ? prev : [...prev, depStr]
        );
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId ? { ...t, failedAttempt: true } : t
          )
        );
        setTimeout(() => {
          setTasks((prev) =>
            prev.map((t) =>
              t.id === taskId ? { ...t, failedAttempt: false } : t
            )
          );
        }, 1000);
      }
    },
    [agentMode, tasks, turns, completedCount]
  );

  const optimalOrder = useMemo(() => topologicalSort(tasks, edges), [tasks, edges]);

  if (phase === "intro") {
    return (
      <Shell env="The Tower">
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
            Six tasks must be completed, but they have hidden dependencies.
            Attempt a task before its prerequisites are done, and you will fail
            and reveal the dependency. Complete all tasks in as few turns as
            possible. Maximum 12 turns.
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
      <Shell env="The Tower">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "8px",
            marginBottom: "16px",
          }}
        >
          <MetricCard label="Turns Used" value={`${turns}`} />
          <MetricCard label="Efficiency" value={`${efficiency}%`} />
        </div>

        <div style={{ marginBottom: "16px" }}>
          <LessonCard term="In the real world">
            Project execution, CI/CD pipelines, manufacturing workflows — all involve tasks with hidden dependencies. An agent that can infer structure from failures and find valid orderings can manage complex operations autonomously.
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

  return (
    <Shell env="The Tower">
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
          Turn {turns} / 12
        </div>
        <div style={{ fontSize: "13px", color: C.textSecondary }}>
          Completed: {completedCount} / 6
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "12px",
          marginBottom: "24px",
        }}
      >
        {tasks.map((task) => {
          const isCompleted = task.status === "completed";
          const isFailed = task.failedAttempt;
          const isSelected = selectedTask === task.id;
          const isDisabled = isCompleted || turns >= 12 || agentMode;

          let bgColor: string = C.surface;
          let borderColor: string = C.border;
          if (isCompleted) {
            bgColor = "#E8F5E9";
            borderColor = "#A5D6A7";
          } else if (isFailed) {
            bgColor = "#FFEBEE";
            borderColor = "#EF9A9A";
          } else if (isSelected) {
            borderColor = C.accent;
          }

          return (
            <button
              key={task.id}
              onClick={() => !isDisabled && handleAttempt(task.id)}
              disabled={isDisabled}
              style={{
                background: bgColor,
                border: `1px solid ${borderColor}`,
                borderLeft: isSelected ? `3px solid ${C.accent}` : `1px solid ${borderColor}`,
                borderRadius: "16px",
                padding: "24px",
                paddingLeft: isSelected ? "22px" : "24px",
                cursor: isDisabled ? "default" : "pointer",
                opacity: isDisabled && !isCompleted ? 0.5 : 1,
                fontFamily: "inherit",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: "24px",
                  fontWeight: 600,
                  color: isCompleted ? "#2E7D32" : isFailed ? "#C62828" : C.textPrimary,
                  marginBottom: "8px",
                }}
              >
                {task.id}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  fontSize: "12px",
                  color: C.textTertiary,
                }}
              >
                {isCompleted && <Check size={14} strokeWidth={2} />}
                {isFailed && <X size={14} strokeWidth={2} />}
                {!isCompleted && !isFailed && <Lock size={14} strokeWidth={2} />}
                {isCompleted
                  ? "Done"
                  : isFailed
                  ? "Failed"
                  : "Unknown"}
              </div>
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
            marginBottom: "24px",
          }}
        >
          Topological sort agent
        </div>
      )}

      {discoveredDeps.length > 0 && (
        <div style={{ ...card, padding: "16px", marginBottom: "24px" }}>
          <div
            style={{
              fontSize: "11px",
              fontWeight: 500,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: C.textTertiary,
              marginBottom: "8px",
            }}
          >
            Discovered Dependencies
          </div>
          <div
            style={{
              fontSize: "13px",
              color: C.textSecondary,
              lineHeight: 1.6,
            }}
          >
            {discoveredDeps.map((dep, i) => (
              <div key={i}>{dep}</div>
            ))}
          </div>
        </div>
      )}

      {turns >= 12 && completedCount < 6 && (
        <div style={{ textAlign: "center", marginTop: "24px" }}>
          <p style={{ fontSize: "14px", color: C.textSecondary, marginBottom: "16px" }}>
            Maximum turns reached. {completedCount} of 6 tasks completed.
          </p>
          <button style={buttonStyle} onClick={() => {
            saveScore("tower", efficiency);
            setPhase("reveal");
          }}>
            View Results
          </button>
        </div>
      )}
    </Shell>
  );
}
