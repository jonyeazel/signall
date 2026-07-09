"use client";

import { motion } from "motion/react";
import { type CSSProperties } from "react";
import { T } from "../lib/theme";

/**
 * Neutral grey placeholder with subtle diagonal light-grey lines.
 * Doubles as the shared-element that morphs card -> sheet (pass layoutId).
 */
export function HatchPlaceholder({
  layoutId,
  radius = 16,
  style,
  children,
}: {
  layoutId?: string;
  radius?: number;
  style?: CSSProperties;
  children?: React.ReactNode;
}) {
  return (
    <motion.div
      layoutId={layoutId}
      style={{
        position: "relative",
        background: T.skeleton,
        backgroundImage:
          "repeating-linear-gradient(-45deg, rgba(0,0,0,0.05) 0px, rgba(0,0,0,0.05) 1.5px, transparent 1.5px, transparent 11px)",
        borderRadius: radius,
        overflow: "hidden",
        ...style,
      }}
    >
      {children}
    </motion.div>
  );
}
