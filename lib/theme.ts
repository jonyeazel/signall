/**
 * Greyscale design tokens — the "v0 native" palette.
 * Kept as plain values so both inline styles and motion components can use them.
 */
export const T = {
  bg: "#FFFFFF",
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
} as const;

/**
 * The empty-media fill: flat grey with faint diagonal rules.
 *
 * This is the template's placeholder language — every frame that has no image
 * yet wears it, so an unfilled storefront reads as a deliberate wireframe
 * rather than as something broken. `gap` tightens the rules for small
 * thumbnails, where the default spacing reads as noise.
 */
export const hatch = (gap = 11) => ({
  background: T.skeleton,
  backgroundImage: `repeating-linear-gradient(-45deg, rgba(0,0,0,0.05) 0px, rgba(0,0,0,0.05) 1.5px, transparent 1.5px, transparent ${gap}px)`,
});

// Spring feel used across the app for the "fluid, future UI" motion signature.
export const SPRING = { type: "spring", stiffness: 420, damping: 38, mass: 0.9 } as const;
export const SPRING_SOFT = { type: "spring", stiffness: 260, damping: 30 } as const;

/**
 * The card <-> expanded-sheet shared-element morph.
 *
 * A fixed-duration ease, not a spring: on a box this large a spring's
 * asymptotic tail makes the last few pixels creep, so the panel reads as
 * settling instead of arriving. Measured: the spring was still moving at
 * ~730ms. A decisive ease-out lands it as one deliberate mechanical motion.
 */
export const MORPH = { type: "tween", duration: 0.46, ease: [0.32, 0.72, 0, 1] } as const;

/**
 * Shared-element morph geometry — the single source of truth for BOTH ends.
 *
 * The product card and the expanded sheet are two ends of one morph, so these
 * must match exactly. Any difference animates mid-flight, and a curvature
 * change during a box scale is precisely what makes a shared-element
 * transition look cheap: the card's image radius was 12 while the sheet's was
 * 0, so the photo's corners snapped square within ~3 frames of an ~600ms
 * flight and it then scaled up as a hard-edged block.
 *
 * MEDIA_RADIUS = PANEL_RADIUS - PANEL_PAD keeps the image's corners nested
 * concentrically inside the panel's at both ends (equal radii inside a padded
 * frame look subtly broken).
 */
export const PANEL_RADIUS = 20;
export const PANEL_PAD = 12;
export const MEDIA_RADIUS = PANEL_RADIUS - PANEL_PAD;

/**
 * "Whisper" pattern — a set of gently flowing, parallel topographic contour
 * lines (the barely-there texture Stripe uses in its assistant panel). Kept
 * extremely faint so it reads as a premium hint of depth, never decoration.
 * Seamlessly tileable: each wave is one full period over the 240px tile width.
 */
const WHISPER_SVG = `<svg xmlns='http://www.w3.org/2000/svg' width='240' height='180'><g fill='none' stroke='#1e2436' stroke-opacity='0.05' stroke-width='1'><path d='M0 30 Q60 14 120 30 T240 30'/><path d='M0 54 Q60 38 120 54 T240 54'/><path d='M0 78 Q60 62 120 78 T240 78'/><path d='M0 102 Q60 86 120 102 T240 102'/><path d='M0 126 Q60 110 120 126 T240 126'/><path d='M0 150 Q60 134 120 150 T240 150'/></g></svg>`;
export const WHISPER_PATTERN = `url("data:image/svg+xml,${encodeURIComponent(WHISPER_SVG)}")`;
