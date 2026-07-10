"use client";

import { motion, useDragControls, type PanInfo } from "motion/react";
import { useState } from "react";
import { X, Check, Star } from "lucide-react";
import { type Offering } from "../lib/offerings";
import { T, SPRING } from "../lib/theme";
import { ImageCarousel } from "./image-carousel";
import { CardChatDrawer } from "./card-chat-drawer";

// Content is present immediately (no fade/stagger): during the shared-layout
// morph, fading pieces in drew the eye to areas that made the grid transform
// look less clean. Everything stays visible so the morph reads as one motion.
const content = {
  hidden: { opacity: 1, y: 0 },
  show: () => ({ opacity: 1, y: 0 }),
};

export function OfferingSheet({
  offering,
  isMobile,
  topInset = 0,
  onClose,
  onBuy,
  onAddToCart,
}: {
  offering: Offering;
  isMobile: boolean;
  topInset?: number;
  onClose: () => void;
  onBuy?: () => void;
  onAddToCart?: () => void;
}) {
  const dragControls = useDragControls();
  const [chatOpen, setChatOpen] = useState(false);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 120 || info.velocity.y > 500) onClose();
  };

  // Hero image gallery — shared instance (keeps the layoutId morph intact).
  // 1:1 aspect on both breakpoints so product imagery composes identically to
  // the slideshow card; dots + horizontal scroll are enabled here for browsing.
  const hero = (
    <ImageCarousel
      layoutId={`media-${offering.id}`}
      images={offering.images}
      alt={offering.title}
      radius={0}
      dotBottom={16}
      style={
        isMobile
          ? { width: "100%", aspectRatio: "1 / 1", flexShrink: 0 }
          : { width: "100%", height: "100%", flexShrink: 0 }
      }
    >
      {/* Drag handle (mobile) — starts the dismiss gesture */}
      {isMobile && (
        <div
          onPointerDown={(e) => dragControls.start(e)}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 34,
            display: "grid",
            placeItems: "center",
            cursor: "grab",
            touchAction: "none",
          }}
        >
          <div
            style={{
              marginTop: 10,
              width: 40,
              height: 5,
              borderRadius: 999,
              background: "rgba(20,20,20,0.28)",
            }}
          />
        </div>
      )}
    </ImageCarousel>
  );

  // PDP text content — shared between layouts.
  const body = (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, padding: isMobile ? "18px 20px 24px" : "28px 30px 26px" }}>
      {/* Title, price and rating — all left-aligned in one content column */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingRight: isMobile ? 0 : 30 }}>
        <motion.h2
          variants={content}
          initial="hidden"
          animate="show"
          custom={0}
          style={{
            margin: 0,
            fontSize: 26,
            fontWeight: 600,
            letterSpacing: "-0.025em",
            color: T.textPrimary,
            lineHeight: 1.1,
          }}
        >
          {offering.title}
        </motion.h2>

        <motion.div
          variants={content}
          initial="hidden"
          animate="show"
          custom={0}
          style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}
        >
          <span style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em", color: T.textPrimary }}>
            {offering.price}
          </span>
          <span aria-hidden style={{ width: 1, height: 14, background: T.border }} />
          <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ display: "flex", gap: 1 }}>
              {[0, 1, 2, 3, 4].map((i) => (
                <Star key={i} size={14} strokeWidth={0} fill={i < Math.round(offering.rating) ? T.ink : T.borderActive} />
              ))}
            </span>
            <span style={{ fontSize: 13, color: T.textSecondary }}>
              {offering.rating.toFixed(1)} · {offering.reviews.toLocaleString()} reviews
            </span>
          </span>
        </motion.div>
      </div>

      {/* Description */}
      <motion.p
        variants={content}
        initial="hidden"
        animate="show"
        custom={1}
        style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: T.inkSoft }}
      >
        {offering.description}
      </motion.p>

      {/* Clean feature list — no blocks */}
      <motion.div
        variants={content}
        initial="hidden"
        animate="show"
        custom={2}
        style={{ display: "flex", flexDirection: "column", gap: 11 }}
      >
        {offering.features.map((f) => (
          <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <Check size={17} strokeWidth={2.4} color={T.ink} style={{ flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontSize: 14.5, lineHeight: 1.45, color: T.inkSoft }}>{f}</span>
          </div>
        ))}
      </motion.div>
    </div>
  );

  // Sticky action bar — Add to cart + Buy now + Ai, all in one row.
  const buyBar = (
    <div
      style={{
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: isMobile ? "12px 16px calc(14px + env(safe-area-inset-bottom))" : "14px 20px",
        borderTop: `1px solid ${T.border}`,
        background: "rgba(255,255,255,0.9)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
      }}
    >
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={onAddToCart}
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: 52,
          borderRadius: 999,
          background: T.ghost,
          color: T.textPrimary,
          border: `1px solid ${T.border}`,
          fontSize: 15.5,
          fontWeight: 600,
          letterSpacing: "-0.01em",
          cursor: "pointer",
        }}
      >
        Add to cart
      </motion.button>
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={onBuy}
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: 52,
          borderRadius: 999,
          background: T.ink,
          color: "#fff",
          border: "none",
          fontSize: 15.5,
          fontWeight: 600,
          letterSpacing: "-0.01em",
          cursor: "pointer",
        }}
      >
        Buy now
      </motion.button>
      <motion.button
        whileTap={{ scale: 0.94 }}
        onClick={() => setChatOpen(true)}
        aria-label={`Ask AI about ${offering.title}`}
        style={{
          width: 52,
          height: 52,
          flexShrink: 0,
          display: "grid",
          placeItems: "center",
          borderRadius: "50%",
          background: T.surface,
          color: T.textPrimary,
          border: `1px solid ${T.borderActive}`,
          fontSize: 15,
          fontWeight: 600,
          letterSpacing: "-0.01em",
          cursor: "pointer",
        }}
      >
        Ai
      </motion.button>
    </div>
  );

  const closeButton = (
    <motion.button
      onClick={onClose}
      aria-label="Close"
      whileTap={{ scale: 0.9 }}
      style={{
        position: "absolute",
        top: 12,
        right: 13,
        zIndex: 5,
        width: 34,
        height: 34,
        borderRadius: "50%",
        background: "rgba(255,255,255,0.9)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        border: `1px solid ${T.border}`,
        color: T.textSecondary,
        display: "grid",
        placeItems: "center",
      }}
    >
      <X size={17} strokeWidth={1.9} />
    </motion.button>
  );

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: isMobile ? "flex-end" : "center",
        justifyContent: "center",
        padding: isMobile ? 0 : 28,
        paddingTop: isMobile ? topInset + 8 : 28,
      }}
    >
      {/* Scrim */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(20,20,20,0.14)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        }}
      />

      {/* Panel — morphs from the card via shared layoutId */}
      <motion.div
        layoutId={`card-${offering.id}`}
        drag={isMobile ? "y" : false}
        dragListener={false}
        dragControls={dragControls}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.5 }}
        onDragEnd={handleDragEnd}
        transition={SPRING}
        style={{
          position: "relative",
          width: "100%",
          maxWidth: isMobile ? "100%" : 960,
          height: isMobile ? undefined : "min(600px, 86vh)",
          maxHeight: isMobile ? `calc(100dvh - ${topInset + 16}px)` : "86vh",
          background: T.surface,
          border: `1px solid ${T.border}`,
          borderRadius: isMobile ? 0 : 28,
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          overflow: "hidden",
        }}
      >
        {closeButton}

        {isMobile ? (
          <>
            {/* Stacked: hero scrolls with content, buy bar pinned */}
            <div
              className="feed-scroll"
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: "auto",
                WebkitOverflowScrolling: "touch",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {hero}
              {body}
            </div>
            {buyBar}
            {/* AI concierge — covers the full card on mobile */}
            <CardChatDrawer offering={offering} open={chatOpen} flatTop onClose={() => setChatOpen(false)} />
          </>
        ) : (
          <>
            {/* Two-column PDP: padded square gallery left, content right.
                The 12px inset + radius mirror the slideshow card so the image
                composition stays consistent through the expand transition. */}
            <div
              style={{
                flexShrink: 0,
                height: "100%",
                aspectRatio: "1 / 1",
                padding: 12,
                boxSizing: "border-box",
              }}
            >
              {/* Inner radius = outer 28 − 12 padding, so the corners nest concentrically */}
              <div style={{ position: "relative", height: "100%", width: "100%", borderRadius: 16, overflow: "hidden" }}>
                {hero}
              </div>
            </div>
            {/* Right column is its own section — a hairline divider joins the
                image section and gives the buy bar's top border something to
                meet. position:relative scopes the chat drawer to this panel. */}
            <div
              style={{
                position: "relative",
                flex: 1,
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
                borderLeft: `1px solid ${T.border}`,
              }}
            >
              <div
                className="feed-scroll"
                style={{
                  flex: 1,
                  minHeight: 0,
                  overflowY: "auto",
                  WebkitOverflowScrolling: "touch",
                }}
              >
                {body}
              </div>
              {buyBar}

              {/* AI concierge — slides up over the text panel only, so the
                  product gallery stays visible on the left while chatting. */}
              <CardChatDrawer
                offering={offering}
                open={chatOpen}
                heightPct="92%"
                onClose={() => setChatOpen(false)}
              />
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
