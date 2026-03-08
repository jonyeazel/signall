"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Shell, MetricCard, LessonCard } from "../shell";
import { C, card, buttonStyle, ghostButton, saveScore, isDemoMode, getNextDemoPath } from "../shared";
import { ArrowRight, RotateCcw, Check, X, Play } from "lucide-react";

type Phase = "intro" | "playing" | "reveal";

type Resources = {
  iron: number;
  crystal: number;
  gold: number;
};

type BotProfile = {
  name: string;
  values: Resources;
  accept: (playerGain: number, botGain: number) => boolean;
};

const PLAYER_VALUES: Resources = { iron: 1, crystal: 3, gold: 5 };

const BOT_PROFILES: BotProfile[] = [
  {
    name: "Fair",
    values: { iron: 3, crystal: 2, gold: 4 },
    accept: (pg, bg) => bg > 0 && pg > 0,
  },
  {
    name: "Greedy",
    values: { iron: 5, crystal: 1, gold: 3 },
    accept: (pg, bg) => bg >= pg * 2,
  },
  {
    name: "Generous",
    values: { iron: 2, crystal: 4, gold: 2 },
    accept: (_pg, bg) => bg > 0,
  },
  {
    name: "Mirror",
    values: { iron: 1, crystal: 3, gold: 5 },
    accept: (pg, bg) => bg > pg,
  },
];

function calcValue(resources: Resources, values: Resources): number {
  return (
    resources.iron * values.iron +
    resources.crystal * values.crystal +
    resources.gold * values.gold
  );
}

function computeTheoreticalMax(
  playerStart: Resources,
  botStart: Resources,
  playerValues: Resources,
  botProfile: BotProfile
): number {
  const allIron = playerStart.iron + botStart.iron;
  const allCrystal = playerStart.crystal + botStart.crystal;
  const allGold = playerStart.gold + botStart.gold;

  let maxValue = calcValue(playerStart, playerValues);

  for (let pi = 0; pi <= allIron; pi++) {
    for (let pc = 0; pc <= allCrystal; pc++) {
      for (let pg = 0; pg <= allGold; pg++) {
        const playerEnd = { iron: pi, crystal: pc, gold: pg };
        const botEnd = {
          iron: allIron - pi,
          crystal: allCrystal - pc,
          gold: allGold - pg,
        };

        const botStartValue = calcValue(botStart, botProfile.values);
        const botEndValue = calcValue(botEnd, botProfile.values);
        const botGain = botEndValue - botStartValue;

        if (botGain >= 0) {
          const pv = calcValue(playerEnd, playerValues);
          if (pv > maxValue) {
            maxValue = pv;
          }
        }
      }
    }
  }

  return maxValue;
}

type TradeHistory = {
  give: Resources;
  want: Resources;
  accepted: boolean;
};

type EstimatedBotType = "unknown" | "fair" | "greedy" | "generous";

