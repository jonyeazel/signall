"use client";

import { useRef, useCallback, useEffect, useState, type RefObject } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { OfferingCard } from "./offering-card";
import { type Offering } from "../lib/offerings";
import { T } from "../lib/theme";

const CARD_W = 400;
const GAP = 32;

/**
 * Horizontal carousel where the card nearest the viewport center is
 * magnified and fully opaque, and neighbors recede — a smooth,
 * scroll-driven focus effect. Cards snap to center and are navigated
 * with elegant prev/next arrow buttons (trackpad-independent).
 */
export function DesktopCarousel({
  offerings,
  rootRef,
  onOpen,
  onAddToCart,
}: {
  offerings: Offering[];
  rootRef: RefObject<HTMLElement | null>;
  onOpen: (id: string) => void;
  /** Add a product to the cart by id — powers the in-chat buy card. */
  onAddToCart?: (id: string) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef<(HTMLDivElement | null)[]>([]);
  const raf = useRef<number | null>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const apply = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const center = track.scrollLeft + track.clientWidth / 2;

    cellRefs.current.forEach((cell) => {
      if (!cell) return;
      const cellCenter = cell.offsetLeft + cell.offsetWidth / 2;
      const dist = Math.abs(center - cellCenter);
      const norm = Math.min(dist / (CARD_W * 1.15), 1); // 0 at center → 1 far away
      const scale = 1.05 - norm * 0.2; // 1.05 centered → 0.85 edges
      const opacity = 1 - norm * 0.42; // 1 centered → ~0.58 edges
      cell.style.transform = `scale(${scale.toFixed(4)})`;
      cell.style.opacity = opacity.toFixed(3);
      cell.style.zIndex = String(Math.round((1 - norm) * 10));
    });

    setAtStart(track.scrollLeft <= 2);
    setAtEnd(track.scrollLeft >= track.scrollWidth - track.clientWidth - 2);
  }, []);

  const onScroll = useCallback(() => {
    if (raf.current != null) return;
    raf.current = requestAnimationFrame(() => {
      raf.current = null;
      apply();
    });
  }, [apply]);

  const scrollByCard = useCallback((dir: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: dir * (CARD_W + GAP), behavior: "smooth" });
  }, []);

  useEffect(() => {
    apply();
    const track = trackRef.current;
    if (!track) return;
    const ro = new ResizeObserver(apply);
    ro.observe(track);
    return () => {
      ro.disconnect();
      if (raf.current != null) cancelAnimationFrame(raf.current);
    };
  }, [apply]);

  return (
    <div style={{ position: "relative" }}>
      <div
        ref={trackRef}
        className="carousel-x"
        onScroll={onScroll}
        style={{
          display: "flex",
          gap: GAP,
          overflowX: "auto",
          scrollSnapType: "x mandatory",
          paddingBlock: "40px 40px",
          paddingInline: `calc(50% - ${CARD_W / 2}px)`,
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
              flexShrink: 0,
              scrollSnapAlign: "center",
              transformOrigin: "center center",
              transition: "transform 240ms cubic-bezier(0.22,1,0.36,1), opacity 240ms ease",
              willChange: "transform, opacity",
            }}
          >
            <OfferingCard
              offering={offering}
              index={i}
              rootRef={rootRef}
              onOpen={() => onOpen(offering.id)}
              onAddToCart={onAddToCart ? () => onAddToCart(offering.id) : undefined}
              imageScrollable={false}
            />
          </div>
        ))}
      </div>

      <NavArrow side="left" disabled={atStart} onClick={() => scrollByCard(-1)} />
      <NavArrow side="right" disabled={atEnd} onClick={() => scrollByCard(1)} />
    </div>
  );
}

function NavArrow({
  side,
  disabled,
  onClick,
}: {
  side: "left" | "right";
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={side === "left" ? "Previous" : "Next"}
      onClick={onClick}
      disabled={disabled}
      style={{
        position: "absolute",
        top: "50%",
        [side]: 24,
        transform: "translateY(-50%)",
        width: 48,
        height: 48,
        borderRadius: "50%",
        background: T.surface,
        border: `1px solid ${T.border}`,
        color: T.textPrimary,
        display: "grid",
        placeItems: "center",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0 : 1,
        pointerEvents: disabled ? "none" : "auto",
        transition: "opacity 220ms ease, transform 160ms ease, background 160ms ease",
        zIndex: 20,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = T.bgSubtle;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = T.surface;
      }}
    >
      {side === "left" ? (
        <ChevronLeft size={22} strokeWidth={2} />
      ) : (
        <ChevronRight size={22} strokeWidth={2} />
      )}
    </button>
  );
}
