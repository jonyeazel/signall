import { T } from "../lib/theme";

/**
 * The Optimo wordmark — "Optimo" set in Geist. Clean and unadorned: we do less,
 * so the name stands on its own with no ornament.
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
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
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
    </span>
  );
}
