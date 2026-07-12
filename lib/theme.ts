/**
 * Greyscale design tokens — the "v0 native" palette.
 * Kept as plain values so both inline styles and motion components can use them.
 */
export const T = {
  gutter: "#E7E7E7",
  bg: "#FBFBFB",
  bgSubtle: "#F4F4F4",
  surface: "#FFFFFF",
  border: "#DBDBDB",
  borderStrong: "#CFCFCF",
  borderActive: "#BFBFBF",
  ink: "#141414",
  inkSoft: "#3A3A3A",
  textPrimary: "#171717",
  textSecondary: "#565656",
  textTertiary: "#9A9A9A",
  skeleton: "#EFEFEF",
  ghost: "#F5F5F5",
  // "Optimo red" — the brand's signature accent. It appears in exactly one
  // place: the dot set as a period at the end of the wordmark ("Optimo●").
  // One unexpected pop of saturated color in an otherwise timeless monochrome
  // palette — Optimo's Louboutin sole. Never used for anything else.
  signature: "#E23A2C",
} as const;

// Spring feel used across the app for the "fluid, future UI" motion signature.
export const SPRING = { type: "spring", stiffness: 420, damping: 38, mass: 0.9 } as const;
export const SPRING_SOFT = { type: "spring", stiffness: 260, damping: 30 } as const;

/**
 * "Whisper" pattern — a set of gently flowing, parallel topographic contour
 * lines (the barely-there texture Stripe uses in its assistant panel). Kept
 * extremely faint so it reads as a premium hint of depth, never decoration.
 * Seamlessly tileable: each wave is one full period over the 240px tile width.
 */
const WHISPER_SVG = `<svg xmlns='http://www.w3.org/2000/svg' width='240' height='180'><g fill='none' stroke='#1e2436' stroke-opacity='0.05' stroke-width='1'><path d='M0 30 Q60 14 120 30 T240 30'/><path d='M0 54 Q60 38 120 54 T240 54'/><path d='M0 78 Q60 62 120 78 T240 78'/><path d='M0 102 Q60 86 120 102 T240 102'/><path d='M0 126 Q60 110 120 126 T240 126'/><path d='M0 150 Q60 134 120 150 T240 150'/></g></svg>`;
export const WHISPER_PATTERN = `url("data:image/svg+xml,${encodeURIComponent(WHISPER_SVG)}")`;
