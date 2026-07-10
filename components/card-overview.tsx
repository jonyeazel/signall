"use client";

import { useRef, useEffect, useLayoutEffect, useState, useCallback } from "react";
import { motion } from "motion/react";
import { type Offering } from "../lib/offerings";
import { T, SPRING } from "../lib/theme";
import { CardIdentity } from "./card-identity";

type Dims = { w: number; h: number; pad: number; vw: number; vh: number; f: number };

/**
 * A pixel-perfect miniature of the full-bleed product card. It is rendered at
 * the real viewport size (vw × vh) and uniformly scaled down, so proportions
 * are identical to the live card — just smaller.
 */
function CardFace({ offering, vw, vh, f }: { offering: Offering; vw: number; vh: number; f: number }) {
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: vw,
        height: vh,
        transform: `scale(${f})`,
        transformOrigin: "top left",
      }}
    >
      <div style={{ position: "relative", width: "100%", height: "100%", background: T.surface, overflow: "hidden" }}>
        <img
          src={offering.images[0] || "/placeholder.svg"}
          alt={offering.title}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            padding: "12px 12px 14px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <CardIdentity offering={offering} />

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                flex: 1,
                height: 46,
                borderRadius: 999,
                background: T.ink,
                color: "#fff",
                display: "grid",
                placeItems: "center",
                fontSize: 15.5,
                fontWeight: 600,
              }}
            >
              Learn more
            </div>
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: 999,
                background: T.bgSubtle,
                border: `1px solid ${T.borderActive}`,
                display: "grid",
                placeItems: "center",
                fontSize: 15,
                fontWeight: 600,
                color: T.textPrimary,
                flexShrink: 0,
              }}
            >
              Ai
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * iOS app-switcher style overview.
 *
 * The vertical feed shrinks into a horizontal deck of miniature product cards
 * (exact proportions of the live card). The centered card is largest; neighbors
 * shrink + dim (coverflow), computed per-frame from scroll position. Tapping a
 * card uniformly zooms it from its spot up to full-bleed, then opens it — so the
 * expand reads as one continuous, intuitive motion.
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
  const [dims, setDims] = useState<Dims | null>(null);
  const [picked, setPicked] = useState<{ i: number; rect: DOMRect } | null>(null);
  const pickedRef = useRef(false);

  // Size the miniature to the live card's exact aspect ratio (vw : vh), filling
  // most of the deck height and a generous share of the width.
  useLayoutEffect(() => {
    const compute = () => {
      const sc = scrollerRef.current;
      if (!sc) return;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const ratio = vw / vh;
      let h = sc.clientHeight * 0.94;
      let w = h * ratio;
      const maxW = vw * 0.86;
      if (w > maxW) {
        w = maxW;
        h = w / ratio;
      }
      const pad = Math.max(10, (sc.clientWidth - w) / 2 - 6);
      setDims({ w: Math.round(w), h: Math.round(h), pad: Math.round(pad), vw, vh, f: w / vw });
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, []);

  const applyTransforms = useCallback(() => {
    if (pickedRef.current) return;
    const sc = scrollerRef.current;
    if (!sc) return;
    const center = sc.scrollLeft + sc.clientWidth / 2;
    cardRefs.current.forEach((el) => {
      if (!el) return;
      const cardCenter = el.offsetLeft + el.offsetWidth / 2;
      const t = Math.min(Math.abs(center - cardCenter) / sc.clientWidth, 1);
      el.style.transform = `scale(${1 - t * 0.14})`;
      el.style.opacity = String(1 - t * 0.42);
    });
  }, []);

  const onScroll = useCallback(() => {
    if (raf.current) return;
    raf.current = requestAnimationFrame(() => {
      raf.current = 0;
      applyTransforms();
    });
  }, [applyTransforms]);

  // Center the active card once sized, then paint the initial coverflow scaling.
  useEffect(() => {
    if (!dims) return;
    const sc = scrollerRef.current;
    const el = cardRefs.current[activeIndex];
    if (sc && el) sc.scrollLeft = el.offsetLeft - (sc.clientWidth - el.offsetWidth) / 2;
    applyTransforms();
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dims]);

  const handlePick = useCallback((i: number, e: React.MouseEvent<HTMLButtonElement>) => {
    if (pickedRef.current) return;
    pickedRef.current = true;
    const rect = e.currentTarget.getBoundingClientRect();
    setPicked({ i, rect });
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
          opacity: picked ? 0 : 1,
          transition: "opacity 0.25s ease",
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
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
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
            paddingInline: dims ? dims.pad : "12%",
            opacity: picked ? 0 : 1,
            transition: "opacity 0.25s ease",
          }}
        >
          {dims &&
            offerings.map((o, i) => (
              <div
                key={o.id}
                ref={(el) => {
                  cardRefs.current[i] = el;
                }}
                style={{
                  flex: `0 0 ${dims.w}px`,
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  scrollSnapAlign: "center",
                  padding: "0 6px",
                  willChange: "transform, opacity",
                  transformOrigin: "center center",
                }}
              >
                <button
                  type="button"
                  onClick={(e) => handlePick(i, e)}
                  style={{
                    position: "relative",
                    width: dims.w,
                    height: dims.h,
                    padding: 0,
                    background: T.surface,
                    border: `1px solid ${T.border}`,
                    borderRadius: 0,
                    overflow: "hidden",
                    cursor: "pointer",
                    boxShadow: "0 18px 40px -16px rgba(0,0,0,0.28)",
                    WebkitTapHighlightColor: "transparent",
                  }}
                >
                  <CardFace offering={o} vw={dims.vw} vh={dims.vh} f={dims.f} />
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
          opacity: picked ? 0 : 1,
          transition: "opacity 0.2s ease",
        }}
      >
        Tap a product to open it
      </div>

      {/* Zoom-to-open: the tapped miniature grows uniformly from its spot to
          full-bleed, then hands off to the feed already positioned on it. */}
      {picked && dims && (
        <motion.div
          initial={{ x: picked.rect.left, y: picked.rect.top, scale: picked.rect.width / dims.vw }}
          animate={{ x: 0, y: 0, scale: 1 }}
          transition={SPRING}
          onAnimationComplete={() => onPick(picked.i)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: dims.vw,
            height: dims.vh,
            transformOrigin: "top left",
            zIndex: 90,
            overflow: "hidden",
            background: T.surface,
          }}
        >
          <CardFace offering={offerings[picked.i]} vw={dims.vw} vh={dims.vh} f={1} />
        </motion.div>
      )}
    </motion.div>
  );
}
