"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Shell, MetricCard, LessonCard, MiniChart } from "../shell";
import { C, saveScore } from "../shared";

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
  const [chartData, setChartData] = useState<number[]>([]);
  const [explored, setExplored] = useState<Set<string>>(new Set());
  const agentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      if (window.parent !== window) {
        window.parent.postMessage({ type: "episodeComplete", envId: "map", efficiency }, "*");
      }
      setGameOver(true);
      setTimeout(() => setPhase("reveal"), 500);
    } else if (moves + 1 >= 50) {
      const efficiency = Math.round((optimalLength / 50) * 100);
      saveScore("map", efficiency);
      if (window.parent !== window) {
        window.parent.postMessage({ type: "episodeComplete", envId: "map", efficiency }, "*");
      }
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
        if (window.parent !== window) {
          window.parent.postMessage({ type: "episodeComplete", envId: "map", efficiency }, "*");
        }
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
        setChartData(prev => [...prev, (GRID_SIZE - 1 - nextPos.x) + (GRID_SIZE - 1 - nextPos.y)]);

        const newMoves = moves + 1;
        if (nextPos.x === GRID_SIZE - 1 && nextPos.y === GRID_SIZE - 1) {
          const efficiency = Math.min(100, Math.round((optimalLength / newMoves) * 100));
          saveScore("map", efficiency);
          if (window.parent !== window) {
            window.parent.postMessage({ type: "episodeComplete", envId: "map", efficiency }, "*");
          }
          setGameOver(true);
          setTimeout(() => setPhase("reveal"), 500);
        } else if (newMoves >= 50) {
          const efficiency = Math.round((optimalLength / 50) * 100);
          saveScore("map", efficiency);
          if (window.parent !== window) {
            window.parent.postMessage({ type: "episodeComplete", envId: "map", efficiency }, "*");
          }
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

  // Auto-start agent mode on mount
  useEffect(() => {
    if (phase === "intro") {
      handleBegin(true);
    }
  }, [phase]);

  if (phase === "playing" && grid.length > 0) {
    return (
      <Shell env="map">
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
            marginBottom: "24px",
          }}
        >
          {grid.map((row, y) =>
            row.map((cell, x) => {
              const isCurrent = position.x === x && position.y === y;
              const visible = isVisible({ x, y }, position);
              const isGoal = x === GRID_SIZE - 1 && y === GRID_SIZE - 1;
              const canClick = isAdjacent({ x, y }, position) && cell !== "wall";
              const cellKey = `${x},${y}`;
              const wasExplored = explored.has(cellKey);
              const wasVisited = path.some(p => p.x === x && p.y === y);

              // Procedural terrain variation for revealed cells
              const terrainVariant = (x * 7 + y * 13) % 5;
              const terrainShades = ["#FFFFFF", "#FDFCFB", "#FAF9F7", "#F8F7F4", "#F5F4F1"];

              let bg: string;
              let border: string;
              let boxShadow: string = "none";

              if (isCurrent) {
                bg = C.accent;
                border = `1px solid ${C.accent}`;
                boxShadow = `0 0 12px rgba(224, 90, 0, 0.4)`;
              } else if (visible) {
                if (cell === "wall") {
                  bg = "#C8C4BC";
                  border = `1px solid #B8B4AC`;
                } else {
                  // Revealed empty cell with terrain variation
                  bg = terrainShades[terrainVariant];
                  border = `1px solid ${C.border}`;
                  if (isGoal) {
                    border = `2px solid ${C.accent}`;
                  }
                }
              } else if (wasExplored) {
                // Previously explored but no longer visible - slightly lighter than hidden
                bg = "#E8E5DF";
                border = `1px solid #DCD9D3`;
              } else {
                // Fully hidden cells
                bg = "#DDD9D2";
                border = `1px solid #D3CFC8`;
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
                    boxShadow,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {/* Path trace dot for visited cells */}
                  {wasVisited && !isCurrent && visible && (
                    <div
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "rgba(224, 90, 0, 0.25)",
                      }}
                    />
                  )}
                </button>
              );
            })
          )}
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
          BFS pathfinding agent
        </div>

        <MiniChart data={chartData} totalSteps={20} yMin={0} yMax={14} />
      </Shell>
    );
  }

  if (phase === "reveal") {
    const finalMoves = Math.max(1, Math.min(moves, 50));
    const efficiency = Math.min(100, Math.round((optimalLength / finalMoves) * 100));

    return (
      <Shell env="map">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", marginBottom: "16px" }}>
          <div>
            <MetricCard label="Your Moves" value={String(finalMoves)} />
            <div style={{ fontSize: "9px", color: C.textTertiary, marginTop: "6px", padding: "0 4px" }}>Steps taken to reach goal</div>
          </div>
          <div>
            <MetricCard label="Optimal" value={String(optimalLength)} />
            <div style={{ fontSize: "9px", color: C.textTertiary, marginTop: "6px", padding: "0 4px" }}>Shortest possible path</div>
          </div>
          <div>
            <MetricCard label="Efficiency" value={`${efficiency}%`} />
            <div style={{ fontSize: "9px", color: C.textTertiary, marginTop: "6px", padding: "0 4px" }}>Path efficiency vs optimal</div>
          </div>
        </div>

        <LessonCard term="What this teaches">
          <span style={{ display: "block", marginBottom: "4px" }}>· Plan with incomplete information</span>
          <span style={{ display: "block", marginBottom: "4px" }}>· Delivery routes need real-time adaptation</span>
          <span style={{ display: "block" }}>· Every logistics problem looks like this</span>
        </LessonCard>
      </Shell>
    );
  }

  return null;
}
