"use client";

import { useState, useRef, useEffect, useCallback, useMemo, type KeyboardEvent } from "react";
import { AnimatePresence, motion, useDragControls } from "motion/react";
import { ArrowUp, Check, ShoppingBag } from "lucide-react";
import { type Offering } from "../lib/offerings";
import { T, COVERS } from "../lib/theme";

/** Functional assets the concierge can surface inline in the thread. */
type Asset = "buy" | "specs";
type Msg = {
  role: "user" | "assistant";
  text: string;
  /** Rich UI the assistant chose to attach beneath this reply. */
  assets?: Asset[];
  /** Suggested next questions, written in the shopper's voice. */
  asks?: string[];
  /** True while tokens are still streaming into this bubble. */
  streaming?: boolean;
};

// A premium, overshoot-free slide for the drawer — glides up and settles.
const DRAWER_SPRING = { type: "spring", stiffness: 320, damping: 36, mass: 0.85 } as const;

/**
 * Parse the concierge's raw stream into display text + functional assets.
 *
 * The model may append machine-read control tokens on the final lines:
 *   [[assets: buy, specs]]      → render a buy card / spec snapshot
 *   [[asks: A follow-up? | B?]] → render tappable follow-up chips
 * Everything from the first "[[" onward is stripped from the visible message,
 * so a half-streamed token never flashes on screen.
 */
function parseMeta(raw: string): { display: string; assets?: Asset[]; asks?: string[] } {
  let assets: Asset[] | undefined;
  let asks: string[] | undefined;

  const assetsMatch = raw.match(/\[\[assets:([^\]]*)\]\]/i);
  if (assetsMatch) {
    const picked = assetsMatch[1]
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter((s): s is Asset => s === "buy" || s === "specs");
    if (picked.length) assets = Array.from(new Set(picked));
  }

  const asksMatch = raw.match(/\[\[asks:([^\]]*)\]\]/i);
  if (asksMatch) {
    const picked = asksMatch[1]
      .split("|")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 3);
    if (picked.length) asks = picked;
  }

  let display = raw;
  const cut = display.indexOf("[[");
  if (cut >= 0) display = display.slice(0, cut);
  return { display: display.trim(), assets, asks };
}

/**
 * A beautiful AI concierge that slides up *inside* a product card.
 *
 * Rendered as an absolute overlay within a `position: relative; overflow:
 * hidden` card, so it stays perfectly clipped to the card's rounded corners.
 *
 * Replies stream live from `/api/concierge` — a frontier model grounded
 * strictly on THIS product's own facts, written in a warm, presupposition-led
 * concierge voice (never health/earnings/performance claims, so any store built
 * on this template stays ad-platform compliant). The model can surface
 * functional assets inline: a real add-to-cart / view buy card, a spec
 * snapshot, and follow-up chips. If the network or gateway is ever
 * unavailable, a grounded local fallback keeps the chat working.
 */
