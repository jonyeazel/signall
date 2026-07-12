"use client";

import { useState, useRef, useEffect, useCallback, useMemo, type KeyboardEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUp, X } from "lucide-react";
import { type Offering } from "../lib/offerings";
import { T, WHISPER_PATTERN } from "../lib/theme";

type Msg = { role: "user" | "assistant"; text: string };

// A premium, overshoot-free slide for the drawer — glides up and settles.
const DRAWER_SPRING = { type: "spring", stiffness: 320, damping: 36, mass: 0.85 } as const;

/**
 * A beautiful AI chat that slides up *inside* a product card.
 *
 * Rendered as an absolute overlay within a `position: relative; overflow:
 * hidden` card, so it stays perfectly clipped to the card's rounded corners.
 * The composer input is 16px so iOS never zooms (which would otherwise fight
 * the card's fixed layout).
 *
 * Replies are generated locally from the product's own facts — deliberately
 * factual, with no health/earnings/performance claims — so any store built on
 * this template stays compliant with Meta and other ad-platform policies.
 */
export function CardChatDrawer({
  offering,
  open,
  onClose,
  initialMessage,
  heightPct = "82%",
  flatTop = false,
}: {
  offering: Offering;
  open: boolean;
  onClose: () => void;
  /** When set, the drawer opens straight into a thread seeded with this
   *  question (e.g. submitted from the card's inline composer). */
  initialMessage?: string;
  /** How much of the offset parent the drawer covers. Defaults to 82%
   *  (leaves a sliver of the card); the expanded PDP passes a taller value. */
  heightPct?: string;
  /** Square off the top corners (mobile full-bleed) instead of rounding them. */
  flatTop?: boolean;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [value, setValue] = useState("");
  const [typing, setTyping] = useState(false);
  const [kb, setKb] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const replyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const suggestions = useMemo(
    () => ["What's it made of?", "Shipping & returns", "Is it right for me?"],
    [],
  );

  // Keyboard etiquette — the whole point of a great chat on iOS:
  //  • Summon the keyboard ONLY when the shopper opened the chat to *type*
  //    (tapped Ai with no seeded question). When it opens with a seeded
  //    question they've already asked from the card's composer — so we keep the
  //    keyboard away and let them READ the reply in full. It returns the instant
  //    they tap the field for a follow-up.
  //  • preventScroll is essential: without it the browser scrolls the card into
  //    view to reveal the input, which shifts the shared-layout product image
  //    and makes the background "flip" as the drawer opens.
  useEffect(() => {
    if (open) {
      if (initialMessage) return;
      const raf = requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
      return () => cancelAnimationFrame(raf);
    }
    const t = setTimeout(() => {
      setMessages([]);
      setValue("");
      setTyping(false);
    }, 260);
    return () => clearTimeout(t);
  }, [open, initialMessage]);

  useEffect(() => {
    return () => {
      if (replyTimer.current) clearTimeout(replyTimer.current);
    };
  }, []);

  // Keep the sheet's bottom pinned flush above the on-screen keyboard so the
  // composer and newest messages are never hidden. iOS/iPadOS — and iOS Chrome,
  // which is WebKit — only shrink the visual viewport, not the layout viewport,
  // so a bottom-anchored sheet would otherwise sit behind the keyboard.
  //
  // Because the app-frame is full-bleed (inset:0), the panel's bottom:0 sits at
  // the true screen bottom, so the keyboard height is simply the difference
  // between the layout viewport and the (shrunken) visual viewport. This avoids
  // fragile parent-rect measurement, which iOS reports inconsistently.
  useEffect(() => {
    const vv = typeof window !== "undefined" ? window.visualViewport : null;
    if (!open || !vv) {
      setKb(0);
      return;
    }
    const update = () => {
      const overlap = window.innerHeight - vv.height - vv.offsetTop;
      // Ignore sub-keyboard jitter (URL-bar chrome, rounding) — a real keyboard
      // is always well over 120px — so the sheet never nudges spuriously.
      setKb(overlap > 120 ? Math.round(overlap) : 0);
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, [open]);

  // Pin to the bottom whenever the thread grows — rAF waits for the new bubble
  // to lay out so the newest line is always fully in view.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const id = requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    });
    return () => cancelAnimationFrame(id);
  }, [messages, typing]);

  // Re-pin instantly as the keyboard opens/closes (and on open) so the last
  // line never slips behind the keyboard mid-animation.
  useEffect(() => {
    const el = scrollRef.current;
    if (el && open) el.scrollTo({ top: el.scrollHeight });
  }, [kb, open]);

  const answer = useCallback(
    (q: string): string => {
      const s = q.toLowerCase();
      if (/(material|made|build|construct|fabric)/.test(s)) {
        return `${offering.title} is ${offering.features[1]?.toLowerCase() ?? offering.description.toLowerCase()}. ${offering.features[2] ?? ""}`.trim();
      }
      if (/(ship|deliver|return|refund|exchange|warranty)/.test(s)) {
        return "Every order ships within 2 business days with tracking, and comes with free 30-day returns. See our Shipping and Returns policies in the footer for the full details.";
      }
      if (/(right for me|should i|fit|good for|worth|help)/.test(s)) {
        return `If you value ${offering.tags.slice(0, 2).join(" and ").toLowerCase()}, ${offering.title} is a considered choice — ${offering.tagline.toLowerCase()} Happy to answer anything specific.`;
      }
      if (/(price|cost|how much)/.test(s)) {
        return `${offering.title} is ${offering.price}. Tap Learn more for the full spec and to add it to your cart.`;
      }
      return `${offering.description} Anything specific you'd like to know?`;
    },
    [offering],
  );

  // Opened with a seed question → start the thread with it and its answer,
  // skipping the welcome + suggestion chips.
  useEffect(() => {
    if (!open) return;
    const seed = initialMessage?.trim();
    if (!seed) return;
    setMessages([{ role: "user", text: seed }]);
    setTyping(true);
    const t = setTimeout(() => {
      setTyping(false);
      setMessages([
        { role: "user", text: seed },
        { role: "assistant", text: answer(seed) },
      ]);
    }, 650);
    return () => clearTimeout(t);
  }, [open, initialMessage, answer]);

  const send = useCallback(
    (raw: string) => {
      const text = raw.trim();
      if (!text) return;
      setValue("");
      setMessages((m) => [...m, { role: "user", text }]);
      setTyping(true);
      replyTimer.current = setTimeout(() => {
        setTyping(false);
        setMessages((m) => [...m, { role: "assistant", text: answer(text) }]);
      }, 650);
    },
    [answer],
  );

  // Close, but blur first so the keyboard begins sliding away in the same beat
  // as the drawer — never a lingering keyboard over a dismissed sheet.
  const dismiss = useCallback(() => {
    inputRef.current?.blur();
    onClose();
  }, [onClose]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.nativeEvent.isComposing || e.keyCode === 229) return;
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        send(value);
      }
      if (e.key === "Escape") dismiss();
    },
    [send, value, dismiss],
  );

  const hasText = value.trim().length > 0;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Scrim over the rest of the card — tap to dismiss */}
          <motion.div
            key="chat-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.24 }}
            onClick={dismiss}
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 19,
              background: "rgba(255,255,255,0.5)",
              backdropFilter: "blur(3px)",
              WebkitBackdropFilter: "blur(3px)",
            }}
          />
          {/* The drawer slides up to ~82% of the card at rest. When the
              keyboard opens it rises flush against it (bottom: kb) AND expands
              upward to a slim top peek, so the whole conversation uses the
              space above the keyboard and the composer sits right on it — the
              chat "comes to attention" as you type, and relaxes when done. */}
          <motion.div
            ref={panelRef}
            key="chat-panel"
            initial={{ y: "101%", opacity: 0.85 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "101%", opacity: 0.85 }}
            transition={DRAWER_SPRING}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: kb,
              height: kb > 0 ? `calc(100% - ${kb}px - 44px)` : heightPct,
              // Track the keyboard with iOS's own easing so the sheet feels
              // physically attached to it as it rises and falls.
              transition: "bottom 0.28s cubic-bezier(0.32,0.72,0,1), height 0.28s cubic-bezier(0.32,0.72,0,1)",
              zIndex: 20,
              display: "flex",
              flexDirection: "column",
              background: "rgba(255,255,255,0.985)",
              backdropFilter: "blur(28px) saturate(1.6)",
              WebkitBackdropFilter: "blur(28px) saturate(1.6)",
              borderTopLeftRadius: flatTop ? 0 : 20,
              borderTopRightRadius: flatTop ? 0 : 20,
              borderTop: `1px solid ${T.border}`,
              boxShadow: "0 -14px 40px -14px rgba(0,0,0,0.2)",
            }}
          >
          {/* Stripe-style decorative wash — barely-there flowing contour lines
              over a soft top glow, masked to dissolve downward. Purely
              aesthetic; sits behind the content and never intercepts taps. */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 260,
              zIndex: 0,
              pointerEvents: "none",
              borderTopLeftRadius: flatTop ? 0 : 20,
              borderTopRightRadius: flatTop ? 0 : 20,
              backgroundImage: `${WHISPER_PATTERN}, radial-gradient(95% 80% at 50% -20%, rgba(23,23,23,0.05), rgba(23,23,23,0) 70%)`,
              backgroundSize: "240px 180px, 100% 100%",
              backgroundRepeat: "repeat, no-repeat",
              maskImage: "linear-gradient(to bottom, #000 0%, rgba(0,0,0,0.5) 55%, transparent 100%)",
              WebkitMaskImage: "linear-gradient(to bottom, #000 0%, rgba(0,0,0,0.5) 55%, transparent 100%)",
            }}
          />

          {/* Minimal top — just a grabber + close. No branding: it's the chat. */}
          <div
            style={{
              position: "relative",
              zIndex: 1,
              flexShrink: 0,
              height: 42,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span aria-hidden style={{ width: 38, height: 5, borderRadius: 999, background: T.borderActive }} />
            <motion.button
              type="button"
              onClick={dismiss}
              whileTap={{ scale: 0.9 }}
              aria-label="Close chat"
              style={{
                position: "absolute",
                right: 10,
                top: 7,
                width: 30,
                height: 30,
                borderRadius: "50%",
                background: T.bgSubtle,
                border: `1px solid ${T.border}`,
                color: T.textSecondary,
                display: "grid",
                placeItems: "center",
                cursor: "pointer",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <X size={16} strokeWidth={2} />
            </motion.button>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            onTouchMove={() => {
              // iMessage-style: the moment you drag the transcript, the
              // keyboard bows out — the conversation is yours to read. It only
              // ever returns when you deliberately tap the field again.
              if (typeof document !== "undefined" && document.activeElement === inputRef.current) {
                inputRef.current?.blur();
              }
            }}
            style={{
              position: "relative",
              zIndex: 1,
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              overscrollBehavior: "contain",
              WebkitOverflowScrolling: "touch",
              padding: "14px 12px 26px",
              display: "flex",
              flexDirection: "column",
              gap: 10,
              // Elegantly dissolve the conversation as it nears the composer —
              // no hard divider line, just a soft fade (extra bottom padding
              // keeps the newest message clear of the fade zone).
              maskImage: "linear-gradient(to bottom, #000 calc(100% - 30px), transparent 100%)",
              WebkitMaskImage: "linear-gradient(to bottom, #000 calc(100% - 30px), transparent 100%)",
            }}
          >
            {/* Assistant welcome */}
            <Bubble role="assistant">
              Hi — I can help with materials, sizing, shipping, or whether {offering.title} is right for you.
            </Bubble>

            {messages.length === 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 2 }}>
                {suggestions.map((s, i) => (
                  <motion.button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.24, delay: 0.06 + i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                    whileTap={{ scale: 0.96 }}
                    style={{
                      fontSize: 13,
                      color: T.textPrimary,
                      background: T.surface,
                      border: `1px solid ${T.border}`,
                      borderRadius: 999,
                      padding: "7px 12px",
                      cursor: "pointer",
                      WebkitTapHighlightColor: "transparent",
                    }}
                  >
                    {s}
                  </motion.button>
                ))}
              </div>
            )}

            {messages.map((m, i) => (
              <Bubble key={i} role={m.role}>
                {m.text}
              </Bubble>
            ))}

            {typing && (
              <Bubble role="assistant">
                <span className="chat-typing" style={{ display: "inline-flex", gap: 3 }}>
                  <Dot /> <Dot /> <Dot />
                </span>
              </Bubble>
            )}
          </div>

          {/* Composer */}
          <div
            style={{
              position: "relative",
              zIndex: 1,
              flexShrink: 0,
              // When lifted above the keyboard the home-indicator inset no
              // longer applies, so drop it to keep the composer snug.
              padding: kb > 0 ? "6px 10px 10px" : "6px 10px calc(10px + env(safe-area-inset-bottom))",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                height: 48,
                borderRadius: 999,
                background: T.surface,
                border: `1px solid ${T.borderActive}`,
                paddingLeft: 18,
                paddingRight: 6,
              }}
            >
              <input
                ref={inputRef}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Message about ${offering.title}…`}
                aria-label={`Message about ${offering.title}`}
                style={{
                  flex: 1,
                  minWidth: 0,
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  color: T.textPrimary,
                  fontFamily: "inherit",
                  // 16px: prevents iOS Safari from auto-zooming on focus.
                  fontSize: 16,
                }}
              />
              <motion.button
                type="button"
                aria-label="Send"
                onClick={() => send(value)}
                disabled={!hasText}
                whileTap={{ scale: hasText ? 0.88 : 1 }}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  flexShrink: 0,
                  background: hasText ? T.ink : T.ghost,
                  border: `1px solid ${hasText ? T.ink : T.border}`,
                  color: hasText ? "#FFFFFF" : T.textTertiary,
                  display: "grid",
                  placeItems: "center",
                  cursor: hasText ? "pointer" : "default",
                  transition: "background 150ms ease-out, color 150ms ease-out",
                }}
              >
                <ArrowUp size={17} strokeWidth={2} />
              </motion.button>
            </div>
          </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Bubble({ role, children }: { role: "user" | "assistant"; children: React.ReactNode }) {
  const isUser = role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      style={{
        alignSelf: isUser ? "flex-end" : "flex-start",
        maxWidth: "82%",
        background: isUser ? T.ink : T.surface,
        color: isUser ? "#FFFFFF" : T.textPrimary,
        border: isUser ? "none" : `1px solid ${T.border}`,
        borderRadius: 18,
        borderBottomRightRadius: isUser ? 6 : 18,
        borderBottomLeftRadius: isUser ? 18 : 6,
        padding: "10px 13px",
        fontSize: 14,
        lineHeight: 1.45,
        letterSpacing: "-0.01em",
      }}
    >
      {children}
    </motion.div>
  );
}

function Dot() {
  return <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.textTertiary, display: "inline-block" }} />;
}
