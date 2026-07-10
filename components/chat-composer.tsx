"use client";

import { useRef, useState, useCallback, type KeyboardEvent } from "react";
import { Plus, ArrowUp } from "lucide-react";

const t = {
  surface: "#FFFFFF",
  border: "#E5E5E5",
  borderActive: "#D4D4D4",
  textPrimary: "#171717",
  textSecondary: "#6E6E6E",
  textTertiary: "#A0A0A0",
  accent: "#171717",
  ghost: "#F5F5F5",
};

export function ChatComposer({
  placeholder = "Ask anything, or describe what you want to build...",
  onSubmit,
  flush = false,
}: {
  placeholder?: string;
  onSubmit?: (value: string) => void;
  flush?: boolean;
}) {
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const autoGrow = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, []);

  const submit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit?.(trimmed);
    setValue("");
    requestAnimationFrame(() => {
      if (textareaRef.current) textareaRef.current.style.height = "auto";
    });
  }, [value, onSubmit]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      // Respect CJK IME composition — don't submit mid-composition.
      if (e.nativeEvent.isComposing || e.keyCode === 229) return;
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        submit();
      }
    },
    [submit],
  );

  const hasText = value.trim().length > 0;

  return (
    <div
      style={{
        width: "100%",
        maxWidth: flush ? "100%" : "720px",
        background: t.surface,
        border: flush ? "none" : `1px solid ${focused ? t.borderActive : t.border}`,
        borderRadius: flush ? "0px" : "24px",
        padding: flush ? "12px 16px 14px" : "12px 12px 10px",
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        transition: "border-color 150ms ease-out",
      }}
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          autoGrow();
        }}
        onKeyDown={handleKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        rows={1}
        aria-label="Message composer"
        style={{
          width: "100%",
          resize: "none",
          border: "none",
          outline: "none",
          background: "transparent",
          color: t.textPrimary,
          fontFamily: "inherit",
          fontSize: "14px",
          lineHeight: 1.5,
          padding: "6px 8px",
          maxHeight: "160px",
          overflowY: "auto",
        }}
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <button
          type="button"
          aria-label="Add attachment"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "34px",
            height: "34px",
            borderRadius: "50%",
            background: t.ghost,
            border: `1px solid ${t.border}`,
            color: t.textSecondary,
            flexShrink: 0,
          }}
        >
          <Plus size={16} strokeWidth={1.75} />
        </button>

        <button
          type="button"
          aria-label="Send message"
          onClick={submit}
          disabled={!hasText}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "34px",
            height: "34px",
            borderRadius: "50%",
            background: hasText ? t.accent : t.ghost,
            border: `1px solid ${hasText ? t.accent : t.border}`,
            color: hasText ? "#FFFFFF" : t.textTertiary,
            flexShrink: 0,
            transition: "background 150ms ease-out, color 150ms ease-out",
          }}
        >
          <ArrowUp size={16} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
