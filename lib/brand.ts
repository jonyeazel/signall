/**
 * Brand identity — the one place to name the store.
 *
 * Everything that shows the brand reads from here: the wordmark, the mobile
 * header's monogram, the page title, the policy pages, and the AI concierge's
 * system prompt. Renaming the store is a one-line change.
 */
export const BRAND = {
  /** Shown in the wordmark, the page title and the policy pages. */
  name: "The Press",
  /** One short line under the wordmark. Two or three words. */
  tagline: "Seven machines",
  /** Used as the page description. */
  description:
    "Seven small machines, each with one taste. Tell one what you want. It prints a one-of-one poster into the frame, and you keep the file.",
} as const;

/** First letter of the brand — the header's monogram avatar. */
export const MONOGRAM = BRAND.name.charAt(0).toUpperCase();
