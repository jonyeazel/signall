"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { C, ENVIRONMENTS, isDemoMode } from "./shared";
import { useEffect, useState } from "react";

function DemoRail({ currentEnvId }: { currentEnvId: string }) {
  const currentIndex = ENVIRONMENTS.findIndex((e) => e.id === currentEnvId);
  const total = ENVIRONMENTS.length;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: "64px",
        background: C.bg,
        borderBottom: `1px solid ${C.border}`,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        padding: "0 48px",
      }}
    >
      {/* Line label */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginRight: "32px",
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: "14px", fontWeight: 600, color: C.accent }}>
          [~]
        </span>
        <div
          style={{
            fontSize: "9px",
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: C.textTertiary,
            lineHeight: 1.2,
          }}
        >
          Line S
        </div>
      </div>

      <div
        style={{
          position: "relative",
          flex: 1,
          height: "100%",
          display: "flex",
          alignItems: "center",
        }}
      >
        {/* Track line */}
        <div
          style={{
            position: "absolute",
            top: "24px",
            left: 0,
            right: 0,
            height: "2px",
            background: C.border,
          }}
        />

        {/* Completed track segment (orange) */}
        {currentIndex > 0 && (
          <div
            style={{
              position: "absolute",
              top: "24px",
              left: 0,
              width: `${(currentIndex / (total - 1)) * 100}%`,
              height: "2px",
              background: C.accent,
            }}
          />
        )}

        {/* Pulse animation between current and next */}
        {currentIndex < total - 1 && (
          <div
            style={{
              position: "absolute",
              top: "24px",
              left: `${(currentIndex / (total - 1)) * 100}%`,
              width: `${(1 / (total - 1)) * 100}%`,
              height: "2px",
              overflow: "visible",
            }}
          >
            <div
              className="rail-traveler"
              style={{
                position: "absolute",
                top: "50%",
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: C.accent,
                boxShadow: `0 0 12px ${C.accent}, 0 0 24px rgba(224, 90, 0, 0.3)`,
                transform: "translate(-50%, -50%)",
                animation: "rail-pulse 2s ease-in-out infinite",
              }}
            />
          </div>
        )}

        {/* Station dots + labels */}
        {ENVIRONMENTS.map((env, i) => {
          const isCompleted = i < currentIndex;
          const isCurrent = i === currentIndex;
          const isFuture = i > currentIndex;
          const leftPercent = (i / (total - 1)) * 100;

          return (
            <div
              key={env.id}
              style={{
                position: "absolute",
                left: `${leftPercent}%`,
                top: 0,
                transform: "translateX(-50%)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                height: "100%",
              }}
            >
              {/* Station dot — centered at 24px from top */}
              <div
                style={{
                  position: "absolute",
                  top: "24px",
                  transform: "translateY(-50%)",
                }}
              >
                <div
                  style={{
                    width: isCurrent ? "14px" : isCompleted ? "10px" : "8px",
                    height: isCurrent ? "14px" : isCompleted ? "10px" : "8px",
                    borderRadius: "50%",
                    background: isCompleted || isCurrent ? C.accent : C.bg,
                    border: isFuture ? `1.5px solid ${C.textTertiary}` : `2px solid ${C.accent}`,
                    boxShadow: isCurrent ? `0 0 16px ${C.accent}` : "none",
                    transition: "all 150ms ease-out",
                  }}
                />
              </div>

              {/* Station name — below the track */}
              <div
                style={{
                  position: "absolute",
                  top: "36px",
                  fontSize: isCurrent ? "10px" : "8px",
                  fontWeight: isCurrent ? 600 : 500,
                  letterSpacing: "0.02em",
                  color: isCurrent ? C.accent : isCompleted ? C.textSecondary : C.textTertiary,
                  whiteSpace: "nowrap",
                  transition: "all 150ms ease-out",
                }}
              >
                {env.station}
              </div>
            </div>
          );
        })}
      </div>

      {/* Current stop indicator */}
      <div
        style={{
          marginLeft: "32px",
          flexShrink: 0,
          textAlign: "right",
        }}
      >
        <div style={{ fontSize: "9px", color: C.textTertiary, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Now at
        </div>
        <div style={{ fontSize: "13px", fontWeight: 600, color: C.textPrimary, letterSpacing: "-0.01em" }}>
          {ENVIRONMENTS[currentIndex]?.station}
        </div>
      </div>
    </div>
  );
}

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
  const [demoMode, setDemoMode] = useState(false);
  const [embedMode, setEmbedMode] = useState(false);

  useEffect(() => {
    setDemoMode(isDemoMode());
    setEmbedMode(isEmbedMode());
  }, []);

  // Find the env id from the env name prop
  const envDef = env ? ENVIRONMENTS.find((e) => e.name === env || e.id === env) : null;

  // Embed mode: centered content, no header, no back button
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

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: demoMode ? "96px 32px 48px" : "32px 32px 48px",
      }}
    >
      {demoMode && envDef && <DemoRail currentEnvId={envDef.id} />}
      <div
        style={{
          maxWidth: "640px",
          width: "100%",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "40px",
          }}
        >
          <Link
            href="/"
            className="back-btn"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "36px",
              height: "36px",
              borderRadius: "12px",
              border: `1px solid ${C.border}`,
              background: C.surface,
              color: C.textTertiary,
              textDecoration: "none",
            }}
          >
            <ArrowLeft size={15} strokeWidth={1.5} />
          </Link>
          {env && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: 700,
                  color: C.accent,
                  letterSpacing: "-0.02em",
                }}
              >
                [~]
              </span>
              <span
                style={{
                  fontSize: "11px",
                  color: GOLD_SHELL,
                }}
              >
                /
              </span>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 500,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  color: C.textSecondary,
                }}
              >
                {env}
              </span>
            </div>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}

const GOLD_SHELL = "#C9A96E";
const GOLD_DIM_SHELL = "rgba(201, 169, 110, 0.2)";

export function MetricCard({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
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
      {/* Gold trim */}
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
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: "16px",
        padding: "20px 24px 20px 20px",
        borderLeft: `3px solid ${C.accent}`,
      }}
    >
      <div
        style={{
          fontSize: "12px",
          fontWeight: 600,
          color: C.accent,
          marginBottom: "8px",
          letterSpacing: "0.01em",
        }}
      >
        {term}
      </div>
      <p
        style={{
          fontSize: "13px",
          lineHeight: 1.65,
          color: C.textSecondary,
          margin: 0,
        }}
      >
        {children}
      </p>
    </div>
  );
}
