"use client";

import { useState, useCallback, useRef } from "react";
import { ChatComposer } from "../components/chat-composer";

// --- Greyscale template palette ---
const t = {
  gutter: "#EAEAEA",
  bg: "#FAFAFA",
  surface: "#FFFFFF",
  border: "#E5E5E5",
  borderActive: "#D0D0D0",
  textPrimary: "#171717",
  textSecondary: "#6E6E6E",
  textTertiary: "#A0A0A0",
  skeleton: "#EDEDED",
};

// Blank placeholder cards — the "rooms" waiting to be decorated.
const CARDS = Array.from({ length: 7 }, (_, i) => i);

const CARD_WIDTH = 322;
const CARD_GAP = 16;
const STRIDE = CARD_WIDTH + CARD_GAP; // 338
const HALF_CARD = CARD_WIDTH / 2; // 161

// A single blank card with a faint skeleton so it reads as "ready for content".
function BlankCard({ active }: { active: boolean }) {
  return (
    <div
      style={{
        flexShrink: 0,
        width: `${CARD_WIDTH}px`,
        height: `${CARD_WIDTH}px`,
        background: t.surface,
        border: `1px solid ${active ? t.borderActive : t.border}`,
        borderRadius: "16px",
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        scrollSnapAlign: "center",
        transform: active ? "scale(1)" : "scale(0.92)",
        opacity: active ? 1 : 0.55,
        transition:
          "transform 150ms ease-out, opacity 150ms ease-out, border-color 150ms ease-out",
      }}
    >
      {/* Top skeleton: avatar + title lines */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "10px",
            background: t.skeleton,
            flexShrink: 0,
          }}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
          <div style={{ width: "120px", height: "10px", borderRadius: "5px", background: t.skeleton }} />
          <div style={{ width: "72px", height: "8px", borderRadius: "4px", background: t.skeleton }} />
        </div>
      </div>

      {/* Bottom skeleton: body lines + chips */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <div style={{ width: "100%", height: "9px", borderRadius: "5px", background: t.skeleton }} />
        <div style={{ width: "80%", height: "9px", borderRadius: "5px", background: t.skeleton }} />
        <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
          <div style={{ width: "48px", height: "18px", borderRadius: "6px", background: t.skeleton }} />
          <div style={{ width: "62px", height: "18px", borderRadius: "6px", background: t.skeleton }} />
          <div style={{ width: "40px", height: "18px", borderRadius: "6px", background: t.skeleton }} />
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  const handleCarouselScroll = useCallback(() => {
    if (!carouselRef.current) return;
    const container = carouselRef.current;
    const scrollCenter = container.scrollLeft + container.clientWidth / 2;
    const paddingOffset = container.clientWidth / 2 - HALF_CARD;
    const newIndex = Math.round((scrollCenter - paddingOffset) / STRIDE);
    const clamped = Math.max(0, Math.min(CARDS.length - 1, newIndex));
    if (clamped !== activeCardIndex) setActiveCardIndex(clamped);
  }, [activeCardIndex]);

  const scrollToCard = useCallback((index: number) => {
    if (!carouselRef.current) return;
    const paddingOffset = carouselRef.current.clientWidth / 2 - HALF_CARD;
    carouselRef.current.scrollTo({
      left: index * STRIDE - paddingOffset + HALF_CARD,
      behavior: "smooth",
    });
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: "12px",
        background: t.bg,
        borderRadius: "24px",
        border: `1px solid ${t.border}`,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* --- Main content --- */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          gap: "24px",
          padding: "24px 32px 0",
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        {/* Hero */}
        <div style={{ textAlign: "center", maxWidth: "620px" }}>
          <h1
            style={{
              fontSize: "38px",
              fontWeight: 600,
              color: t.textPrimary,
              letterSpacing: "-0.03em",
              lineHeight: 1.15,
              margin: "0 0 12px 0",
            }}
          >
            Lorem ipsum dolor sit amet
          </h1>
          <p
            style={{
              fontSize: "15px",
              lineHeight: 1.6,
              color: t.textSecondary,
              margin: 0,
            }}
          >
            Consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore
            et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud
            exercitation.
          </p>
        </div>

        {/* Carousel of blank cards */}
        <div
          ref={carouselRef}
          className="carousel-scroll"
          onScroll={handleCarouselScroll}
          style={{
            display: "flex",
            gap: `${CARD_GAP}px`,
            overflowX: "scroll",
            scrollSnapType: "x mandatory",
            scrollBehavior: "smooth",
            padding: `0 calc(50% - ${HALF_CARD}px)`,
            width: "100%",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {CARDS.map((i) => (
            <BlankCard key={i} active={activeCardIndex === i} />
          ))}
        </div>

        {/* Carousel position dots */}
        <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
          {CARDS.map((i) => (
            <button
              key={i}
              aria-label={`Go to card ${i + 1}`}
              onClick={() => scrollToCard(i)}
              style={{
                width: activeCardIndex === i ? "16px" : "6px",
                height: "6px",
                borderRadius: "3px",
                background: activeCardIndex === i ? t.textPrimary : t.border,
                border: "none",
                padding: 0,
                transition: "all 150ms ease-out",
              }}
            />
          ))}
        </div>
      </div>

      {/* --- Dock: AI chat composer --- */}
      <div
        style={{
          flexShrink: 0,
          padding: "0 32px 20px",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <ChatComposer />
      </div>
    </div>
  );
}
