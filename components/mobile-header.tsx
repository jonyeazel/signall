"use client";

import { AnimatePresence, motion } from "motion/react";
import { LayoutGrid, ShoppingBag } from "lucide-react";
import { type RefObject } from "react";
import { T, SPRING_SOFT } from "../lib/theme";
import { Wordmark } from "./wordmark";

const roundBtn = {
  width: 44,
  height: 44,
  borderRadius: "50%",
  // Apple liquid glass — matches the card's Ai button + Buy Now pill.
  background: "rgba(255,255,255,0.55)",
  backdropFilter: "blur(22px) saturate(180%)",
  WebkitBackdropFilter: "blur(22px) saturate(180%)",
  border: "1px solid rgba(255,255,255,0.6)",
  boxShadow: "0 8px 24px -8px rgba(0,0,0,0.30), inset 0 1px 0.5px rgba(255,255,255,0.85)",
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
            borderRadius: "50%",
            flexShrink: 0,
            padding: 1.5,
            boxSizing: "border-box",
            background: T.surface,
            border: `1.5px solid ${T.ink}`,
            boxShadow: "0 2px 10px rgba(0,0,0,0.10)",
          }}
          aria-hidden
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              borderRadius: "50%",
              background: T.ink,
              color: "#fff",
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
          <Wordmark size={17} glow />
          <span
            style={{
              fontSize: 12.5,
              color: T.textSecondary,
              lineHeight: 1.2,
              whiteSpace: "nowrap",
              textShadow: "0 1px 12px rgba(251,251,251,0.92), 0 0 4px rgba(251,251,251,0.92)",
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
