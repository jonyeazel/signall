"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Shell, MetricCard, LessonCard } from "../shell";
import { C, card, buttonStyle, ghostButton, saveScore } from "../shared";

type Phase = "intro" | "playing" | "reveal";

type Item = {
  id: number;
  appeal: number;
  cost: number;
  trueValue: number;
};

const GREEN = "#22A55B";

function gaussianRandom(mean: number, stdDev: number): number {
  let u = 0,
    v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return z * stdDev + mean;
}

function generateItems(): Item[] {
  return Array.from({ length: 8 }, (_, i) => {
    const appeal = Math.floor(Math.random() * 5) + 1;
    const cost = Math.floor(Math.random() * 26) + 10;
    const rawValue = appeal * 6 + gaussianRandom(0, 8);
    const trueValue = Math.round(Math.max(2, Math.min(50, rawValue)));
    return { id: i, appeal, cost, trueValue };
  });
}

function computeOptimal(items: Item[], budget: number): { value: number; indices: number[] } {
  let bestValue = 0;
  let bestIndices: number[] = [];

  for (let mask = 0; mask < 1 << items.length; mask++) {
    let totalCost = 0;
    let totalValue = 0;
    const indices: number[] = [];

    for (let i = 0; i < items.length; i++) {
      if (mask & (1 << i)) {
        totalCost += items[i].cost;
        totalValue += items[i].trueValue;
        indices.push(i);
      }
    }

    if (totalCost <= budget && totalValue > bestValue) {
      bestValue = totalValue;
      bestIndices = indices;
    }
  }

  return { value: bestValue, indices: bestIndices };
}

// --- Expected value agent ---

function expectedValueAgentChoice(
  item: Item,
  currentBudget: number,
  itemsRemaining: number
): "buy" | "pass" {
  const estimatedValue = item.appeal * 6;
  const reserveRatio = Math.max(0.2, itemsRemaining / 8);
  const reserveBudget = 100 * reserveRatio * 0.3;
  const availableBudget = currentBudget - reserveBudget;

  if (item.cost <= availableBudget && estimatedValue > item.cost * 0.9) {
    return "buy";
  }

  if (item.appeal >= 4 && item.cost <= availableBudget && item.cost <= 25) {
    return "buy";
  }

  if (estimatedValue < item.cost * 0.7) {
    return "pass";
  }

  if (itemsRemaining === 1 && currentBudget >= item.cost && estimatedValue > item.cost * 0.5) {
    return "buy";
  }

  return "pass";
}

// --- Budget Gauge Component ---
function BudgetGauge({ budget, maxBudget = 100 }: { budget: number; maxBudget?: number }) {
  const percentage = budget / maxBudget;
  const radius = 70;
  const strokeWidth = 10;
  const centerX = 100;
  const centerY = 80;

  // Arc goes from 180 degrees (left) to 0 degrees (right) - a semicircle
  // We draw from right to left for the background, then fill from left based on percentage
  const startX = centerX - radius; // Left end
  const startY = centerY;
  const endX = centerX + radius; // Right end
  const endY = centerY;

  // For the filled arc, calculate how far along we are
  // percentage 1 = full arc, percentage 0 = no arc
  const filledAngle = Math.PI * (1 - percentage);
  const filledEndX = centerX + radius * Math.cos(filledAngle);
  const filledEndY = centerY - radius * Math.sin(filledAngle);

  // Color interpolation: green at 100%, yellow at 50%, orange at 0%
  const color = percentage > 0.5 ? GREEN : percentage > 0.25 ? "#D4A72C" : C.accent;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "24px" }}>
      <svg width="200" height="120" viewBox="0 0 200 120">
        {/* Background arc - full semicircle */}
        <path
          d={`M ${startX} ${startY} A ${radius} ${radius} 0 0 1 ${endX} ${endY}`}
          fill="none"
          stroke={C.border}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Filled arc - from left, proportional to budget remaining */}
        {percentage > 0.01 && (
          <path
            d={`M ${startX} ${startY} A ${radius} ${radius} 0 ${percentage > 0.5 ? 1 : 0} 1 ${filledEndX} ${filledEndY}`}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        )}
        {/* Budget number in center */}
        <text
          x={centerX}
          y={centerY + 8}
          textAnchor="middle"
          style={{
            fontSize: "32px",
            fontWeight: 600,
            fill: C.textPrimary,
          }}
        >
          {budget}
        </text>
        <text
          x={centerX}
          y={centerY + 28}
          textAnchor="middle"
          style={{
            fontSize: "11px",
            fontWeight: 500,
            letterSpacing: "0.06em",
            fill: C.textTertiary,
          }}
        >
          BUDGET
        </text>
      </svg>
    </div>
  );
}

