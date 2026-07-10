"use client";

import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { type RefObject } from "react";
import { type Offering } from "../lib/offerings";
import { T, SPRING } from "../lib/theme";
import { ImageCarousel } from "./image-carousel";
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
  // Shared morphing media — a swipeable image carousel with pagination dots.
  const media = (
    <div
      onClick={onOpen}
      style={{ flex: 1, minHeight: 0, width: "100%", cursor: "pointer", position: "relative" }}
    >
      <ImageCarousel
        layoutId={`media-${offering.id}`}
        count={4}
        radius={14}
        style={{ height: "100%", width: "100%" }}
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
            pointerEvents: "none",
          }}
        >
          {offering.index}
        </motion.span>
      </ImageCarousel>
    </div>
  );

  // Shared content block (title / price / description / tags / arrow)
  const contentBlock = (
    <button
      onClick={onOpen}
      style={{
        textAlign: "left",
        background: "transparent",
        border: "none",
        padding: "2px 4px 4px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        cursor: "pointer",
        width: "100%",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, width: "100%" }}>
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

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 2, width: "100%" }}>
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
    </button>
  );

  // Mobile: composer built into the card
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
          <div style={{ flex: 1, minHeight: 0, padding: 12, display: "flex", flexDirection: "column", gap: 12 }}>
            {media}
            {contentBlock}
          </div>

          {/* Inline composer — feels native to the product card */}
          <div style={{ borderTop: `1px solid ${T.border}`, background: T.bgSubtle }}>
            <ChatComposer flush placeholder={`Ask about ${offering.title}…`} />
          </div>
        </motion.div>
      </motion.div>
    );
  }

  // Desktop card
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ root: rootRef, once: true, amount: 0.2 }}
      transition={{ ...SPRING, delay: Math.min(index * 0.04, 0.2) }}
      style={{ width: "100%", height: "100%" }}
    >
      <motion.div
        layoutId={`card-${offering.id}`}
        whileHover={{ y: -4 }}
        transition={SPRING}
        style={{
          width: "100%",
          height: "100%",
          background: T.surface,
          border: `1px solid ${T.border}`,
          borderRadius: 22,
          padding: 12,
          display: "flex",
          flexDirection: "column",
          gap: 14,
          boxShadow: "0 1px 2px rgba(0,0,0,0.03), 0 8px 24px -18px rgba(0,0,0,0.25)",
        }}
      >
        {media}
        {contentBlock}
      </motion.div>
    </motion.div>
  );
}
