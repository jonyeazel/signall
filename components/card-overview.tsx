"use client";

import { useRef, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import { type Offering } from "../lib/offerings";
import { T, SPRING } from "../lib/theme";

const HATCH = {
  background: T.skeleton,
  backgroundImage:
    "repeating-linear-gradient(-45deg, rgba(0,0,0,0.05) 0px, rgba(0,0,0,0.05) 1.5px, transparent 1.5px, transparent 11px)",
};

/**
 * iOS app-switcher style overview.
 *
 * The vertical feed shrinks into a horizontal deck of scaled-down product
 * cards. The centered card is full-size; neighbors shrink + dim (coverflow),
 * computed per-frame from scroll position (no CSS transform transition — that
 * would fight the rAF writes and stutter). Tap a card to zoom back into it.
 */
export function CardOverview({
  offerings,
  activeIndex,
  onPick,
  onClose,
}: {
  offerings: Offering[];
  activeIndex: number;
  onPick: (index: number) => void;
  onClose: () => void;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const raf = useRef(0);

  const applyTransforms = useCallback(() => {
    const sc = scrollerRef.current;
    if (!sc) return;
    const center = sc.scrollLeft + sc.clientWidth / 2;
    cardRefs.current.forEach((el) => {
      if (!el) return;
      const cardCenter = el.offsetLeft + el.offsetWidth / 2;
      const t = Math.min(Math.abs(center - cardCenter) / sc.clientWidth, 1);
      el.style.transform = `scale(${1 - t * 0.17})`;
      el.style.opacity = String(1 - t * 0.5);
    });
  }, []);

  const onScroll = useCallback(() => {
    if (raf.current) return;
    raf.current = requestAnimationFrame(() => {
      raf.current = 0;
      applyTransforms();
    });
  }, [applyTransforms]);

  // Center the active card on open, then paint the initial coverflow scaling.
  useEffect(() => {
    const sc = scrollerRef.current;
    const el = cardRefs.current[activeIndex];
    if (sc && el) sc.scrollLeft = el.offsetLeft - (sc.clientWidth - el.offsetWidth) / 2;
    applyTransforms();
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 70,
        display: "flex",
        flexDirection: "column",
        background: "rgba(248,248,248,0.72)",
        backdropFilter: "blur(22px) saturate(1.3)",
        WebkitBackdropFilter: "blur(22px) saturate(1.3)",
      }}
    >
      {/* Top row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 18px 4px",
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.02em", color: T.textPrimary }}>
          All products
        </span>
        <motion.button
          type="button"
          onClick={onClose}
          whileTap={{ scale: 0.95 }}
          style={{
            height: 34,
            padding: "0 16px",
            borderRadius: 999,
            background: T.ink,
            color: "#fff",
            border: "none",
            fontSize: 13.5,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Done
        </motion.button>
      </div>

      {/* Horizontal deck — shrinks in from the full feed */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={SPRING}
        style={{ flex: 1, minHeight: 0, display: "flex" }}
      >
        <div
          ref={scrollerRef}
          onScroll={onScroll}
          className="carousel-x"
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            overflowX: "auto",
            overflowY: "hidden",
            scrollSnapType: "x mandatory",
            paddingInline: "17%",
          }}
        >
          {offerings.map((o, i) => (
            <div
              key={o.id}
              ref={(el) => {
                cardRefs.current[i] = el;
              }}
              style={{
                flex: "0 0 66%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                scrollSnapAlign: "center",
                padding: "0 8px",
                willChange: "transform, opacity",
                transformOrigin: "center center",
              }}
            >
              <button
                type="button"
                onClick={() => onPick(i)}
                style={{
                  width: "100%",
                  height: "82%",
                  padding: 0,
                  display: "flex",
                  flexDirection: "column",
                  background: T.surface,
                  border: `1px solid ${T.border}`,
                  borderRadius: 24,
                  overflow: "hidden",
                  cursor: "pointer",
                  textAlign: "left",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                <div style={{ flex: 1, minHeight: 0, ...HATCH }} aria-hidden />
                <div
                  style={{
                    flexShrink: 0,
                    padding: "14px 16px",
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <span
                    style={{
                      fontSize: 16,
                      fontWeight: 600,
                      letterSpacing: "-0.02em",
                      color: T.textPrimary,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {o.title}
                  </span>
                  <span style={{ fontSize: 15, fontWeight: 600, color: T.textPrimary, flexShrink: 0 }}>
                    {o.price}
                  </span>
                </div>
              </button>
            </div>
          ))}
        </div>
      </motion.div>

      <div
        style={{
          flexShrink: 0,
          textAlign: "center",
          padding: "4px 0 calc(16px + env(safe-area-inset-bottom))",
          fontSize: 12.5,
          color: T.textTertiary,
        }}
      >
        Tap a product to open it
      </div>
    </motion.div>
  );
}
