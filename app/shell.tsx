"use client";

import { C } from "./shared";
import { useEffect, useState } from "react";

function isEmbedMode(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("embed") === "true";
}

export function Shell({
  children,
}: {
  children: React.ReactNode;
  env?: string;
}) {
  const [embedMode, setEmbedMode] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    setEmbedMode(isEmbedMode());
    setChecked(true);
  }, []);

  if (!checked) return null;

  // Embedded: minimal wrapper for iframe
  if (embedMode) {
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

  // Direct access: full-page layout with back link
  return (
    <div style={{
      minHeight: "100vh",
      background: C.bg,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "24px",
    }}>
      <div style={{ width: "100%", maxWidth: "600px", marginBottom: "16px" }}>
        <a
          href="/"
          style={{
            fontSize: "13px",
            color: C.textTertiary,
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          &larr; Signall
        </a>
      </div>
      <div style={{ maxWidth: "600px", width: "100%", flex: 1 }}>
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

export function MiniChart({
  data,
  totalSteps,
  yMin,
  yMax,
  label,
}: {
  data: number[];
  totalSteps: number;
  yMin?: number;
  yMax?: number;
  label?: string;
}) {
  if (data.length === 0) {
    return (
      <div style={{ height: "80px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "8px 12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: C.textTertiary, fontSize: "11px" }}>{label || "Chart builds as the agent trains"}</span>
      </div>
    );
  }

  const lo = yMin ?? Math.min(...data);
  const hi = yMax ?? Math.max(...data);
  const range = hi - lo || 1;
  const w = 520, h = 56, pl = 4, pr = 4, pt = 4, pb = 4;
  const cw = w - pl - pr, ch = h - pt - pb;

  const points = data.map((v, i) => ({
    x: pl + (i / Math.max(totalSteps - 1, 1)) * cw,
    y: pt + ch - ((Math.min(Math.max(v, lo), hi) - lo) / range) * ch,
  }));
  const polyline = points.map(p => `${p.x},${p.y}`).join(" ");
  const last = points[points.length - 1];
  const gridCount = 3;
  const gridLines = Array.from({ length: gridCount }, (_, i) => lo + ((i + 1) / (gridCount + 1)) * range);

  return (
    <div style={{ height: "80px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "8px 12px", overflow: "hidden" }}>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: "100%" }}>
        {gridLines.map((v, i) => {
          const y = pt + ch - ((v - lo) / range) * ch;
          return <line key={i} x1={pl} y1={y} x2={w - pr} y2={y} stroke={C.border} strokeWidth={0.5} />;
        })}
        <polyline points={polyline} fill="none" stroke={C.accent} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={2.5} fill={C.accent} opacity={0.3} />
        ))}
        {last && <circle cx={last.x} cy={last.y} r={5} fill={C.accent} style={{ filter: `drop-shadow(0 0 4px ${C.accent})` }} />}
      </svg>
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
