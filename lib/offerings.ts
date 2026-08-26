export type Offering = {
  id: string;
  title: string;
  /** Short punchy hook — the "why buy" in one line. Feeds the AI concierge. */
  tagline: string;
  /** A complete two-line thought (~12–15 words) shown beneath the artwork on
   *  the card and in the overview. Written to fit two lines with no truncation. */
  blurb: string;
  price: string;
  description: string;
  /**
   * The engine's aesthetic DNA — a compact style contract that gets baked
   * into every image prompt this card composes. Written as hard art
   * direction (movement, palette, type treatment, what is banned) so two
   * different briefs still come out unmistakably from the same machine.
   */
  style: string;
  /** Opening moves shown as chips in the chat — written in the maker's voice,
   *  each one a real brief the engine can print from immediately. */
  starters: string[];
  /** The line the engine greets you with. Sets the machine's personality. */
  welcome: string;
  /**
   * Fixed artwork, in display order. In the Press, cards ship EMPTY on
   * purpose: the diagonal-hatch placeholder reads as an idle machine, and the
   * card's brain fills the frame on demand. Anything the engine prints is
   * layered on top of this at runtime (see press-provider).
   */
  images?: string[];
  rating: number;
  reviews: number;
  tags: string[];
  features: string[];
  stats: { label: string; value: string }[];
};

/**
 * THE POSTER PRESS — seven machines, each with one taste and one job.
 *
 * Every card is an aesthetic engine. It only speaks one visual language. You
 * give it a few words; it composes a one-of-one poster straight into the
 * frame you are looking at — square on desktop, tall on your phone — and you
 * download what it made. The catalog below is therefore not a list of
 * products: it is a list of BRAINS. The style string is each brain's taste;
 * the concierge route turns it into that card's system prompt, and the press
 * route bakes it into every image it prints.
 */
