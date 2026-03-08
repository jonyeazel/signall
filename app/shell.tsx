"use client";

import { C, ENVIRONMENTS } from "./shared";
import { useEffect, useState } from "react";

function isEmbedMode(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("embed") === "true";
}

export function Shell({
  children,
  env,
}: {
  children: React.ReactNode;
  env?: string;
}) {
  const [embedMode, setEmbedMode] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const embed = isEmbedMode();
    setEmbedMode(embed);
    setChecked(true);

    // Guard: if not embedded, redirect to homepage
    if (!embed) {
      window.location.href = "/";
    }
  }, []);

  // Don't render anything until we've checked — prevents flash
  if (!checked || !embedMode) {
    return null;
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: C.bg,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px 24px",
    }}>
      <div style={{ maxWidth: "600px", width: "100%" }}>
        {children}
      </div>
    </div>
  );
}

const GOLD_DIM_SHELL = "rgba(201, 169, 110, 0.2)";

export function MetricCard({
  label,
  value,
  muted,
  subtitle,
}: {
  label: string;
  value: string;
  muted?: boolean;
  subtitle?: string;
}) {
  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: "16px",
        padding: "20px 24px",
        position: "relative",
      }}
    >
      <div style={{ position: "absolute", top: 0, left: "20px", right: "20px", height: "1px", background: `linear-gradient(90deg, transparent, ${GOLD_DIM_SHELL}, transparent)` }} />
      <div
        style={{
          fontSize: "9px",
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: C.textTertiary,
          marginBottom: "12px",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: "28px",
          fontWeight: 600,
          letterSpacing: "-0.02em",
          lineHeight: 1,
          color: muted ? C.textTertiary : C.textPrimary,
        }}
      >
        {value}
      </div>
      {subtitle && (
        <div
          style={{
            fontSize: "9px",
            color: C.textTertiary,
            marginTop: "8px",
          }}
        >
          {subtitle}
        </div>
      )}
    </div>
  );
}

export function LessonCard({
  term,
  children,
}: {
  term: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ padding: "4px 0" }}>
      <div
        style={{
          fontSize: "12px",
          fontWeight: 600,
          color: C.accent,
          marginBottom: "6px",
          letterSpacing: "0.01em",
        }}
      >
        {term}
      </div>
      <div
        style={{
          fontSize: "13px",
          lineHeight: 1.65,
          color: C.textSecondary,
        }}
      >
        {children}
      </div>
    </div>
  );
}
