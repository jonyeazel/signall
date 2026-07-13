"use client";

import { motion } from "motion/react";
import { useRef, useState, useCallback, type CSSProperties, type ReactNode } from "react";
import { T, SPRING } from "../lib/theme";
import { OfferCover } from "./offer-cover";
import type { Offering } from "../lib/offerings";

/**
 * Full-width, horizontally-paged image carousel with pagination dots.
 * Slides are neutral diagonal-hatch placeholders (swap for real <img> later).
 * Pass `layoutId` so it can morph card -> sheet as a shared element.
 *
 * `scrollable` (default true) uses native touch scroll-snap — ideal on mobile.
 * When false (desktop), the track is controlled via clickable dots and never
 * hijacks trackpad/wheel gestures, so horizontal swipes scroll the parent
 * card carousel instead of the inner gallery.
 */
export function ImageCarousel({
  layoutId,
  images,
  alt = "",
  count = 4,
  radius = 0,
  dots = true,
  dotBottom = 12,
  dotTop,
  scrollable = true,
  tapToBrowse = false,
  imageFit = "cover",
  offering,
  coverScale = 1,
  coverVariant = "backdrop",
  style,
  children,
}: {
  layoutId?: string;
  images?: string[];
  alt?: string;
  count?: number;
  radius?: number;
  dots?: boolean;
  dotBottom?: number;
  /** When provided and there are no images, render the offer's typographic
   *  cover instead of empty placeholder slides. This is how the entire
   *  v0University catalog gets its visual identity. */
  offering?: Offering;
  /** Tune cover type for small contexts (overview mini ≈ 0.5). */
  coverScale?: number;
  /** When set, dots anchor to the top of the frame (story/reel style) instead
   *  of the bottom — used by the immersive mobile card. */
  dotTop?: number;
  scrollable?: boolean;
  tapToBrowse?: boolean;
  imageFit?: "cover" | "contain";
  coverVariant?: "backdrop" | "full";
  style?: CSSProperties;
  children?: ReactNode;
}) {
  const hasImages = !!(images && images.length > 0);
  // No photos + a cover offer → render one typographic cover slide.
  const showCover = !hasImages && !!offering;
  const slides = hasImages ? images!.length : showCover ? 1 : count;
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const raf = useRef(0);

  const onScroll = useCallback(() => {
    if (raf.current) return;
    raf.current = requestAnimationFrame(() => {
      raf.current = 0;
      const el = trackRef.current;
      if (!el) return;
      const i = Math.round(el.scrollLeft / el.clientWidth);
      setActive((prev) => (prev === i ? prev : i));
    });
  }, []);

  const goTo = useCallback(
    (i: number) => {
      const el = trackRef.current;
      if (scrollable && el) {
        el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
      }
      setActive(i);
    },
    [scrollable],
  );

  return (
    <motion.div
      layoutId={layoutId}
      transition={SPRING}
      style={{
        position: "relative",
        borderRadius: radius,
        overflow: "hidden",
        background: T.skeleton,
        ...style,
      }}
    >
      <div
        ref={trackRef}
        onScroll={scrollable ? onScroll : undefined}
        className="carousel-x"
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          overflowX: scrollable ? "auto" : "hidden",
          overflowY: "hidden",
          scrollSnapType: scrollable ? "x mandatory" : undefined,
          // Allow BOTH axes so the browser axis-locks like Instagram Reels:
          // a horizontal drag browses images here, while a vertical drag chains
          // up to the product feed (the only vertical scroller) to page cards.
          // Using only "pan-x" would lock the whole full-screen image to
          // horizontal and kill vertical paging across the entire card.
          touchAction: scrollable ? "pan-x pan-y" : "pan-y",
          transform: scrollable ? undefined : `translateX(-${active * 100}%)`,
          transition: scrollable ? undefined : "transform 420ms cubic-bezier(0.22,1,0.36,1)",
        }}
      >
        {Array.from({ length: slides }).map((_, i) => (
          <div
            key={i}
            style={{
              flex: "0 0 100%",
              width: "100%",
              height: "100%",
              scrollSnapAlign: "start",
              position: "relative",
              background: hasImages ? T.skeleton : T.ghost,
            }}
          >
            {hasImages && (
              <img
                src={images![i] || "/placeholder.svg"}
                alt={alt}
                draggable={false}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: imageFit,
                  display: "block",
                  userSelect: "none",
                }}
              />
            )}
            {showCover && offering && (
              <OfferCover
                cover={offering.cover}
                index={offering.index}
                category={offering.category}
                title={offering.title}
                tagline={offering.tagline}
                price={offering.price}
                duration={offering.duration}
                Icon={offering.icon}
                scale={coverScale}
                variant={coverVariant}
              />
            )}
          </div>
        ))}
      </div>

      {/* Tap zones — advance images by tapping the left/right edges. Center is
          left uncovered so a tap there falls through to open the PDP. Each zone
          stops propagation so browsing images never opens the sheet. */}
      {tapToBrowse && slides > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous image"
            disabled={active === 0}
            onClick={(e) => {
              e.stopPropagation();
              goTo(Math.max(0, active - 1));
            }}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "28%",
              height: "70%",
              background: "transparent",
              border: "none",
              padding: 0,
              zIndex: 1,
              cursor: active === 0 ? "default" : "pointer",
            }}
          />
          <button
            type="button"
            aria-label="Next image"
            disabled={active === slides - 1}
            onClick={(e) => {
              e.stopPropagation();
              goTo(Math.min(slides - 1, active + 1));
            }}
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: "28%",
              height: "70%",
              background: "transparent",
              border: "none",
              padding: 0,
              zIndex: 1,
              cursor: active === slides - 1 ? "default" : "pointer",
            }}
          />
        </>
      )}

      {dots && slides > 1 && (
        <div
          style={{
            position: "absolute",
            ...(dotTop != null ? { top: dotTop } : { bottom: dotBottom }),
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            gap: 5,
            zIndex: 2,
          }}
        >
          {Array.from({ length: slides }).map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`View image ${i + 1}`}
              onClick={(e) => {
                e.stopPropagation();
                goTo(i);
              }}
              style={{
                width: active === i ? 16 : 6,
                height: 6,
                padding: 0,
                border: "none",
                borderRadius: 999,
                background: active === i ? T.ink : "rgba(20,20,20,0.25)",
                cursor: "pointer",
                transition: "width 220ms ease, background 220ms ease",
              }}
            />
          ))}
        </div>
      )}

      {children}
    </motion.div>
  );
}
