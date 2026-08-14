import { T } from "../lib/theme";
import { BRAND } from "../lib/brand";

/**
 * The wordmark — the brand name set in Geist. Clean and unadorned: the name
 * stands on its own with no ornament. Rename the store in `lib/brand.ts`.
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
      {BRAND.name}
    </span>
  );
}
