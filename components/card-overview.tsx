"use client";

import { useRef, useEffect, useLayoutEffect, useState, useCallback } from "react";
import { motion } from "motion/react";
import { type Offering } from "../lib/offerings";
import { T, SPRING } from "../lib/theme";

type Dims = { w: number; h: number; pad: number; vw: number; vh: number; f: number };

// Corner radius applied to the miniature cards in THIS slideshow view only.
// The live full-bleed cards stay square.
const CARD_RADIUS = 28;

// Height reserved beneath the photo for the centered explainer text.
const TEXT_H = 104;

/**
 * The shrunken slideshow card: a clean, chrome-free product photo up top with
 * the two explainer lines centered beneath it. No name overlay, no buttons —
 * the image says what it is, the two lines say what it does. (The name is kept,
 * small and quiet, to ground the card.)
 */
function MiniCard({ offering }: { offering: Offering }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        background: T.surface,
      }}
    >
      <div style={{ position: "relative", flex: `0 0 calc(100% - ${TEXT_H}px)`, overflow: "hidden" }}>
        <img
          src={offering.images[0] || "/placeholder.svg"}
          alt={offering.title}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 5,
          padding: "0 18px",
          textAlign: "center",
        }}
      >
        <span
          style={{
            fontSize: 14.5,
            fontWeight: 600,
            letterSpacing: "-0.01em",
            color: T.textPrimary,
            lineHeight: 1.1,
          }}
        >
          {offering.title}
        </span>
        <p
          style={{
            margin: 0,
            fontSize: 13.5,
            lineHeight: 1.45,
            color: T.textSecondary,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            maxWidth: "34ch",
          }}
        >
          {offering.description}
        </p>
      </div>
    </div>
  );
}

/**
 * The zoom-to-open morph. The photo grows uniformly from the miniature's image
 * area up to full-bleed while the centered explainer text lifts a touch and
 * fades — as if the words are absorbed into the image. On completion it hands
 * off to the immersive card, whose own overlay text fades in on top. This is
 * the "text below → text on top" transition, kept graceful and robust.
 */
function ExpandingCard({
  offering,
  card,
  vw,
  vh,
  onDone,
}: {
  offering: Offering;
  card: DOMRect;
  vw: number;
  vh: number;
  onDone: () => void;
}) {
  const imageH = card.height - TEXT_H;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 90, pointerEvents: "none" }}>
      {/* Photo: from the mini's image box to full-bleed */}
      <motion.div
        initial={{ top: card.top, left: card.left, width: card.width, height: imageH, borderRadius: CARD_RADIUS }}
        animate={{ top: 0, left: 0, width: vw, height: vh, borderRadius: 0 }}
        transition={SPRING}
        onAnimationComplete={onDone}
        style={{ position: "absolute", overflow: "hidden", background: T.surface }}
      >
        <img
          src={offering.images[0] || "/placeholder.svg"}
          alt=""
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />
      </motion.div>

      {/* Explainer text: lifts slightly and fades as the photo takes over */}
      <motion.div
        initial={{ top: card.top + imageH, left: card.left, width: card.width, opacity: 1 }}
        animate={{ top: card.top + imageH - 28, opacity: 0 }}
        transition={{ ...SPRING, opacity: { duration: 0.28, ease: "easeIn" } }}
        style={{
          position: "absolute",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 5,
          padding: "10px 18px 0",
          textAlign: "center",
        }}
      >
        <span style={{ fontSize: 14.5, fontWeight: 600, letterSpacing: "-0.01em", color: T.textPrimary }}>
          {offering.title}
        </span>
        <p
          style={{
            margin: 0,
            fontSize: 13.5,
            lineHeight: 1.45,
            color: T.textSecondary,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            maxWidth: "34ch",
          }}
        >
          {offering.description}
        </p>
      </motion.div>
    </div>
  );
}

/**
 * iOS app-switcher style overview.
 *
 * The vertical feed shrinks into a horizontal deck of miniature product cards.
 * The centered card is largest; neighbors shrink + dim (coverflow), computed
 * per-frame from scroll position. Tapping a card zooms its photo from its spot
 * up to full-bleed, then opens it — so the expand reads as one continuous,
 * intuitive motion.
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
  const [current, setCurrent] = useState(activeIndex);
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
      let h = sc.clientHeight * 0.92;
      let w = h * ratio;
      // Slightly narrower so a clear sliver of the neighbouring cards shows —
      // a natural affordance that there's more to scroll.
      const maxW = vw * 0.8;
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
    let nearest = 0;
    let nearestDist = Infinity;
    cardRefs.current.forEach((el, i) => {
      if (!el) return;
      const cardCenter = el.offsetLeft + el.offsetWidth / 2;
      const dist = Math.abs(center - cardCenter);
      const t = Math.min(dist / sc.clientWidth, 1);
      el.style.transform = `scale(${1 - t * 0.14})`;
      el.style.opacity = String(1 - t * 0.42);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = i;
      }
    });
    setCurrent((prev) => (prev === nearest ? prev : nearest));
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
          padding: "calc(16px + env(safe-area-inset-top)) 18px 4px",
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
                    borderRadius: CARD_RADIUS,
                    overflow: "hidden",
                    cursor: "pointer",
                    WebkitTapHighlightColor: "transparent",
                  }}
                >
                  <MiniCard offering={o} />
                </button>
              </div>
            ))}
        </div>
      </motion.div>

      {/* Pagination dots — reflect the centered card as you scroll */}
      <div
        style={{
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          padding: "6px 0 calc(18px + env(safe-area-inset-bottom))",
          opacity: picked ? 0 : 1,
          transition: "opacity 0.2s ease",
        }}
      >
        {offerings.map((o, i) => (
          <span
            key={o.id}
            style={{
              width: i === current ? 20 : 6,
              height: 6,
              borderRadius: 999,
              background: i === current ? T.ink : T.borderActive,
              transition: "width 0.28s ease, background 0.28s ease",
            }}
          />
        ))}
      </div>

      {/* Zoom-to-open morph */}
      {picked && dims && (
        <ExpandingCard
          offering={offerings[picked.i]}
          card={picked.rect}
          vw={dims.vw}
          vh={dims.vh}
          onDone={() => onPick(picked.i)}
        />
      )}
    </motion.div>
  );
}
