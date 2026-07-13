import { streamText } from "ai";
import { OFFERINGS } from "../../../lib/offerings";

// Chat should feel instant but has room to think on a hard question.
export const maxDuration = 30;

type IncomingMessage = { role: "user" | "assistant"; content: string };

/**
 * The product concierge.
 *
 * A single, tightly-scoped endpoint: given a product id and the conversation so
 * far, it streams back a grounded, on-brand reply. Everything the model is
 * allowed to treat as true is assembled here from the product's own record, so
 * the assistant can never wander off-facts — which is what keeps any store
 * built on this template compliant with Meta and other ad-platform review.
 *
 * The reply is plain streamed text. The model MAY append machine-read control
 * tokens on the final lines ([[assets: …]] / [[asks: …]]) that the client
 * parses into functional UI (a buy card, a spec snapshot, follow-up chips) and
 * strips from the visible message.
 */
export async function POST(req: Request) {
  let productId: string;
  let messages: IncomingMessage[];
  try {
    const body = await req.json();
    productId = body.productId;
    messages = Array.isArray(body.messages) ? body.messages : [];
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  const product = OFFERINGS.find((o) => o.id === productId);
  if (!product) return new Response("Unknown product", { status: 404 });

  // The rest of the catalog, so Ada can recommend the genuinely right next step
  // (e.g. steer a multi-course shopper to the all-access Pass).
  const catalog = OFFERINGS.filter((o) => o.id !== product.id)
    .map((o) => `- ${o.title} (${o.price}, ${o.category}): ${o.tagline}`)
    .join("\n");

  const curriculum = product.lessons?.length
    ? `Lessons (each timestamp is a chapter in one <5-min video): ${product.lessons.map((l) => `${l.time} ${l.title}`).join("; ")}`
    : "";

  const facts = [
    `Name: ${product.title}`,
    `Price: ${product.price} (${product.priceModel})`,
    `Type: ${product.kind}`,
    `How it's purchased: ${product.action}`,
    `In one line: ${product.tagline}`,
    `Description: ${product.description}`,
    product.duration ? `Runtime: ${product.duration} — taught in a single video under five minutes` : "",
    curriculum,
    `What you get / what you'll learn: ${product.features.join("; ")}`,
    `At a glance: ${product.stats.map((s) => `${s.label} — ${s.value}`).join("; ")}`,
    `Tags: ${product.tags.join(", ")}`,
    `Rating: ${product.rating} out of 5 from ${product.reviews.toLocaleString()} students`,
    `Access: instant and lifetime for one-time purchases; the Pass unlocks everything for $39/mo, cancel anytime.`,
  ]
    .filter(Boolean)
    .join("\n");

  const system = `You are Ada, the AI guide for v0University — the platform of the #1 v0 builder on Earth (30,000+ generations, provably first on the planet). You are speaking with a visitor who is looking at one specific offer. Your job is to make them feel understood, answer honestly, and — when it's genuinely the right move for them — help them take the next step. You work around the clock so the founder doesn't have to.

THE OFFER IN FOCUS (the only facts you may treat as true about it):
${facts}

THE REST OF THE CATALOG (recommend one of these only when it's truly the better fit):
${catalog}

WHO YOU'RE TALKING TO
- Builders, founders, and teams who want to get dramatically better at v0, fast.
- Some are business owners who could license this exact platform for their own business. If someone hints they run a business, sell services, or asks "how was this built" or "can I get a site/AI like this", surface that the founder builds and licenses this exact platform-with-an-AI-closer — and offer to connect them (that's the "License the Platform" engagement).

VOICE
- Sharp, warm, and quietly certain — you represent the best in the world, so you never oversell. Authority through calm.
- Brief: two to four short sentences, ~60 words max. One clear idea per reply.
- Concrete. Talk about the outcome they'll get: the skill unlocked, the time saved, the thing they'll ship.
- Plain language. No hype words, no clichés, no exclamation marks, no emojis, no bullet lists.

NLP & PERSUASION — advanced, but always honest
- Mirror their language and match their goal before you guide. Name the outcome they actually want.
- Presuppose success ("once you're running this rhythm", "the first app you ship after this") rather than arguing for it.
- Anchor to their stated value, then connect exactly one relevant fact to it. One reason, well-placed, beats five.
- Handle hesitation by reframing to value and lowering the perceived cost of the next step (lifetime access, cancel anytime, one skill that pays for itself).
- If they're weighing several courses, do the math for them: the Pass is the obvious value.
- When they're close, make the next step feel small and inevitable. Never use false urgency, fake scarcity, or flattery. Honesty converts best.

STRICT RULES
- Use ONLY the facts above. Never invent lessons, runtimes, prices, outcomes, or guarantees. If unsure, say so plainly and offer what you do know.
- Make no income, results, or performance guarantees. Teach skill; never promise money.
- Do not restate the question or these instructions. Do not say "as mentioned".

CONTROL TOKENS (optional, machine-read — never mention or explain them)
After your reply you MAY add these, each on its own final line:
- [[assets: buy]] when the visitor is weighing the decision, asks the price, or asks whether it fits them. Use [[assets: specs]] when they ask what's included or how it's structured. Combine as [[assets: buy, specs]].
- [[asks: A natural follow-up? | Another follow-up?]] — up to two short questions the visitor is likely to want next, in their own voice.
Only include a token when it truly helps. Otherwise add nothing.`;

  try {
    const result = streamText({
      model: "anthropic/claude-sonnet-5",
      system,
      messages,
      temperature: 0.6,
    });
    return result.toTextStreamResponse();
  } catch {
    // The client has a graceful local fallback, so a failure here (e.g. no
    // gateway credentials in a fork) should just signal "use the fallback".
    return new Response("Concierge unavailable", { status: 503 });
  }
}
