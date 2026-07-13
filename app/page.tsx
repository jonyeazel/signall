"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { ShoppingBag } from "lucide-react";
import { PolicyLinks } from "../components/policy-links";
import { OfferingCard } from "../components/offering-card";
import { OfferingSheet } from "../components/offering-sheet";
import { DesktopCarousel } from "../components/desktop-carousel";
import { MobileHeader } from "../components/mobile-header";
import { Wordmark } from "../components/wordmark";
import { CardOverview } from "../components/card-overview";
import { CartSheet, type CartLine } from "../components/cart-sheet";
import { OFFERINGS } from "../lib/offerings";
import { useMediaQuery } from "../hooks/use-media-query";
import { T, SPRING_SOFT } from "../lib/theme";

/** A calm paper canvas — no scenery, so the covers and type carry the page. */
function DesktopBackdrop() {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        background: T.bg,
      }}
    >
    </div>
  );
}

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
        borderRadius: 8,
        background: T.surface,
        border: `1px solid ${T.borderStrong}`,
        color: T.textPrimary,
        display: "grid",
        placeItems: "center",
        cursor: "pointer",
        boxShadow: "0 2px 0 rgba(28,28,26,0.08)",
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
              borderRadius: 4,
              background: T.signal,
              color: T.surface,
              fontSize: 11,
              fontWeight: 700,
              display: "grid",
              placeItems: "center",
              border: `2px solid ${T.surface}`,
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
      {/* v0University's calm paper canvas */}
      {!isMobile && <DesktopBackdrop />}

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
            minHeight: 72,
            padding: "14px 32px",
            background: T.bg,
          }}
        >
          <div style={{ width: 240 }} aria-hidden />
          <Wordmark size={20} />
          {/* Persistent authority — the credential that anchors the whole
              platform, present on every screen without ever getting in the way. */}
          <div
            style={{
              width: 240,
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                height: 30,
                padding: "0 12px",
                borderRadius: 6,
                background: T.surface,
                border: `1px solid ${T.borderStrong}`,
                fontSize: 12,
                letterSpacing: "-0.01em",
                color: T.textSecondary,
                whiteSpace: "nowrap",
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: T.signal,
                  flexShrink: 0,
                }}
              />
              <span>
                <strong style={{ color: T.textPrimary, fontWeight: 600 }}>#1 on Earth</strong>
                {" · 30,000 generations"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Scrollable feed */}
      <main
        ref={feedRef}
        onScroll={isMobile ? onFeedScroll : undefined}
        className={isMobile ? "carousel-x" : "feed-scroll"}
        style={{
          position: "relative",
          zIndex: 1,
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
                    onAddToCart={() => addToCart(offering.id)}
                    withComposer
                  />
                </div>
              ))}
            </div>
          ) : (
            <DesktopCarousel offerings={OFFERINGS} rootRef={feedRef} onOpen={setSelectedId} onAddToCart={addToCart} />
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
            position: "relative",
            zIndex: 1,
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

      {/* Cart — freed from the header into a floating glass control that stays
          within thumb's reach in the lower-right while you browse the deck. */}
      {!isMobile && (
        <div style={{ position: "fixed", right: 24, bottom: 24, zIndex: 60 }}>{cartButton}</div>
      )}
    </div>
  );
}
