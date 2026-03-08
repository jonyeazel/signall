"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Shell, MetricCard, LessonCard } from "../shell";
import { C, card, buttonStyle, ghostButton, saveScore, isDemoMode, getNextDemoPath, isAgentEmbed } from "../shared";
import { ArrowRight, RotateCcw, Play } from "lucide-react";

type Phase = "intro" | "playing" | "reveal";

type Item = {
  id: number;
  appeal: number;
  cost: number;
  trueValue: number;
};

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
  // Estimate true value based on appeal (appeal * 6 is the mean)
  const estimatedValue = item.appeal * 6;

  // Reserve some budget for later items (don't spend everything early)
  const reserveRatio = Math.max(0.2, itemsRemaining / 8);
  const reserveBudget = 100 * reserveRatio * 0.3; // Keep ~30% of proportional budget
  const availableBudget = currentBudget - reserveBudget;

  // Buy if estimated value > cost and we have budget
  if (item.cost <= availableBudget && estimatedValue > item.cost * 0.9) {
    return "buy";
  }

  // Also buy high-appeal items even if slightly overpriced
  if (item.appeal >= 4 && item.cost <= availableBudget && item.cost <= 25) {
    return "buy";
  }

  // Skip items that look overpriced
  if (estimatedValue < item.cost * 0.7) {
    return "pass";
  }

  // On last item, buy if we can afford
  if (itemsRemaining === 1 && currentBudget >= item.cost && estimatedValue > item.cost * 0.5) {
    return "buy";
  }

  return "pass";
}

function AppealDots({ rating }: { rating: number }) {
  return (
    <div style={{ display: "flex", gap: "4px" }}>
      {Array.from({ length: 5 }, (_, i) => (
        <div
          key={i}
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            background: i < rating ? C.accent : C.border,
          }}
        />
      ))}
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
  const [demoMode, setDemoMode] = useState(false);
  const [agentEmbed, setAgentEmbed] = useState(false);

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

      // Brief pause to show decision, then execute
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
        window.location.href = getNextDemoPath("auction");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [demoMode, phase]);

  if (phase === "intro") {
    return (
      <Shell env="The Auction">
        <div style={{ ...card, padding: "48px 32px" }}>
          <p
            style={{
              fontSize: "15px",
              lineHeight: 1.7,
              color: C.textSecondary,
              margin: "0 0 32px 0",
            }}
          >
            Eight items will appear one at a time. You have a budget of 100
            points. Each item shows an appeal rating and cost, but the true
            value is hidden. Some high-appeal items are traps; some low-appeal
            items are gems. Maximize your total value.
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

  if (phase === "playing" && items.length > 0) {
    const currentItem = items[currentIndex];
    const canAfford = budget >= currentItem.cost;
    const purchasedItems = purchased.map((idx) => items[idx]);

    return (
      <Shell env="The Auction">
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
            Item {currentIndex + 1} of 8
          </span>
          <span
            style={{
              fontSize: "15px",
              fontWeight: 600,
              color: C.textPrimary,
            }}
          >
            Budget: {budget}
          </span>
        </div>

        <div
          style={{
            ...card,
            padding: "32px",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: "24px",
            }}
          >
            <div>
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
                Appeal
              </div>
              <AppealDots rating={currentItem.appeal} />
            </div>
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
                  fontSize: "24px",
                  fontWeight: 600,
                  color: C.textPrimary,
                }}
              >
                {currentItem.cost}
              </div>
            </div>
          </div>

          {!agentMode && (
            <div style={{ display: "flex", gap: "12px" }}>
              <button
                style={{
                  ...buttonStyle,
                  flex: 1,
                  justifyContent: "center",
                  opacity: canAfford ? 1 : 0.5,
                }}
                onClick={handleBuy}
                disabled={!canAfford}
              >
                Buy
              </button>
              <button
                style={{
                  ...ghostButton,
                  flex: 1,
                  justifyContent: "center",
                }}
                onClick={handlePass}
              >
                Pass
              </button>
            </div>
          )}

          {agentMode && (
            <div style={{ display: "flex", gap: "12px" }}>
              <div
                style={{
                  ...buttonStyle,
                  flex: 1,
                  justifyContent: "center",
                  opacity: agentDecision === "buy" ? 1 : 0.3,
                  cursor: "default",
                }}
              >
                Buy
              </div>
              <div
                style={{
                  ...ghostButton,
                  flex: 1,
                  justifyContent: "center",
                  opacity: agentDecision === "pass" ? 1 : 0.3,
                  cursor: "default",
                }}
              >
                Pass
              </div>
            </div>
          )}
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
            Expected value agent
          </div>
        )}

        {purchasedItems.length > 0 && (
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
              Purchased
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {purchasedItems.map((item, i) => (
                <div
                  key={i}
                  style={{
                    ...card,
                    padding: "8px 12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <AppealDots rating={item.appeal} />
                  <span style={{ fontSize: "13px", color: C.textSecondary }}>
                    -{item.cost}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Shell>
    );
  }

  if (phase === "reveal") {
    const playerValue = purchased.reduce((sum, idx) => sum + items[idx].trueValue, 0);
    const efficiency = optimalResult.value > 0
      ? Math.round((playerValue / optimalResult.value) * 100)
      : 0;

    return (
      <Shell env="The Auction">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "8px",
            marginBottom: "16px",
          }}
        >
          <MetricCard label="Your Value" value={String(playerValue)} />
          <MetricCard label="Optimal" value={String(optimalResult.value)} />
          <MetricCard label="Efficiency" value={`${efficiency}%`} />
        </div>

        <div style={{ marginBottom: "16px" }}>
          <LessonCard term="In the real world">
            Every capital allocation decision is a version of this game — limited budget, uncertain returns, irreversible commitments. Procurement agents, ad bidders, and venture allocators all need to distinguish apparent value from true value under scarcity.
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
