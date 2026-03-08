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
  station: string;
};

export type EnvGroup = {
  label: string;
  envs: EnvDef[];
};

export const ENV_GROUPS: EnvGroup[] = [
  {
    label: "Foundation",
    envs: [
      { id: "bandit", name: "The Bandit", capability: "Portfolio allocation & market testing", path: "/bandit", station: "Embarcadero" },
      { id: "sequence", name: "The Sequence", capability: "Trend prediction & time series", path: "/sequence", station: "Powell St" },
      { id: "map", name: "The Map", capability: "Logistics & route optimization", path: "/map-nav", station: "Fog Basin" },
      { id: "auction", name: "The Auction", capability: "Capital deployment & pricing", path: "/auction", station: "Montgomery" },
    ],
  },
  {
    label: "Reasoning",
    envs: [
      { id: "tower", name: "The Tower", capability: "Project execution & task sequencing", path: "/tower", station: "Civic Center" },
      { id: "signal", name: "The Signal", capability: "Fraud detection & anomaly recognition", path: "/signal", station: "Nob Hill" },
      { id: "negotiation", name: "The Negotiation", capability: "Deal-making & counterparty modeling", path: "/negotiation", station: "Market St" },
      { id: "repair", name: "The Repair", capability: "Root cause analysis & diagnostics", path: "/repair", station: "Mission" },
    ],
  },
  {
    label: "Mastery",
    envs: [
      { id: "transfer", name: "The Transfer", capability: "Market expansion & domain adaptation", path: "/transfer", station: "Twin Peaks" },
      { id: "meta", name: "The Meta", capability: "Risk management & confidence calibration", path: "/metacognition", station: "Lands End" },
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