export function CardChatDrawer({
  offering,
  open,
  onClose,
  initialMessage,
  heightPct = "82%",
  flatTop = false,
  onAddToCart,
  onViewProduct,
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
  /** Wire the in-chat buy card to the real cart. */
  onAddToCart?: () => void;
  /** Wire the in-chat "view details" action to open the PDP. Omit inside the
   *  PDP itself (the shopper is already there). */
  onViewProduct?: () => void;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [value, setValue] = useState("");
  const [typing, setTyping] = useState(false);
  const [kb, setKb] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const messagesRef = useRef<Msg[]>([]);
  const dragControls = useDragControls();

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Prefer the product's own hand-written openers (set per product in the
  // catalog) so the empty state sparks the exact conversation that sells THIS
  // piece; fall back to a universal set for any product without them.
  const suggestions = useMemo(
    () =>
      offering.chatSeeds && offering.chatSeeds.length > 0
        ? offering.chatSeeds
        : ["Is it right for me?", "What's it made of?", `Why ${offering.price}?`],
    [offering.chatSeeds, offering.price],
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

  // Abort any in-flight stream when the drawer closes or unmounts.
  useEffect(() => {
    if (!open) abortRef.current?.abort();
    return () => abortRef.current?.abort();
  }, [open]);

  // Keep the sheet's bottom pinned flush above the on-screen keyboard so the
  // composer and newest messages are never hidden. iOS/iPadOS — and iOS Chrome,
  // which is WebKit — only shrink the visual viewport, not the layout viewport,
  // so a bottom-anchored sheet would otherwise sit behind the keyboard.
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

  // Grounded local fallback — used only if the streamed concierge is
  // unreachable, so a forked template with no gateway key still feels alive.
  const localReply = useCallback(
    (q: string): { text: string; assets?: Asset[]; asks?: string[] } => {
      const s = q.toLowerCase();
      if (/(what.*(learn|inside|included|cover|get)|structure|lesson|chapter|module|how long|length)/.test(s)) {
        const detail = offering.features[0]?.toLowerCase() ?? offering.description.toLowerCase();
        const extra = offering.features[1] ? `, plus ${offering.features[1].toLowerCase()}` : "";
        const dur = offering.duration ? ` It's taught in a single video, ${offering.duration}.` : "";
        return {
          text: `You'll walk away with ${detail}${extra}.${dur}`,
          assets: ["specs"],
          asks: ["Is this right for me?", "Should I just get the Pass?"],
        };
      }
      if (/(beginner|new|start|code|experience|hard|difficult|level)/.test(s)) {
        return {
          text: `No coding required — this is about the rhythm, not the syntax. If you can describe what you want, you can follow along and ship it.`,
          assets: ["buy"],
          asks: ["What will I build?", `Why ${offering.price}?`],
        };
      }
      if (/(right for me|should i|fit|suit|good for|worth|help|recommend|me)/.test(s)) {
        return {
          text: `If you want ${offering.tags.slice(0, 2).join(" and ").toLowerCase()}, this is a direct hit — ${offering.tagline.toLowerCase()} It pays for itself the first time you use it.`,
          assets: ["buy"],
          asks: ["What will I learn?", "Should I just get the Pass?"],
        };
      }
      if (/(price|cost|how much|expensive|why|value|pass|subscribe|bundle)/.test(s)) {
        return {
          text: `${offering.title} is ${offering.price}. If you're eyeing more than a couple of courses, the Pass at $39/mo unlocks all eight plus everything I release next — cancel anytime.`,
          assets: ["buy"],
          asks: ["What's included?", "Is this right for me?"],
        };
      }
      return {
        text: `${offering.description} What would you like to know?`,
        asks: ["Is this right for me?", "What will I learn?"],
      };
    },
    [offering],
  );

  // Stream a grounded reply from the concierge, patching tokens into the last
  // assistant bubble as they arrive; fall back locally on any failure.
  const respond = useCallback(
    async (history: { role: "user" | "assistant"; content: string }[], fallbackText: string) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setTyping(true);
      let started = false;

      try {
        const res = await fetch("/api/concierge", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ productId: offering.id, messages: history }),
          signal: controller.signal,
        });
        if (!res.ok || !res.body) throw new Error("no stream");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let raw = "";

        for (;;) {
          const { done, value: chunk } = await reader.read();
          if (done) break;
          raw += decoder.decode(chunk, { stream: true });
          const { display } = parseMeta(raw);
          if (!display) continue;
          if (!started) {
            started = true;
            setTyping(false);
            setMessages((m) => [...m, { role: "assistant", text: display, streaming: true }]);
          } else {
            setMessages((m) => patchLast(m, { text: display }));
          }
        }

        if (!started) throw new Error("empty reply");
        const final = parseMeta(raw);
        setMessages((m) =>
          patchLast(m, { text: final.display, assets: final.assets, asks: final.asks, streaming: false }),
        );
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setTyping(false);
        const fb = localReply(fallbackText);
        setMessages((m) => {
          const next = m.slice();
          const last = next[next.length - 1];
          if (started && last && last.role === "assistant") {
            next[next.length - 1] = {
              ...last,
              streaming: false,
              text: last.text || fb.text,
              assets: fb.assets,
              asks: fb.asks,
            };
          } else {
            next.push({ role: "assistant", text: fb.text, assets: fb.assets, asks: fb.asks });
          }
          return next;
        });
      }
    },
    [offering.id, localReply],
  );

  const send = useCallback(
    (raw: string) => {
      const text = raw.trim();
      if (!text) return;
      setValue("");
      const userMsg: Msg = { role: "user", text };
      setMessages((m) => [...m, userMsg]);
      const history = [...messagesRef.current, userMsg].map((m) => ({ role: m.role, content: m.text }));
      respond(history, text);
    },
    [respond],
  );

  // Opened with a seed question → start the thread with it and stream the reply.
  useEffect(() => {
    if (!open) return;
    const seed = initialMessage?.trim();
    if (!seed) return;
    setMessages([{ role: "user", text: seed }]);
    respond([{ role: "user", content: seed }], seed);
  }, [open, initialMessage, respond]);

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
              background: "rgba(28,28,26,0.22)",
            }}
          />
          {/* The drawer slides up to ~82% of the card at rest. When the
              keyboard opens it rises flush against it (bottom: kb) AND expands
              upward to a slim top peek, so the whole conversation uses the
              space above the keyboard and the composer sits right on it. */}
          <motion.div
            ref={panelRef}
            key="chat-panel"
            initial={{ y: "101%", opacity: 0.85 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "101%", opacity: 0.85 }}
            transition={DRAWER_SPRING}
            drag="y"
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.55 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 110 || info.velocity.y > 520) dismiss();
            }}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: kb,
              height: kb > 0 ? `calc(100% - ${kb}px - 44px)` : heightPct,
              transition: "bottom 0.28s cubic-bezier(0.32,0.72,0,1), height 0.28s cubic-bezier(0.32,0.72,0,1)",
              zIndex: 20,
              display: "flex",
              flexDirection: "column",
              background: T.bg,
              borderTopLeftRadius: flatTop ? 0 : 10,
              borderTopRightRadius: flatTop ? 0 : 10,
              borderTop: `1px solid ${T.borderStrong}`,
              boxShadow: "0 -2px 0 rgba(28,28,26,0.06)",
            }}
          >
            {/* Minimal top — the grabber IS the control: drag it down to close. */}
            <div
              role="button"
              aria-label="Drag down to close chat"
              onPointerDown={(e) => dragControls.start(e)}
              onClick={(e) => e.stopPropagation()}
              style={{
                position: "relative",
                zIndex: 1,
                flexShrink: 0,
                height: 44,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "grab",
                touchAction: "none",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <span aria-hidden style={{ width: 44, height: 5, borderRadius: 8, background: T.borderActive }} />
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              onTouchMove={() => {
                // iMessage-style: the moment you drag the transcript, the
                // keyboard bows out — the conversation is yours to read.
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
              }}
            >
              {/* Assistant welcome */}
              <Bubble role="assistant">
                Hey — I&apos;m Ada. Ask me anything about {offering.title}, or tell me what you&apos;re trying to
                build and I&apos;ll tell you honestly if it&apos;s the right move.
              </Bubble>

              {messages.length === 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 2 }}>
                  {suggestions.map((s, i) => (
                    <Chip key={s} label={s} index={i} onClick={() => send(s)} />
                  ))}
                </div>
              )}

              {messages.map((m, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: m.role === "user" ? "flex-end" : "flex-start" }}>
                  <Bubble role={m.role} streaming={m.streaming}>
                    {m.text}
                  </Bubble>

                  {/* Functional assets the concierge attached to this reply */}
                  {m.role === "assistant" && !m.streaming && m.assets?.includes("buy") && (
                    <BuyCard
                      offering={offering}
                      onAddToCart={onAddToCart}
                      onView={
                        onViewProduct
                          ? () => {
                              onViewProduct();
                              dismiss();
                            }
                          : undefined
                      }
                    />
                  )}
                  {m.role === "assistant" && !m.streaming && m.assets?.includes("specs") && (
                    <SpecCard offering={offering} />
                  )}

                  {/* Suggested follow-ups, in the shopper's voice */}
                  {m.role === "assistant" && !m.streaming && m.asks && m.asks.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 1 }}>
                      {m.asks.map((a, j) => (
                        <Chip key={a} label={a} index={j} onClick={() => send(a)} />
                      ))}
                    </div>
                  )}
                </div>
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
                padding: kb > 0 ? "6px 10px 10px" : "6px 10px calc(10px + env(safe-area-inset-bottom))",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  height: 48,
                  borderRadius: 8,
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

