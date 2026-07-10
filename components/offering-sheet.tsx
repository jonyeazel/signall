"use client";

import { motion, useDragControls, type PanInfo } from "motion/react";
import { X, Check, Star, ShoppingBag, Truck, ShieldCheck } from "lucide-react";
import { type Offering } from "../lib/offerings";
import { T, SPRING, SPRING_SOFT } from "../lib/theme";
import { ImageCarousel } from "./image-carousel";

const content = {
  hidden: { opacity: 0, y: 14 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.12 + i * 0.05, ...SPRING_SOFT },
  }),
};

export function OfferingSheet({
  offering,
  isMobile,
  topInset = 0,
  onClose,
}: {
  offering: Offering;
  isMobile: boolean;
  topInset?: number;
  onClose: () => void;
}) {
  const dragControls = useDragControls();

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 120 || info.velocity.y > 500) onClose();
  };

  // Hero image gallery — shared instance (keeps the layoutId morph intact).
  const hero = (
    <ImageCarousel
      layoutId={`media-${offering.id}`}
      count={4}
      radius={0}
      style={{ height: isMobile ? 320 : "100%", width: "100%", flexShrink: 0 }}
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
              background: "rgba(20,20,20,0.25)",
              boxShadow: "0 0 0 1px rgba(255,255,255,0.5)",
            }}
          />
        </div>
      )}

      <motion.span
        layoutId={`index-${offering.id}`}
        style={{
          position: "absolute",
          top: 14,
          left: 15,
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
  );

  // PDP text content — shared between layouts.
  const body = (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, padding: isMobile ? "18px 20px 24px" : "28px 30px 26px" }}>
      {/* Title + price */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 14, paddingRight: isMobile ? 0 : 30 }}>
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
          <motion.span
            variants={content}
            initial="hidden"
            animate="show"
            custom={0}
            style={{
              fontSize: 20,
              fontWeight: 600,
              letterSpacing: "-0.02em",
              color: T.textPrimary,
              flexShrink: 0,
            }}
          >
            {offering.price}
          </motion.span>
        </div>

        {/* Review stars */}
        <motion.div
          variants={content}
          initial="hidden"
          animate="show"
          custom={0}
          style={{ display: "flex", alignItems: "center", gap: 8 }}
        >
          <div style={{ display: "flex", gap: 1 }}>
            {[0, 1, 2, 3, 4].map((i) => (
              <Star key={i} size={14} strokeWidth={0} fill={i < 5 ? T.ink : T.borderActive} />
            ))}
          </div>
          <span style={{ fontSize: 13, color: T.textSecondary }}>4.9 · 128 reviews</span>
        </motion.div>
      </div>

      {/* Description */}
      <motion.p
        variants={content}
        initial="hidden"
        animate="show"
        custom={1}
        style={{ margin: 0, fontSize: 15, lineHeight: 1.65, color: T.inkSoft }}
      >
        {offering.description}
      </motion.p>

      {/* Trust row */}
      <motion.div
        variants={content}
        initial="hidden"
        animate="show"
        custom={2}
        style={{ display: "flex", gap: 10 }}
      >
        {[
          { icon: Truck, label: "Fast shipping" },
          { icon: ShieldCheck, label: "2-year warranty" },
        ].map(({ icon: Icon, label }) => (
          <div
            key={label}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 12px",
              background: T.bgSubtle,
              border: `1px solid ${T.border}`,
              borderRadius: 12,
            }}
          >
            <Icon size={16} strokeWidth={1.8} color={T.textSecondary} />
            <span style={{ fontSize: 12.5, fontWeight: 500, color: T.textSecondary }}>{label}</span>
          </div>
        ))}
      </motion.div>

      {/* Stat band */}
      <motion.div
        variants={content}
        initial="hidden"
        animate="show"
        custom={3}
        style={{
          display: "flex",
          background: T.bgSubtle,
          border: `1px solid ${T.border}`,
          borderRadius: 16,
          overflow: "hidden",
        }}
      >
        {offering.stats.map((s, i) => (
          <div
            key={s.label}
            style={{
              flex: 1,
              padding: "14px 12px",
              display: "flex",
              flexDirection: "column",
              gap: 3,
              alignItems: "center",
              borderLeft: i === 0 ? "none" : `1px solid ${T.border}`,
            }}
          >
            <span style={{ fontSize: 19, fontWeight: 600, color: T.textPrimary, letterSpacing: "-0.02em" }}>
              {s.value}
            </span>
            <span style={{ fontSize: 11.5, color: T.textTertiary, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {s.label}
            </span>
          </div>
        ))}
      </motion.div>

      {/* Features */}
      <motion.div
        variants={content}
        initial="hidden"
        animate="show"
        custom={4}
        style={{ display: "flex", flexDirection: "column", gap: 12 }}
      >
        <span style={{ fontSize: 12, fontWeight: 600, color: T.textTertiary, textTransform: "uppercase", letterSpacing: "0.07em" }}>
          What&apos;s included
        </span>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {offering.features.map((f) => (
            <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  background: T.ink,
                  color: "#fff",
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                  marginTop: 1,
                }}
              >
                <Check size={12} strokeWidth={2.4} />
              </div>
              <span style={{ fontSize: 14, lineHeight: 1.5, color: T.inkSoft }}>{f}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );

  // Sticky buy bar — CRO-optimized PDP footer.
  const buyBar = (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.28, ...SPRING_SOFT }}
      style={{
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: isMobile ? "12px 16px calc(14px + env(safe-area-inset-bottom))" : "14px 20px",
        borderTop: `1px solid ${T.border}`,
        background: "rgba(255,255,255,0.9)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
        <span style={{ fontSize: 11, color: T.textTertiary, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Price
        </span>
        <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", color: T.textPrimary }}>
          {offering.price}
        </span>
      </div>
      <motion.button
        whileTap={{ scale: 0.98 }}
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 9,
          height: 52,
          borderRadius: 14,
          background: T.ink,
          color: "#fff",
          border: "none",
          fontSize: 16,
          fontWeight: 600,
          letterSpacing: "-0.01em",
          cursor: "pointer",
        }}
      >
        <ShoppingBag size={18} strokeWidth={2} />
        Add to cart
      </motion.button>
    </motion.div>
  );

  const closeButton = (
    <motion.button
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.15 }}
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
          background: "rgba(20,20,20,0.28)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
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
          borderRadius: isMobile ? "26px 26px 0 0" : 28,
          boxShadow: "0 -8px 40px -12px rgba(0,0,0,0.22), 0 30px 60px -20px rgba(0,0,0,0.3)",
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
          </>
        ) : (
          <>
            {/* Two-column PDP: gallery left, scrollable content right */}
            <div style={{ flex: "0 0 44%", position: "relative", overflow: "hidden" }}>{hero}</div>
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
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
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
