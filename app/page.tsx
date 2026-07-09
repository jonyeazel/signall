"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { ChatComposer } from "../components/chat-composer";
import { OfferingCard } from "../components/offering-card";
import { OfferingSheet } from "../components/offering-sheet";
import { OFFERINGS } from "../lib/offerings";
import { useMediaQuery } from "../hooks/use-media-query";
import { T } from "../lib/theme";

export default function Home() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewportH, setViewportH] = useState(0);
  const feedRef = useRef<HTMLElement>(null);

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
        inset: isMobile ? 8 : 12,
        background: T.bg,
        borderRadius: isMobile ? 20 : 24,
        border: `1px solid ${T.border}`,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 20px",
          borderBottom: `1px solid ${T.border}`,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-geist-mono), monospace",
            fontSize: 12,
            letterSpacing: "0.14em",
            color: T.textSecondary,
            textTransform: "uppercase",
          }}
        >
          Template
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "#22c55e",
              boxShadow: "0 0 0 3px rgba(34,197,94,0.15)",
            }}
          />
          <span
            style={{
              fontFamily: "var(--font-geist-mono), monospace",
              fontSize: 11,
              letterSpacing: "0.12em",
              color: T.textTertiary,
              textTransform: "uppercase",
            }}
          >
            System Ready
          </span>
        </span>
      </div>

      {/* Scrollable feed */}
      <main
        ref={feedRef}
        className="feed-scroll"
        style={{
          flex: 1,
          overflowY: selected ? "hidden" : "auto",
          minHeight: 0,
          padding: isMobile ? "0 8px" : "36px 32px 16px",
          WebkitOverflowScrolling: "touch",
          scrollSnapType: isMobile ? "y mandatory" : undefined,
        }}
      >
        {/* Hero */}
        <div
          style={{
            maxWidth: 760,
            margin: "0 auto",
            textAlign: "center",
            padding: isMobile ? "22px 8px 16px" : "8px 0 28px",
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

        {/* Cards */}
        <LayoutGroup>
          {isMobile ? (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {OFFERINGS.map((offering, i) => (
                <div
                  key={offering.id}
                  style={{
                    height: viewportH ? viewportH : "82dvh",
                    paddingBottom: 10,
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
                  />
                </div>
              ))}
            </div>
          ) : (
            <div
              className="carousel-x"
              style={{
                display: "flex",
                gap: 18,
                overflowX: "auto",
                scrollSnapType: "x mandatory",
                padding: "4px 2px 20px",
                margin: "0 -32px",
                paddingLeft: 32,
                paddingRight: 32,
              }}
            >
              {OFFERINGS.map((offering, i) => (
                <div
                  key={offering.id}
                  style={{
                    width: 264,
                    aspectRatio: "4 / 5",
                    flexShrink: 0,
                    scrollSnapAlign: "start",
                  }}
                >
                  <OfferingCard
                    offering={offering}
                    index={i}
                    rootRef={feedRef}
                    onOpen={() => setSelectedId(offering.id)}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Expanded sheet */}
          <AnimatePresence>
            {selected && (
              <OfferingSheet
                key={selected.id}
                offering={selected}
                isMobile={isMobile}
                onClose={close}
              />
            )}
          </AnimatePresence>
        </LayoutGroup>
      </main>

      {/* Dock: flush full-width on mobile, centered on desktop */}
      <div
        style={{
          flexShrink: 0,
          borderTop: `1px solid ${T.border}`,
          background: T.surface,
          padding: isMobile ? 0 : "14px 20px",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <ChatComposer flush={isMobile} placeholder="Ask anything, or describe what to build…" />
      </div>
    </div>
  );
}
