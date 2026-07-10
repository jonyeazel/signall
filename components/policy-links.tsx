"use client";

import Link from "next/link";
import { POLICIES, STORE } from "../lib/legal";
import { T } from "../lib/theme";

/**
 * Store policy links — Privacy, Terms, Returns, Shipping, Contact.
 *
 * Surfacing these site-wide keeps any storefront built on this template
 * compliant with Meta Commerce/Ads review and other ad-platform policies,
 * which require reachable business + policy information.
 *
 * `tone="dock"` renders the desktop footer (replaces the composer);
 * `tone="inline"` renders a lighter row for embedding inside the PDP.
 */
export function PolicyLinks({ tone = "dock" }: { tone?: "dock" | "inline" }) {
  const isDock = tone === "dock";
  const year = new Date().getFullYear();

  return (
    <nav
      style={{
        width: "100%",
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        alignItems: "center",
        gap: "6px 0",
      }}
    >
      {POLICIES.map((p, i) => (
        <span key={p.slug} style={{ display: "inline-flex", alignItems: "center" }}>
          {i > 0 && (
            <span aria-hidden style={{ color: T.borderActive, fontSize: 12, padding: "0 8px" }}>
              ·
            </span>
          )}
          <Link
            href={`/legal/${p.slug}`}
            style={{
              fontSize: isDock ? 13 : 12.5,
              color: T.textSecondary,
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            {p.title}
          </Link>
        </span>
      ))}
      {/* Copyright kept inline on the same row */}
      <span aria-hidden style={{ color: T.borderActive, fontSize: 12, padding: "0 8px" }}>
        ·
      </span>
      <span style={{ fontSize: isDock ? 12.5 : 11.5, color: T.textTertiary, whiteSpace: "nowrap" }}>
        © {year} {STORE.name}
      </span>
    </nav>
  );
}
