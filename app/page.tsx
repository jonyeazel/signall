"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { ChatComposer } from "../components/chat-composer";
import { OfferingCard } from "../components/offering-card";
import { OfferingSheet } from "../components/offering-sheet";
import { DesktopCarousel } from "../components/desktop-carousel";
import { OFFERINGS } from "../lib/offerings";
import { useMediaQuery } from "../hooks/use-media-query";
import { T } from "../lib/theme";

export default function Home() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewportH, setViewportH] = useState(0);
  const [headerH, setHeaderH] = useState(0);
  const feedRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  const isMobile = useMediaQuery("(max-width: 640px)");

  // Measure the scroll viewport so mobile cards can fill it exactly for clean snap.
  useEffect(() => {
    const el = feedRef.current;
    if (!el) return;
    const measure = () => setViewportH(el.clientHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Measure the header so the expanded sheet always stops just below it.
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const measure = () => setHeaderH(el.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const selected = OFFERINGS.find((o) => o.id === selectedId) ?? null;

  const close = useCallback(() => setSelectedId(null), []);

  // Escape-to-close while a sheet is open.
  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, close]);

  return (
    <div
      style={{
        position: "fixed",
        inset: isMobile ? 0 : 12,
        background: T.bg,
        borderRadius: isMobile ? 0 : 24,
        border: isMobile ? "none" : `1px solid ${T.border}`,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Top bar — profile identity + CTA (always visible, above the sheet) */}
      <div
        ref={headerRef}
        style={{
          position: "relative",
          zIndex: 60,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: isMobile ? "12px 16px 10px" : "16px 18px",
          background: T.bg,
          borderBottom: "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 10 : 12, minWidth: 0 }}>
          <div
            style={{
              width: isMobile ? 38 : 44,
              height: isMobile ? 38 : 44,
              borderRadius: "50%",
              background: T.ink,
              color: "#fff",
              display: "grid",
              placeItems: "center",
              fontSize: isMobile ? 15 : 17,
              fontWeight: 600,
              letterSpacing: "-0.02em",
              flexShrink: 0,
            }}
            aria-hidden
          >
            L
          </div>
          <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
            <span
              style={{
                fontSize: isMobile ? 15 : 17,
                fontWeight: 600,
                letterSpacing: "-0.02em",
                color: T.textPrimary,
                lineHeight: 1.15,
                whiteSpace: "nowrap",
              }}
            >
              Lorem Studio
            </span>
            <span
              style={{
                fontSize: isMobile ? 12 : 13,
                color: T.textTertiary,
                lineHeight: 1.2,
                whiteSpace: "nowrap",
              }}
            >
              Ipsum dolor sit
            </span>
          </div>
        </div>
        <button
          type="button"
          style={{
            flexShrink: 0,
            height: isMobile ? 38 : 42,
            padding: isMobile ? "0 18px" : "0 22px",
            borderRadius: 999,
            background: T.ink,
            color: "#fff",
            border: "none",
            fontSize: isMobile ? 13.5 : 14.5,
            fontWeight: 600,
            letterSpacing: "-0.01em",
            cursor: "pointer",
          }}
        >
          Get started
        </button>
      </div>

      {/* Scrollable feed */}
      <main
        ref={feedRef}
        className={isMobile ? "carousel-x" : "feed-scroll"}
        style={{
          flex: 1,
          overflowY: selected ? "hidden" : "auto",
          overflowX: "hidden",
          minHeight: 0,
          padding: isMobile ? "0 8px" : "36px 32px 16px",
          WebkitOverflowScrolling: "touch",
          scrollSnapType: isMobile ? "y mandatory" : undefined,
        }}
      >
        {/* Hero (desktop only) */}
        {!isMobile && (
        <div
          style={{
            maxWidth: 760,
            margin: "0 auto",
            textAlign: "center",
            padding: "8px 0 28px",
          }}
        >
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            style={{
              margin: "0 0 10px",
              fontSize: "clamp(28px, 5.4vw, 40px)",
              fontWeight: 600,
              letterSpacing: "-0.035em",
              lineHeight: 1.08,
              color: T.textPrimary,
            }}
          >
            Lorem ipsum dolor
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
            style={{
              margin: "0 auto",
              maxWidth: 380,
              fontSize: "clamp(14px, 2.4vw, 15px)",
              lineHeight: 1.55,
              color: T.textSecondary,
            }}
          >
            Tap any card to expand it.
          </motion.p>
        </div>
        )}

        {/* Cards */}
        <LayoutGroup>
          {isMobile ? (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {OFFERINGS.map((offering, i) => (
                <div
                  key={offering.id}
                  style={{
                    height: viewportH ? viewportH : "82dvh",
                    paddingBottom: 8,
                    scrollSnapAlign: "start",
                    scrollSnapStop: "always",
                    display: "flex",
                  }}
                >
                  <OfferingCard
                    offering={offering}
                    index={i}
                    rootRef={feedRef}
                    onOpen={() => setSelectedId(offering.id)}
                    withComposer
                  />
                </div>
              ))}
            </div>
          ) : (
            <div style={{ margin: "0 -32px" }}>
              <DesktopCarousel offerings={OFFERINGS} rootRef={feedRef} onOpen={setSelectedId} />
            </div>
          )}

          {/* Expanded sheet */}
          <AnimatePresence>
            {selected && (
              <OfferingSheet
                key={selected.id}
                offering={selected}
                isMobile={isMobile}
                topInset={headerH}
                onClose={close}
              />
            )}
          </AnimatePresence>
        </LayoutGroup>
      </main>

      {/* Dock: desktop only — on mobile the composer lives inside each card */}
      {!isMobile && (
        <div
          style={{
            flexShrink: 0,
            borderTop: "none",
            background: "transparent",
            padding: "12px 20px 18px",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <ChatComposer placeholder="Ask anything, or describe what to build…" />
        </div>
      )}
    </div>
  );
}
