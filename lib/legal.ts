/**
 * Store policy content.
 *
 * These pages exist so any storefront built on this template ships
 * ad-platform-compliant out of the box. Meta (Facebook/Instagram) Commerce
 * and Advertising review — and Google, TikTok, and Pinterest ads — all expect
 * a business to expose a clear Privacy Policy, Terms, Refund/Return Policy,
 * Shipping Policy, and reachable Contact details before approving a domain.
 *
 * Replace the bracketed placeholders (company name, address, email) with your
 * real business details. The copy below is written to be truthful and generic —
 * it makes no earnings, health, or performance claims, which keeps it aligned
 * with Meta's prohibited-content and personal-attributes policies.
 */

export const STORE = {
  name: "Optimo",
  legalName: "[Your Legal Company Name]",
  email: "support@example.com",
  address: "[Street Address, City, State/Region, Postal Code, Country]",
  returnWindowDays: 30,
  shipWithinDays: 2,
};

export type PolicySection = { heading: string; body: string[] };
export type Policy = {
  slug: string;
  title: string;
  summary: string;
  updated: string;
  sections: PolicySection[];
};

const UPDATED = "January 1, 2026";

export const POLICIES: Policy[] = [
  {
    slug: "privacy",
    title: "Privacy Policy",
    summary: "What we collect, why, and the choices you have.",
    updated: UPDATED,
    sections: [
      {
        heading: "Overview",
        body: [
          `This Privacy Policy explains how ${STORE.name} ("we", "us") collects, uses, and protects your information when you visit our store or make a purchase. We only collect what we need to run the store, fulfil orders, and improve your experience.`,
        ],
      },
      {
        heading: "Information we collect",
        body: [
          "Order information: your name, shipping and billing address, email address, phone number, and payment confirmation (we never store full card numbers — payments are handled by our PCI-compliant payment processor).",
          "Usage information: pages viewed, products browsed, and general device/browser data collected through cookies and similar technologies to keep the site working and to measure performance.",
        ],
      },
      {
        heading: "How we use your information",
        body: [
          "To process and deliver your orders, provide customer support, send order and shipping updates, prevent fraud, and — only where you have opted in — send occasional marketing you can unsubscribe from at any time.",
        ],
      },
      {
        heading: "Advertising & analytics",
        body: [
          "We may use advertising and analytics tools (such as the Meta pixel and similar technologies) to understand how our ads perform and to show relevant products. These tools may set cookies. You can manage cookie and ad preferences in your browser and through each platform's ad settings.",
        ],
      },
      {
        heading: "Sharing",
        body: [
          "We share information only with service providers who help us operate — payment processors, shipping carriers, and analytics/advertising partners — and only as needed to perform their service. We do not sell your personal information.",
        ],
      },
      {
        heading: "Your rights",
        body: [
          "Depending on where you live, you may have the right to access, correct, delete, or port your personal data, and to object to certain processing. To exercise these rights, contact us at " + STORE.email + ".",
        ],
      },
      {
        heading: "Data retention & security",
        body: [
          "We keep personal data only as long as necessary for the purposes above or as required by law, and we use reasonable technical and organisational measures to protect it.",
        ],
      },
    ],
  },
  {
    slug: "terms",
    title: "Terms of Service",
    summary: "The agreement that governs use of this store.",
    updated: UPDATED,
    sections: [
      {
        heading: "Agreement",
        body: [
          `By accessing ${STORE.name} or placing an order, you agree to these Terms. If you do not agree, please do not use the store.`,
        ],
      },
      {
        heading: "Products & pricing",
        body: [
          "We work to describe and price every product accurately. Colours and finishes may vary slightly due to screen settings and the handmade nature of some items. If a product is listed with an incorrect price or description, we reserve the right to cancel the order and refund you in full.",
        ],
      },
      {
        heading: "Orders",
        body: [
          "Your order is an offer to buy. We may accept or decline it, and we may limit or cancel quantities purchased per person or per order. A contract is formed only when we confirm shipment.",
        ],
      },
      {
        heading: "Intellectual property",
        body: [
          "All content on this store — images, text, and design — is owned by us or our licensors and may not be reused without permission.",
        ],
      },
      {
        heading: "Limitation of liability",
        body: [
          "To the fullest extent permitted by law, our liability arising from your use of the store or any product is limited to the amount you paid for the relevant order. Nothing in these Terms limits rights you have that cannot be excluded under applicable law.",
        ],
      },
      {
        heading: "Contact",
        body: ["Questions about these Terms can be sent to " + STORE.email + "."],
      },
    ],
  },
  {
    slug: "returns",
    title: "Returns & Refunds",
    summary: `Free ${30}-day returns on unused items.`,
    updated: UPDATED,
    sections: [
      {
        heading: "Our promise",
        body: [
          `If you're not happy, you have ${STORE.returnWindowDays} days from delivery to request a return for a full refund. Items must be unused and in their original packaging.`,
        ],
      },
      {
        heading: "How to start a return",
        body: [
          `Email ${STORE.email} with your order number and the item you'd like to return. We'll reply with a prepaid return label and instructions.`,
        ],
      },
      {
        heading: "Refunds",
        body: [
          "Once we receive and inspect your return, we'll issue your refund to the original payment method within 5–10 business days. You'll get an email when it's on the way.",
        ],
      },
      {
        heading: "Exchanges & damaged items",
        body: [
          "Need a different item? Start a return and place a new order. If anything arrives damaged or defective, contact us within 48 hours of delivery with a photo and we'll make it right at no cost to you.",
        ],
      },
      {
        heading: "Exceptions",
        body: [
          "For hygiene and safety reasons, a small number of items may be final sale; these are clearly marked on the product page.",
        ],
      },
    ],
  },
  {
    slug: "shipping",
    title: "Shipping Policy",
    summary: "Where we ship, how long it takes, and what it costs.",
    updated: UPDATED,
    sections: [
      {
        heading: "Processing time",
        body: [
          `Orders are processed and dispatched within ${STORE.shipWithinDays} business days. You'll receive a tracking number by email as soon as your order ships.`,
        ],
      },
      {
        heading: "Delivery estimates",
        body: [
          "Standard domestic delivery typically arrives in 3–7 business days after dispatch. International delivery times vary by destination and customs processing.",
        ],
      },
      {
        heading: "Shipping costs",
        body: [
          "Shipping is calculated at checkout based on your address and the items in your cart. Any duties or import taxes for international orders are the responsibility of the recipient.",
        ],
      },
      {
        heading: "Lost or delayed parcels",
        body: [
          `If your tracking hasn't updated in several days or your parcel appears lost, email ${STORE.email} and we'll open a claim with the carrier and get a replacement moving.`,
        ],
      },
    ],
  },
  {
    slug: "contact",
    title: "Contact Us",
    summary: "Reach a real person — we reply within one business day.",
    updated: UPDATED,
    sections: [
      {
        heading: "Customer support",
        body: [
          `Email: ${STORE.email}`,
          "We aim to reply to every message within one business day, Monday to Friday.",
        ],
      },
      {
        heading: "Business details",
        body: [`${STORE.legalName}`, `${STORE.address}`],
      },
      {
        heading: "Before you write",
        body: [
          "Many questions are answered in our Shipping and Returns policies. For order-specific help, please include your order number so we can assist you faster.",
        ],
      },
    ],
  },
];

export function getPolicy(slug: string): Policy | undefined {
  return POLICIES.find((p) => p.slug === slug);
}
