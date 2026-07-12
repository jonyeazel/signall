"use client";

import { useRef, useEffect, useLayoutEffect, useState, useCallback } from "react";
import { motion } from "motion/react";
import { type Offering } from "../lib/offerings";
import { T } from "../lib/theme";

type Dims = {
  photoW: number;
  photoH: number;
  itemW: number;
  pad: number;
  vw: number;
  vh: number;
};

// Corner radius on the miniature photo (this slideshow view only).
const CARD_RADIUS = 26;
// Vertical space reserved beneath each photo for the centered explainer text.
const TEXT_H = 88;
// Gap between the photo and the text block.
const TEXT_GAP = 16;

// A calm, controlled morph — enough spring to feel alive, no wobble.
const MORPH = { type: "spring" as const, stiffness: 300, damping: 34 };

/** The centered explainer block: a small quiet name + the two-line blurb.
 *  Rendered on the frosted overview backdrop (never on a white panel). */
function Explainer({ offering, faded }: { offering: Offering; faded?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        padding: "0 10px",
        textAlign: "center",
        opacity: faded ? 0 : 1,
      }}
    >
      <span
        style={{
          fontSize: 13,
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
          fontSize: 13,
          lineHeight: 1.4,
          color: T.textSecondary,
          maxWidth: "32ch",
        }}
      >
        {offering.blurb}
      </p>
    </div>
  );
}

/**
 * The zoom-to-open morph. The photo grows uniformly from the miniature's photo
 * frame up to full-bleed while the centered explainer text beneath it fades —
 * as if the words are absorbed into the image. On completion it hands off to
 * the immersive card, whose own overlay text fades in on top. This is the
 * "text below → text on top" transition.
 */
function ExpandingCard({
  offering,
  photo,
  vw,
  vh,
  onDone,
}: {
  offering: Offering;
  photo: DOMRect;
  vw: number;
  vh: number;
  onDone: () => void;
}) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 90, pointerEvents: "none" }}>
      {/* Explainer text sitting just under the photo — fades + lifts away */}
      <motion.div
        initial={{ top: photo.bottom + TEXT_GAP, opacity: 1 }}
        animate={{ top: photo.bottom + TEXT_GAP - 20, opacity: 0 }}
        transition={{ duration: 0.22, ease: "easeIn" }}
        style={{ position: "absolute", left: 0, right: 0, display: "flex", justifyContent: "center" }}
      >
        <Explainer offering={offering} />
      </motion.div>

      {/* Photo: from the mini's frame to full-bleed */}
      <motion.div
        initial={{ top: photo.top, left: photo.left, width: photo.width, height: photo.height, borderRadius: CARD_RADIUS }}
        animate={{ top: 0, left: 0, width: vw, height: vh, borderRadius: 0 }}
        transition={MORPH}
        onAnimationComplete={onDone}
        style={{ position: "absolute", overflow: "hidden", background: T.surface }}
      >
        <img
          src={offering.images[0] || "/placeholder.svg"}
          alt=""
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />
      </motion.div>
    </div>
  );
}

/**
 * iOS app-switcher style overview.
 *
 * The vertical feed shrinks into a horizontal deck of product cards — each a
 * clean, chrome-free photo with its name + two-line blurb centered beneath it.
 * The centered card is largest; neighbors shrink + dim (coverflow). Tapping a
 * card zooms its photo from its spot up to full-bleed, then opens it.
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

  // Size the photo to the live card's aspect ratio (vw : vh), filling most of
  // the deck height minus the reserved text space beneath it.
  useLayoutEffect(() => {
    const compute = () => {
      const sc = scrollerRef.current;
      if (!sc) return;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const ratio = vw / vh;
      const avail = sc.clientHeight;
      let photoH = avail * 0.9 - TEXT_H - TEXT_GAP;
      let photoW = photoH * ratio;
      const maxW = vw * 0.8;
      if (photoW > maxW) {
        photoW = maxW;
        photoH = photoW / ratio;
      }
      const itemW = Math.round(photoW);
      const pad = Math.max(10, (sc.clientWidth - itemW) / 2 - 6);
      setDims({
        photoW: Math.round(photoW),
        photoH: Math.round(photoH),
        itemW,
        pad: Math.round(pad),
        vw,
        vh,
      });
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
      el.style.transform = `scale(${1 - t * 0.12})`;
      el.style.opacity = String(1 - t * 0.4);
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
    // Measure the PHOTO element (not the whole column) so the morph grows from
    // the image exactly.
    const photoEl = e.currentTarget.querySelector<HTMLElement>("[data-photo]");
    const rect = (photoEl ?? e.currentTarget).getBoundingClientRect();
    pickedRef.current = true;
    setPicked({ i, rect });
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
      onClick={onClose}
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
      {/* Horizontal deck — shrinks in from the full feed. No header chrome:
          the photos + text own the whole height. Tapping the empty backdrop
          closes; taps on a card are stopped from bubbling. */}
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        transition={MORPH}
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          paddingTop: "env(safe-area-inset-top)",
        }}
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
            transition: "opacity 0.3s ease",
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
                  flex: `0 0 ${dims.itemW}px`,
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: TEXT_GAP,
                  scrollSnapAlign: "center",
                  padding: "0 6px",
                  willChange: "transform, opacity",
                  transformOrigin: "center center",
                }}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePick(i, e);
                  }}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: TEXT_GAP,
                    padding: 0,
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    WebkitTapHighlightColor: "transparent",
                  }}
                >
                  {/* Photo frame — the only bordered/rounded surface */}
                  <div
                    data-photo
                    style={{
                      position: "relative",
                      width: dims.photoW,
                      height: dims.photoH,
                      borderRadius: CARD_RADIUS,
                      overflow: "hidden",
                      background: T.surface,
                      border: `1px solid ${T.border}`,
                    }}
                  >
                    <img
                      src={o.images[0] || "/placeholder.svg"}
                      alt={o.title}
                      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  </div>
                  {/* Explainer beneath, on the frosted backdrop */}
                  <div style={{ height: TEXT_H, display: "flex", alignItems: "flex-start" }}>
                    <Explainer offering={o} />
                  </div>
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
          padding: "2px 0 calc(20px + env(safe-area-inset-bottom))",
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
          photo={picked.rect}
          vw={dims.vw}
          vh={dims.vh}
          onDone={() => onPick(picked.i)}
        />
      )}
    </motion.div>
  );
}
