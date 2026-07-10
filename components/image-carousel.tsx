"use client";

import { motion } from "motion/react";
import { useRef, useState, useCallback, type CSSProperties, type ReactNode } from "react";
import { T } from "../lib/theme";

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
  count = 4,
  radius = 0,
  dots = true,
  scrollable = true,
  style,
  children,
}: {
  layoutId?: string;
  count?: number;
  radius?: number;
  dots?: boolean;
  scrollable?: boolean;
  style?: CSSProperties;
  children?: ReactNode;
}) {
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
          scrollSnapType: scrollable ? "x mandatory" : undefined,
          touchAction: scrollable ? "pan-x" : undefined,
          transform: scrollable ? undefined : `translateX(-${active * 100}%)`,
          transition: scrollable ? undefined : "transform 420ms cubic-bezier(0.22,1,0.36,1)",
        }}
      >
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            style={{
              flex: "0 0 100%",
              width: "100%",
              height: "100%",
              scrollSnapAlign: "start",
              background: T.skeleton,
              backgroundImage:
                "repeating-linear-gradient(-45deg, rgba(0,0,0,0.05) 0px, rgba(0,0,0,0.05) 1.5px, transparent 1.5px, transparent 11px)",
            }}
          />
        ))}
      </div>

      {dots && count > 1 && (
        <div
          style={{
            position: "absolute",
            bottom: 12,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            gap: 5,
          }}
        >
          {Array.from({ length: count }).map((_, i) => (
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
