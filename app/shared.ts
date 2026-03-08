// --- Palette ---

export const C = {
  bg: "#F5F3EF",
  surface: "#FFFFFF",
  border: "#E4E0DA",
  borderActive: "#C8C4BC",
  textPrimary: "#191919",
  textSecondary: "#6B6B68",
  textTertiary: "#9B9B98",
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
  domains: string[];
};

export type EnvGroup = {
  label: string;
  envs: EnvDef[];
};

export const ENV_GROUPS: EnvGroup[] = [
  {
    label: "Foundation",
    envs: [
      { id: "bandit", name: "Explore vs Exploit", capability: "Try new things or stick with what works?", path: "/bandit", useCases: ["A/B testing at scale", "Ad spend across channels", "Product recommendations"], domains: ["Decisions", "Probability", "Pricing"] },
      { id: "sequence", name: "Pattern Match", capability: "Spot the pattern. Predict what comes next.", path: "/sequence", useCases: ["Demand forecasting", "Price trends", "Restocking signals"], domains: ["Data analysis", "Forecasting", "Statistics"] },
      { id: "map", name: "Navigate Blind", capability: "Find a path when you can't see the whole map.", path: "/map-nav", useCases: ["Supply chain routing", "Delivery optimization", "Market entry"], domains: ["Planning", "Logistics", "Systems thinking"] },
      { id: "auction", name: "Spend Smart", capability: "Get the most value out of a limited budget.", path: "/auction", useCases: ["Ad bidding", "Procurement", "Portfolio sizing"], domains: ["Economics", "Optimization", "Budgeting"] },
    ],
  },
  {
    label: "Reasoning",
    envs: [
      { id: "tower", name: "Order of Ops", capability: "Figure out what needs to happen first.", path: "/tower", useCases: ["Launch coordination", "Pipeline ordering", "Task sequencing"], domains: ["Project management", "Sequencing", "Operations"] },
      { id: "signal", name: "Spot the Spike", capability: "Find the real signal hiding in the noise.", path: "/signal", useCases: ["Fraud detection", "Anomaly alerts", "Bot filtering"], domains: ["Anomaly detection", "Security", "Quality"] },
      { id: "negotiation", name: "Read the Room", capability: "Figure out what the other side really wants.", path: "/negotiation", useCases: ["Contract negotiation", "Dynamic pricing", "Retention offers"], domains: ["Game theory", "Psychology", "Persuasion"] },
      { id: "repair", name: "Find the Break", capability: "Figure out what broke and why.", path: "/repair", useCases: ["Funnel debugging", "Revenue diagnosis", "Outage triage"], domains: ["Root cause analysis", "Debugging", "Diagnostics"] },
    ],
  },
  {
    label: "Mastery",
    envs: [
      { id: "transfer", name: "Apply What Works", capability: "Use what worked before in a new situation.", path: "/transfer", useCases: ["New market entry", "Cross-industry reuse", "Product expansion"], domains: ["Pattern transfer", "Strategy", "Adaptation"] },
      { id: "meta", name: "Know Your Limits", capability: "Know when to be confident and when to ask for help.", path: "/metacognition", useCases: ["Risk-adjusted decisions", "Human escalation", "Confidence scoring"], domains: ["Self-awareness", "Risk", "Calibration"] },
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