function Bubble({
  role,
  children,
  streaming = false,
}: {
  role: "user" | "assistant";
  children: React.ReactNode;
  streaming?: boolean;
}) {
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
        borderRadius: 8,
        borderBottomRightRadius: isUser ? 2 : 8,
        borderBottomLeftRadius: isUser ? 8 : 2,
        padding: "10px 13px",
        fontSize: 14,
        lineHeight: 1.45,
        letterSpacing: "-0.01em",
      }}
    >
      {children}
      {streaming && <span className="chat-caret" aria-hidden />}
    </motion.div>
  );
}

/** A small, tactile suggestion / follow-up chip. */
function Chip({ label, index, onClick }: { label: string; index: number; onClick: () => void }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, delay: 0.04 + index * 0.05, ease: [0.22, 1, 0.36, 1] }}
      whileTap={{ scale: 0.96 }}
      style={{
        fontSize: 13,
        color: T.textPrimary,
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: 8,
        padding: "7px 12px",
        cursor: "pointer",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {label}
    </motion.button>
  );
}

/**
 * The in-chat buy card — the concierge turning a decision into one tap.
 * Real add-to-cart (with a confirmed state) and an optional jump to the PDP.
 */
function BuyCard({
  offering,
  onAddToCart,
  onView,
}: {
  offering: Offering;
  onAddToCart?: () => void;
  onView?: () => void;
}) {
  const [added, setAdded] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
      style={{
        alignSelf: "flex-start",
        maxWidth: "90%",
        width: 300,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        padding: 12,
        borderRadius: 18,
        background: T.surface,
        border: `1px solid ${T.border}`,
        boxShadow: "0 12px 30px -18px rgba(0,0,0,0.35)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 12,
            overflow: "hidden",
            flexShrink: 0,
            display: "grid",
            placeItems: "center",
            background: COVERS[offering.cover].bg,
            color: COVERS[offering.cover].accent,
            border: `1px solid ${T.border}`,
          }}
          aria-hidden
        >
          <offering.icon size={24} strokeWidth={1.8} />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 14.5, fontWeight: 600, letterSpacing: "-0.01em", color: T.textPrimary }}>
            {offering.title}
          </div>
          <div style={{ fontSize: 13, color: T.textSecondary, marginTop: 1 }}>
            {offering.price} · {offering.action === "subscribe" ? "cancel anytime" : "lifetime access"}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={() => {
            onAddToCart?.();
            setAdded(true);
          }}
          style={{
            flex: 1,
            height: 42,
            borderRadius: 8,
            background: added ? T.ghost : T.ink,
            color: added ? T.textPrimary : "#FFFFFF",
            border: added ? `1px solid ${T.border}` : "none",
            fontSize: 14,
            fontWeight: 600,
            letterSpacing: "-0.01em",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 7,
            transition: "background 160ms ease, color 160ms ease",
          }}
        >
          {added ? (
            <>
              <Check size={16} strokeWidth={2.4} /> Added
            </>
          ) : (
            <>
              <ShoppingBag size={16} strokeWidth={2} /> Add to cart
            </>
          )}
        </motion.button>
        {onView && (
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={onView}
            style={{
              flexShrink: 0,
              height: 42,
              padding: "0 16px",
              borderRadius: 8,
              background: T.surface,
              color: T.textPrimary,
              border: `1px solid ${T.borderActive}`,
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: "-0.01em",
              cursor: "pointer",
            }}
          >
            Details
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}

/** The in-chat spec snapshot — the product's key numbers at a glance. */
function SpecCard({ offering }: { offering: Offering }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
      style={{
        alignSelf: "flex-start",
        maxWidth: "90%",
        display: "flex",
        gap: 8,
        padding: 6,
        borderRadius: 16,
        background: T.surface,
        border: `1px solid ${T.border}`,
        boxShadow: "0 12px 30px -18px rgba(0,0,0,0.35)",
      }}
    >
      {offering.stats.map((stat) => (
        <div
          key={stat.label}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            padding: "9px 13px",
            borderRadius: 11,
            background: T.ghost,
            minWidth: 66,
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.02em", color: T.textPrimary }}>
            {stat.value}
          </span>
          <span style={{ fontSize: 11, color: T.textSecondary, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            {stat.label}
          </span>
        </div>
      ))}
    </motion.div>
  );
}

function Dot() {
  return <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.textTertiary, display: "inline-block" }} />;
}

/** Immutably patch the last message in the list. */
function patchLast(list: Msg[], patch: Partial<Msg>): Msg[] {
  if (list.length === 0) return list;
  const next = list.slice();
  next[next.length - 1] = { ...next[next.length - 1], ...patch };
  return next;
}
