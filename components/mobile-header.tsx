"use client";

import { AnimatePresence, motion } from "motion/react";
import { LayoutGrid, ShoppingBag } from "lucide-react";
import { type RefObject } from "react";
import { type Offering } from "../lib/offerings";
import { T, SPRING_SOFT } from "../lib/theme";

const roundBtn = {
  width: 40,
  height: 40,
  borderRadius: "50%",
  background: "rgba(251,251,251,0.72)",
  backdropFilter: "blur(12px) saturate(1.4)",
  WebkitBackdropFilter: "blur(12px) saturate(1.4)",
  border: `1px solid ${T.border}`,
  color: T.textPrimary,
  display: "grid",
  placeItems: "center",
  flexShrink: 0,
  cursor: "pointer",
  WebkitTapHighlightColor: "transparent",
} as const;

/**
 * Floating, product-aware header for mobile.
 *
 * Stationary on the z-axis (glass, sits above the scrolling feed) but adopts
 * the *active* card's thumbnail + name/price as cards snap into view — so it
 * reads as an extension of whatever card you're looking at. Right side carries
 * the two functional affordances: browse-all (overview) and cart.
 */
export function MobileHeader({
  offering,
  cartCount,
  hidden = false,
  onOpenCart,
  onOpenOverview,
  barRef,
}: {
  offering: Offering;
  cartCount: number;
  hidden?: boolean;
  onOpenCart: () => void;
  onOpenOverview: () => void;
  barRef?: RefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      ref={barRef}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        padding: "20px 20px 0",
        background: "transparent",
        pointerEvents: "none",
        opacity: hidden ? 0 : 1,
        transform: hidden ? "translateY(-6px)" : "translateY(0)",
        transition: "opacity 220ms ease, transform 220ms ease",
      }}
    >
      {/* Active product identity — crossfades as cards scroll into view */}
      <div style={{ position: "relative", flex: 1, minWidth: 0, height: 40 }}>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={offering.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={SPRING_SOFT}
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              gap: 11,
              minWidth: 0,
            }}
          >
            <img
              src={offering.images[0] || "/placeholder.svg"}
              alt=""
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                flexShrink: 0,
                objectFit: "cover",
                border: `1px solid ${T.border}`,
                background: T.skeleton,
              }}
            />
            <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  letterSpacing: "-0.02em",
                  color: T.textPrimary,
                  lineHeight: 1.15,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {offering.title}
              </span>
              <span style={{ fontSize: 12.5, color: T.textTertiary, lineHeight: 1.2, whiteSpace: "nowrap" }}>
                {offering.price}
              </span>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Functional affordances */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, pointerEvents: hidden ? "none" : "auto" }}>
        <motion.button
          type="button"
          onClick={onOpenOverview}
          whileTap={{ scale: 0.92 }}
          aria-label="Browse all products"
          style={roundBtn}
        >
          <LayoutGrid size={18} strokeWidth={1.9} />
        </motion.button>
        <motion.button
          type="button"
          onClick={onOpenCart}
          whileTap={{ scale: 0.92 }}
          aria-label={`Cart, ${cartCount} item${cartCount === 1 ? "" : "s"}`}
          style={{ ...roundBtn, position: "relative" }}
        >
          <ShoppingBag size={18} strokeWidth={1.9} />
          <AnimatePresence>
            {cartCount > 0 && (
              <motion.span
                key={cartCount}
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.4, opacity: 0 }}
                transition={SPRING_SOFT}
                style={{
                  position: "absolute",
                  top: -3,
                  right: -3,
                  minWidth: 18,
                  height: 18,
                  padding: "0 5px",
                  borderRadius: 999,
                  background: T.ink,
                  color: "#fff",
                  fontSize: 11,
                  fontWeight: 700,
                  display: "grid",
                  placeItems: "center",
                  border: "2px solid rgba(251,251,251,0.9)",
                }}
              >
                {cartCount}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </div>
  );
}
