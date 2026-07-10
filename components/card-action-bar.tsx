"use client";

import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Sparkles, ArrowUp, X } from "lucide-react";
import { T, SPRING } from "../lib/theme";

/**
 * The product card's action row.
 *
 * Default: a near-full-width "Add to cart" CTA + a small circular AI button.
 * The first job is frictionless buying (tap, tap, buy); the AI is secondary.
 *
 * Tapping AI morphs the circle (shared layoutId="ai-surface") into a full-width
 * input — effectively a second version of the CTA row — while the buy button
 * gracefully makes room. Tapping close morphs it back.
 */
export function CardActionBar({
  id,
  title,
  onBuy,
  onAsk,
}: {
  id: string;
  title: string;
  onBuy?: () => void;
  onAsk?: (value: string) => void;
}) {
  const surfaceId = `ai-surface-${id}`;
  const [aiOpen, setAiOpen] = useState(false);
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (aiOpen) {
      const id = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
  }, [aiOpen]);

  const close = useCallback(() => {
    setAiOpen(false);
    setValue("");
  }, []);

  const submit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onAsk?.(trimmed);
    setValue("");
  }, [value, onAsk]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.nativeEvent.isComposing || e.keyCode === 229) return;
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        submit();
      }
      if (e.key === "Escape") close();
    },
    [submit, close],
  );

  const hasText = value.trim().length > 0;
  const H = 54;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
      <AnimatePresence initial={false} mode="popLayout">
        {!aiOpen && (
          <motion.button
            key="cta"
            type="button"
            onClick={onBuy}
            layout
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            transition={SPRING}
            whileTap={{ scale: 0.975 }}
            style={{
              flex: 1,
              height: H,
              borderRadius: 999,
              background: T.ink,
              color: "#FFFFFF",
              border: "none",
              fontSize: 15.5,
              fontWeight: 600,
              letterSpacing: "-0.01em",
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            Add to cart
          </motion.button>
        )}
      </AnimatePresence>

      {/* The morphing AI surface — circle <-> input */}
      {!aiOpen ? (
        <motion.button
          key="ai-circle"
          type="button"
          layoutId={surfaceId}
          onClick={() => setAiOpen(true)}
          transition={SPRING}
          whileTap={{ scale: 0.94 }}
          aria-label={`Ask AI about ${title}`}
          style={{
            width: H,
            height: H,
            borderRadius: 999,
            background: T.bgSubtle,
            border: `1px solid ${T.borderActive}`,
            color: T.textPrimary,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 1,
            flexShrink: 0,
            cursor: "pointer",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          <motion.span layout style={{ display: "grid", placeItems: "center" }}>
            <Sparkles size={17} strokeWidth={1.75} />
          </motion.span>
          <motion.span
            layout
            style={{
              fontSize: 9.5,
              fontWeight: 600,
              letterSpacing: "0.06em",
              color: T.textSecondary,
            }}
          >
            AI
          </motion.span>
        </motion.button>
      ) : (
        <motion.div
          key="ai-input"
          layoutId={surfaceId}
          transition={SPRING}
          style={{
            flex: 1,
            height: H,
            borderRadius: 999,
            background: T.surface,
            border: `1px solid ${T.borderActive}`,
            display: "flex",
            alignItems: "center",
            gap: 6,
            paddingLeft: 18,
            paddingRight: 6,
            overflow: "hidden",
          }}
        >
          <motion.span
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.08 }}
            style={{ display: "grid", placeItems: "center", color: T.textTertiary, flexShrink: 0 }}
          >
            <Sparkles size={16} strokeWidth={1.75} />
          </motion.span>
          <motion.input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask about ${title}…`}
            aria-label={`Ask about ${title}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.06 }}
            style={{
              flex: 1,
              minWidth: 0,
              border: "none",
              outline: "none",
              background: "transparent",
              color: T.textPrimary,
              fontFamily: "inherit",
              fontSize: 14.5,
            }}
          />
          <motion.button
            type="button"
            aria-label="Send"
            onClick={submit}
            disabled={!hasText}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            whileTap={{ scale: 0.92 }}
            style={{
              width: 42,
              height: 42,
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
        </motion.div>
      )}

      <AnimatePresence initial={false} mode="popLayout">
        {aiOpen && (
          <motion.button
            key="close"
            type="button"
            onClick={close}
            layout
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={SPRING}
            whileTap={{ scale: 0.92 }}
            aria-label="Close AI"
            style={{
              width: H,
              height: H,
              borderRadius: 999,
              background: T.bgSubtle,
              border: `1px solid ${T.border}`,
              color: T.textSecondary,
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <X size={19} strokeWidth={1.9} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
