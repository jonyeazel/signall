"use client";

import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { type RefObject } from "react";
import { type Offering } from "../lib/offerings";
import { T, SPRING } from "../lib/theme";

export function OfferingCard({
  offering,
  index,
  rootRef,
  onOpen,
}: {
  offering: Offering;
  index: number;
  rootRef: RefObject<HTMLElement | null>;
  onOpen: () => void;
}) {
  const Icon = offering.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ root: rootRef, once: true, amount: 0.25 }}
      transition={{ ...SPRING, delay: Math.min(index * 0.04, 0.2) }}
      style={{ width: "100%" }}
    >
      <motion.button
        layoutId={`card-${offering.id}`}
        onClick={onOpen}
        whileHover={{ y: -4 }}
        whileTap={{ scale: 0.985 }}
        transition={SPRING}
        style={{
          width: "100%",
          textAlign: "left",
          background: T.surface,
          border: `1px solid ${T.border}`,
          borderRadius: 22,
          padding: 22,
          display: "flex",
          flexDirection: "column",
          gap: 18,
          cursor: "pointer",
          boxShadow: "0 1px 2px rgba(0,0,0,0.03), 0 8px 24px -18px rgba(0,0,0,0.25)",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        {/* Header: icon tile + index */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <motion.div
            layoutId={`icon-${offering.id}`}
            style={{
              width: 46,
              height: 46,
              borderRadius: 13,
              background: T.ink,
              color: "#fff",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            <Icon size={21} strokeWidth={1.6} />
          </motion.div>
          <motion.span
            layoutId={`index-${offering.id}`}
            style={{
              fontFamily: "var(--font-geist-mono), monospace",
              fontSize: 12,
              letterSpacing: "0.08em",
              color: T.textTertiary,
            }}
          >
            {offering.index}
          </motion.span>
        </div>

        {/* Title + tagline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          <motion.h3
            layoutId={`title-${offering.id}`}
            style={{
              margin: 0,
              fontSize: 21,
              fontWeight: 600,
              letterSpacing: "-0.02em",
              color: T.textPrimary,
              lineHeight: 1.15,
            }}
          >
            {offering.title}
          </motion.h3>
          <p
            style={{
              margin: 0,
              fontSize: 14,
              lineHeight: 1.5,
              color: T.textSecondary,
            }}
          >
            {offering.tagline}
          </p>
        </div>

        {/* Footer: tags + open affordance */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginTop: 2,
          }}
        >
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {offering.tags.map((tag) => (
              <span
                key={tag}
                style={{
                  fontSize: 11.5,
                  fontWeight: 500,
                  color: T.textSecondary,
                  background: T.bgSubtle,
                  border: `1px solid ${T.border}`,
                  borderRadius: 999,
                  padding: "4px 10px",
                }}
              >
                {tag}
              </span>
            ))}
          </div>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              border: `1px solid ${T.borderStrong}`,
              display: "grid",
              placeItems: "center",
              color: T.textPrimary,
              flexShrink: 0,
            }}
          >
            <ArrowUpRight size={16} strokeWidth={1.75} />
          </div>
        </div>
      </motion.button>
    </motion.div>
  );
}