// --- Adaptive trading agent ---
// Start by proposing small trades to probe the bot's strategy
// Track whether bot accepts/rejects to infer its type
// Once bot type is estimated, optimize trades accordingly
function agentProposeTrade(
  playerResources: Resources,
  botResources: Resources,
  history: TradeHistory[],
  estimatedType: EstimatedBotType
): { give: Resources; want: Resources } {
  // Probe phase: first 2 rounds, try small trades to learn
  if (history.length < 2) {
    if (history.length === 0) {
      // First trade: offer 1 iron for 1 crystal (tests if bot will accept equal-ish trades)
      return {
        give: { iron: Math.min(1, playerResources.iron), crystal: 0, gold: 0 },
        want: { iron: 0, crystal: Math.min(1, botResources.crystal), gold: 0 },
      };
    } else {
      // Second trade: offer something more generous to test
      return {
        give: { iron: Math.min(2, playerResources.iron), crystal: 0, gold: 0 },
        want: { iron: 0, crystal: Math.min(1, botResources.crystal), gold: 0 },
      };
    }
  }

  // Based on estimated type, craft optimal trade
  switch (estimatedType) {
    case "generous":
      // Ask for more aggressive trades - try to get gold
      if (botResources.gold > 0 && playerResources.iron > 0) {
        return {
          give: { iron: Math.min(2, playerResources.iron), crystal: 0, gold: 0 },
          want: { iron: 0, crystal: 0, gold: Math.min(1, botResources.gold) },
        };
      }
      if (botResources.crystal > 0 && playerResources.iron > 0) {
        return {
          give: { iron: Math.min(1, playerResources.iron), crystal: 0, gold: 0 },
          want: { iron: 0, crystal: Math.min(2, botResources.crystal), gold: 0 },
        };
      }
      break;

    case "greedy":
      // Offer small concessions - give more than we get
      if (playerResources.iron >= 2 && botResources.crystal > 0) {
        return {
          give: { iron: 2, crystal: 0, gold: 0 },
          want: { iron: 0, crystal: Math.min(1, botResources.crystal), gold: 0 },
        };
      }
      if (playerResources.iron >= 3 && botResources.gold > 0) {
        return {
          give: { iron: 3, crystal: 0, gold: 0 },
          want: { iron: 0, crystal: 0, gold: Math.min(1, botResources.gold) },
        };
      }
      break;

    case "fair":
      // Propose mutually beneficial trades
      if (playerResources.iron >= 2 && botResources.crystal > 0) {
        return {
          give: { iron: Math.min(2, playerResources.iron), crystal: 0, gold: 0 },
          want: { iron: 0, crystal: Math.min(1, botResources.crystal), gold: 0 },
        };
      }
      if (playerResources.iron >= 1 && botResources.gold > 0) {
        return {
          give: { iron: Math.min(1, playerResources.iron), crystal: Math.min(1, playerResources.crystal), gold: 0 },
          want: { iron: 0, crystal: 0, gold: Math.min(1, botResources.gold) },
        };
      }
      break;

    default:
      // Unknown - try a moderate trade
      if (playerResources.iron > 0 && botResources.crystal > 0) {
        return {
          give: { iron: Math.min(1, playerResources.iron), crystal: 0, gold: 0 },
          want: { iron: 0, crystal: Math.min(1, botResources.crystal), gold: 0 },
        };
      }
  }

  // Fallback: any trade that makes sense
  if (playerResources.iron > 0 && botResources.crystal > 0) {
    return {
      give: { iron: 1, crystal: 0, gold: 0 },
      want: { iron: 0, crystal: 1, gold: 0 },
    };
  }
  if (playerResources.crystal > 0 && botResources.gold > 0) {
    return {
      give: { iron: 0, crystal: 1, gold: 0 },
      want: { iron: 0, crystal: 0, gold: 1 },
    };
  }

  // Last resort
  return {
    give: { iron: 0, crystal: 0, gold: 0 },
    want: { iron: 0, crystal: 0, gold: 0 },
  };
}

function inferBotType(history: TradeHistory[]): EstimatedBotType {
  if (history.length < 2) return "unknown";

  const acceptCount = history.filter((h) => h.accepted).length;

  // If both probe trades accepted, likely generous or fair
  if (acceptCount === 2) {
    // Check if the second (more generous from us) was accepted
    // Generous bots accept anything that benefits them
    return "generous";
  }

  // If only first accepted, likely fair
  if (acceptCount === 1 && history[0].accepted) {
    return "fair";
  }

  // If none accepted, likely greedy
  if (acceptCount === 0) {
    return "greedy";
  }

  // Mixed results - assume fair
  return "fair";
}

