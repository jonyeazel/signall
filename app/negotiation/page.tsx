"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Shell, MetricCard, LessonCard, MiniChart } from "../shell";
import { C, card, buttonStyle, saveScore } from "../shared";
import { Check, X, ArrowRight } from "lucide-react";

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
function agentProposeTrade(
  playerResources: Resources,
  botResources: Resources,
  history: TradeHistory[],
  estimatedType: EstimatedBotType
): { give: Resources; want: Resources } {
  if (history.length < 2) {
    if (history.length === 0) {
      return {
        give: { iron: Math.min(1, playerResources.iron), crystal: 0, gold: 0 },
        want: { iron: 0, crystal: Math.min(1, botResources.crystal), gold: 0 },
      };
    } else {
      return {
        give: { iron: Math.min(2, playerResources.iron), crystal: 0, gold: 0 },
        want: { iron: 0, crystal: Math.min(1, botResources.crystal), gold: 0 },
      };
    }
  }

  switch (estimatedType) {
    case "generous":
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
      if (playerResources.iron > 0 && botResources.crystal > 0) {
        return {
          give: { iron: Math.min(1, playerResources.iron), crystal: 0, gold: 0 },
          want: { iron: 0, crystal: Math.min(1, botResources.crystal), gold: 0 },
        };
      }
  }

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

  return {
    give: { iron: 0, crystal: 0, gold: 0 },
    want: { iron: 0, crystal: 0, gold: 0 },
  };
}

