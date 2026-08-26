"use client";

import { motion } from "motion/react";
import { useState, type RefObject } from "react";
import { type Offering } from "../lib/offerings";
import { T, SPRING, MORPH, PANEL_RADIUS, PANEL_PAD, MEDIA_RADIUS } from "../lib/theme";
import { ImageCarousel } from "./image-carousel";
import { CardActionBar } from "./card-action-bar";
import { CardIdentity } from "./card-identity";
import { CardChatDrawer } from "./card-chat-drawer";
import { useArtifact } from "./press-provider";
import { PressSurface } from "./press-surface";

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

  // What this engine last printed. A ready artifact REPLACES the plate — the
  // idle hatch is the machine at rest, the print is the machine mid-show.
  const artifact = useArtifact(offering.id);
  const plate = artifact?.status === "ready" && artifact.url ? [artifact.url] : offering.images;

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
              images={plate}
              alt={offering.title}
              radius={0}
              dots={false}
              scrollable={false}
              style={{ height: "100%", width: "100%" }}
            />
            {/* The machine's output tray — printing chip / save chip / jam
                note. insetTop ducks the save chip under the floating header. */}
            <PressSurface engineId={offering.id} artifact={artifact} inset={14} insetTop={72} />
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
      // Hover lift lives on this OUTER wrapper, never on the layoutId node
      // below: a transform on the element that owns layout projection fights
      // that projection, and since a card is always clicked while hovered, the
      // morph would begin from a node with a live competing scale.
      whileHover={chatOpen ? undefined : { scale: 1.01 }}
      style={{ width: "100%", transformOrigin: "center center" }}
    >
      <motion.div
        layoutId={`card-${offering.id}`}
        transition={MORPH}
        style={{
          position: "relative",
          width: "100%",
          background: T.surface,
          border: `1px solid ${T.border}`,
          borderRadius: PANEL_RADIUS,
          padding: PANEL_PAD,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          overflow: "hidden",
        }}
      >
        <div
          onClick={onOpen}
          style={{ position: "relative", width: "100%", aspectRatio: "1 / 1", flexShrink: 0, cursor: "pointer" }}
        >
          {/* Slideshow view: a single 1:1 hero, no dots and not scrollable —
              browsing images belongs to the expanded card, so this never
              hijacks the horizontal slide between products.
              MEDIA_RADIUS is shared with the sheet so the morph never animates
              curvature — see the token's note in lib/theme.ts. */}
          <ImageCarousel
            layoutId={`media-${offering.id}`}
            images={plate}
            alt={offering.title}
            radius={MEDIA_RADIUS}
            dots={false}
            scrollable={false}
            style={{ height: "100%", width: "100%" }}
          />
          {/* The machine's output tray — printing chip / save chip / jam note */}
          <PressSurface engineId={offering.id} artifact={artifact} />
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
