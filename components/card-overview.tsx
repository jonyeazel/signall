"use client";

import { useRef, useEffect, useLayoutEffect, useState, useCallback } from "react";
import { motion, useReducedMotion } from "motion/react";
import { type Offering } from "../lib/offerings";
import { T, WHISPER_PATTERN } from "../lib/theme";
import { HatchPlaceholder } from "./hatch-placeholder";
import { CardIdentity } from "./card-identity";
import { CardActionBar } from "./card-action-bar";

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

// The zoom-open photo uses a fixed-duration tween (not a spring) so the
// handoff to the immersive card fires exactly when the photo *visually* fills
// the screen — a spring's long settle tail is what made the "text on top"
// arrive a beat late.
const PHOTO_MORPH = { type: "tween" as const, duration: 0.44, ease: [0.32, 0.72, 0, 1] as const };

// Entering the overview (the shrink) is deliberately slower than opening a
// card: opening should feel eager, but stepping back should feel like the
// feed calmly settling into its deck. An ease-in-out over a longer beat reads
// composed where the snappy open curve read rushed.
const ENTER_MORPH = { type: "tween" as const, duration: 0.68, ease: [0.65, 0, 0.35, 1] as const };
// How long the deck / frost / dots take to materialize *during* the shrink —
// they finish together with ENTER_MORPH so nothing pops in after it lands.
const ENTER_FADE = 0.6;

/** The centered explainer block: a small quiet name + the two-line blurb.
 *  Rendered on the frosted overview backdrop (never on a white panel). */
function Explainer({ offering, faded }: { offering: Offering; faded?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        padding: "0 10px",
        textAlign: "center",
        opacity: faded ? 0 : 1,
      }}
    >
      <span
        style={{
          fontSize: 19,
          fontWeight: 600,
          letterSpacing: "-0.02em",
          color: T.textPrimary,
          lineHeight: 1.15,
        }}
      >
        {offering.title}
      </span>
      <p
        style={{
          margin: 0,
          fontSize: 13.5,
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
 * A non-interactive copy of the live card's bottom chrome (identity block +
 * action row), pixel-matched to OfferingCard's mobile overlay. The morph
 * clones render it so the card's text doesn't vanish/appear in a single frame
 * at either end of the transition: it dissolves OUT as the card shrinks into
 * the deck, and dissolves IN as a picked card lands full-bleed.
 *
 * The action bar gets a `-ghost` id: its internal `ai-surface-${id}` layoutId
 * would otherwise collide with the real card's bar (both mounted at once) and
 * motion would fly the AI button between them.
 */
function ChromeGhost({ offering }: { offering: Offering }) {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        padding: "12px 12px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        pointerEvents: "none",
      }}
    >
      <CardIdentity offering={offering} />
      <CardActionBar id={`${offering.id}-ghost`} title={offering.title} height={58} />
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
        animate={{ top: photo.bottom + TEXT_GAP - 24, opacity: 0 }}
        transition={{ duration: 0.16, ease: "easeIn" }}
        style={{ position: "absolute", left: 0, right: 0, display: "flex", justifyContent: "center" }}
      >
        <Explainer offering={offering} />
      </motion.div>

      {/* Photo: from the mini's frame to full-bleed */}
      <motion.div
        initial={{ top: photo.top, left: photo.left, width: photo.width, height: photo.height, borderRadius: CARD_RADIUS }}
        animate={{ top: 0, left: 0, width: vw, height: vh, borderRadius: 0 }}
        transition={PHOTO_MORPH}
        onAnimationComplete={onDone}
        style={{ position: "absolute", overflow: "hidden", background: T.surface }}
      >
        <HatchPlaceholder
          src={offering.images?.[0]}
          radius={0}
          style={{ position: "absolute", inset: 0 }}
        />
        {/* The card's chrome rides in during the landing beat (finishes at
            0.24 + 0.2 = the morph's 0.44s), so when the overview dissolves
            away the real card's chrome is already painted underneath in the
            exact same place — the handoff swaps identical pixels. */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2, delay: 0.24, ease: "easeOut" }}
          style={{ position: "absolute", inset: 0 }}
        >
          <ChromeGhost offering={offering} />
        </motion.div>
      </motion.div>
    </div>
  );
}

