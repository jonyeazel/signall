import { T } from "../lib/theme";

/**
 * The Optimo wordmark — "Optimo" set in Geist, closed by the signature dot: a
 * single period of Optimo red. That dot is the brand's one unmistakable
 * gesture (its Louboutin sole): the smallest possible mark of color, tied to
 * the name itself so it travels wherever the name goes. Never rendered without
 * it. We do less — so the one thing we do, we own.
 */
export function Wordmark({
  size = 23,
  color = T.textPrimary,
  glow = false,
}: {
  size?: number;
  color?: string;
  glow?: boolean;
}) {
  // The dot scales with the type and is nudged tight to the final "o".
  const dot = Math.max(3, Math.round(size * 0.135));
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "flex-end",
        fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
        fontSize: size,
        fontWeight: 600,
        letterSpacing: "-0.02em",
        color,
        lineHeight: 1,
        whiteSpace: "nowrap",
        textShadow: glow ? "0 1px 12px rgba(251,251,251,0.92), 0 0 4px rgba(251,251,251,0.92)" : undefined,
      }}
    >
      Optimo
      <span
        aria-hidden
        style={{
          width: dot,
          height: dot,
          borderRadius: "50%",
          background: T.signature,
          marginLeft: Math.round(size * 0.055),
          marginBottom: Math.max(1, Math.round(size * 0.07)),
          flexShrink: 0,
          // A whisper of lift so the dot feels intentionally placed, not printed.
          boxShadow: glow ? "0 0 8px rgba(226,58,44,0.35)" : undefined,
        }}
      />
    </span>
  );
}
