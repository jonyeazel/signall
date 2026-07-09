"use client";

import { motion, type PanInfo } from "motion/react";
import { X, Check, ArrowRight } from "lucide-react";
import { type Offering } from "../lib/offerings";
import { T, SPRING, SPRING_SOFT } from "../lib/theme";
import { ChatComposer } from "./chat-composer";
import { HatchPlaceholder } from "./hatch-placeholder";

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
  onClose,
}: {
  offering: Offering;
  isMobile: boolean;
  onClose: () => void;
}) {
  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 120 || info.velocity.y > 500) onClose();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: isMobile ? "flex-end" : "center",
        justifyContent: "center",
        padding: isMobile ? 0 : 24,
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
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.55 }}
        onDragEnd={handleDragEnd}
        transition={SPRING}
        style={{
          position: "relative",
          width: "100%",
          maxWidth: isMobile ? "100%" : 560,
          maxHeight: isMobile ? "92vh" : "88vh",
          background: T.surface,
          border: `1px solid ${T.border}`,
          borderRadius: isMobile ? "28px 28px 0 0" : 28,
          boxShadow: "0 -8px 40px -12px rgba(0,0,0,0.22), 0 30px 60px -20px rgba(0,0,0,0.3)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Drag handle (mobile) */}
        {isMobile && (
          <div style={{ display: "grid", placeItems: "center", padding: "10px 0 2px" }}>
            <div style={{ width: 38, height: 5, borderRadius: 999, background: T.borderActive }} />
          </div>
        )}

        {/* Scrollable body */}
        <div
          style={{
            overflowY: "auto",
            padding: isMobile ? "0 20px 22px" : "0 28px 28px",
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          {/* Full-bleed morphing banner */}
          <HatchPlaceholder
            layoutId={`media-${offering.id}`}
            radius={0}
            style={{
              height: isMobile ? 150 : 190,
              marginLeft: isMobile ? -20 : -28,
              marginRight: isMobile ? -20 : -28,
              marginTop: isMobile ? 0 : 0,
              width: "auto",
            }}
          >
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
              }}
            >
              {offering.index}
            </motion.span>
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
                width: 34,
                height: 34,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.82)",
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
          </HatchPlaceholder>

          {/* Title + price + tagline */}
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 14 }}>
              <motion.h2
                layoutId={`title-${offering.id}`}
                style={{
                  margin: 0,
                  fontSize: 25,
                  fontWeight: 600,
                  letterSpacing: "-0.025em",
                  color: T.textPrimary,
                  lineHeight: 1.1,
                }}
              >
                {offering.title}
              </motion.h2>
              <motion.span
                layoutId={`price-${offering.id}`}
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
            <motion.p
              variants={content}
              initial="hidden"
              animate="show"
              custom={0}
              style={{ margin: 0, fontSize: 14.5, lineHeight: 1.55, color: T.textSecondary }}
            >
              {offering.tagline}
            </motion.p>
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

          {/* Stat band */}
          <motion.div
            variants={content}
            initial="hidden"
            animate="show"
            custom={2}
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
            custom={3}
            style={{ display: "flex", flexDirection: "column", gap: 10 }}
          >
            <span style={{ fontSize: 12, fontWeight: 600, color: T.textTertiary, textTransform: "uppercase", letterSpacing: "0.07em" }}>
              What&apos;s included
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
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

          {/* Contextual AI composer */}
          <motion.div variants={content} initial="hidden" animate="show" custom={4} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: T.textTertiary, textTransform: "uppercase", letterSpacing: "0.07em" }}>
              Ask about this
            </span>
            <ChatComposer placeholder={`Ask anything about ${offering.title}...`} />
          </motion.div>

          {/* CTA */}
          <motion.button
            variants={content}
            initial="hidden"
            animate="show"
            custom={5}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              width: "100%",
              padding: "15px 20px",
              borderRadius: 14,
              background: T.ink,
              color: "#fff",
              border: "none",
              fontSize: 15,
              fontWeight: 600,
            }}
          >
            {offering.cta}
            <ArrowRight size={17} strokeWidth={2} />
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