function inferBotType(history: TradeHistory[]): EstimatedBotType {
  if (history.length < 2) return "unknown";

  const acceptCount = history.filter((h) => h.accepted).length;

  if (acceptCount === 2) {
    return "generous";
  }

  if (acceptCount === 1 && history[0].accepted) {
    return "fair";
  }

  if (acceptCount === 0) {
    return "greedy";
  }

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
  const [chartData, setChartData] = useState<number[]>([]);
  const agentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-start agent mode on mount
  useEffect(() => {
    if (phase === "intro") {
      handleBegin(true);
    }
  }, [phase]);

  useEffect(() => {
    if (!agentMode || phase !== "playing") return;
    if (round > 5) return;

    agentTimerRef.current = setTimeout(() => {
      const newEstimate = inferBotType(history);
      setEstimatedBotType(newEstimate);

      const proposal = agentProposeTrade(playerResources, botResources, history, newEstimate);
      setTradeGive(proposal.give);
      setTradeWant(proposal.want);

      setTimeout(() => {
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

        const currentResources = accepted
          ? { iron: playerResources.iron - proposal.give.iron + proposal.want.iron, crystal: playerResources.crystal - proposal.give.crystal + proposal.want.crystal, gold: playerResources.gold - proposal.give.gold + proposal.want.gold }
          : playerResources;
        setChartData(prev => [...prev, calcValue(currentResources, PLAYER_VALUES)]);

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
          if (window.parent !== window) {
            window.parent.postMessage({ type: "episodeComplete", envId: "negotiation", efficiency }, "*");
          }
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
      if (window.parent !== window) {
        window.parent.postMessage({ type: "episodeComplete", envId: "negotiation", efficiency }, "*");
      }
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
              color: want > 0 ? "#22A55B" : C.textTertiary,
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

  const isPlaying = phase === "playing";
  const isReveal = phase === "reveal";

  return (
    <Shell env="negotiation">
      {/* HEADER BAR - Fixed height, always present */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          height: "24px",
          marginBottom: "24px",
        }}
      >
        {/* Left side: agent indicator + round or phase info */}
        <div style={{ fontSize: "13px", color: C.textSecondary, display: "flex", alignItems: "center", gap: "8px" }}>
          {/* Agent indicator - always rendered, visibility via opacity */}
          <span style={{ color: C.accent, opacity: agentMode && isPlaying ? 1 : 0 }}>Agent</span>
          {/* Round / phase info */}
          <span>
            {isPlaying ? `Round ${round} / 5` : `Complete`}
          </span>
        </div>
        {/* Right side: value display */}
        <div style={{ fontSize: "13px", color: C.textSecondary }}>
          Your value: {playerValue}
        </div>
      </div>

      {/* MAIN CONTENT AREA - Fixed structure, content swaps inside */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

        {/* PLAYING CONTENT */}
        <div style={{ display: isPlaying ? "block" : "none" }}>
          {/* Feedback banner - fixed height container, content fades in/out */}
          <div
            style={{
              height: "56px",
              marginBottom: "16px",
              display: "flex",
              alignItems: "center",
            }}
          >
            <div
              style={{
                ...card,
                padding: "16px 20px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                width: "100%",
                opacity: lastResponse ? 1 : 0,
                background: lastResponse === "accepted" ? "rgba(74, 222, 128, 0.1)" : "rgba(224, 90, 0, 0.1)",
                borderColor: lastResponse === "accepted" ? "#2A5A3A" : "#5A3A2A",
                transition: "opacity 150ms ease-out",
              }}
            >
              {lastResponse === "accepted" ? (
                <Check size={18} strokeWidth={2} color="#22A55B" />
              ) : (
                <X size={18} strokeWidth={2} color={C.accent} />
              )}
              <span
                style={{
                  fontSize: "14px",
                  color: lastResponse === "accepted" ? "#22A55B" : C.accent,
                }}
              >
                Trade {lastResponse || "pending"}
              </span>
            </div>
          </div>

          {/* Trade form */}
          <div style={{ ...card, padding: "20px 24px", marginBottom: "16px" }}>
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

          {/* Values reference */}
          <div style={{ ...card, padding: "16px 20px", marginBottom: "16px" }}>
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

          {/* Submit button / Agent status - fixed height container */}
          <div style={{ height: "44px", marginBottom: "16px" }}>
            {/* Player submit button - shown when not agent mode */}
            <button
              style={{
                ...buttonStyle,
                width: "100%",
                justifyContent: "center",
                display: agentMode ? "none" : "inline-flex",
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
            {/* Agent status - shown when agent mode */}
            <div
              style={{
                display: agentMode ? "flex" : "none",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                fontSize: "12px",
                color: C.textTertiary,
              }}
            >
              Adaptive trading agent
            </div>
          </div>

          {/* Trade history - FIXED HEIGHT scrollable container */}
          <div style={{ ...card, padding: "16px 20px", height: "140px", display: "flex", flexDirection: "column" }}>
            <div
              style={{
                fontSize: "11px",
                fontWeight: 500,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: C.textTertiary,
                marginBottom: "12px",
                flexShrink: 0,
              }}
            >
              Trade History
            </div>
            <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
              {history.length === 0 ? (
                <div style={{ fontSize: "13px", color: C.textTertiary }}>No trades yet</div>
              ) : (
                history.map((h, i) => (
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
                      <Check size={16} strokeWidth={2} color="#22A55B" />
                    ) : (
                      <X size={16} strokeWidth={2} color={C.accent} />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {isPlaying && <MiniChart data={chartData} totalSteps={5} yMin={0} />}

        {/* REVEAL CONTENT */}
        <div style={{ display: isReveal ? "block" : "none" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "12px",
              marginBottom: "16px",
            }}
          >
            <MetricCard label="Final Value" value={`${playerValue}`} subtitle="Total resource value accumulated" />
            <MetricCard label="Efficiency" value={`${efficiency}%`} subtitle="Value captured vs theoretical max" />
            <MetricCard label="Accepted" value={`${history.filter((h) => h.accepted).length}/5`} subtitle="Trades the counterpart agreed to" />
          </div>

          <div style={{ fontSize: "13px", color: C.textSecondary, marginBottom: "16px" }}>
            Bot was <span style={{ fontWeight: 500, color: C.textPrimary }}>{botProfile.name}</span> — {botProfile.name === "Fair" ? "accepts when both gain" : botProfile.name === "Greedy" ? "needs 2x your gain" : botProfile.name === "Generous" ? "accepts any gain" : "needs more than you"}. Values: I={botProfile.values.iron}, C={botProfile.values.crystal}, G={botProfile.values.gold}.
            <span style={{ display: "block", fontSize: "12px", color: C.textTertiary, marginTop: "6px" }}>The agent had to figure out the counterpart&apos;s hidden strategy.</span>
          </div>

          <LessonCard term="What this teaches">
            <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "13px", lineHeight: 1.8 }}>
              <li>Read what the other side values</li>
              <li>Every deal has hidden preferences</li>
              <li>Adapt strategy based on responses</li>
            </ul>
          </LessonCard>
        </div>
      </div>
    </Shell>
  );
}
