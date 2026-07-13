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
  name: "v0University",
  legalName: "[Your Legal Company Name]",
  email: "hello@v0university.com",
  address: "[Street Address, City, State/Region, Postal Code, Country]",
  returnWindowDays: 14,
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
          `This Privacy Policy explains how ${STORE.name} ("we", "us") collects, uses, and protects your information when you visit the platform, enrol in a course, or book a session. We only collect what we need to give you access, provide support, and improve the experience.`,
        ],
      },
      {
        heading: "Information we collect",
        body: [
          "Account & purchase information: your name, email address, and payment confirmation (we never store full card numbers — payments are handled by our PCI-compliant payment processor).",
          "Usage information: lessons viewed, progress, questions asked to the AI guide, and general device/browser data collected through cookies and similar technologies to keep the platform working and to measure performance.",
        ],
      },
      {
        heading: "How we use your information",
        body: [
          "To give you access to the courses and materials you purchase, provide customer support, answer your questions, prevent fraud, and — only where you have opted in — send occasional updates you can unsubscribe from at any time.",
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
          "We share information only with service providers who help us operate — payment processors, video hosting, and analytics/advertising partners — and only as needed to perform their service. We do not sell your personal information.",
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
        heading: "Courses & pricing",
        body: [
          "We work to describe and price every course, subscription, and service accurately. If something is listed with an incorrect price or description, we reserve the right to cancel the order and refund you in full.",
        ],
      },
      {
        heading: "Access & subscriptions",
        body: [
          "One-time purchases grant you lifetime personal access to that course or resource. The Pass is a recurring subscription that unlocks the full library while active; you can cancel anytime and keep access until the end of the current billing period. Bookings for coaching, custom work, and licensing are confirmed by email.",
        ],
      },
      {
        heading: "Intellectual property & personal use",
        body: [
          "All content — videos, prompts, text, and design — is owned by us or our licensors and is licensed to you for your own personal use. You may not share, resell, redistribute, or republish it without written permission.",
        ],
      },
      {
        heading: "Educational purpose & no guarantees",
        body: [
          "Our courses and materials are educational. They teach skills and methods; they do not guarantee any specific result, income, or outcome, which depends on your own effort and circumstances.",
          "To the fullest extent permitted by law, our liability arising from your use of the platform or any purchase is limited to the amount you paid for the relevant order. Nothing in these Terms limits rights you have that cannot be excluded under applicable law.",
        ],
      },
      {
        heading: "Contact",
        body: ["Questions about these Terms can be sent to " + STORE.email + "."],
      },
    ],
  },
  {
    slug: "refunds",
    title: "Refund Policy",
    summary: `A ${14}-day guarantee on courses and the Pass.`,
    updated: UPDATED,
    sections: [
      {
        heading: "Our guarantee",
        body: [
          `If a course or the Pass isn't right for you, email us within ${STORE.returnWindowDays} days of purchase and we'll issue a full refund — no hard feelings. We'd rather you learn something valuable than keep money for something that didn't help.`,
        ],
      },
      {
        heading: "How to request a refund",
        body: [
          `Email ${STORE.email} from the address you purchased with, and let us know which purchase you'd like refunded. We'll process it to your original payment method within 5–10 business days.`,
        ],
      },
      {
        heading: "Subscriptions",
        body: [
          "You can cancel the Pass at any time from your account or by emailing us. Cancelling stops future billing and you keep access until the end of the current billing period. We don't charge cancellation fees.",
        ],
      },
      {
        heading: "Services & custom work",
        body: [
          "One-on-one coaching, custom chatbots, done-for-you builds, and platform licensing are booked engagements. Refund terms for these are agreed in writing before work begins, since they involve reserved time and delivered work.",
        ],
      },
    ],
  },
  {
    slug: "access",
    title: "Access & Delivery",
    summary: "Everything is digital — you get in instantly.",
    updated: UPDATED,
    sections: [
      {
        heading: "Instant access",
        body: [
          "There's nothing to ship. The moment your purchase is confirmed, your course, prompt library, or Pass is unlocked and ready to watch or use — on any device, whenever you want.",
        ],
      },
      {
        heading: "How courses are delivered",
        body: [
          "Each micro-course is a focused video, under five minutes, with its chapters listed on the page. You can revisit any course you own as many times as you like.",
        ],
      },
      {
        heading: "Bookings & sessions",
        body: [
          "For coaching and custom engagements, we'll email you to confirm details and schedule. Sessions are held over video, and you keep any recordings and materials we agree to.",
        ],
      },
      {
        heading: "Trouble getting in?",
        body: [
          `If a purchase doesn't unlock or a video won't play, email ${STORE.email} and we'll get you sorted quickly.`,
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
          "Many questions are answered by Ada, the AI guide on every offer — she's available around the clock. For account or purchase help, email from the address you bought with so we can find you faster.",
        ],
      },
    ],
  },
];

export function getPolicy(slug: string): Policy | undefined {
  return POLICIES.find((p) => p.slug === slug);
}
