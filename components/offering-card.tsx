"use client";

import { motion } from "motion/react";
import { Star } from "lucide-react";
import { type RefObject } from "react";
import { type Offering } from "../lib/offerings";
import { T, SPRING } from "../lib/theme";
import { ImageCarousel } from "./image-carousel";
import { CardActionBar } from "./card-action-bar";

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
            border: `1px solid ${T.border}`,
            borderRadius: 24,
            overflow: "hidden",
          }}
        >
          {/* Full-bleed gallery */}
          <div
            onClick={onOpen}
            style={{ position: "absolute", inset: 0, cursor: "pointer" }}
          >
            <ImageCarousel
              layoutId={`media-${offering.id}`}
              images={offering.images}
              alt={offering.title}
              radius={24}
              dotBottom={150}
              scrollable={imageScrollable}
              style={{ height: "100%", width: "100%" }}
            />
          </div>

          {/* Top veil — keeps the floating header legible over the image */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 132,
              background: "linear-gradient(to bottom, rgba(251,251,251,0.92), rgba(251,251,251,0))",
              pointerEvents: "none",
              zIndex: 1,
            }}
          />

          {/* Bottom overlay — hook + social proof + buy row */}
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 2,
              padding: "56px 12px 12px",
              display: "flex",
              flexDirection: "column",
              gap: 10,
              background:
                "linear-gradient(to top, rgba(251,251,251,0.98) 0%, rgba(251,251,251,0.96) 42%, rgba(251,251,251,0) 100%)",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: "0 4px" }}>
              <p
                style={{
                  margin: 0,
                  fontSize: 15,
                  fontWeight: 500,
                  lineHeight: 1.35,
                  letterSpacing: "-0.01em",
                  color: T.textPrimary,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {offering.tagline}
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Star size={13} strokeWidth={0} fill={T.ink} />
                <span style={{ fontSize: 12.5, color: T.textSecondary, letterSpacing: "-0.01em" }}>
                  {offering.rating.toFixed(1)} · {offering.reviews.toLocaleString()} reviews
                </span>
              </div>
            </div>

            <CardActionBar id={offering.id} title={offering.title} price={offering.price} onBuy={onOpen} />
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
            radius={14}
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
            {offering.tagline}
          </p>
        </button>
      </motion.div>
    </motion.div>
  );
}
