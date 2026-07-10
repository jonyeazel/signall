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
  /** Short punchy hook shown on the card — the "why buy" in one line. */
  tagline: string;
  price: string;
  description: string;
  images: string[];
  rating: number;
  reviews: number;
  tags: string[];
  features: string[];
  stats: { label: string; value: string }[];
  cta: string;
};

/**
 * A cohesive premium design-goods catalog. Each card is one object,
 * shot editorial-style on a warm neutral backdrop. Swap the copy/images
 * for any real store; the structure stays.
 */
export const OFFERINGS: Offering[] = [
  {
    id: "lumen",
    index: "01",
    icon: Sparkles,
    title: "Lumen",
    tagline: "Warm, dimmable glow — cordless anywhere.",
    price: "$149",
    description:
      "A rechargeable table lamp cast in matte plaster. Three warm brightness levels, up to 40 hours per charge, and no cord to hide — carry it from the desk to the dinner table.",
    images: ["/catalog/lumen-1.png", "/catalog/lumen-2.png"],
    rating: 4.9,
    reviews: 2431,
    tags: ["Lighting", "Cordless", "Dimmable"],
    features: [
      "Up to 40 hours of light per charge",
      "Three warm brightness levels",
      "Hand-cast matte plaster shade",
      "USB-C fast charging, no cord to hide",
    ],
    stats: [
      { label: "Runtime", value: "40h" },
      { label: "Levels", value: "3" },
      { label: "Charge", value: "USB-C" },
    ],
    cta: "Add Lumen",
  },
  {
    id: "strata",
    index: "02",
    icon: Layers,
    title: "Strata",
    tagline: "Hand-thrown stoneware that nests.",
    price: "$120",
    description:
      "A set of three nesting bowls, each hand-thrown from speckled stoneware and glazed in tonal neutrals. Oven, microwave, and dishwasher safe.",
    images: ["/catalog/strata-1.png", "/catalog/strata-2.png"],
    rating: 4.8,
    reviews: 1187,
    tags: ["Ceramics", "Set of 3", "Handmade"],
    features: [
      "Set of three nesting sizes",
      "Hand-thrown speckled stoneware",
      "Reactive tonal-neutral glaze",
      "Oven, microwave & dishwasher safe",
    ],
    stats: [
      { label: "Pieces", value: "3" },
      { label: "Finish", value: "Matte" },
      { label: "Safe", value: "Dishwasher" },
    ],
    cta: "Add Strata",
  },
  {
    id: "orbit",
    index: "03",
    icon: Orbit,
    title: "Orbit",
    tagline: "Silent sweep. Aircraft-grade aluminum.",
    price: "$189",
    description:
      "A wall clock milled from a single piece of aircraft-grade aluminum, with a true silent sweep movement and hands balanced to the millimeter.",
    images: ["/catalog/orbit-1.png", "/catalog/orbit-2.png"],
    rating: 4.9,
    reviews: 864,
    tags: ["Clock", "Aluminum", "Silent"],
    features: [
      "True silent sweep movement",
      "Milled from single-block aluminum",
      "Numberless minimalist face",
      "Runs a full year on one cell",
    ],
    stats: [
      { label: "Movement", value: "Silent" },
      { label: "Body", value: "Alu" },
      { label: "Battery", value: "1 yr" },
    ],
    cta: "Add Orbit",
  },
  {
    id: "compass",
    index: "04",
    icon: Compass,
    title: "Compass",
    tagline: "Hand-polished acetate. Polarized.",
    price: "$240",
    description:
      "Hand-polished tortoise-shell acetate with polarized, scratch-resistant lenses and a five-barrel hinge built to outlast trends.",
    images: ["/catalog/compass-1.png", "/catalog/compass-2.png"],
    rating: 4.7,
    reviews: 1592,
    tags: ["Eyewear", "Polarized", "Acetate"],
    features: [
      "Polarized, scratch-resistant lenses",
      "Hand-polished Italian acetate",
      "Five-barrel reinforced hinge",
      "100% UV400 protection",
    ],
    stats: [
      { label: "Lens", value: "Polarized" },
      { label: "UV", value: "400" },
      { label: "Hinge", value: "5-barrel" },
    ],
    cta: "Add Compass",
  },
  {
    id: "boxes",
    index: "05",
    icon: Boxes,
    title: "Modules",
    tagline: "Solid oak. Stack it your way.",
    price: "$95",
    description:
      "Modular storage boxes in solid white oak, finished with a food-safe oil. Stack, nest, and reconfigure them endlessly as your space changes.",
    images: ["/catalog/boxes-1.png", "/catalog/boxes-2.png"],
    rating: 4.8,
    reviews: 733,
    tags: ["Storage", "Solid Oak", "Modular"],
    features: [
      "Solid white oak, food-safe oil finish",
      "Stack, nest & reconfigure freely",
      "Hand-cut dovetail joinery",
      "Felt-lined base protects surfaces",
    ],
    stats: [
      { label: "Wood", value: "Oak" },
      { label: "System", value: "Modular" },
      { label: "Finish", value: "Oiled" },
    ],
    cta: "Add Modules",
  },
  {
    id: "waves",
    index: "06",
    icon: Waves,
    title: "Waves",
    tagline: "Sculptural stoneware, thrown by hand.",
    price: "$135",
    description:
      "A sculptural vase thrown by hand in bone-white stoneware, its undulating profile catching light differently from every angle.",
    images: ["/catalog/waves-1.png", "/catalog/waves-2.png"],
    rating: 4.8,
    reviews: 528,
    tags: ["Vase", "Stoneware", "Sculptural"],
    features: [
      "Thrown by hand, no two alike",
      "Bone-white matte stoneware",
      "Watertight sealed interior",
      "Undulating light-catching profile",
    ],
    stats: [
      { label: "Form", value: "Sculptural" },
      { label: "Finish", value: "Matte" },
      { label: "Sealed", value: "Yes" },
    ],
    cta: "Add Waves",
  },
  {
    id: "aperture",
    index: "07",
    icon: Aperture,
    title: "Aperture",
    tagline: "Full-frame that lives in your pocket.",
    price: "$1,290",
    description:
      "A compact full-frame camera with a fixed 35mm lens, tactile dials, and a leather grip — engineered to disappear into everyday carry.",
    images: ["/catalog/aperture-1.png", "/catalog/aperture-2.png"],
    rating: 4.9,
    reviews: 946,
    tags: ["Camera", "Full-frame", "35mm"],
    features: [
      "Full-frame sensor, fixed 35mm f/1.2",
      "Tactile machined-metal dials",
      "Hand-wrapped leather grip",
      "Pocketable magnesium body",
    ],
    stats: [
      { label: "Sensor", value: "Full-frame" },
      { label: "Lens", value: "35mm" },
      { label: "Aperture", value: "f/1.2" },
    ],
    cta: "Add Aperture",
  },
];
