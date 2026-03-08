// --- Palette ---

export const C = {
  bg: "#0E0E10",
  surface: "#1C1C1F",
  border: "#2A2A2E",
  borderActive: "#3A3A3E",
  textPrimary: "#E8E8E3",
  textSecondary: "#9A9A96",
  textTertiary: "#5A5A58",
  accent: "#E05A00",
} as const;

// --- Shared styles ---

export const card: React.CSSProperties = {
  background: C.surface,
  border: `1px solid ${C.border}`,
  borderRadius: "16px",
};

export const metaLabel: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: 500,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: C.textTertiary,
};

export const buttonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  height: "44px",
  padding: "0 24px",
  background: C.accent,
  color: "#FFFFFF",
  border: "none",
  borderRadius: "16px",
  fontSize: "13px",
  fontWeight: 500,
  fontFamily: "inherit",
  letterSpacing: "0.01em",
  cursor: "pointer",
};

export const ghostButton: React.CSSProperties = {
  ...buttonStyle,
  background: "transparent",
  color: C.textSecondary,
  border: `1px solid ${C.border}`,
};

// --- Score management ---

export type EnvScore = {
  best: number;
  attempts: number;
};

const STORAGE_KEY = "agent-training-scores";

export function getScores(): Record<string, EnvScore> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveScore(envId: string, efficiency: number): void {
  if (typeof window === "undefined") return;
  const scores = getScores();
  const existing = scores[envId];
  scores[envId] = {
    best: Math.max(efficiency, existing?.best ?? 0),
    attempts: (existing?.attempts ?? 0) + 1,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
}

export function getBestScore(envId: string): number | null {
  const scores = getScores();
  return scores[envId]?.best ?? null;
}

export function getAttempts(envId: string): number {
  const scores = getScores();
  return scores[envId]?.attempts ?? 0;
}

export function clearScores(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

// --- Environment definitions ---

export type EnvDef = {
  id: string;
  name: string;
  capability: string;
  path: string;
  station?: string; // legacy, kept for compatibility
  useCases: [string, string, string];
};

export type EnvGroup = {
  label: string;
  envs: EnvDef[];
};

export const ENV_GROUPS: EnvGroup[] = [
  {
    label: "Foundation",
    envs: [
      { id: "bandit", name: "Explore vs Exploit", capability: "When to try new things vs stick with what works", path: "/bandit", useCases: ["A/B test optimization at scale", "Ad spend across channels", "Product recommendation tuning"] },
      { id: "sequence", name: "Pattern Match", capability: "Find the rule in the data", path: "/sequence", useCases: ["Sales demand forecasting", "Price trend prediction", "Inventory restocking signals"] },
      { id: "map", name: "Navigate Blind", capability: "Plan a path when you can't see the whole map", path: "/map-nav", useCases: ["Supply chain routing", "Delivery path optimization", "Market entry navigation"] },
      { id: "auction", name: "Spend Smart", capability: "Buy the right things with a limited budget", path: "/auction", useCases: ["Ad bidding budget allocation", "Procurement under constraints", "Portfolio investment sizing"] },
    ],
  },
  {
    label: "Reasoning",
    envs: [
      { id: "tower", name: "Order of Ops", capability: "Figure out what has to happen first", path: "/tower", useCases: ["Product launch coordination", "CI/CD pipeline ordering", "Campaign task sequencing"] },
      { id: "signal", name: "Spot the Spike", capability: "Find real signals hidden in noise", path: "/signal", useCases: ["Fraud transaction detection", "Analytics anomaly alerts", "Real vs bot traffic filtering"] },
      { id: "negotiation", name: "Read the Room", capability: "Figure out what the other side wants", path: "/negotiation", useCases: ["Vendor contract negotiation", "Dynamic pricing strategy", "Customer retention offers"] },
      { id: "repair", name: "Find the Break", capability: "Diagnose which part of the system failed", path: "/repair", useCases: ["Conversion funnel debugging", "Revenue drop diagnosis", "System outage triage"] },
    ],
  },
  {
    label: "Mastery",
    envs: [
      { id: "transfer", name: "Apply What Works", capability: "Use a solution from one domain in another", path: "/transfer", useCases: ["New market expansion", "Cross-vertical strategy reuse", "Product line extension"] },
      { id: "meta", name: "Know Your Limits", capability: "Know when you're confident and when you're guessing", path: "/metacognition", useCases: ["Risk-adjusted decision making", "When to escalate to humans", "Model confidence scoring"] },
    ],
  },
];

export const ENVIRONMENTS: EnvDef[] = ENV_GROUPS.flatMap((g) => g.envs);

// --- Demo mode helpers ---

export function isDemoMode(): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  return params.get("demo") === "true";
}

export function isAgentEmbed(): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  return params.get("embed") === "true" && params.get("agent") === "true";
}

export function getNextDemoPath(currentEnvId: string): string {
  const idx = ENVIRONMENTS.findIndex((e) => e.id === currentEnvId);
  if (idx === -1 || idx >= ENVIRONMENTS.length - 1) return "/";
  return `${ENVIRONMENTS[idx + 1].path}?demo=true`;
}
