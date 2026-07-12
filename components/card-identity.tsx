import { type Offering } from "../lib/offerings";
import { T } from "../lib/theme";

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
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: "10px 12px",
        borderRadius: 8,
        background: "rgba(248,247,242,0.94)",
        border: `1px solid ${T.border}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
        {/* Avatar ring — identical to the header profile: a dark border with a
            thin 1.5px white gap around the product thumbnail. */}
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 5,
            flexShrink: 0,
            padding: 2,
            boxSizing: "border-box",
            background: T.surface,
            border: `1px solid ${T.borderStrong}`,
          }}
        >
          <img
            src={offering.images[1] ?? offering.images[0] ?? "/placeholder.svg"}
            alt=""
            style={{
              width: "100%",
              height: "100%",
              borderRadius: 3,
              objectFit: "cover",
              display: "block",
            }}
          />
        </div>
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
            }}
          >
            {offering.title}
          </span>
          <span
            style={{
              flexShrink: 0,
              display: "inline-flex",
              alignItems: "center",
              padding: "6px 9px",
              borderRadius: 5,
              background: T.bgSubtle,
              border: `1px solid ${T.border}`,
              color: T.textPrimary,
              fontSize: 12.5,
              fontWeight: 600,
              letterSpacing: "-0.01em",
              lineHeight: 1,
              whiteSpace: "nowrap",
            }}
          >
            {offering.price}
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
        }}
      >
        {offering.blurb}
      </p>
    </div>
  );
}
