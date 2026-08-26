import { generateImage } from "ai";
import { OFFERINGS } from "../../../lib/offerings";

// A print takes real time to compose. Give the press room to work.
export const maxDuration = 120;

/**
 * The press itself — where an engine's composed prompt becomes pixels.
 *
 * POST { engineId, prompt, aspect } →  { image: dataUrl }
 *
 * The client never sends raw style instructions: it sends the engine id and
 * the BRIEF-level prompt its brain composed in chat. This route re-attaches
 * the engine's style DNA server-side, so a tampered request can't make, say,
 * the Naturalist print something outside its own taste — the machine's one
 * taste is enforced here, not in the browser.
 *
 * `aspect` is which frame the artwork is being born into:
 *   "square"   → desktop card / expanded sheet  (1024x1024)
 *   "portrait" → the phone's full-bleed card    (1024x1536)
 * The composition is generated natively for that frame — never cropped after.
 */
export async function POST(req: Request) {
  let engineId: string;
  let prompt: string;
  let aspect: "square" | "portrait";
  try {
    const body = await req.json();
    engineId = String(body.engineId ?? "");
    prompt = String(body.prompt ?? "").slice(0, 1600);
    aspect = body.aspect === "portrait" ? "portrait" : "square";
  } catch {
    return Response.json({ error: "Bad request" }, { status: 400 });
  }

  const engine = OFFERINGS.find((o) => o.id === engineId);
  if (!engine) return Response.json({ error: "Unknown engine" }, { status: 404 });
  if (!prompt.trim()) return Response.json({ error: "Empty brief" }, { status: 400 });

  const framing =
    aspect === "portrait"
      ? "Tall portrait poster. Compose natively for the tall frame; keep the lower quarter visually calmer so overlaid captions stay readable."
      : "Square poster. Compose natively for the square frame, edge to edge.";

  const fullPrompt = [
    `A finished, printed poster. ${framing}`,
    `STYLE (non-negotiable, this machine has exactly one taste): ${engine.style}`,
    `THE BRIEF: ${prompt.trim()}`,
    "The artwork must read as a deliberate, gallery-quality poster in the style above — never a generic AI image.",
  ].join("\n");

  try {
    const result = await generateImage({
      model: "openai/gpt-image-2",
      prompt: fullPrompt,
      size: aspect === "portrait" ? "1024x1536" : "1024x1024",
      providerOptions: { openai: { quality: "medium" } },
    });

    const img = result.image;
    return Response.json({
      image: `data:${img.mediaType ?? "image/png"};base64,${img.base64}`,
    });
  } catch (err) {
    console.error("[press] generation failed:", err instanceof Error ? err.message : err);
    // The client shows a calm retry state — a fork with no gateway key gets
    // the same message, so the template degrades gracefully.
    return Response.json({ error: "The press is offline right now." }, { status: 503 });
  }
}
