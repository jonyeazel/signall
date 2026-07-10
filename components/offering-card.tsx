"use client";

import { motion } from "motion/react";
import { useState, type RefObject } from "react";
import { type Offering } from "../lib/offerings";
import { T, SPRING } from "../lib/theme";
import { ImageCarousel } from "./image-carousel";
import { CardActionBar } from "./card-action-bar";
import { CardIdentity } from "./card-identity";
import { CardChatDrawer } from "./card-chat-drawer";

export function OfferingCard({
  offering,
  index,
  rootRef,
  onOpen,
  withComposer = false,
  imageScrollable = true,
}: {
  offering: Offering;
  index: number;
  rootRef: RefObject<HTMLElement | null>;
  onOpen: () => void;
  withComposer?: boolean;
  imageScrollable?: boolean;
}) {
  // Desktop cards open the AI concierge as a drawer that slides up inside the card.
  const [chatOpen, setChatOpen] = useState(false);

  // ---- Mobile: full-bleed immersive card ------------------------------------
  // The product image fills the entire card; a soft legibility veil at the
  // bottom carries the hook, rating and buy row. Feels like a premium reel.
  if (withComposer) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ root: rootRef, once: true, amount: 0.2 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        style={{ width: "100%", height: "100%" }}
      >
        <motion.div
          layoutId={`card-${offering.id}`}
          transition={SPRING}
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            background: T.surface,
            overflow: "hidden",
          }}
        >
          {/* Full-bleed gallery — native horizontal scroll-snap.
              touch-action: pan-x on the track + pan-y on the feed lets the
              browser axis-lock: swipe sideways browses images, swipe up/down
              pages products. A tap (no scroll) opens the PDP. */}
          <div
            onClick={onOpen}
            style={{ position: "absolute", inset: 0, cursor: "pointer" }}
          >
            <ImageCarousel
              layoutId={`media-${offering.id}`}
              images={offering.images}
              alt={offering.title}
              radius={0}
              dotBottom={160}
              scrollable
              style={{ height: "100%", width: "100%" }}
            />
          </div>

          {/* Bottom content — classic profile block + action row.
              No gradient fade: the container is pointer-transparent so swipes
              pass through to the gallery; only the action row captures taps.
              Soft white text-halos keep copy legible over the image. */}
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 2,
              padding: "12px 12px 14px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              pointerEvents: "none",
            }}
          >
            <CardIdentity offering={offering} />

            <div style={{ pointerEvents: "auto" }}>
              <CardActionBar id={offering.id} title={offering.title} onBuy={onOpen} />
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  // ---- Desktop card ---------------------------------------------------------
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
        whileHover={chatOpen ? undefined : { y: -4 }}
        transition={SPRING}
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          background: T.surface,
          border: `1px solid ${T.border}`,
          borderRadius: 20,
          padding: 12,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          overflow: "hidden",
        }}
      >
        <div
          onClick={onOpen}
          style={{ flex: 1, minHeight: 0, width: "100%", cursor: "pointer" }}
        >
          <ImageCarousel
            layoutId={`media-${offering.id}`}
            images={offering.images}
            alt={offering.title}
            radius={12}
            scrollable={imageScrollable}
            style={{ height: "100%", width: "100%" }}
          />
        </div>

        <button
          onClick={onOpen}
          style={{
            textAlign: "left",
            background: "transparent",
            border: "none",
            padding: "0 4px",
            display: "flex",
            flexDirection: "column",
            gap: 6,
            cursor: "pointer",
            width: "100%",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, width: "100%" }}>
            <h3
              style={{
                margin: 0,
                fontSize: 20,
                fontWeight: 600,
                letterSpacing: "-0.02em",
                color: T.textPrimary,
                lineHeight: 1.15,
              }}
            >
              {offering.title}
            </h3>
            <span
              style={{
                fontSize: 18,
                fontWeight: 600,
                letterSpacing: "-0.01em",
                color: T.textPrimary,
                flexShrink: 0,
              }}
            >
              {offering.price}
            </span>
          </div>

          <p
            style={{
              margin: 0,
              fontSize: 14,
              lineHeight: 1.5,
              color: T.textSecondary,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {offering.description}
          </p>
        </button>

        {/* Action row — mirrors the mobile card. Ai opens the in-card drawer. */}
        <CardActionBar
          id={offering.id}
          title={offering.title}
          onBuy={onOpen}
          onAi={() => setChatOpen(true)}
        />

        {/* AI concierge — slides up inside the card, clipped to its corners */}
        <CardChatDrawer offering={offering} open={chatOpen} onClose={() => setChatOpen(false)} />
      </motion.div>
    </motion.div>
  );
}
