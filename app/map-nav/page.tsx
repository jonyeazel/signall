"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Shell, MetricCard, LessonCard } from "../shell";
import { C, card, buttonStyle, ghostButton, saveScore, isDemoMode, getNextDemoPath } from "../shared";
import { ArrowRight, RotateCcw, Play } from "lucide-react";

type Phase = "intro" | "playing" | "reveal";
type Cell = "empty" | "wall" | "goal" | "start";
type Position = { x: number; y: number };

const GRID_SIZE = 8;
const CELL_SIZE = 48;
const GAP = 2;

function generateGrid(): { grid: Cell[][]; optimalLength: number } {
  const maxAttempts = 100;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const grid: Cell[][] = Array.from({ length: GRID_SIZE }, () =>
      Array.from({ length: GRID_SIZE }, () => "empty" as Cell)
    );

    grid[0][0] = "start";
    grid[GRID_SIZE - 1][GRID_SIZE - 1] = "goal";

    const wallCount = Math.floor(GRID_SIZE * GRID_SIZE * 0.18);
    let placed = 0;
    while (placed < wallCount) {
      const x = Math.floor(Math.random() * GRID_SIZE);
      const y = Math.floor(Math.random() * GRID_SIZE);
      if (grid[y][x] === "empty") {
        grid[y][x] = "wall";
        placed++;
      }
    }

    const optimalLength = bfs(grid, { x: 0, y: 0 }, { x: GRID_SIZE - 1, y: GRID_SIZE - 1 });
    if (optimalLength !== -1) {
      return { grid, optimalLength };
    }
  }

  const fallbackGrid: Cell[][] = Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => "empty" as Cell)
  );
  fallbackGrid[0][0] = "start";
  fallbackGrid[GRID_SIZE - 1][GRID_SIZE - 1] = "goal";
  return { grid: fallbackGrid, optimalLength: (GRID_SIZE - 1) * 2 };
}

function bfs(grid: Cell[][], start: Position, goal: Position): number {
  const queue: { pos: Position; dist: number }[] = [{ pos: start, dist: 0 }];
  const visited = new Set<string>();
  visited.add(`${start.x},${start.y}`);

  const directions = [
    { dx: 0, dy: -1 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 },
    { dx: 1, dy: 0 },
  ];

  while (queue.length > 0) {
    const { pos, dist } = queue.shift()!;

    if (pos.x === goal.x && pos.y === goal.y) {
      return dist;
    }

    for (const { dx, dy } of directions) {
      const nx = pos.x + dx;
      const ny = pos.y + dy;
      const key = `${nx},${ny}`;

      if (
        nx >= 0 &&
        nx < GRID_SIZE &&
        ny >= 0 &&
        ny < GRID_SIZE &&
        !visited.has(key) &&
        grid[ny][nx] !== "wall"
      ) {
        visited.add(key);
        queue.push({ pos: { x: nx, y: ny }, dist: dist + 1 });
      }
    }
  }

  return -1;
}

function isVisible(pos: Position, current: Position): boolean {
  const dx = Math.abs(pos.x - current.x);
  const dy = Math.abs(pos.y - current.y);
  return (dx === 0 && dy === 0) || (dx + dy === 1);
}

function isAdjacent(pos: Position, current: Position): boolean {
  const dx = Math.abs(pos.x - current.x);
  const dy = Math.abs(pos.y - current.y);
  return dx + dy === 1;
}

// --- BFS pathfinding agent ---

function bfsAgentChoice(
  grid: Cell[][],
  current: Position,
  explored: Set<string>
): Position | null {
  const goal = { x: GRID_SIZE - 1, y: GRID_SIZE - 1 };
  const directions = [
    { dx: 0, dy: -1 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 },
    { dx: 1, dy: 0 },
  ];

  // Get valid adjacent moves
  const validMoves: Position[] = [];
  for (const { dx, dy } of directions) {
    const nx = current.x + dx;
    const ny = current.y + dy;
    if (
      nx >= 0 &&
      nx < GRID_SIZE &&
      ny >= 0 &&
      ny < GRID_SIZE &&
      grid[ny][nx] !== "wall"
    ) {
      validMoves.push({ x: nx, y: ny });
    }
  }

  if (validMoves.length === 0) return null;

  // Try BFS from current position to goal using only explored/walkable cells
  const path = bfsPath(grid, current, goal, explored);
  if (path.length > 1) {
    // path[0] is current, path[1] is next step
    return path[1];
  }

  // No clear path found, explore nearest unrevealed cell
  // Prefer moves toward unexplored areas
  const unexploredMoves = validMoves.filter((m) => !explored.has(`${m.x},${m.y}`));
  if (unexploredMoves.length > 0) {
    // Prefer moves that get us closer to the goal
    unexploredMoves.sort((a, b) => {
      const distA = Math.abs(a.x - goal.x) + Math.abs(a.y - goal.y);
      const distB = Math.abs(b.x - goal.x) + Math.abs(b.y - goal.y);
      return distA - distB;
    });
    return unexploredMoves[0];
  }

  // Fallback: move toward goal greedily
  validMoves.sort((a, b) => {
    const distA = Math.abs(a.x - goal.x) + Math.abs(a.y - goal.y);
    const distB = Math.abs(b.x - goal.x) + Math.abs(b.y - goal.y);
    return distA - distB;
  });
  return validMoves[0];
}

