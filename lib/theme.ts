/**
 * Optimo industrial design tokens.
 * Warm paper, mineral shells, graphite type, and a single safety-red signal.
 * Kept as plain values so motion components and inline styles share one system.
 */
export const T = {
  gutter: "#DCD9D1",
  bg: "#F2F0E9",
  bgSubtle: "#E9E6DE",
  surface: "#F8F7F2",
  border: "#D0CDC4",
  borderStrong: "#B8B4AA",
  borderActive: "#8E8A80",
  ink: "#1C1C1A",
  inkSoft: "#3C3B37",
  textPrimary: "#1C1C1A",
  textSecondary: "#66635B",
  textTertiary: "#8E8A80",
  skeleton: "#E3E0D8",
  ghost: "#ECE9E2",
  signal: "#D83A2F",
} as const;

/** Critically damped motion: fast enough to feel immediate, weighted enough to explain space. */
export const SPRING = { type: "spring", stiffness: 480, damping: 48, mass: 0.85 } as const;
export const SPRING_SOFT = { type: "spring", stiffness: 360, damping: 42, mass: 0.9 } as const;
