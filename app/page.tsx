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
  const feedRef = useRef<HTMLElement>(null);

  const isMobile = useMediaQuery("(max-width: 640px)");
  const twoCol = useMediaQuery("(min-width: 760px)");

  const selected = OFFERINGS.find((o) => o.id === selectedId) ?? null;

  const close = useCallback(() => setSelectedId(null), []);

  // Lock scroll + Escape-to-close while a sheet is open.
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
        inset: 12,
        background: T.bg,
        borderRadius: 24,
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
          padding: "16px 22px",
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
          padding: isMobile ? "22px 18px 12px" : "40px 32px 20px",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {/* Hero */}
        <div style={{ maxWidth: 760, margin: "0 auto", textAlign: "center", padding: "8px 0 30px" }}>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            style={{
              margin: "0 0 14px",
              fontSize: "clamp(30px, 6vw, 44px)",
              fontWeight: 600,
              letterSpacing: "-0.035em",
              lineHeight: 1.08,
              color: T.textPrimary,
            }}
          >
            Lorem ipsum dolor sit amet
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
            style={{
              margin: "0 auto",
              maxWidth: 520,
              fontSize: "clamp(14px, 2.6vw, 16px)",
              lineHeight: 1.6,
              color: T.textSecondary,
            }}
          >
            Consectetur adipiscing elit. Tap any offering to expand it — every card
            is a room, waiting to be decorated.
          </motion.p>
        </div>

        {/* Cards */}
        <LayoutGroup>
          <div
            style={{
              maxWidth: 760,
              margin: "0 auto",
              display: "grid",
              gridTemplateColumns: twoCol ? "1fr 1fr" : "1fr",
              gap: 16,
              paddingBottom: 8,
            }}
          >
            {OFFERINGS.map((offering, i) => (
              <OfferingCard
                key={offering.id}
                offering={offering}
                index={i}
                rootRef={feedRef}
                onOpen={() => setSelectedId(offering.id)}
              />
            ))}
          </div>

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

      {/* Dock: global AI composer */}
      <div
        style={{
          flexShrink: 0,
          padding: isMobile ? "10px 16px 16px" : "14px 32px 20px",
          borderTop: `1px solid ${T.border}`,
          background: `linear-gradient(to top, ${T.bg}, ${T.bg})`,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <ChatComposer />
      </div>
    </div>
  );
}
