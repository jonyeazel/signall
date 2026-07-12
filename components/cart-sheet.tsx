"use client";

import { motion } from "motion/react";
import { X, Trash2, ShoppingBag } from "lucide-react";
import { type Offering } from "../lib/offerings";
import { T, SPRING } from "../lib/theme";

export type CartLine = { offering: Offering; qty: number };

const priceOf = (p: string) => parseFloat(p.replace(/[^0-9.]/g, "")) || 0;

/** Minimal, on-theme cart — bottom sheet on mobile, centered panel on desktop. */
export function CartSheet({
  items,
  isMobile,
  onRemove,
  onClose,
}: {
  items: CartLine[];
  isMobile: boolean;
  onRemove: (id: string) => void;
  onClose: () => void;
}) {
  const subtotal = items.reduce((sum, { offering, qty }) => sum + priceOf(offering.price) * qty, 0);
  const count = items.reduce((n, { qty }) => n + qty, 0);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        display: "flex",
        alignItems: isMobile ? "flex-end" : "center",
        justifyContent: "center",
        padding: isMobile ? 0 : 28,
      }}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.22 }}
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(28,28,26,0.28)",
        }}
      />

      <motion.div
        initial={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.96, y: 12 }}
        animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
        exit={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.96, y: 12 }}
        transition={SPRING}
        style={{
          position: "relative",
          width: "100%",
          maxWidth: isMobile ? "100%" : 440,
          maxHeight: isMobile ? "82dvh" : "80vh",
          background: T.surface,
          border: `1px solid ${T.borderStrong}`,
          borderRadius: isMobile ? "10px 10px 0 0" : 10,
          boxShadow: "0 8px 28px rgba(28,28,26,0.16)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "18px 20px 14px",
            borderBottom: `1px solid ${T.border}`,
          }}
        >
          <span style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.02em", color: T.textPrimary }}>
            Your cart{count > 0 ? ` · ${count}` : ""}
          </span>
          <motion.button
            type="button"
            onClick={onClose}
            whileTap={{ scale: 0.9 }}
            aria-label="Close cart"
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              background: T.bgSubtle,
              border: `1px solid ${T.border}`,
              color: T.textSecondary,
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
            }}
          >
            <X size={17} strokeWidth={1.9} />
          </motion.button>
        </div>

        {items.length === 0 ? (
          <div
            style={{
              padding: "48px 24px 56px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 14,
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: T.bgSubtle,
                border: `1px solid ${T.border}`,
                display: "grid",
                placeItems: "center",
                color: T.textTertiary,
              }}
            >
              <ShoppingBag size={24} strokeWidth={1.7} />
            </div>
            <span style={{ fontSize: 15, color: T.textSecondary }}>Your cart is empty</span>
            <motion.button
              type="button"
              onClick={onClose}
              whileTap={{ scale: 0.97 }}
              style={{
                height: 44,
                padding: "0 22px",
                borderRadius: 8,
                background: T.ink,
                color: "#fff",
                border: "none",
                fontSize: 14.5,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Browse products
            </motion.button>
          </div>
        ) : (
          <>
            {/* Lines */}
            <div
              className="feed-scroll"
              style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "8px 12px", WebkitOverflowScrolling: "touch" }}
            >
              {items.map(({ offering, qty }) => (
                <div
                  key={offering.id}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 8px" }}
                >
                  <div
                    style={{ width: 52, height: 52, borderRadius: 6, flexShrink: 0, border: `1px solid ${T.border}`, overflow: "hidden", background: T.ghost }}
                  >
                    <img
                      src={offering.images[0] || "/placeholder.svg"}
                      alt=""
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                    <span
                      style={{
                        fontSize: 14.5,
                        fontWeight: 600,
                        color: T.textPrimary,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {offering.title}
                    </span>
                    <span style={{ fontSize: 13, color: T.textTertiary }}>
                      {offering.price}
                      {qty > 1 ? ` · ×${qty}` : ""}
                    </span>
                  </div>
                  <motion.button
                    type="button"
                    onClick={() => onRemove(offering.id)}
                    whileTap={{ scale: 0.9 }}
                    aria-label={`Remove ${offering.title}`}
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: "50%",
                      background: "transparent",
                      border: "none",
                      color: T.textTertiary,
                      display: "grid",
                      placeItems: "center",
                      cursor: "pointer",
                      flexShrink: 0,
                    }}
                  >
                    <Trash2 size={17} strokeWidth={1.8} />
                  </motion.button>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div
              style={{
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: isMobile ? "14px 16px calc(16px + env(safe-area-inset-bottom))" : "16px 20px",
                borderTop: `1px solid ${T.border}`,
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
                <span style={{ fontSize: 11, color: T.textTertiary, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Subtotal
                </span>
                <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", color: T.textPrimary }}>
                  ${subtotal.toFixed(0)}
                </span>
              </div>
              <motion.button
                type="button"
                whileTap={{ scale: 0.98 }}
                style={{
                  flex: 1,
                  height: 52,
                  borderRadius: 8,
                  background: T.ink,
                  color: "#fff",
                  border: "none",
                  fontSize: 16,
                  fontWeight: 600,
                  letterSpacing: "-0.01em",
                  cursor: "pointer",
                }}
              >
                Checkout
              </motion.button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
