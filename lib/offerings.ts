export type Offering = {
  id: string;
  title: string;
  /** Short punchy hook — the "why buy" in one line. Feeds the AI concierge. */
  tagline: string;
  /** A complete two-line thought (~12–15 words) shown beneath the product on
   *  the card and in the overview. Written to fit two lines with no truncation. */
  blurb: string;
  price: string;
  description: string;
  /**
   * Product photography, in display order.
   *
   * Leave this off and every frame falls back to the diagonal-hatch
   * placeholder, which is what makes the unfilled template read as a wireframe.
   * Add paths (e.g. `["/catalog/item-1.png"]`) and the cards, gallery, cart
   * thumbnails and chat all switch to the real images with no other changes.
   */
  images?: string[];
  rating: number;
  reviews: number;
  tags: string[];
  features: string[];
  stats: { label: string; value: string }[];
};

/**
 * Sample catalog — placeholder content for the starter template.
 *
 * Generated from one shape so it stays obvious that none of it is real: seven
 * items, each with the same skeleton of copy and no photography. Replace this
 * array with your own products; every surface in the app reads from it, so
 * nothing else needs to change.
 */
const ORDINALS = ["One", "Two", "Three", "Four", "Five", "Six", "Seven"];

export const OFFERINGS: Offering[] = ORDINALS.map((word, i) => ({
  id: `item-${i + 1}`,
  title: `Item ${word}`,
  tagline: "The single line that earns the tap.",
  blurb: "A two-line summary of what this is and who it is for goes here.",
  price: `$${(i + 1) * 100}`,
  description:
    "Replace this paragraph with your own copy. There is room for two or three plain sentences that say what this is, what it does, and why it is worth the price.",
  // Sample social proof — swap in your real numbers, or remove the rating row
  // from the product sheet if you have none yet.
  rating: 4,
  reviews: 100,
  tags: ["Category one", "Category two"],
  features: [
    "First feature line goes here",
    "Second feature line goes here",
    "Third feature line goes here",
    "Fourth feature line goes here",
  ],
  stats: [
    { label: "Spec one", value: "—" },
    { label: "Spec two", value: "—" },
    { label: "Spec three", value: "—" },
  ],
}));
