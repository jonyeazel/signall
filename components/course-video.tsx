"use client";

import { useState } from "react";
import { Play, Lock, Clock } from "lucide-react";
import { motion } from "motion/react";
import type { Offering } from "../lib/offerings";
import { T, COVERS } from "../lib/theme";

/**
 * The course preview surface for the detail sheet.
 *
 * A course is taught in a single ≤5-minute video. This renders a cinematic
 * 16:9 "player" (a designed poster frame — real video src drops in later via
 * `offering` when produced) with a big play affordance, runtime, and the
 * chapter list beneath. Non-course offers never mount this.
 */
export function CourseVideo({ offering }: { offering: Offering }) {
  const tone = COVERS[offering.cover];
  const [playing, setPlaying] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Player / poster */}
      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "16 / 9",
          borderRadius: 10,
          overflow: "hidden",
          background: tone.bg,
          border: `1px solid ${T.borderStrong}`,
        }}
      >
        {/* Poster: giant runtime numeral echoing the cover language */}
        <span
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            fontFamily: "var(--font-display), Georgia, serif",
            fontStyle: "italic",
            fontWeight: 600,
            fontSize: 120,
            letterSpacing: "-0.05em",
            color: tone.ink,
            opacity: 0.08,
            userSelect: "none",
          }}
        >
          {offering.index}
        </span>

        {/* Play button */}
        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          whileHover={{ scale: 1.04 }}
          onClick={() => setPlaying((p) => !p)}
          aria-label={playing ? "Pause preview" : "Play preview"}
          style={{
            position: "absolute",
            inset: 0,
            margin: "auto",
            width: 66,
            height: 66,
            borderRadius: 999,
            background: T.signal,
            color: T.onSignal,
            border: "none",
            display: "grid",
            placeItems: "center",
            cursor: "pointer",
            boxShadow: "0 8px 24px -6px rgba(226,58,30,0.5)",
          }}
        >
          <Play size={26} strokeWidth={2} fill="currentColor" style={{ marginLeft: 3 }} />
        </motion.button>

        {/* Runtime chip */}
        <div
          style={{
            position: "absolute",
            left: 14,
            bottom: 14,
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 10px",
            borderRadius: 6,
            background: "rgba(22,21,15,0.72)",
            color: "#FBFAF5",
            fontFamily: "var(--font-geist-mono), monospace",
            fontSize: 12,
            letterSpacing: "0.02em",
          }}
        >
          <Clock size={13} strokeWidth={2} />
          {offering.duration ?? "5:00"}
        </div>
      </div>

      {/* Curriculum */}
      {offering.lessons && offering.lessons.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span
            style={{
              fontFamily: "var(--font-geist-mono), monospace",
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: T.textSecondary,
              marginBottom: 8,
            }}
          >
            In this lesson
          </span>
          {offering.lessons.map((l, i) => (
            <div
              key={l.title}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "11px 0",
                borderTop: i === 0 ? "none" : `1px solid ${T.border}`,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-geist-mono), monospace",
                  fontSize: 12.5,
                  color: T.textTertiary,
                  width: 40,
                  flexShrink: 0,
                }}
              >
                {l.time}
              </span>
              <span style={{ fontSize: 14.5, color: T.inkSoft, lineHeight: 1.35, flex: 1 }}>
                {l.title}
              </span>
              {i > 0 && <Lock size={13} strokeWidth={2} style={{ color: T.textTertiary, flexShrink: 0 }} aria-label="Preview locked" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
