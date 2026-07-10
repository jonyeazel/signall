"use client";

import { motion } from "motion/react";
import { useRef, useState, useCallback, type CSSProperties, type ReactNode } from "react";
import { T } from "../lib/theme";

/**
 * Full-width, horizontally-paged image carousel with pagination dots.
 * Slides are neutral diagonal-hatch placeholders (swap for real <img> later).
 * Pass `layoutId` so it can morph card -> sheet as a shared element.
 */
export function ImageCarousel({
  layoutId,
  count = 4,
  radius = 0,
  dots = true,
  style,
  children,
}: {
  layoutId?: string;
  count?: number;
  radius?: number;
  dots?: boolean;
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
        onScroll={onScroll}
        className="carousel-x"
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          overflowX: "auto",
          scrollSnapType: "x mandatory",
          touchAction: "pan-x",
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
            pointerEvents: "none",
          }}
        >
          {Array.from({ length: count }).map((_, i) => (
            <span
              key={i}
              style={{
                width: active === i ? 16 : 6,
                height: 6,
                borderRadius: 999,
                background: active === i ? T.ink : "rgba(20,20,20,0.28)",
                boxShadow: "0 0 0 1px rgba(255,255,255,0.4)",
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
