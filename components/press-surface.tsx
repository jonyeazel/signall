"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowDownToLine } from "lucide-react";
import { T } from "../lib/theme";
import { type Artifact, downloadArtifact } from "./press-provider";

/**
 * The machine's output tray — an overlay that sits on any image surface and
 * narrates the press's state.
 *
 *   printing → a quiet breathing chip over the idle hatch (the wireframe IS
 *              the resting machine, so we never hide it — it just wakes up)
 *   ready    → the finished print fades in underneath (rendered by the image
 *              surface itself); this overlay adds only the download chip
 *   error    → one calm line; the engine's chat is where you try again
 *
 * Deliberately chrome-light: one chip at a time, never a spinner farm. The
 * artwork is the show.
 */
export function PressSurface({
  engineId,
  artifact,
  /** Corner chip inset — matches the surface's own padding rhythm. */
  inset = 10,
  /** Extra top clearance for the save chip — the mobile full-bleed card has a
   *  floating header over its top edge, so the chip must duck under it. */
  insetTop,
}: {
  engineId: string;
  artifact: Artifact | undefined;
  inset?: number;
  insetTop?: number;
}) {
  return (
    <div aria-live="polite" style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 3 }}>
      <AnimatePresence>
        {artifact?.status === "printing" && (
          <motion.div
            key="printing"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: "absolute",
              left: "50%",
              bottom: "12%",
              transform: "translateX(-50%)",
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "9px 16px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.92)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              border: `1px solid ${T.border}`,
              boxShadow: "0 10px 30px -12px rgba(0,0,0,0.25)",
            }}
          >
            <span className="press-pulse" aria-hidden />
            <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: "-0.01em", color: T.textPrimary }}>
              Printing yours…
            </span>
          </motion.div>
        )}

        {artifact?.status === "error" && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: "absolute",
              left: "50%",
              bottom: "12%",
              transform: "translateX(-50%)",
              whiteSpace: "nowrap",
              padding: "9px 16px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.92)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              border: `1px solid ${T.border}`,
              fontSize: 13,
              color: T.textSecondary,
            }}
          >
            The press jammed. Ask again in the chat.
          </motion.div>
        )}

        {artifact?.status === "ready" && artifact.url && (
          <motion.button
            key="download"
            type="button"
            aria-label="Download your one-of-one print"
            onClick={(e) => {
              e.stopPropagation();
              downloadArtifact(engineId, artifact);
            }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            whileTap={{ scale: 0.92 }}
            style={{
              position: "absolute",
              top: insetTop ?? inset,
              right: inset,
              pointerEvents: "auto",
              display: "flex",
              alignItems: "center",
              gap: 7,
              height: 36,
              padding: "0 13px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.92)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              border: `1px solid ${T.border}`,
              boxShadow: "0 8px 24px -10px rgba(0,0,0,0.3)",
              color: T.textPrimary,
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: "-0.01em",
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <ArrowDownToLine size={15} strokeWidth={2.2} />
            Save
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
