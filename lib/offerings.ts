import {
  Sparkles,
  Layers,
  Orbit,
  Compass,
  Boxes,
  Waves,
  Aperture,
  type LucideIcon,
} from "lucide-react";

export type Offering = {
  id: string;
  index: string;
  icon: LucideIcon;
  title: string;
  tagline: string;
  price: string;
  description: string;
  tags: string[];
  features: string[];
  stats: { label: string; value: string }[];
  cta: string;
};

/**
 * Generic, lorem-ipsum "offerings". Each card is meant to represent
 * something a company offers — a product, a service, a capability.
 * Swap the copy/icons for any real use case; the structure stays.
 */
export const OFFERINGS: Offering[] = [
  {
    id: "lumen",
    index: "01",
    icon: Sparkles,
    title: "Lorem Lumen",
    tagline: "Consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore.",
    price: "$49/mo",
    description:
      "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate.",
    tags: ["Lorem", "Ipsum", "Dolor"],
    features: [
      "Excepteur sint occaecat cupidatat non proident",
      "Sunt in culpa qui officia deserunt mollit",
      "Anim id est laborum et dolore magnam",
      "Sed ut perspiciatis unde omnis iste natus",
    ],
    stats: [
      { label: "Lorem", value: "99.9%" },
      { label: "Ipsum", value: "2.4k" },
      { label: "Dolor", value: "18ms" },
    ],
    cta: "Explore Lumen",
  },
  {
    id: "strata",
    index: "02",
    icon: Layers,
    title: "Ipsum Strata",
    tagline: "Tempor incididunt ut labore et dolore magna aliqua enim ad minim.",
    price: "$120",
    description:
      "Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.",
    tags: ["Strata", "Nova", "Flux"],
    features: [
      "Neque porro quisquam est qui dolorem",
      "Ipsum quia dolor sit amet consectetur",
      "Adipisci velit sed quia non numquam",
      "Eius modi tempora incidunt ut labore",
    ],
    stats: [
      { label: "Layers", value: "12x" },
      { label: "Depth", value: "∞" },
      { label: "Load", value: "0.3s" },
    ],
    cta: "Explore Strata",
  },
  {
    id: "orbit",
    index: "03",
    icon: Orbit,
    title: "Dolor Orbit",
    tagline: "Magna aliqua ut enim ad minim veniam, quis nostrud exercitation.",
    price: "$89/mo",
    description:
      "Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla.",
    tags: ["Orbit", "Ring", "Path"],
    features: [
      "At vero eos et accusamus et iusto odio",
      "Dignissimos ducimus qui blanditiis praesentium",
      "Voluptatum deleniti atque corrupti quos",
      "Dolores et quas molestias excepturi sint",
    ],
    stats: [
      { label: "Nodes", value: "48" },
      { label: "Reach", value: "9 zones" },
      { label: "Sync", value: "Live" },
    ],
    cta: "Explore Orbit",
  },
  {
    id: "compass",
    index: "04",
    icon: Compass,
    title: "Amet Compass",
    tagline: "Quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea.",
    price: "$240",
    description:
      "Et harum quidem rerum facilis est et expedita distinctio. Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus id quod maxime.",
    tags: ["Compass", "Guide", "True"],
    features: [
      "Temporibus autem quibusdam et aut officiis",
      "Debitis aut rerum necessitatibus saepe eveniet",
      "Ut et voluptates repudiandae sint et molestiae",
      "Itaque earum rerum hic tenetur a sapiente",
    ],
    stats: [
      { label: "Routes", value: "∞" },
      { label: "Drift", value: "0.01°" },
      { label: "Uptime", value: "100%" },
    ],
    cta: "Explore Compass",
  },
  {
    id: "boxes",
    index: "05",
    icon: Boxes,
    title: "Elit Modules",
    tagline: "Nisi ut aliquip ex ea commodo consequat duis aute irure dolor.",
    price: "$32/mo",
    description:
      "Delectus, ut aut reiciendis voluptatibus maiores alias consequatur aut perferendis doloribus asperiores repellat. Sed ut perspiciatis unde omnis iste natus error.",
    tags: ["Modular", "Grid", "Kit"],
    features: [
      "Sit voluptatem accusantium doloremque laudantium",
      "Totam rem aperiam eaque ipsa quae ab illo",
      "Inventore veritatis et quasi architecto beatae",
      "Vitae dicta sunt explicabo nemo enim ipsam",
    ],
    stats: [
      { label: "Blocks", value: "64" },
      { label: "Combos", value: "1M+" },
      { label: "Fit", value: "Any" },
    ],
    cta: "Explore Modules",
  },
  {
    id: "waves",
    index: "06",
    icon: Waves,
    title: "Sed Waves",
    tagline: "Duis aute irure dolor in reprehenderit in voluptate velit esse.",
    price: "$75/mo",
    description:
      "Voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim.",
    tags: ["Waves", "Flow", "Calm"],
    features: [
      "Perspiciatis unde omnis iste natus error sit",
      "Voluptatem accusantium doloremque laudantium",
      "Totam rem aperiam eaque ipsa quae ab illo",
      "Inventore et quasi architecto beatae vitae",
    ],
    stats: [
      { label: "Flow", value: "Smooth" },
      { label: "Latency", value: "8ms" },
      { label: "Range", value: "Full" },
    ],
    cta: "Explore Waves",
  },
  {
    id: "aperture",
    index: "07",
    icon: Aperture,
    title: "Eiusmod Aperture",
    tagline: "Ut labore et dolore magna aliqua enim ad minim veniam quis.",
    price: "$160",
    description:
      "Quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt neque porro quisquam est, qui dolorem ipsum quia dolor sit amet consectetur adipisci.",
    tags: ["Aperture", "Lens", "Focus"],
    features: [
      "Numquam eius modi tempora incidunt ut labore",
      "Et dolore magnam aliquam quaerat voluptatem",
      "Ut enim ad minima veniam quis nostrum",
      "Exercitationem ullam corporis suscipit laboriosam",
    ],
    stats: [
      { label: "Focus", value: "Sharp" },
      { label: "Field", value: "180°" },
      { label: "Speed", value: "f/1.2" },
    ],
    cta: "Explore Aperture",
  },
];
