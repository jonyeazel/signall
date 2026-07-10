"use client";

import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { type RefObject } from "react";
import { type Offering } from "../lib/offerings";
import { T, SPRING } from "../lib/theme";
import { HatchPlaceholder } from "./hatch-placeholder";
import { ChatComposer } from "./chat-composer";

export function OfferingCard({
  offering,
  index,
  rootRef,
  onOpen,
  withComposer = false,
}: {
  offering: Offering;
  index: number;
  rootRef: RefObject<HTMLElement | null>;
  onOpen: () => void;
  withComposer?: boolean;
}) {
  // Shared morphing media (diagonal hatch placeholder → sheet banner)
  const media = (
    <HatchPlaceholder
      layoutId={`media-${offering.id}`}
      radius={14}
      style={{ flex: 1, minHeight: 0, width: "100%" }}
    >
      <motion.span
        layoutId={`index-${offering.id}`}
        style={{
          position: "absolute",
          top: 12,
          left: 13,
          fontFamily: "var(--font-geist-mono), monospace",
          fontSize: 11,
          letterSpacing: "0.1em",
          color: T.textTertiary,
          background: "rgba(255,255,255,0.72)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
          padding: "3px 8px",
          borderRadius: 999,
        }}
      >
        {offering.index}
      </motion.span>
    </HatchPlaceholder>
  );

  // Shared content block (title / price / description / tags / arrow)
  const contentBlock = (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "2px 4px 4px" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <motion.h3
          layoutId={`title-${offering.id}`}
          style={{
            margin: 0,
            fontSize: 17,
            fontWeight: 600,
            letterSpacing: "-0.02em",
            color: T.textPrimary,
            lineHeight: 1.15,
          }}
        >
          {offering.title}
        </motion.h3>
        <motion.span
          layoutId={`price-${offering.id}`}
          style={{
            fontSize: 15,
            fontWeight: 600,
            letterSpacing: "-0.01em",
            color: T.textPrimary,
            flexShrink: 0,
          }}
        >
          {offering.price}
        </motion.span>
      </div>

      {/* Two-line description */}
      <p
        style={{
          margin: 0,
          fontSize: 12.5,
          lineHeight: 1.45,
          color: T.textSecondary,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {offering.tagline}
      </p>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 2 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {offering.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: T.textSecondary,
                background: T.bgSubtle,
                border: `1px solid ${T.border}`,
                borderRadius: 999,
                padding: "3px 9px",
              }}
            >
              {tag}
            </span>
          ))}
        </div>
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: "50%",
            border: `1px solid ${T.borderStrong}`,
            display: "grid",
            placeItems: "center",
            color: T.textPrimary,
            flexShrink: 0,
          }}
        >
          <ArrowUpRight size={15} strokeWidth={1.75} />
        </div>
      </div>
    </div>
  );

  // Mobile: composer built into the card (tap area + inline composer are siblings)
  if (withComposer) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ root: rootRef, once: true, amount: 0.2 }}
        transition={SPRING}
        style={{ width: "100%", height: "100%" }}
      >
        <motion.div
          layoutId={`card-${offering.id}`}
          transition={SPRING}
          style={{
            width: "100%",
            height: "100%",
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: 24,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            boxShadow: "0 1px 2px rgba(0,0,0,0.03), 0 12px 32px -22px rgba(0,0,0,0.3)",
          }}
        >
          <motion.button
            onClick={onOpen}
            whileTap={{ scale: 0.99 }}
            transition={SPRING}
            style={{
              flex: 1,
              minHeight: 0,
              textAlign: "left",
              background: "transparent",
              border: "none",
              padding: 12,
              display: "flex",
              flexDirection: "column",
              gap: 14,
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {media}
            {contentBlock}
          </motion.button>

          {/* Inline composer — feels native to the product card */}
          <div style={{ borderTop: `1px solid ${T.border}`, background: T.bgSubtle }}>
            <ChatComposer flush placeholder={`Ask about ${offering.title}…`} />
          </div>
        </motion.div>
      </motion.div>
    );
  }

  // Desktop: whole card is a single tappable button
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ root: rootRef, once: true, amount: 0.2 }}
      transition={{ ...SPRING, delay: Math.min(index * 0.04, 0.2) }}
      style={{ width: "100%", height: "100%" }}
    >
      <motion.button
        layoutId={`card-${offering.id}`}
        onClick={onOpen}
        whileHover={{ y: -4 }}
        whileTap={{ scale: 0.985 }}
        transition={SPRING}
        style={{
          width: "100%",
          height: "100%",
          textAlign: "left",
          background: T.surface,
          border: `1px solid ${T.border}`,
          borderRadius: 22,
          padding: 12,
          display: "flex",
          flexDirection: "column",
          gap: 14,
          cursor: "pointer",
          boxShadow: "0 1px 2px rgba(0,0,0,0.03), 0 8px 24px -18px rgba(0,0,0,0.25)",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        {media}
        {contentBlock}
      </motion.button>
    </motion.div>
  );
}
