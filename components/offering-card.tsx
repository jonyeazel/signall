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
  onAddToCart,
  withComposer = false,
  imageScrollable = true,
}: {
  offering: Offering;
  index: number;
  rootRef: RefObject<HTMLElement | null>;
  onOpen: () => void;
  /** Add this product to the cart — wires the in-chat buy card to the store. */
  onAddToCart?: () => void;
  withComposer?: boolean;
  imageScrollable?: boolean;
}) {
  // Desktop cards open the AI concierge as a drawer that slides up inside the
  // card — but only once the shopper submits a question. Tapping Ai first
  // expands the inline composer (like mobile); submitting seeds the drawer.
  const [chatOpen, setChatOpen] = useState(false);
  const [chatSeed, setChatSeed] = useState<string | undefined>(undefined);

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
            // Pin to 0 so Motion's shared-layout projection can't leave a
            // residual percentage radius on the full-bleed immersive card.
            borderRadius: 0,
          }}
        >
          {/* Full-bleed hero — a single product image (no horizontal browsing;
              that lives in the PDP). Vertical swipes page between products. A
              tap opens the PDP. */}
          <div
            onClick={onOpen}
            style={{ position: "absolute", inset: 0, cursor: "pointer" }}
          >
            <ImageCarousel
              layoutId={`media-${offering.id}`}
              images={offering.images}
              alt={offering.title}
              radius={0}
              dots={false}
              scrollable={false}
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
              <CardActionBar
                id={offering.id}
                title={offering.title}
                height={58}
                onBuy={onOpen}
                onAsk={(q) => {
                  setChatSeed(q);
                  setChatOpen(true);
                }}
              />
            </div>
          </div>

          {/* AI concierge — slides up over the card, clipped to its corners.
              Same inline-composer → drawer flow as the desktop cards. */}
          <CardChatDrawer
            offering={offering}
            open={chatOpen}
            initialMessage={chatSeed}
            onAddToCart={onAddToCart}
            onViewProduct={onOpen}
            onClose={() => {
              setChatOpen(false);
              setChatSeed(undefined);
            }}
          />
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
      style={{ width: "100%" }}
    >
      <motion.div
        layoutId={`card-${offering.id}`}
        whileHover={chatOpen ? undefined : { y: -2 }}
        transition={SPRING}
        style={{
          position: "relative",
          transformOrigin: "center center",
          width: "100%",
          background: T.surface,
          border: `1px solid ${T.borderStrong}`,
          borderRadius: 10,
          padding: 10,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          boxShadow: "0 2px 0 rgba(28,28,26,0.06)",
          overflow: "hidden",
        }}
      >
        {/* 1:1 image well with inset padding — the product sits inside white
            space rather than bleeding to every edge. The inner wrapper clips
            to the same small radius so the image corners stay clean. */}
        <div
          onClick={onOpen}
          style={{
            width: "100%",
            aspectRatio: "1 / 1",
            flexShrink: 0,
            cursor: "pointer",
            background: T.bgSubtle,
            borderRadius: 6,
            overflow: "hidden",
          }}
        >
          <ImageCarousel
            layoutId={`media-${offering.id}`}
            images={offering.images}
            alt={offering.title}
            radius={4}
            dots={false}
            scrollable={false}
            imageFit="cover"
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
            }}
          >
            {offering.blurb}
          </p>
        </button>

        {/* Action row — lighter than mobile so it doesn't dominate the card.
            Tapping Ai expands the inline composer; submitting a question seeds
            and opens the chat drawer. */}
        <CardActionBar
          id={offering.id}
          title={offering.title}
          height={44}
          borderedGlass
          onBuy={onOpen}
          onAsk={(q) => {
            setChatSeed(q);
            setChatOpen(true);
          }}
        />

        {/* AI concierge — slides up inside the card, clipped to its corners */}
        <CardChatDrawer
          offering={offering}
          open={chatOpen}
          initialMessage={chatSeed}
          onAddToCart={onAddToCart}
          onViewProduct={onOpen}
          onClose={() => {
            setChatOpen(false);
            setChatSeed(undefined);
          }}
        />
      </motion.div>
    </motion.div>
  );
}