/**
 * The zoom-to-CLOSE morph (opening the overview). The inverse of ExpandingCard:
 * the full-bleed card you were viewing shrinks down into its miniature photo
 * frame in the deck, while the centered explainer text settles in beneath it.
 * On completion the real deck is revealed. This makes entering the slideshow
 * feel physically connected to the card you left, not a generic fade.
 */
function ShrinkingCard({
  offering,
  target,
  vw,
  vh,
  onDone,
}: {
  offering: Offering;
  // Always measured before mount. Mounting with a null target and swapping it
  // in later is what silently BROKE this morph: the null-target render made
  // `animate` equal `initial`, framer completed that zero-length animation,
  // and its completion callback ran after the re-render had already supplied
  // the target — so an `if (target)` guard passed and onDone fired on frame
  // one. The shrink never played; entering the deck was an instant cut.
  target: DOMRect;
  vw: number;
  vh: number;
  onDone: () => void;
}) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 80, pointerEvents: "none" }}>
      {/* Photo: from full-bleed down to the miniature's frame. The drop shadow
          gives it depth mid-flight but decays to transparent by landing — the
          real deck card underneath has NO shadow, so a shadow held to the end
          would pop off on the handoff frame. */}
      <motion.div
        initial={{
          top: 0,
          left: 0,
          width: vw,
          height: vh,
          borderRadius: 0,
          boxShadow: "0 24px 60px -24px rgba(0,0,0,0.28)",
        }}
        animate={{
          top: target.top,
          left: target.left,
          width: target.width,
          height: target.height,
          borderRadius: CARD_RADIUS,
          boxShadow: "0 24px 60px -24px rgba(0,0,0,0)",
        }}
        transition={ENTER_MORPH}
        onAnimationComplete={onDone}
        style={{
          position: "absolute",
          overflow: "hidden",
          background: T.surface,
          border: `1px solid ${T.border}`,
        }}
      >
        <HatchPlaceholder
          src={offering.images?.[0]}
          radius={0}
          style={{ position: "absolute", inset: 0 }}
        />
        {/* The card's own chrome dissolves off as it steps back into the deck
            — without this it vanishes in one frame the instant the clone
            covers the real card. Quick, and done before real travel begins
            (the ease-in-out barely moves in its first fifth). */}
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          style={{ position: "absolute", inset: 0 }}
        >
          <ChromeGhost offering={offering} />
        </motion.div>
      </motion.div>

      {/* Explainer settles in beneath the shrunken photo. Its timing mirrors
          the deck's own fade so when this clone unmounts, the real explainer
          underneath is already at full opacity — a seamless swap, no pop. */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: ENTER_FADE - 0.1, delay: 0.18, ease: "easeOut" }}
        style={{ position: "absolute", top: target.bottom + TEXT_GAP, left: 0, right: 0, display: "flex", justifyContent: "center" }}
      >
        <Explainer offering={offering} />
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
  // Skip both zoom morphs for reduced-motion users: the deck appears live
  // immediately and picking a card opens it directly. The remaining opacity
  // fades are gentle enough to keep.
  const reduceMotion = useReducedMotion();
  // Opening transition: the fullscreen card shrinks into its miniature before
  // the real deck is revealed.
  const [phase, setPhase] = useState<"enter" | "live">(reduceMotion ? "live" : "enter");
  const [shrinkRect, setShrinkRect] = useState<DOMRect | null>(null);

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
  // This runs in a LAYOUT effect (before the browser paints) and measures the
  // shrink target synchronously, so the ShrinkingCard clone is present and
  // covering full-bleed on the very first painted frame — no gray-panel flash.
  useLayoutEffect(() => {
    if (!dims) return;
    const sc = scrollerRef.current;
    const el = cardRefs.current[activeIndex];
    if (sc && el) sc.scrollLeft = el.offsetLeft - (sc.clientWidth - el.offsetWidth) / 2;
    applyTransforms();
    // Measure where the active card's photo now sits — the shrink target.
    const photoEl = el?.querySelector<HTMLElement>("[data-photo]");
    if (photoEl) setShrinkRect(photoEl.getBoundingClientRect());
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dims]);

  const handlePick = useCallback(
    (i: number, e: React.MouseEvent<HTMLButtonElement>) => {
      if (pickedRef.current) return;
      pickedRef.current = true;
      if (reduceMotion) {
        onPick(i);
        return;
      }
      // Measure the PHOTO element (not the whole column) so the morph grows
      // from the image exactly.
      const photoEl = e.currentTarget.querySelector<HTMLElement>("[data-photo]");
      const rect = (photoEl ?? e.currentTarget).getBoundingClientRect();
      setPicked({ i, rect });
    },
    [reduceMotion, onPick],
  );

  return (
    <motion.div
      // Start fully present, NOT faded-in: the ShrinkingCard clone renders
      // solid and full-bleed on frame one, perfectly covering the card you
      // were viewing, then shrinks to reveal the frosted deck behind it. A
      // fade-in here would cross-dissolve the clone + backdrop over the still-
      // sharp card underneath — the "flash". We only fade on exit.
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
      onClick={() => {
        if (phase === "live") onClose();
      }}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 70,
        display: "flex",
        flexDirection: "column",
        // The frosted panel stays TRANSPARENT until the ShrinkingCard clone is
        // measured and ready to cover the screen (`shrinkRect`). Until then the
        // real product card beneath us shows through — a seamless hand-off —
        // instead of a bare gray panel flashing before the clone mounts. Once
        // ready it's near-opaque (also stops the card's dark CTA ghosting
        // through at the bottom, so the deck reads clean edge to edge).
        background: shrinkRect ? "rgba(248,248,248,0.96)" : "transparent",
        backdropFilter: shrinkRect ? "blur(28px) saturate(1.3)" : "none",
        WebkitBackdropFilter: shrinkRect ? "blur(28px) saturate(1.3)" : "none",
        transition: `background ${ENTER_FADE}s ease`,
      }}
    >
      {/* Whisper texture — the same barely-there contour lines as the AI drawer,
          fading in from the top so the frosted backdrop has a hint of depth.
          Only shown once the backdrop is opaque, so it never paints over the
          live card during the first frame. */}
      {shrinkRect && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            backgroundImage: WHISPER_PATTERN,
            backgroundSize: "240px 180px",
            backgroundRepeat: "repeat",
            opacity: 0.7,
            maskImage: "linear-gradient(to bottom, #000 0%, transparent 60%)",
            WebkitMaskImage: "linear-gradient(to bottom, #000 0%, transparent 60%)",
          }}
        />
      )}

      {/* Horizontal deck — shrinks in from the full feed. No header chrome:
          the photos + text own the whole height. Tapping the empty backdrop
          closes; taps on a card are stopped from bubbling.

          The deck fades in DURING the shrink, not after it: the shrinking
          clone sits opaquely on top of its own slot, so the neighbors emerge
          around it while it travels, and by the time it lands everything is
          already present. Waiting for `phase === "live"` here was the jolt —
          the whole deck popped in right after the morph finished. */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: ENTER_FADE, delay: 0.08, ease: "easeOut" }}
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          paddingTop: "env(safe-area-inset-top)",
          // Don't let the invisible deck swallow taps during the entrance.
          pointerEvents: phase === "live" ? "auto" : "none",
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
                    <HatchPlaceholder
                      src={o.images?.[0]}
                      alt={o.title}
                      radius={0}
                      style={{ position: "absolute", inset: 0 }}
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
          // Gated on the measurement (not the phase) so the dots ease in with
          // the deck during the shrink rather than popping in after it.
          opacity: picked || !shrinkRect ? 0 : 1,
          transition: `opacity ${ENTER_FADE}s ease`,
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

      {/* Zoom-to-close morph — the fullscreen card shrinking into its deck slot.
          Mounted only once the target is measured (which happens in a layout
          effect, i.e. before first paint, so nothing flashes). Mounting earlier
          with a null target is the completion-callback race documented on
          ShrinkingCard. */}
      {phase === "enter" && dims && shrinkRect && (
        <ShrinkingCard
          offering={offerings[activeIndex]}
          target={shrinkRect}
          vw={dims.vw}
          vh={dims.vh}
          onDone={() => setPhase("live")}
        />
      )}

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
