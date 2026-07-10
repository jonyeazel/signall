"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { ShoppingBag } from "lucide-react";
import { PolicyLinks } from "../components/policy-links";
import { OfferingCard } from "../components/offering-card";
import { OfferingSheet } from "../components/offering-sheet";
import { DesktopCarousel } from "../components/desktop-carousel";
import { MobileHeader } from "../components/mobile-header";
import { CardOverview } from "../components/card-overview";
import { CartSheet, type CartLine } from "../components/cart-sheet";
import { OFFERINGS } from "../lib/offerings";
import { useMediaQuery } from "../hooks/use-media-query";
import { T, SPRING_SOFT } from "../lib/theme";

export default function Home() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewportH, setViewportH] = useState(0);
  const [headerH, setHeaderH] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [overview, setOverview] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [cart, setCart] = useState<Record<string, number>>({});
  const feedRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const scrollRaf = useRef(0);

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
  }, [isMobile]);

  const selected = OFFERINGS.find((o) => o.id === selectedId) ?? null;
  const close = useCallback(() => setSelectedId(null), []);

  const cartCount = Object.values(cart).reduce((n, q) => n + q, 0);
  const cartItems: CartLine[] = Object.entries(cart)
    .map(([id, qty]) => ({ offering: OFFERINGS.find((o) => o.id === id)!, qty }))
    .filter((l) => l.offering);

  const addToCart = useCallback((id: string) => {
    setCart((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 }));
  }, []);
  const removeFromCart = useCallback((id: string) => {
    setCart((c) => {
      const next = { ...c };
      delete next[id];
      return next;
    });
  }, []);

  // Buy Now (from the PDP) → add to cart, close the PDP, reveal the cart.
  const handleBuy = useCallback(
    (id: string) => {
      addToCart(id);
      setSelectedId(null);
      setCartOpen(true);
    },
    [addToCart],
  );

  // Track which card is centered so the floating header can adopt its identity.
  const onFeedScroll = useCallback(() => {
    if (scrollRaf.current) return;
    scrollRaf.current = requestAnimationFrame(() => {
      scrollRaf.current = 0;
      const el = feedRef.current;
      if (!el || !viewportH) return;
      const i = Math.round(el.scrollTop / viewportH);
      const clamped = Math.max(0, Math.min(OFFERINGS.length - 1, i));
      setActiveIndex((prev) => (prev === clamped ? prev : clamped));
    });
  }, [viewportH]);

  const scrollToIndex = useCallback(
    (i: number, behavior: ScrollBehavior = "smooth") => {
      const el = feedRef.current;
      if (el && viewportH) el.scrollTo({ top: i * viewportH, behavior });
      setActiveIndex(i);
    },
    [viewportH],
  );

  // Escape-to-close: cart, then overview, then sheet.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (cartOpen) setCartOpen(false);
      else if (overview) setOverview(false);
      else if (selected) close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cartOpen, overview, selected, close]);

  const cartButton = (
    <motion.button
      type="button"
      onClick={() => setCartOpen(true)}
      whileTap={{ scale: 0.94 }}
      aria-label={`Cart, ${cartCount} item${cartCount === 1 ? "" : "s"}`}
      style={{
        position: "relative",
        flexShrink: 0,
        width: 44,
        height: 44,
        borderRadius: "50%",
        background: T.surface,
        border: `1px solid ${T.border}`,
        color: T.textPrimary,
        display: "grid",
        placeItems: "center",
        cursor: "pointer",
      }}
    >
      <ShoppingBag size={20} strokeWidth={1.9} />
      <AnimatePresence>
        {cartCount > 0 && (
          <motion.span
            key={cartCount}
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.4, opacity: 0 }}
            transition={SPRING_SOFT}
            style={{
              position: "absolute",
              top: -2,
              right: -2,
              minWidth: 19,
              height: 19,
              padding: "0 5px",
              borderRadius: 999,
              background: T.ink,
              color: "#fff",
              fontSize: 11,
              fontWeight: 700,
              display: "grid",
              placeItems: "center",
              border: "2px solid #FBFBFB",
            }}
          >
            {cartCount}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );

  return (
    <div
      style={{
        // Full-bleed on every breakpoint. Mobile being edge-to-edge also makes
        // the keyboard math exact: the panel's bottom:0 equals the true screen
        // bottom, so the chat composer lifts flush against the keyboard.
        position: "fixed",
        inset: 0,
        background: T.bg,
        borderRadius: 0,
        border: "none",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header: floating & product-aware on mobile, identity bar on desktop */}
      {isMobile ? (
        <MobileHeader
          barRef={headerRef}
          cartCount={cartCount}
          hidden={!!selected}
          onOpenCart={() => setCartOpen(true)}
          onOpenOverview={() => setOverview(true)}
        />
      ) : (
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
            padding: "20px 28px",
            // When a card is expanded the header background drops away so its
            // content floats over the scrim and the card centers cleanly.
            background: selected ? "transparent" : T.bg,
            transition: "background 200ms ease",
          }}
        >
          {/* Light wordmark lockup — a small ink dot + name + tagline, all
              vertically centered on one axis. Far airier than the old avatar. */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
            <span
              aria-hidden
              style={{ width: 7, height: 7, borderRadius: "50%", background: T.ink, flexShrink: 0, marginRight: -3 }}
            />
            <span
              style={{
                fontSize: 19,
                fontWeight: 600,
                letterSpacing: "-0.03em",
                color: T.textPrimary,
                lineHeight: 1,
                whiteSpace: "nowrap",
              }}
            >
              Form
            </span>
            <span aria-hidden style={{ width: 1, height: 14, background: T.border, flexShrink: 0 }} />
            <span style={{ fontSize: 13.5, color: T.textTertiary, lineHeight: 1, whiteSpace: "nowrap" }}>
              Considered objects
            </span>
          </div>
          {cartButton}
        </div>
      )}

      {/* Scrollable feed */}
      <main
        ref={feedRef}
        onScroll={isMobile ? onFeedScroll : undefined}
        className={isMobile ? "carousel-x" : "feed-scroll"}
        style={{
          flex: 1,
          overflowY: selected ? "hidden" : "auto",
          overflowX: "hidden",
          minHeight: 0,
          padding: 0,
          display: isMobile ? undefined : "flex",
          flexDirection: isMobile ? undefined : "column",
          justifyContent: isMobile ? undefined : "center",
          WebkitOverflowScrolling: "touch",
          scrollSnapType: isMobile ? "y mandatory" : undefined,
          touchAction: isMobile ? "pan-y" : undefined,
          overscrollBehaviorY: isMobile ? "contain" : undefined,
        }}
      >
        <LayoutGroup>
          {isMobile ? (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {OFFERINGS.map((offering, i) => (
                <div
                  key={offering.id}
                  style={{
                    height: viewportH ? viewportH : "82dvh",
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
            <DesktopCarousel offerings={OFFERINGS} rootRef={feedRef} onOpen={setSelectedId} />
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
                onBuy={() => handleBuy(selected.id)}
                onAddToCart={() => addToCart(selected.id)}
              />
            )}
          </AnimatePresence>
        </LayoutGroup>
      </main>

      {/* iOS-style overview deck (mobile) */}
      <AnimatePresence>
        {isMobile && overview && (
          <CardOverview
            offerings={OFFERINGS}
            activeIndex={activeIndex}
            onPick={(i) => {
              // Feed is positioned instantly under the full-screen zoom clone,
              // so revealing it is a seamless hand-off (no visible scroll).
              scrollToIndex(i, "auto");
              setOverview(false);
            }}
            onClose={() => setOverview(false)}
          />
        )}
      </AnimatePresence>

      {/* Cart */}
      <AnimatePresence>
        {cartOpen && (
          <CartSheet
            items={cartItems}
            isMobile={isMobile}
            onRemove={removeFromCart}
            onClose={() => setCartOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Dock: desktop only. The per-card AI concierge replaces the global
          composer, so this space carries the store's policy links — keeping
          the storefront compliant with Meta and other ad-platform review. */}
      {!isMobile && (
        <div
          style={{
            flexShrink: 0,
            background: "transparent",
            padding: "14px 20px 18px",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <PolicyLinks tone="dock" />
        </div>
      )}
    </div>
  );
}