export const OFFERINGS: Offering[] = [
  {
    id: "swiss",
    title: "The Modernist",
    tagline: "Grid, type, one red accent. Nothing extra.",
    blurb: "Give it three words. It answers with clean Swiss design from 1957.",
    price: "$100",
    description:
      "This machine speaks classic Swiss modernism and nothing else. Strict grid, bold flat shapes, huge clean type. You say what the poster is about. It decides where every line sits.",
    style:
      "Swiss International Typographic Style poster, 1950s Basel school. Strict modular grid. Large flat geometric shapes. Bold Neo-Grotesque sans-serif type as a design element, tightly kerned. Palette locked to off-white paper, ink black, and ONE signal red accent. Generous negative space. Absolutely no gradients, no photos, no texture, no decoration, no more than three colors.",
    starters: ["A poster for my morning run", "Our kitchen, est. 2021", "Jazz night, Friday"],
    welcome:
      "I make Swiss posters. Grid, type, one red accent. Tell me what yours is about — three words is plenty.",
    rating: 5,
    reviews: 214,
    tags: ["Poster engine", "Swiss modernism"],
    features: [
      "Composed for your exact frame — square here, tall on a phone",
      "One taste, locked: grid, flat shapes, signal red",
      "Every print is a one-of-one — no two are ever alike",
      "Download the finished file the moment it lands",
    ],
    stats: [
      { label: "Edition", value: "1 of 1" },
      { label: "School", value: "Basel" },
      { label: "Colors", value: "3 max" },
    ],
  },
  {
    id: "botanical",
    title: "The Naturalist",
    tagline: "Hand-etched plates from a study that never existed.",
    blurb: "Name any living thing. It draws the antique scientific plate for it.",
    price: "$200",
    description:
      "This machine draws like a nineteenth-century field scientist. Fine etched linework, soft watercolor washes, neat specimen labels. Name a plant, a bird, a beetle — even your houseplant — and it makes the museum plate.",
    style:
      "Antique natural-history illustration plate, 19th-century copperplate etching with delicate hand-tinted watercolor washes. Fine crosshatched linework, precise specimen detail, small elegant serif captions and figure numbers. Aged cream paper ground. Composition like a museum folio page: one central specimen, satellite detail studies. No modern elements, no bold graphics, no photography.",
    starters: ["My monstera, as a museum plate", "A barn owl study", "Tomatoes from the garden"],
    welcome:
      "I etch specimen plates — plants, birds, insects, anything that grows. Name your subject and I'll put it in the folio.",
    rating: 5,
    reviews: 178,
    tags: ["Poster engine", "Natural history"],
    features: [
      "Composed for your exact frame — square here, tall on a phone",
      "One taste, locked: etched line, watercolor wash, folio labels",
      "Every print is a one-of-one — no two are ever alike",
      "Download the finished file the moment it lands",
    ],
    stats: [
      { label: "Edition", value: "1 of 1" },
      { label: "Method", value: "Etching" },
      { label: "Paper", value: "Cream" },
    ],
  },
  {
    id: "brutalist",
    title: "The Shouter",
    tagline: "Type so big it stops being words.",
    blurb: "Say the thing you mean. It sets it in letters the size of walls.",
    price: "$300",
    description:
      "This machine sets words like concrete. Massive type, hard edges, raw contrast. Give it your phrase — a motto, a warning, an inside joke — and it builds a wall out of it.",
    style:
      "Brutalist typographic poster. One short phrase set in enormous, heavy, tightly-packed grotesque type that dominates the entire frame, cropped and colliding with the edges. Raw high contrast: near-black ink on unbleached paper, or reversed. Type IS the image — no illustration, no photo, no ornament. Deliberate harsh spacing, overlapping baselines allowed. Feels like concrete and confidence.",
    starters: ["NOT YET — in giant letters", "Do the hard thing first", "Coffee then everything"],
    welcome:
      "I shout. Hand me the words you actually mean and I'll set them heavy enough to lean on.",
    rating: 4,
    reviews: 301,
    tags: ["Poster engine", "Brutalist type"],
    features: [
      "Composed for your exact frame — square here, tall on a phone",
      "One taste, locked: monumental type, raw contrast, hard crops",
      "Every print is a one-of-one — no two are ever alike",
      "Download the finished file the moment it lands",
    ],
    stats: [
      { label: "Edition", value: "1 of 1" },
      { label: "Ink", value: "Heavy" },
      { label: "Volume", value: "Max" },
    ],
  },
  {
    id: "ukiyoe",
    title: "The Woodcutter",
    tagline: "Your world, carved as a Japanese woodblock print.",
    blurb: "Describe a moment. It carves the Edo-period print of it.",
    price: "$400",
    description:
      "This machine prints in the manner of Hokusai's workshop. Flat mineral color, carved outlines, drifting mist. Give it any scene — your street in the rain, a cat by a window — and it hands back the woodblock.",
    style:
      "Traditional Japanese ukiyo-e woodblock print, Edo period style. Flat planes of mineral pigment — indigo, ochre, sage, faded rose — with visible carved keyblock outlines. Stylized waves, clouds, or rain as pattern. Subtle paper grain, small red artist's seal. Asymmetric composition with bold negative space. No western shading, no gradients except hand-graded bokashi skies, no photorealism.",
    starters: ["My street in the rain", "A cat watching snow", "Waves under a red moon"],
    welcome:
      "I carve woodblocks. Describe one quiet moment — weather helps — and I'll print it the old way.",
    rating: 5,
    reviews: 246,
    tags: ["Poster engine", "Ukiyo-e"],
    features: [
      "Composed for your exact frame — square here, tall on a phone",
      "One taste, locked: carved line, mineral color, bokashi skies",
      "Every print is a one-of-one — no two are ever alike",
      "Download the finished file the moment it lands",
    ],
    stats: [
      { label: "Edition", value: "1 of 1" },
      { label: "Period", value: "Edo" },
      { label: "Blocks", value: "5" },
    ],
  },
  {
    id: "deco",
    title: "The Gilder",
    tagline: "1928 glamour for whatever you're proud of.",
    blurb: "Tell it what deserves an occasion. It prints the gold-and-noir bill.",
    price: "$500",
    description:
      "This machine believes everything deserves a premiere. Art Deco geometry, gold on midnight, tall elegant lettering. Your dinner party, your finished thesis, your dog's birthday — it makes the grand announcement.",
    style:
      "Art Deco poster, late 1920s French luxury style. Strong symmetric geometry: sunbursts, stepped forms, fan motifs. Metallic gold and champagne linework on deep midnight navy or noir ground. Tall elegant high-contrast display lettering with decorative borders. Streamlined stylized figures or objects, never realistic. Opulent but disciplined. No pastels, no grunge, no photography.",
    starters: ["A premiere for my dinner party", "The thesis is done", "Sunday: the dog turns three"],
    welcome:
      "I gild occasions. Tell me what you're celebrating — or what should feel celebrated — and I'll print the bill.",
    rating: 5,
    reviews: 189,
    tags: ["Poster engine", "Art Deco"],
    features: [
      "Composed for your exact frame — square here, tall on a phone",
      "One taste, locked: gold line, midnight ground, stepped geometry",
      "Every print is a one-of-one — no two are ever alike",
      "Download the finished file the moment it lands",
    ],
    stats: [
      { label: "Edition", value: "1 of 1" },
      { label: "Year", value: "1928" },
      { label: "Leaf", value: "Gold" },
    ],
  },
  {
    id: "storybook",
    title: "The Illustrator",
    tagline: "The picture-book page your memory deserves.",
    blurb: "Share a small true moment. It paints the storybook page of it.",
    price: "$600",
    description:
      "This machine paints in soft watercolor and gentle light, like the best children's books. Give it a small true moment — a first snow, a grandmother's kitchen — and it paints the page where that memory lives.",
    style:
      "Classic children's picture-book illustration. Soft transparent watercolor with warm colored-pencil linework. Gentle golden light, rounded friendly forms, small lovely details worth finding twice. Muted storybook palette: butter yellow, moss, dusty blue, warm gray. Quiet, tender, never saccharine or cartoonish. No hard outlines, no digital gloss, no text unless asked.",
    starters: ["First snow on our street", "Grandma's kitchen at noon", "A fox who collects buttons"],
    welcome:
      "I paint storybook pages. Tell me one small moment you'd like to keep — real or invented, both work.",
    rating: 5,
    reviews: 267,
    tags: ["Poster engine", "Storybook"],
    features: [
      "Composed for your exact frame — square here, tall on a phone",
      "One taste, locked: watercolor wash, pencil line, golden light",
      "Every print is a one-of-one — no two are ever alike",
      "Download the finished file the moment it lands",
    ],
    stats: [
      { label: "Edition", value: "1 of 1" },
      { label: "Medium", value: "Wash" },
      { label: "Light", value: "Golden" },
    ],
  },
  {
    id: "blueprint",
    title: "The Draftsman",
    tagline: "Anything you love, documented like a machine part.",
    blurb: "Name the thing. It drafts the cyanotype schematic, labels and all.",
    price: "$700",
    description:
      "This machine drafts everything as a serious technical document. White linework on blueprint blue, measurements, callouts, a title block. Your bicycle, your espresso ritual, your cat — drawn like it ships to a factory.",
    style:
      "Technical blueprint drawing, classic cyanotype style. Precise white and pale-cyan linework on deep Prussian blue ground. Orthographic views, exploded parts, dimension lines, arrows, neat engineering lettering, hatched sections, a formal title block with drawing number. Subject rendered as a serious schematic no matter how unserious it is. Dry wit through labels. No color beyond the blue, no painterly texture.",
    starters: ["Schematic of my bicycle", "Exploded view: morning coffee", "My cat, fig. 1 through 4"],
    welcome:
      "I draft schematics. Name the thing — object, ritual, or creature — and I'll document it like it ships Monday.",
    rating: 4,
    reviews: 158,
    tags: ["Poster engine", "Blueprint"],
    features: [
      "Composed for your exact frame — square here, tall on a phone",
      "One taste, locked: white line, Prussian blue, title block",
      "Every print is a one-of-one — no two are ever alike",
      "Download the finished file the moment it lands",
    ],
    stats: [
      { label: "Edition", value: "1 of 1" },
      { label: "Sheet", value: "A1" },
      { label: "Rev", value: "A" },
    ],
  },
];
