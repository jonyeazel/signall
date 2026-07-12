"use client";

import { AnimatePresence, motion } from "motion/react";
import { LayoutGrid, ShoppingBag } from "lucide-react";
import { type RefObject } from "react";
import { T, SPRING_SOFT } from "../lib/theme";
import { Wordmark } from "./wordmark";

const roundBtn = {
  width: 44,
  height: 44,
  borderRadius: 8,
  background: T.surface,
  border: `1px solid ${T.borderStrong}`,
  boxShadow: "0 2px 0 rgba(28,28,26,0.08)",
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
  cartCount,
  hidden = false,
  onOpenCart,
  onOpenOverview,
  barRef,
}: {
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
        padding: "calc(20px + env(safe-area-inset-top)) 20px 0",
        background: "transparent",
        pointerEvents: "none",
        opacity: hidden ? 0 : 1,
        transform: hidden ? "translateY(-6px)" : "translateY(0)",
        transition: "opacity 220ms ease, transform 220ms ease",
      }}
    >
      {/* Consistent brand identity — the storefront's logo + name, unchanging
          as you scroll (product identity now lives on each card itself). */}
      <div style={{ display: "flex", alignItems: "center", gap: 11, flex: 1, minWidth: 0 }}>
        {/* Avatar ring: a dark border (matching the avatar photo) with a thin
            1.5px white gap around the inner avatar, so it reads as a framed
            profile without a wide halo. */}
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 8,
            flexShrink: 0,
            padding: 3,
            boxSizing: "border-box",
            background: T.surface,
            border: `1px solid ${T.borderStrong}`,
            boxShadow: "0 2px 0 rgba(28,28,26,0.08)",
          }}
          aria-hidden
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              borderRadius: 5,
              background: T.ink,
              color: T.surface,
              display: "grid",
              placeItems: "center",
              fontSize: 15,
              fontWeight: 600,
              letterSpacing: "-0.02em",
            }}
          >
            O
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
          <Wordmark size={17} />
          <span
            style={{
              fontSize: 12.5,
              color: T.textSecondary,
              lineHeight: 1.2,
              whiteSpace: "nowrap",
              letterSpacing: "0.01em",
            }}
          >
            Shopify Theme
          </span>
        </div>
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
          <LayoutGrid size={20} strokeWidth={1.9} />
        </motion.button>
        <motion.button
          type="button"
          onClick={onOpenCart}
          whileTap={{ scale: 0.92 }}
          aria-label={`Cart, ${cartCount} item${cartCount === 1 ? "" : "s"}`}
          style={{ ...roundBtn, position: "relative" }}
        >
          <ShoppingBag size={20} strokeWidth={1.9} />
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
                  borderRadius: 4,
                  background: T.signal,
                  color: T.surface,
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
