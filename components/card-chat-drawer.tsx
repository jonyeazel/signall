"use client";

import { useState, useRef, useEffect, useCallback, useMemo, type KeyboardEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Sparkles, ArrowUp, X } from "lucide-react";
import { type Offering } from "../lib/offerings";
import { T, SPRING } from "../lib/theme";

type Msg = { role: "user" | "assistant"; text: string };

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
}: {
  offering: Offering;
  open: boolean;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [value, setValue] = useState("");
  const [typing, setTyping] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const replyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const suggestions = useMemo(
    () => ["What's it made of?", "Shipping & returns", "Is it right for me?"],
    [],
  );

  // Focus the input when the drawer opens; reset the thread when it closes.
  useEffect(() => {
    if (open) {
      const raf = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(raf);
    }
    const t = setTimeout(() => {
      setMessages([]);
      setValue("");
      setTyping(false);
    }, 260);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    return () => {
      if (replyTimer.current) clearTimeout(replyTimer.current);
    };
  }, []);

  // Auto-scroll to the latest message.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

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

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.nativeEvent.isComposing || e.keyCode === 229) return;
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        send(value);
      }
      if (e.key === "Escape") onClose();
    },
    [send, value, onClose],
  );

  const hasText = value.trim().length > 0;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={SPRING}
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 20,
            display: "flex",
            flexDirection: "column",
            background: "rgba(255,255,255,0.86)",
            backdropFilter: "blur(24px) saturate(1.5)",
            WebkitBackdropFilter: "blur(24px) saturate(1.5)",
          }}
        >
          {/* Header */}
          <div
            style={{
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 12px 10px",
              borderBottom: `1px solid ${T.border}`,
            }}
          >
            <img
              src={offering.images[1] ?? offering.images[0] ?? "/placeholder.svg"}
              alt=""
              style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
            />
            <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
              <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-0.01em", color: T.textPrimary, lineHeight: 1.2 }}>
                Ask about {offering.title}
              </span>
              <span style={{ fontSize: 11.5, color: T.textTertiary, lineHeight: 1.2 }}>AI concierge</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close chat"
              style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                background: T.bgSubtle,
                border: `1px solid ${T.border}`,
                color: T.textSecondary,
                display: "grid",
                placeItems: "center",
                cursor: "pointer",
                flexShrink: 0,
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <X size={17} strokeWidth={2} />
            </button>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              padding: "14px 12px",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {/* Assistant welcome */}
            <Bubble role="assistant">
              Hi — I can help with materials, sizing, shipping, or whether {offering.title} is right for you.
            </Bubble>

            {messages.length === 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 2 }}>
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
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
                  </button>
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
              flexShrink: 0,
              padding: "10px 10px calc(10px + env(safe-area-inset-bottom))",
              borderTop: `1px solid ${T.border}`,
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
                paddingLeft: 16,
                paddingRight: 6,
              }}
            >
              <Sparkles size={16} strokeWidth={1.75} color={T.textTertiary} style={{ flexShrink: 0 }} />
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
              <button
                type="button"
                aria-label="Send"
                onClick={() => send(value)}
                disabled={!hasText}
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
              </button>
            </div>
          </div>
        </motion.div>
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