export default function NegotiationPage() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [round, setRound] = useState(1);
  const [playerResources, setPlayerResources] = useState<Resources>({
    iron: 5,
    crystal: 3,
    gold: 2,
  });
  const [botResources, setBotResources] = useState<Resources>({
    iron: 2,
    crystal: 5,
    gold: 4,
  });
  const [tradeGive, setTradeGive] = useState<Resources>({
    iron: 0,
    crystal: 0,
    gold: 0,
  });
  const [tradeWant, setTradeWant] = useState<Resources>({
    iron: 0,
    crystal: 0,
    gold: 0,
  });
  const [botProfile, setBotProfile] = useState<BotProfile>(BOT_PROFILES[0]);
  const [lastResponse, setLastResponse] = useState<"accepted" | "rejected" | null>(null);
  const [history, setHistory] = useState<TradeHistory[]>([]);
  const [agentMode, setAgentMode] = useState(false);
  const [estimatedBotType, setEstimatedBotType] = useState<EstimatedBotType>("unknown");
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
        window.location.href = getNextDemoPath("negotiation");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [demoMode, phase]);

  // Agent auto-play
  useEffect(() => {
    if (!agentMode || phase !== "playing") return;
    if (round > 5) return;

    agentTimerRef.current = setTimeout(() => {
      // Update bot type estimate
      const newEstimate = inferBotType(history);
      setEstimatedBotType(newEstimate);

      // Get agent's proposed trade
      const proposal = agentProposeTrade(playerResources, botResources, history, newEstimate);
      setTradeGive(proposal.give);
      setTradeWant(proposal.want);

      // Brief pause to show selection, then submit
      setTimeout(() => {
        // Execute the trade (similar to handleSubmitTrade)
        const giveValue = calcValue(proposal.give, PLAYER_VALUES);
        const wantValue = calcValue(proposal.want, PLAYER_VALUES);
        const playerGain = wantValue - giveValue;

        const botGiveValue = calcValue(proposal.want, botProfile.values);
        const botWantValue = calcValue(proposal.give, botProfile.values);
        const botGain = botWantValue - botGiveValue;

        const accepted = botProfile.accept(playerGain, botGain);

        if (accepted) {
          setPlayerResources((prev) => ({
            iron: prev.iron - proposal.give.iron + proposal.want.iron,
            crystal: prev.crystal - proposal.give.crystal + proposal.want.crystal,
            gold: prev.gold - proposal.give.gold + proposal.want.gold,
          }));
          setBotResources((prev) => ({
            iron: prev.iron + proposal.give.iron - proposal.want.iron,
            crystal: prev.crystal + proposal.give.crystal - proposal.want.crystal,
            gold: prev.gold + proposal.give.gold - proposal.want.gold,
          }));
        }

        setHistory((prev) => [
          ...prev,
          { give: { ...proposal.give }, want: { ...proposal.want }, accepted },
        ]);
        setLastResponse(accepted ? "accepted" : "rejected");
        setTradeGive({ iron: 0, crystal: 0, gold: 0 });
        setTradeWant({ iron: 0, crystal: 0, gold: 0 });

        if (round >= 5) {
          const finalResources = accepted
            ? {
                iron: playerResources.iron - proposal.give.iron + proposal.want.iron,
                crystal: playerResources.crystal - proposal.give.crystal + proposal.want.crystal,
                gold: playerResources.gold - proposal.give.gold + proposal.want.gold,
              }
            : playerResources;
          const finalValue = calcValue(finalResources, PLAYER_VALUES);
          const theoreticalMax = computeTheoreticalMax(
            { iron: 5, crystal: 3, gold: 2 },
            { iron: 2, crystal: 5, gold: 4 },
            PLAYER_VALUES,
            botProfile
          );
          const efficiency = Math.round((finalValue / theoreticalMax) * 100);
          saveScore("negotiation", efficiency);
          setTimeout(() => setPhase("reveal"), 500);
        } else {
          setRound((r) => r + 1);
        }
      }, 200);
    }, 400);

    return () => {
      if (agentTimerRef.current) clearTimeout(agentTimerRef.current);
    };
  }, [agentMode, phase, round, playerResources, botResources, history, botProfile, estimatedBotType]);

  const handleBegin = useCallback((withAgent: boolean = false) => {
    const profile = BOT_PROFILES[Math.floor(Math.random() * BOT_PROFILES.length)];
    setBotProfile(profile);
    setPlayerResources({ iron: 5, crystal: 3, gold: 2 });
    setBotResources({ iron: 2, crystal: 5, gold: 4 });
    setTradeGive({ iron: 0, crystal: 0, gold: 0 });
    setTradeWant({ iron: 0, crystal: 0, gold: 0 });
    setRound(1);
    setLastResponse(null);
    setHistory([]);
    setAgentMode(withAgent);
    setEstimatedBotType("unknown");
    setPhase("playing");
  }, []);

  const adjustGive = (resource: keyof Resources, delta: number) => {
    if (agentMode) return;
    setTradeGive((prev) => ({
      ...prev,
      [resource]: Math.max(0, Math.min(playerResources[resource], prev[resource] + delta)),
    }));
  };

  const adjustWant = (resource: keyof Resources, delta: number) => {
    if (agentMode) return;
    setTradeWant((prev) => ({
      ...prev,
      [resource]: Math.max(0, Math.min(botResources[resource], prev[resource] + delta)),
    }));
  };

  const handleSubmitTrade = useCallback(() => {
    if (agentMode) return;

    const giveValue = calcValue(tradeGive, PLAYER_VALUES);
    const wantValue = calcValue(tradeWant, PLAYER_VALUES);
    const playerGain = wantValue - giveValue;

    const botGiveValue = calcValue(tradeWant, botProfile.values);
    const botWantValue = calcValue(tradeGive, botProfile.values);
    const botGain = botWantValue - botGiveValue;

    const accepted = botProfile.accept(playerGain, botGain);

    if (accepted) {
      setPlayerResources((prev) => ({
        iron: prev.iron - tradeGive.iron + tradeWant.iron,
        crystal: prev.crystal - tradeGive.crystal + tradeWant.crystal,
        gold: prev.gold - tradeGive.gold + tradeWant.gold,
      }));
      setBotResources((prev) => ({
        iron: prev.iron + tradeGive.iron - tradeWant.iron,
        crystal: prev.crystal + tradeGive.crystal - tradeWant.crystal,
        gold: prev.gold + tradeGive.gold - tradeWant.gold,
      }));
    }

    setHistory((prev) => [
      ...prev,
      { give: { ...tradeGive }, want: { ...tradeWant }, accepted },
    ]);
    setLastResponse(accepted ? "accepted" : "rejected");
    setTradeGive({ iron: 0, crystal: 0, gold: 0 });
    setTradeWant({ iron: 0, crystal: 0, gold: 0 });

    if (round >= 5) {
      const finalValue = calcValue(
        {
          iron: playerResources.iron - (accepted ? tradeGive.iron - tradeWant.iron : 0),
          crystal: playerResources.crystal - (accepted ? tradeGive.crystal - tradeWant.crystal : 0),
          gold: playerResources.gold - (accepted ? tradeGive.gold - tradeWant.gold : 0),
        },
        PLAYER_VALUES
      );
      const theoreticalMax = computeTheoreticalMax(
        { iron: 5, crystal: 3, gold: 2 },
        { iron: 2, crystal: 5, gold: 4 },
        PLAYER_VALUES,
        botProfile
      );
      const efficiency = Math.round((finalValue / theoreticalMax) * 100);
      saveScore("negotiation", efficiency);
      setTimeout(() => setPhase("reveal"), 500);
    } else {
      setRound((r) => r + 1);
    }
  }, [agentMode, tradeGive, tradeWant, botProfile, round, playerResources]);

  const playerValue = calcValue(playerResources, PLAYER_VALUES);
  const theoreticalMax = useMemo(
    () =>
      computeTheoreticalMax(
        { iron: 5, crystal: 3, gold: 2 },
        { iron: 2, crystal: 5, gold: 4 },
        PLAYER_VALUES,
        botProfile
      ),
    [botProfile]
  );
  const efficiency = Math.round((playerValue / theoreticalMax) * 100);

  if (phase === "intro") {
    return (
      <Shell env="The Negotiation">
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
            Trade resources with a bot over 5 rounds. You know your own values
            (Iron=1, Crystal=3, Gold=5), but the bot&apos;s values and strategy are
            hidden. Propose trades to maximize your total value. The bot will
            accept or reject based on its hidden preferences.
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
      <Shell env="The Negotiation">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "12px",
            marginBottom: "16px",
          }}
        >
          <MetricCard label="Final Value" value={`${playerValue}`} />
          <MetricCard label="Efficiency" value={`${efficiency}%`} />
          <MetricCard label="Accepted" value={`${history.filter((h) => h.accepted).length}/5`} />
        </div>

        <div style={{ fontSize: "13px", color: C.textSecondary, marginBottom: "16px" }}>
          Bot was <span style={{ fontWeight: 500, color: C.textPrimary }}>{botProfile.name}</span> — {botProfile.name === "Fair" ? "accepts when both gain" : botProfile.name === "Greedy" ? "needs 2x your gain" : botProfile.name === "Generous" ? "accepts any gain" : "needs more than you"}. Values: I={botProfile.values.iron}, C={botProfile.values.crystal}, G={botProfile.values.gold}.
        </div>

        <LessonCard term="In the real world">
          Every business deal involves counterparties with hidden preferences. Procurement agents negotiate supplier contracts. Sales agents adapt pricing strategies. An autonomous agent that models other agents can close deals that generate real revenue.
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

  const ResourceRow = ({
    label,
    player,
    bot,
    give,
    want,
    onAdjustGive,
    onAdjustWant,
  }: {
    label: string;
    player: number;
    bot: number;
    give: number;
    want: number;
    onAdjustGive: (delta: number) => void;
    onAdjustWant: (delta: number) => void;
  }) => (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "80px 1fr 1fr",
        gap: "12px",
        alignItems: "center",
        padding: "12px 0",
        borderBottom: `1px solid ${C.border}`,
      }}
    >
      <div style={{ fontSize: "14px", fontWeight: 500, color: C.textPrimary }}>
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ fontSize: "14px", color: C.textSecondary, width: "20px" }}>
          {player}
        </span>
        <div style={{ display: "flex", gap: "4px" }}>
          <button
            onClick={() => onAdjustGive(-1)}
            disabled={give <= 0 || agentMode}
            style={{
              width: "28px",
              height: "28px",
              border: `1px solid ${C.border}`,
              borderRadius: "16px",
              background: C.surface,
              cursor: give <= 0 || agentMode ? "default" : "pointer",
              opacity: give <= 0 || agentMode ? 0.4 : 1,
              fontFamily: "inherit",
              fontSize: "16px",
              color: C.textSecondary,
            }}
          >
            -
          </button>
          <div
            style={{
              width: "32px",
              textAlign: "center",
              fontSize: "14px",
              fontWeight: 500,
              color: give > 0 ? C.accent : C.textTertiary,
            }}
          >
            {give}
          </div>
          <button
            onClick={() => onAdjustGive(1)}
            disabled={give >= player || agentMode}
            style={{
              width: "28px",
              height: "28px",
              border: `1px solid ${C.border}`,
              borderRadius: "16px",
              background: C.surface,
              cursor: give >= player || agentMode ? "default" : "pointer",
              opacity: give >= player || agentMode ? 0.4 : 1,
              fontFamily: "inherit",
              fontSize: "16px",
              color: C.textSecondary,
            }}
          >
            +
          </button>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ fontSize: "14px", color: C.textSecondary, width: "20px" }}>
          {bot}
        </span>
        <div style={{ display: "flex", gap: "4px" }}>
          <button
            onClick={() => onAdjustWant(-1)}
            disabled={want <= 0 || agentMode}
            style={{
              width: "28px",
              height: "28px",
              border: `1px solid ${C.border}`,
              borderRadius: "16px",
              background: C.surface,
              cursor: want <= 0 || agentMode ? "default" : "pointer",
              opacity: want <= 0 || agentMode ? 0.4 : 1,
              fontFamily: "inherit",
              fontSize: "16px",
              color: C.textSecondary,
            }}
          >
            -
          </button>
          <div
            style={{
              width: "32px",
              textAlign: "center",
              fontSize: "14px",
              fontWeight: 500,
              color: want > 0 ? "#2E7D32" : C.textTertiary,
            }}
          >
            {want}
          </div>
          <button
            onClick={() => onAdjustWant(1)}
            disabled={want >= bot || agentMode}
            style={{
              width: "28px",
              height: "28px",
              border: `1px solid ${C.border}`,
              borderRadius: "16px",
              background: C.surface,
              cursor: want >= bot || agentMode ? "default" : "pointer",
              opacity: want >= bot || agentMode ? 0.4 : 1,
              fontFamily: "inherit",
              fontSize: "16px",
              color: C.textSecondary,
            }}
          >
            +
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <Shell env="The Negotiation">
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
          Round {round} / 5
        </div>
        <div style={{ fontSize: "13px", color: C.textSecondary }}>
          Your value: {playerValue}
        </div>
      </div>

      {lastResponse && (
        <div
          style={{
            ...card,
            padding: "16px 20px",
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            background: lastResponse === "accepted" ? "#E8F5E9" : "#FFEBEE",
            borderColor: lastResponse === "accepted" ? "#A5D6A7" : "#EF9A9A",
          }}
        >
          {lastResponse === "accepted" ? (
            <Check size={18} strokeWidth={2} color="#2E7D32" />
          ) : (
            <X size={18} strokeWidth={2} color="#C62828" />
          )}
          <span
            style={{
              fontSize: "14px",
              color: lastResponse === "accepted" ? "#2E7D32" : "#C62828",
            }}
          >
            Trade {lastResponse}
          </span>
        </div>
      )}

      <div style={{ ...card, padding: "20px 24px", marginBottom: "24px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "80px 1fr 1fr",
            gap: "12px",
            marginBottom: "8px",
          }}
        >
          <div />
          <div
            style={{
              fontSize: "11px",
              fontWeight: 500,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: C.textTertiary,
            }}
          >
            You give
          </div>
          <div
            style={{
              fontSize: "11px",
              fontWeight: 500,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: C.textTertiary,
            }}
          >
            You want
          </div>
        </div>

        <ResourceRow
          label="Iron"
          player={playerResources.iron}
          bot={botResources.iron}
          give={tradeGive.iron}
          want={tradeWant.iron}
          onAdjustGive={(d) => adjustGive("iron", d)}
          onAdjustWant={(d) => adjustWant("iron", d)}
        />
        <ResourceRow
          label="Crystal"
          player={playerResources.crystal}
          bot={botResources.crystal}
          give={tradeGive.crystal}
          want={tradeWant.crystal}
          onAdjustGive={(d) => adjustGive("crystal", d)}
          onAdjustWant={(d) => adjustWant("crystal", d)}
        />
        <ResourceRow
          label="Gold"
          player={playerResources.gold}
          bot={botResources.gold}
          give={tradeGive.gold}
          want={tradeWant.gold}
          onAdjustGive={(d) => adjustGive("gold", d)}
          onAdjustWant={(d) => adjustWant("gold", d)}
        />
      </div>

      <div style={{ ...card, padding: "16px 20px", marginBottom: "24px" }}>
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
          Your Values
        </div>
        <div style={{ fontSize: "13px", color: C.textSecondary }}>
          Iron = 1, Crystal = 3, Gold = 5
        </div>
      </div>

      {!agentMode && (
        <button
          style={{
            ...buttonStyle,
            width: "100%",
            justifyContent: "center",
            opacity:
              tradeGive.iron + tradeGive.crystal + tradeGive.gold === 0 &&
              tradeWant.iron + tradeWant.crystal + tradeWant.gold === 0
                ? 0.5
                : 1,
          }}
          onClick={handleSubmitTrade}
          disabled={
            tradeGive.iron + tradeGive.crystal + tradeGive.gold === 0 &&
            tradeWant.iron + tradeWant.crystal + tradeWant.gold === 0
          }
        >
          Submit Trade
          <ArrowRight size={16} strokeWidth={2} />
        </button>
      )}

      {agentMode && (
        <div
          style={{
            textAlign: "center",
            fontSize: "12px",
            color: C.textTertiary,
            marginBottom: "24px",
          }}
        >
          Adaptive trading agent
        </div>
      )}

      {history.length > 0 && (
        <div style={{ ...card, padding: "16px 20px", marginTop: "24px" }}>
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
            Trade History
          </div>
          {history.map((h, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: "13px",
                color: C.textSecondary,
                padding: "8px 0",
                borderBottom: i < history.length - 1 ? `1px solid ${C.border}` : "none",
              }}
            >
              <span>
                Gave: {h.give.iron}I, {h.give.crystal}C, {h.give.gold}G | Wanted:{" "}
                {h.want.iron}I, {h.want.crystal}C, {h.want.gold}G
              </span>
              {h.accepted ? (
                <Check size={16} strokeWidth={2} color="#2E7D32" />
              ) : (
                <X size={16} strokeWidth={2} color="#C62828" />
              )}
            </div>
          ))}
        </div>
      )}
    </Shell>
  );
}
