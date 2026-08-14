"use client";

import { motion } from "motion/react";
import { type CSSProperties } from "react";
import { hatch } from "../lib/theme";

/**
 * A media frame that works whether or not there is a photo yet.
 *
 * With no `src` it fills with the diagonal-hatch placeholder — the template's
 * wireframe language. Pass a `src` and it shows the image instead, so adding
 * real photography to the catalog needs no changes here or at any call site.
 *
 * Doubles as the shared element that morphs card -> sheet (pass `layoutId`).
 */
export function HatchPlaceholder({
  layoutId,
  src,
  alt = "",
  fit = "cover",
  radius = 16,
  hatchGap,
  style,
  children,
}: {
  layoutId?: string;
  src?: string;
  alt?: string;
  fit?: "cover" | "contain";
  radius?: number;
  /** Tighten the hatch rules for small thumbnails. */
  hatchGap?: number;
  style?: CSSProperties;
  children?: React.ReactNode;
}) {
  return (
    <motion.div
      layoutId={layoutId}
      style={{
        position: "relative",
        ...hatch(hatchGap),
        borderRadius: radius,
        overflow: "hidden",
        ...style,
      }}
    >
      {src && (
        <img
          src={src}
          alt={alt}
          draggable={false}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: fit,
            display: "block",
            userSelect: "none",
          }}
        />
      )}
      {children}
    </motion.div>
  );
}
