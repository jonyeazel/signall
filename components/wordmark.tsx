import { T } from "../lib/theme";

/**
 * The v0University lockup — a sans "v0" mark set hard against a Fraunces
 * "University". The sans/serif tension is the whole identity: the machine and
 * the master, side by side. A single signal dot marks the "live, always-on"
 * nature of the platform.
 */
export function Wordmark({
  size = 20,
  color = T.textPrimary,
  showDot = true,
}: {
  size?: number;
  color?: string;
  /** The pulsing signal dot — the "always on" tell. Hidden in tight spots. */
  showDot?: boolean;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "baseline",
        gap: size * 0.14,
        color,
        lineHeight: 1,
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
          fontSize: size,
          fontWeight: 640,
          letterSpacing: "-0.03em",
        }}
      >
        v0
      </span>
      <span
        style={{
          fontFamily: "var(--font-display), Georgia, serif",
          fontSize: size * 1.02,
          fontWeight: 500,
          letterSpacing: "-0.01em",
        }}
      >
        University
      </span>
      {showDot && (
        <span
          aria-hidden
          style={{
            alignSelf: "center",
            width: size * 0.19,
            height: size * 0.19,
            borderRadius: "50%",
            background: T.signal,
            marginLeft: size * 0.1,
            marginBottom: size * 0.35,
            boxShadow: `0 0 0 ${size * 0.08}px ${T.signalSoft}`,
          }}
        />
      )}
    </span>
  );
}
