/**
 * Brand identity — the one place to name the store.
 *
 * Everything that shows the brand reads from here: the wordmark, the mobile
 * header's monogram, the page title, the policy pages, and the AI concierge's
 * system prompt. Renaming the store is a one-line change.
 */
export const BRAND = {
  /** Shown in the wordmark, the page title and the policy pages. */
  name: "Studio",
  /** One short line under the wordmark. Two or three words. */
  tagline: "Starter template",
  /** Used as the page description. */
  description: "A starter template. Replace this copy with your own.",
} as const;

/** First letter of the brand — the header's monogram avatar. */
export const MONOGRAM = BRAND.name.charAt(0).toUpperCase();
