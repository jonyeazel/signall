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
  textSecondary: "#6B6B6B",
  textTertiary: "#9A9A9A",
  skeleton: "#EFEFEF",
  ghost: "#F5F5F5",
} as const;

// Spring feel used across the app for the "fluid, future UI" motion signature.
export const SPRING = { type: "spring", stiffness: 420, damping: 38, mass: 0.9 } as const;
export const SPRING_SOFT = { type: "spring", stiffness: 260, damping: 30 } as const;
