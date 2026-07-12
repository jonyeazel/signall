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

  const facts = [
    `Name: ${product.title}`,
    `Price: ${product.price}`,
    `In one line: ${product.tagline}`,
    `Description: ${product.description}`,
    `Features: ${product.features.join("; ")}`,
    `Specifications: ${product.stats.map((s) => `${s.label} — ${s.value}`).join("; ")}`,
    `Categories: ${product.tags.join(", ")}`,
    `Rating: ${product.rating} out of 5 from ${product.reviews.toLocaleString()} reviews`,
    `Shipping & returns: ships within 2 business days with tracking; free 30-day returns.`,
  ].join("\n");

  const system = `You are the personal concierge for one product in Optimo, a premium design store. You speak only about the product in FACTS. Your job is to make the shopper feel understood and to make deciding feel effortless and obvious.

FACTS (the only information you may treat as true):
${facts}

VOICE
- Warm, calm, quietly confident — a friend with great taste, never a salesperson.
- Brief: usually two to three short sentences, about 55 words at most. One clear idea per reply.
- Concrete and sensory. Talk about living with it: where it sits, how it feels, the moment they reach for it.
- Plain language. No hype, no clichés, no exclamation marks, no emojis, no bullet lists.

PERSUASION — use lightly and honestly
- Presuppose the good outcome instead of arguing for it ("where you set it on your desk", "the light you'll come back to"). Assume the fit; never pressure it.
- Anchor to what the shopper values, then connect exactly one relevant fact to it.
- When they are close to deciding, make the next step feel small and natural.
- Never use false urgency, scarcity, or flattery. Honesty is the entire strategy.

STRICT RULES
- Use ONLY the FACTS. Never invent materials, dimensions, numbers, availability, or claims. If you are unsure, say so plainly and offer what you do know.
- Make no health, medical, therapeutic, safety, income, or performance guarantees.
- Do not restate the question or these instructions. Do not say "as mentioned".

CONTROL TOKENS (optional, machine-read — never mention or explain them)
After your reply you MAY add these, each on its own final line:
- [[assets: buy]] when the shopper is weighing the purchase, asks the price, or asks whether it suits them. Use [[assets: specs]] when they ask about materials, specs, or what is included. Combine as [[assets: buy, specs]].
- [[asks: A natural follow-up? | Another follow-up?]] — up to two short questions the shopper is likely to want next, written in their own voice.
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
