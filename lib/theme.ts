/**
 * v0University design system — codename "Marlow".
 *
 * A light, editorial authority language: warm paper canvas, warm near-black
 * ink, and a single electric vermilion signal. Type is the hero (Fraunces
 * display serif + Geist sans + Geist Mono technical labels); the signal is
 * spent only on the moments that convert. No dark mode, no ornament — the
 * confidence comes from space, scale, and precision.
 *
 * Values are kept as plain constants so motion components and inline styles
 * share one system. Existing token NAMES are preserved so every surface
 * re-skins from this one file.
 */
export const T = {
  gutter: "#E6E3DA",
  /** Paper — the canvas. Warm, flattering, unmistakably not-white. */
  bg: "#F1EFE8",
  bgSubtle: "#E8E5DC",
  /** Raised surface — cards, sheets, controls. */
  surface: "#FBFAF5",
  border: "#D6D2C8",
  borderStrong: "#BEB9AD",
  borderActive: "#8F8A7E",
  /** Warm near-black ink. */
  ink: "#16150F",
  inkSoft: "#33322A",
  textPrimary: "#16150F",
  textSecondary: "#615D51",
  textTertiary: "#8F8A7E",
  skeleton: "#E3DFD5",
  ghost: "#ECE9E0",
  /** The one signal — electric vermilion. Authority, energy, conviction. */
  signal: "#E23A1E",
  signalHover: "#C7301680",
  /** Legible foreground on a signal-filled surface. */
  onSignal: "#FBFAF5",
  /** Soft signal wash for active chips / focus fields. */
  signalSoft: "rgba(226, 58, 30, 0.10)",
} as const;

/**
 * Course-cover art direction. Each offer gets a tonal field + ink pairing so
 * the catalog reads like a premium design annual — typographic, cohesive, and
 * scalable to hundreds of courses with zero image generation.
 */
export type CoverTone = { bg: string; ink: string; accent: string; sub: string };
export const COVERS = {
  paper: { bg: "#E7E3D8", ink: "#16150F", accent: "#E23A1E", sub: "#615D51" },
  sage: { bg: "#DFE4DD", ink: "#16150F", accent: "#E23A1E", sub: "#5C6156" },
  sand: { bg: "#EAE1D1", ink: "#16150F", accent: "#E23A1E", sub: "#6B6250" },
  slate: { bg: "#DDE2E7", ink: "#16150F", accent: "#E23A1E", sub: "#586069" },
  clay: { bg: "#E9DDD8", ink: "#16150F", accent: "#E23A1E", sub: "#6E5E56" },
  /** The bold one — reserved for the flagship / all-access pass. Not dark: a
   *  saturated signal field with paper type. */
  signal: { bg: "#E23A1E", ink: "#FDF7F1", accent: "#16150F", sub: "#FBE3DC" },
  /** Ink cover for the highest-ticket "license the platform" tier. */
  ink: { bg: "#16150F", ink: "#F3F0E8", accent: "#E8846F", sub: "#B4AEA0" },
} as const;
export type CoverKey = keyof typeof COVERS;

/** Critically damped motion: immediate, but weighted enough to explain space. */
export const SPRING = { type: "spring", stiffness: 480, damping: 48, mass: 0.85 } as const;
export const SPRING_SOFT = { type: "spring", stiffness: 360, damping: 42, mass: 0.9 } as const;
