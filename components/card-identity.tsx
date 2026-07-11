import { type Offering } from "../lib/offerings";
import { T } from "../lib/theme";

/** White text-halo that keeps copy legible over any (light) product photo. */
const HALO = "0 1px 12px rgba(251,251,251,0.92), 0 0 4px rgba(251,251,251,0.92)";

/**
 * The classic "profile" block that sits just above a card's action row:
 * a round avatar + product name with a price·rating subtitle, followed by a
 * two-line product description.
 *
 * Shared by the live mobile card AND the overview miniature so the two can
 * never diverge — the miniature is a literal, pixel-perfect scale-down.
 */
export function CardIdentity({ offering }: { offering: Offering }) {
  return (
    // A single left-aligned column: the avatar+name row sits on top, and the
    // description spans full width below it, so the avatar, name and
    // description all share one clean left edge (matching the action row).
    <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "0 4px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
        <img
          src={offering.images[1] ?? offering.images[0] ?? "/placeholder.svg"}
          alt=""
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            flexShrink: 0,
            objectFit: "cover",
            border: "1px solid rgba(255,255,255,0.7)",
            boxShadow: "0 2px 10px rgba(0,0,0,0.14)",
          }}
        />
        {/* Title + price share one row; the price rides in a dark "Buy Now"
            pill next to the name. The title truncates so the pill never wraps. */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <span
            style={{
              fontSize: 16,
              fontWeight: 600,
              letterSpacing: "-0.02em",
              color: T.textPrimary,
              lineHeight: 1.2,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              textShadow: HALO,
            }}
          >
            {offering.title}
          </span>
          <span
            style={{
              flexShrink: 0,
              display: "inline-flex",
              alignItems: "center",
              padding: "5px 11px",
              borderRadius: 999,
              background: T.ink,
              color: T.bg,
              fontSize: 12.5,
              fontWeight: 600,
              letterSpacing: "-0.01em",
              lineHeight: 1,
              whiteSpace: "nowrap",
              boxShadow: "0 2px 10px rgba(0,0,0,0.14)",
            }}
          >
            Buy Now - {offering.price}
          </span>
        </div>
      </div>

      <p
        style={{
          margin: 0,
          fontSize: 14,
          lineHeight: 1.42,
          color: T.textSecondary,
          textShadow: HALO,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {offering.description}
      </p>
    </div>
  );
}