// --- Appeal Bars (vertical) ---
function AppealBars({ rating, size = "normal" }: { rating: number; size?: "normal" | "mini" }) {
  const barWidth = size === "mini" ? 4 : 6;
  const barHeight = size === "mini" ? 16 : 32;
  const gap = size === "mini" ? 2 : 4;

  return (
    <div style={{ display: "flex", gap: `${gap}px`, alignItems: "flex-end", height: `${barHeight}px` }}>
      {Array.from({ length: 5 }, (_, i) => {
        const height = ((i + 1) / 5) * barHeight;
        const filled = i < rating;
        return (
          <div
            key={i}
            style={{
              width: `${barWidth}px`,
              height: `${height}px`,
              borderRadius: "2px",
              background: filled ? C.accent : C.border,
            }}
          />
        );
      })}
    </div>
  );
}

// --- Portfolio Tile ---
function PortfolioTile({ item, empty }: { item?: Item; empty?: boolean }) {
  if (empty) {
    return (
      <div
        style={{
          width: "40px",
          height: "40px",
          borderRadius: "8px",
          border: `1px dashed ${C.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: "40px",
        height: "40px",
        borderRadius: "8px",
        background: C.surface,
        border: `1px solid ${C.border}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <AppealBars rating={item?.appeal ?? 0} size="mini" />
    </div>
  );
}

export default function AuctionPage() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [items, setItems] = useState<Item[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [budget, setBudget] = useState(100);
  const [purchased, setPurchased] = useState<number[]>([]);
  const [optimalResult, setOptimalResult] = useState({ value: 0, indices: [] as number[] });
  const [agentMode, setAgentMode] = useState(false);
  const [agentDecision, setAgentDecision] = useState<"buy" | "pass" | null>(null);
  const agentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const initGame = useCallback(() => {
    const newItems = generateItems();
    setItems(newItems);
    setOptimalResult(computeOptimal(newItems, 100));
    setCurrentIndex(0);
    setBudget(100);
    setPurchased([]);
    setAgentDecision(null);
  }, []);

  const handleBegin = useCallback((withAgent: boolean = false) => {
    initGame();
    setAgentMode(withAgent);
    setPhase("playing");
  }, [initGame]);

  const handleBuy = useCallback(() => {
    const item = items[currentIndex];
    if (budget >= item.cost) {
      setBudget((b) => b - item.cost);
      setPurchased((p) => [...p, currentIndex]);
    }
    advanceRound();
  }, [items, currentIndex, budget]);

  const handlePass = useCallback(() => {
    advanceRound();
  }, []);

  const advanceRound = useCallback(() => {
    setAgentDecision(null);
    if (currentIndex < 7) {
      setCurrentIndex((i) => i + 1);
    } else {
      setTimeout(() => {
        setPhase("reveal");
      }, 100);
    }
  }, [currentIndex]);

  // Save score when entering reveal phase
  useEffect(() => {
    if (phase === "reveal" && items.length > 0) {
      const finalValue = purchased.reduce((sum, idx) => sum + items[idx].trueValue, 0);
      const efficiency = optimalResult.value > 0
        ? Math.round((finalValue / optimalResult.value) * 100)
        : 0;
      saveScore("auction", efficiency);
      if (window.parent !== window) {
        window.parent.postMessage({ type: "episodeComplete", envId: "auction", efficiency }, "*");
      }
    }
  }, [phase, items, purchased, optimalResult.value]);

  // Agent auto-play
  useEffect(() => {
    if (!agentMode || phase !== "playing" || items.length === 0) return;

    agentTimerRef.current = setTimeout(() => {
      const currentItem = items[currentIndex];
      const itemsRemaining = 8 - currentIndex;
      const decision = expectedValueAgentChoice(currentItem, budget, itemsRemaining);
      setAgentDecision(decision);

      setTimeout(() => {
        if (decision === "buy" && budget >= currentItem.cost) {
          setBudget((b) => b - currentItem.cost);
          setPurchased((p) => [...p, currentIndex]);
        }

        setAgentDecision(null);
        if (currentIndex < 7) {
          setCurrentIndex((i) => i + 1);
        } else {
          setTimeout(() => {
            setPhase("reveal");
          }, 100);
        }
      }, 200);
    }, 400);

    return () => {
      if (agentTimerRef.current) clearTimeout(agentTimerRef.current);
    };
  }, [agentMode, phase, currentIndex, items, budget]);

  useEffect(() => {
    initGame();
  }, [initGame]);

  // Auto-start agent mode on mount
  useEffect(() => {
    if (phase === "intro") {
      handleBegin(true);
    }
  }, [phase]);

  // Compute derived state for all phases
  const currentItem = items.length > 0 ? items[currentIndex] : null;
  const canAfford = currentItem ? budget >= currentItem.cost : false;
  const purchasedItems = purchased.map((idx) => items[idx]);
  const playerValue = purchased.reduce((sum, idx) => sum + items[idx].trueValue, 0);
  const runningTotal = purchasedItems.reduce((sum, item) => sum + item.cost, 0);
  const efficiency = optimalResult.value > 0
    ? Math.round((playerValue / optimalResult.value) * 100)
    : 0;

  return (
    <Shell env="auction">
      {/* Playing phase */}
      {phase === "playing" && currentItem && (
        <>
          {/* Budget Gauge */}
          <BudgetGauge budget={budget} />

          {/* Current Item Card */}
          <div
            style={{
              ...card,
              padding: "0",
              marginBottom: "16px",
              overflow: "hidden",
            }}
          >
            {/* Progress bar at top */}
            <div style={{ height: "4px", background: C.border }}>
              <div
                style={{
                  height: "100%",
                  width: `${((currentIndex + 1) / 8) * 100}%`,
                  background: C.accent,
                  transition: "width 150ms ease-out",
                }}
              />
            </div>

            {/* Item counter */}
            <div
              style={{
                padding: "12px 24px",
                borderBottom: `1px solid ${C.border}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: "13px", color: C.textSecondary }}>
                {currentIndex + 1} of 8
              </span>
              {agentMode && (
                <span style={{ fontSize: "11px", color: C.accent, fontWeight: 500 }}>
                  Agent
                </span>
              )}
            </div>

            {/* Item content */}
            <div
              style={{
                padding: "24px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                minHeight: "80px",
              }}
            >
              {/* Left: Appeal bars */}
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
                  Appeal
                </div>
                <AppealBars rating={currentItem.appeal} />
              </div>

              {/* Right: Cost */}
              <div style={{ textAlign: "right" }}>
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
                  Cost
                </div>
                <div
                  style={{
                    fontSize: "32px",
                    fontWeight: 600,
                    color: C.textPrimary,
                    lineHeight: 1,
                  }}
                >
                  {currentItem.cost}
                </div>
              </div>
            </div>

            {/* Decision buttons */}
            <div
              style={{
                padding: "16px 24px 24px",
                display: "flex",
                gap: "12px",
              }}
            >
              <button
                style={{
                  ...buttonStyle,
                  flex: 1,
                  justifyContent: "center",
                  opacity: agentMode
                    ? (agentDecision === "buy" ? 1 : 0.3)
                    : (canAfford ? 1 : 0.5),
                  cursor: agentMode ? "default" : "pointer",
                  boxShadow: agentDecision === "buy" ? `0 0 0 2px ${C.accent}` : "none",
                }}
                onClick={agentMode ? undefined : handleBuy}
                disabled={agentMode || !canAfford}
              >
                Buy
              </button>
              <button
                style={{
                  ...ghostButton,
                  flex: 1,
                  justifyContent: "center",
                  opacity: agentMode
                    ? (agentDecision === "pass" ? 1 : 0.3)
                    : 1,
                  cursor: agentMode ? "default" : "pointer",
                }}
                onClick={agentMode ? undefined : handlePass}
                disabled={agentMode}
              >
                Pass
              </button>
            </div>
          </div>

          {/* Portfolio Strip */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
            }}
          >
            <div style={{ display: "flex", gap: "8px" }}>
              {Array.from({ length: 8 }, (_, i) => {
                const purchasedItem = purchasedItems[i];
                return (
                  <PortfolioTile
                    key={i}
                    item={purchasedItem}
                    empty={!purchasedItem}
                  />
                );
              })}
            </div>
            <div
              style={{
                fontSize: "13px",
                color: C.textSecondary,
                whiteSpace: "nowrap",
              }}
            >
              <span style={{ fontWeight: 600, color: C.textPrimary }}>{runningTotal}</span>
              <span style={{ marginLeft: "4px" }}>spent</span>
            </div>
          </div>
        </>
      )}

      {/* Reveal phase */}
      {phase === "reveal" && (
        <>
          <div
            style={{
              ...card,
              padding: "32px",
              marginBottom: "24px",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "8px",
                marginBottom: "16px",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column" }}>
                <MetricCard label="Your Value" value={String(playerValue)} />
                <div style={{ fontSize: "9px", color: C.textTertiary, marginTop: "4px", textAlign: "center" }}>
                  Total value of purchased items
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <MetricCard label="Optimal" value={String(optimalResult.value)} />
                <div style={{ fontSize: "9px", color: C.textTertiary, marginTop: "4px", textAlign: "center" }}>
                  Best possible with same budget
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <MetricCard label="Efficiency" value={`${efficiency}%`} />
                <div style={{ fontSize: "9px", color: C.textTertiary, marginTop: "4px", textAlign: "center" }}>
                  Value captured vs possible
                </div>
              </div>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <LessonCard term="What this teaches">
                <ul style={{ margin: 0, paddingLeft: "16px", lineHeight: 1.8 }}>
                  <li>Spend limited budgets wisely</li>
                  <li>Apparent value isn't always real value</li>
                  <li>Every procurement decision is this game</li>
                </ul>
              </LessonCard>
            </div>
          </div>
        </>
      )}
    </Shell>
  );
}
