"use client";

import { useRef, useCallback, useEffect, type RefObject } from "react";
import { OfferingCard } from "./offering-card";
import { type Offering } from "../lib/offerings";

const CARD_W = 340;

/**
 * Horizontal carousel where the card nearest the viewport center is
 * magnified and fully opaque, and neighbors recede — a smooth,
 * scroll-driven focus effect. Cards snap to center.
 */
export function DesktopCarousel({
  offerings,
  rootRef,
  onOpen,
}: {
  offerings: Offering[];
  rootRef: RefObject<HTMLElement | null>;
  onOpen: (id: string) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef<(HTMLDivElement | null)[]>([]);
  const raf = useRef<number | null>(null);

  const apply = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const center = track.scrollLeft + track.clientWidth / 2;

    cellRefs.current.forEach((cell) => {
      if (!cell) return;
      const cellCenter = cell.offsetLeft + cell.offsetWidth / 2;
      const dist = Math.abs(center - cellCenter);
      const norm = Math.min(dist / (CARD_W * 1.15), 1); // 0 at center → 1 far away
      const scale = 1.06 - norm * 0.22; // 1.06 centered → 0.84 edges
      const opacity = 1 - norm * 0.4; // 1 centered → 0.6 edges
      cell.style.transform = `scale(${scale.toFixed(4)})`;
      cell.style.opacity = opacity.toFixed(3);
      cell.style.zIndex = String(Math.round((1 - norm) * 10));
    });
  }, []);

  const onScroll = useCallback(() => {
    if (raf.current != null) return;
    raf.current = requestAnimationFrame(() => {
      raf.current = null;
      apply();
    });
  }, [apply]);

  useEffect(() => {
    apply();
    const track = trackRef.current;
    if (!track) return;
    const ro = new ResizeObserver(apply);
    ro.observe(track);
    // Start focused on the first card.
    return () => {
      ro.disconnect();
      if (raf.current != null) cancelAnimationFrame(raf.current);
    };
  }, [apply]);

  return (
    <div
      ref={trackRef}
      className="carousel-x"
      onScroll={onScroll}
      style={{
        display: "flex",
        gap: 28,
        overflowX: "auto",
        scrollSnapType: "x mandatory",
        paddingBlock: "44px 44px",
        paddingInline: "calc(50% - 170px)",
      }}
    >
      {offerings.map((offering, i) => (
        <div
          key={offering.id}
          ref={(el) => {
            cellRefs.current[i] = el;
          }}
          style={{
            width: CARD_W,
            aspectRatio: "4 / 5",
            flexShrink: 0,
            scrollSnapAlign: "center",
            transformOrigin: "center center",
            transition: "transform 240ms cubic-bezier(0.22,1,0.36,1), opacity 240ms ease",
            willChange: "transform, opacity",
          }}
        >
          <OfferingCard offering={offering} index={i} rootRef={rootRef} onOpen={() => onOpen(offering.id)} />
        </div>
      ))}
    </div>
  );
}