function bfsPath(
  grid: Cell[][],
  start: Position,
  goal: Position,
  explored: Set<string>
): Position[] {
  const queue: { pos: Position; path: Position[] }[] = [{ pos: start, path: [start] }];
  const visited = new Set<string>();
  visited.add(`${start.x},${start.y}`);

  const directions = [
    { dx: 0, dy: -1 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 },
    { dx: 1, dy: 0 },
  ];

  while (queue.length > 0) {
    const { pos, path } = queue.shift()!;

    if (pos.x === goal.x && pos.y === goal.y) {
      return path;
    }

    for (const { dx, dy } of directions) {
      const nx = pos.x + dx;
      const ny = pos.y + dy;
      const key = `${nx},${ny}`;

      if (
        nx >= 0 &&
        nx < GRID_SIZE &&
        ny >= 0 &&
        ny < GRID_SIZE &&
        !visited.has(key) &&
        grid[ny][nx] !== "wall" &&
        (explored.has(key) || (nx === goal.x && ny === goal.y))
      ) {
        visited.add(key);
        queue.push({ pos: { x: nx, y: ny }, path: [...path, { x: nx, y: ny }] });
      }
    }
  }

  return [];
}

export default function MapNavPage() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [grid, setGrid] = useState<Cell[][]>([]);
  const [optimalLength, setOptimalLength] = useState(0);
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const [moves, setMoves] = useState(0);
  const [path, setPath] = useState<Position[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [agentMode, setAgentMode] = useState(false);
  const [explored, setExplored] = useState<Set<string>>(new Set());
  const agentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [demoMode, setDemoMode] = useState(false);

  const initGame = useCallback(() => {
    const { grid: newGrid, optimalLength: optimal } = generateGrid();
    setGrid(newGrid);
    setOptimalLength(optimal);
    setPosition({ x: 0, y: 0 });
    setMoves(0);
    setPath([{ x: 0, y: 0 }]);
    setGameOver(false);
    setExplored(new Set(["0,0"]));
  }, []);

  const handleBegin = useCallback((withAgent: boolean = false) => {
    initGame();
    setAgentMode(withAgent);
    setPhase("playing");
  }, [initGame]);

  const handleCellClick = useCallback((x: number, y: number) => {
    if (gameOver || agentMode) return;
    if (!isAdjacent({ x, y }, position)) return;
    if (grid[y][x] === "wall") return;

    const newPos = { x, y };
    setPosition(newPos);
    setMoves((m) => m + 1);
    setPath((p) => [...p, newPos]);
    setExplored((prev) => new Set([...prev, `${x},${y}`]));

    if (x === GRID_SIZE - 1 && y === GRID_SIZE - 1) {
      const finalMoves = moves + 1;
      const efficiency = Math.min(100, Math.round((optimalLength / finalMoves) * 100));
      saveScore("map", efficiency);
      setGameOver(true);
      setTimeout(() => setPhase("reveal"), 500);
    } else if (moves + 1 >= 50) {
      const efficiency = Math.round((optimalLength / 50) * 100);
      saveScore("map", efficiency);
      setGameOver(true);
      setTimeout(() => setPhase("reveal"), 500);
    }
  }, [gameOver, agentMode, position, grid, moves, optimalLength]);

  // Agent auto-play
  useEffect(() => {
    if (!agentMode || phase !== "playing" || gameOver || grid.length === 0) return;

    agentTimerRef.current = setTimeout(() => {
      const nextPos = bfsAgentChoice(grid, position, explored);
      if (!nextPos) {
        // Stuck, end game
        const efficiency = Math.round((optimalLength / Math.max(1, moves)) * 100);
        saveScore("map", efficiency);
        setGameOver(true);
        setTimeout(() => setPhase("reveal"), 500);
        return;
      }

      // Brief pause to show selection highlight
      setTimeout(() => {
        setPosition(nextPos);
        setMoves((m) => m + 1);
        setPath((p) => [...p, nextPos]);
        setExplored((prev) => new Set([...prev, `${nextPos.x},${nextPos.y}`]));

        const newMoves = moves + 1;
        if (nextPos.x === GRID_SIZE - 1 && nextPos.y === GRID_SIZE - 1) {
          const efficiency = Math.min(100, Math.round((optimalLength / newMoves) * 100));
          saveScore("map", efficiency);
          setGameOver(true);
          setTimeout(() => setPhase("reveal"), 500);
        } else if (newMoves >= 50) {
          const efficiency = Math.round((optimalLength / 50) * 100);
          saveScore("map", efficiency);
          setGameOver(true);
          setTimeout(() => setPhase("reveal"), 500);
        }
      }, 200);
    }, 400);

    return () => {
      if (agentTimerRef.current) clearTimeout(agentTimerRef.current);
    };
  }, [agentMode, phase, gameOver, grid, position, explored, moves, optimalLength]);

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
        window.location.href = getNextDemoPath("map");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [demoMode, phase]);

  if (phase === "intro") {
    return (
      <Shell env="The Map">
        <div style={{ ...card, padding: "48px 32px" }}>
          <p
            style={{
              fontSize: "15px",
              lineHeight: 1.7,
              color: C.textSecondary,
              margin: "0 0 32px 0",
            }}
          >
            Navigate from the top-left corner to the bottom-right goal. You can
            only see your current cell and the four adjacent cells. Walls block
            your path. Find the shortest route with limited visibility. Maximum
            50 moves.
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

  if (phase === "playing" && grid.length > 0) {
    return (
      <Shell env="The Map">
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
            Moves: {moves}
          </span>
          <span style={{ fontSize: "13px", color: C.accent, fontWeight: 500 }}>
            GOAL: Bottom-right
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${GRID_SIZE}, ${CELL_SIZE}px)`,
            gap: `${GAP}px`,
            justifyContent: "center",
            marginBottom: agentMode ? "24px" : "0",
          }}
        >
          {grid.map((row, y) =>
            row.map((cell, x) => {
              const isCurrent = position.x === x && position.y === y;
              const visible = isVisible({ x, y }, position);
              const isGoal = x === GRID_SIZE - 1 && y === GRID_SIZE - 1;
              const canClick = isAdjacent({ x, y }, position) && cell !== "wall";

              let bg: string = C.border;
              let border: string = `1px solid ${C.border}`;

              if (isCurrent) {
                bg = C.accent;
                border = `1px solid ${C.accent}`;
              } else if (visible) {
                if (cell === "wall") {
                  bg = C.textPrimary;
                  border = `1px solid ${C.textPrimary}`;
                } else {
                  bg = C.surface;
                  border = `1px solid ${C.border}`;
                  if (isGoal) {
                    border = `2px solid ${C.accent}`;
                  }
                }
              }

              return (
                <button
                  key={`${x}-${y}`}
                  onClick={() => handleCellClick(x, y)}
                  disabled={!canClick || gameOver || agentMode}
                  style={{
                    width: CELL_SIZE,
                    height: CELL_SIZE,
                    background: bg,
                    border,
                    borderRadius: "16px",
                    cursor: canClick && !gameOver && !agentMode ? "pointer" : "default",
                    padding: 0,
                    transition: "background 150ms ease-out",
                    fontFamily: "inherit",
                  }}
                />
              );
            })
          )}
        </div>

        {agentMode && (
          <div
            style={{
              textAlign: "center",
              fontSize: "12px",
              color: C.textTertiary,
            }}
          >
            BFS pathfinding agent
          </div>
        )}
      </Shell>
    );
  }

  if (phase === "reveal") {
    const finalMoves = Math.max(1, Math.min(moves, 50));
    const efficiency = Math.min(100, Math.round((optimalLength / finalMoves) * 100));

    return (
      <Shell env="The Map">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "8px",
            marginBottom: "16px",
          }}
        >
          <MetricCard label="Your Moves" value={String(finalMoves)} />
          <MetricCard label="Optimal" value={String(optimalLength)} />
          <MetricCard label="Efficiency" value={`${efficiency}%`} />
        </div>

        <div style={{ marginBottom: "16px" }}>
          <LessonCard term="In the real world">
            Logistics companies route deliveries through uncertain traffic, weather, and road conditions. Supply chain agents navigate supplier networks with partial visibility. Planning under uncertainty is the core skill of autonomous operations.
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
