"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Shell, MetricCard, LessonCard, MiniChart } from "../shell";
import { C, card, buttonStyle, saveScore } from "../shared";
import { Lock, Check, X } from "lucide-react";

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

// Placeholder tasks for consistent layout before game starts
const PLACEHOLDER_TASKS: Task[] = [
  { id: "A", status: "available", prerequisites: [] },
  { id: "B", status: "available", prerequisites: [] },
  { id: "C", status: "available", prerequisites: [] },
  { id: "D", status: "available", prerequisites: [] },
  { id: "E", status: "available", prerequisites: [] },
  { id: "F", status: "available", prerequisites: [] },
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

// Fixed height for dependencies section
const DEPS_SECTION_HEIGHT = 100;

export default function TowerPage() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [turns, setTurns] = useState(0);
  const [discoveredDeps, setDiscoveredDeps] = useState<string[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [edges, setEdges] = useState<[string, string][]>([]);
  const [agentMode, setAgentMode] = useState(false);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [knownDeps, setKnownDeps] = useState<Map<string, Set<string>>>(new Map());
  const [chartData, setChartData] = useState<number[]>([]);
  const agentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        setChartData(prev => [...prev, unmetPrereqs.length === 0 ? completedCount + 1 : completedCount]);

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
            if (window.parent !== window) {
              window.parent.postMessage({ type: "episodeComplete", envId: "tower", efficiency: finalEfficiency }, "*");
            }
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

  // Auto-start agent mode on mount
  useEffect(() => {
    if (phase === "intro") {
      handleBegin(true);
    }
  }, [phase]);

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
          if (window.parent !== window) {
            window.parent.postMessage({ type: "episodeComplete", envId: "tower", efficiency: finalEfficiency }, "*");
          }
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

  // Use placeholder tasks for intro phase to maintain consistent layout
  const displayTasks = phase === "intro" ? PLACEHOLDER_TASKS : tasks;
  const isPlaying = phase === "playing";
  const isReveal = phase === "reveal";
  const isIntro = phase === "intro";
  const maxTurnsReached = turns >= 12 && completedCount < 6;

  return (
    <Shell env="tower">
      {/* Header section - always rendered with fixed height */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "24px",
          height: "20px",
          alignItems: "center",
        }}
      >
        <div
          style={{
            fontSize: "13px",
            color: C.textSecondary,
            opacity: isIntro ? 0 : 1,
            transition: "opacity 150ms ease-out",
          }}
        >
          <span
            style={{
              color: C.accent,
              marginRight: "8px",
              opacity: agentMode ? 1 : 0,
              transition: "opacity 150ms ease-out",
            }}
          >
            Agent
          </span>
          Turn {turns} / 12
        </div>
        <div
          style={{
            fontSize: "13px",
            color: C.textSecondary,
            opacity: isIntro ? 0 : 1,
            transition: "opacity 150ms ease-out",
          }}
        >
          Completed: {completedCount} / 6
        </div>
      </div>

      {/* Task grid - always 3x2, fixed dimensions */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "12px",
          marginBottom: "24px",
          opacity: isReveal ? 0.5 : 1,
          transition: "opacity 150ms ease-out",
        }}
      >
        {displayTasks.map((task) => {
          const isCompleted = task.status === "completed";
          const isFailed = task.failedAttempt;
          const isSelected = selectedTask === task.id;
          const isDisabled = isCompleted || turns >= 12 || agentMode || isIntro || isReveal;

          let bgColor: string = C.surface;
          let borderColor: string = C.border;
          if (isCompleted) {
            bgColor = "rgba(74, 222, 128, 0.1)";
            borderColor = "#2A5A3A";
          } else if (isFailed) {
            bgColor = "rgba(224, 90, 0, 0.1)";
            borderColor = "#5A3A2A";
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
                opacity: isDisabled && !isCompleted && !isIntro && !isReveal ? 0.5 : 1,
                fontFamily: "inherit",
                textAlign: "center",
                height: "100px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  fontSize: "24px",
                  fontWeight: 600,
                  color: isCompleted ? "#22A55B" : isFailed ? "#E05A00" : C.textPrimary,
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

      {/* Agent mode indicator - always rendered, visibility via opacity */}
      <div
        style={{
          textAlign: "center",
          fontSize: "12px",
          color: C.textTertiary,
          marginBottom: "24px",
          height: "16px",
          opacity: agentMode && isPlaying ? 1 : 0,
          transition: "opacity 150ms ease-out",
        }}
      >
        Topological sort agent
      </div>

      {isPlaying && <MiniChart data={chartData} totalSteps={12} yMin={0} yMax={6} />}

      {/* Discovered dependencies section - fixed height container, always rendered */}
      <div
        style={{
          ...card,
          padding: "16px",
          marginBottom: "24px",
          height: `${DEPS_SECTION_HEIGHT}px`,
          opacity: isPlaying ? 1 : 0,
          transition: "opacity 150ms ease-out",
          overflow: "hidden",
        }}
      >
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
            color: discoveredDeps.length > 0 ? C.textSecondary : C.textTertiary,
            lineHeight: 1.6,
            height: `${DEPS_SECTION_HEIGHT - 48}px`,
            overflowY: "auto",
            opacity: discoveredDeps.length > 0 ? 1 : 0.4,
          }}
        >
          {discoveredDeps.length > 0 ? (
            discoveredDeps.map((dep, i) => (
              <div key={i}>{dep}</div>
            ))
          ) : (
            <div>No dependencies discovered yet</div>
          )}
        </div>
      </div>

      {/* Maximum turns reached - fixed container, content fades in */}
      <div
        style={{
          textAlign: "center",
          height: "72px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          opacity: maxTurnsReached && isPlaying ? 1 : 0,
          pointerEvents: maxTurnsReached && isPlaying ? "auto" : "none",
          transition: "opacity 150ms ease-out",
        }}
      >
        <p style={{ fontSize: "14px", color: C.textSecondary, marginBottom: "16px", margin: 0 }}>
          Maximum turns reached. {completedCount} of 6 tasks completed.
        </p>
        <button
          style={buttonStyle}
          onClick={() => {
            saveScore("tower", efficiency);
            if (window.parent !== window) {
              window.parent.postMessage({ type: "episodeComplete", envId: "tower", efficiency }, "*");
            }
            setPhase("reveal");
          }}
        >
          View Results
        </button>
      </div>

      {/* Reveal content overlay */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          padding: "0 32px 48px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          opacity: isReveal ? 1 : 0,
          pointerEvents: isReveal ? "auto" : "none",
          transition: "opacity 150ms ease-out",
        }}
      >
        <div style={{ maxWidth: "640px", width: "100%" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "8px",
              marginBottom: "16px",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column" }}>
              <MetricCard label="Turns Used" value={`${turns}`} />
              <div style={{ fontSize: "9px", color: C.textTertiary, marginTop: "4px", textAlign: "center" }}>
                Attempts to complete all tasks
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <MetricCard label="Efficiency" value={`${efficiency}%`} />
              <div style={{ fontSize: "9px", color: C.textTertiary, marginTop: "4px", textAlign: "center" }}>
                Fewer turns = better planning
              </div>
            </div>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <LessonCard term="What this teaches">
              <ul style={{ margin: 0, paddingLeft: "16px", lineHeight: 1.8 }}>
                <li>Find hidden dependencies before they block you</li>
                <li>Project launches need this exact skill</li>
                <li>CI/CD pipelines are dependency puzzles</li>
              </ul>
            </LessonCard>
          </div>
        </div>
      </div>
    </Shell>
  );
}
