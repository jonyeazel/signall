"use client";

import { COVERS, type CoverKey } from "../lib/theme";
import type { LucideIcon } from "lucide-react";

/**
 * A typographic offer cover — the visual identity of the whole catalog.
 *
 * Instead of stock photography, every offer is a designed cover: a bold tonal
 * field, a huge display-serif index numeral, a category label in mono, and one
 * restrained icon. This reads like a premium design annual, scales to hundreds
 * of offers with zero image generation, and keeps type as the hero — Marlow's
 * core mandate. Fills its parent completely.
 *
 * variant "backdrop" — for cards/PDP where surrounding chrome already shows the
 *   title. The giant index numeral is the graphic; the lower area stays clear
 *   for the card's own identity + action row.
 * variant "full" — for contexts with no chrome (the overview minis). Adds the
 *   title + tagline block.
 */
export function OfferCover({
  cover,
  index,
  category,
  title,
  tagline,
  price,
  duration,
  Icon,
  scale = 1,
  variant = "backdrop",
}: {
  cover: CoverKey;
  index: string;
  category: string;
  title: string;
  tagline?: string;
  price?: string;
  duration?: string;
  Icon?: LucideIcon;
  scale?: number;
  variant?: "backdrop" | "full";
}) {
  const tone = COVERS[cover];
  const pad = 26 * scale;
  const isFull = variant === "full";

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: tone.bg,
        color: tone.ink,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: pad,
        boxSizing: "border-box",
      }}
    >
      {/* Giant display-serif index numeral — the design-annual centerpiece. */}
      <span
        aria-hidden
        style={{
          position: "absolute",
          right: isFull ? pad * 0.5 : "50%",
          top: isFull ? "auto" : "50%",
          bottom: isFull ? -pad * 1.1 : "auto",
          transform: isFull ? "none" : "translate(50%, -46%)",
          fontFamily: "var(--font-display), Georgia, serif",
          fontWeight: 600,
          fontSize: (isFull ? 210 : 300) * scale,
          lineHeight: 0.8,
          letterSpacing: "-0.05em",
          color: tone.ink,
          opacity: isFull ? 0.06 : 0.1,
          userSelect: "none",
          pointerEvents: "none",
          fontStyle: "italic",
        }}
      >
        {index}
      </span>

      {/* Top row — category + icon. */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, position: "relative" }}>
        <span
          style={{
            fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
            fontSize: 11 * scale,
            fontWeight: 500,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: tone.sub,
          }}
        >
          {category}
        </span>
        {Icon && (
          <Icon size={22 * scale} strokeWidth={1.8} style={{ color: tone.accent, flexShrink: 0 }} aria-hidden />
        )}
      </div>

      {/* Title block — only in "full" (chrome supplies it otherwise). */}
      {isFull ? (
        <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 10 * scale }}>
          <h2
            style={{
              fontFamily: "var(--font-display), Georgia, serif",
              fontWeight: 500,
              fontSize: 40 * scale,
              lineHeight: 1.02,
              letterSpacing: "-0.02em",
              color: tone.ink,
              margin: 0,
              textWrap: "balance",
            }}
          >
            {title}
          </h2>
          {tagline && (
            <p style={{ fontSize: 14 * scale, lineHeight: 1.4, color: tone.sub, margin: 0, maxWidth: "28ch" }}>
              {tagline}
            </p>
          )}
        </div>
      ) : (
        // Backdrop: a quiet price/duration tag anchored bottom-left, clear of
        // the card's own identity block which sits below it.
        (price || duration) && (
          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              gap: 8 * scale,
              fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
              fontSize: 12 * scale,
              letterSpacing: "0.04em",
              color: tone.ink,
              opacity: 0.5,
            }}
          >
            {duration && <span>{duration}</span>}
          </div>
        )
      )}
    </div>
  );
}
