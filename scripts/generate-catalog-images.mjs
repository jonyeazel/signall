import { generateText } from "ai";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const MODEL = "google/gemini-3.1-flash-image-preview";
const OUTPUT_DIR = join(process.cwd(), "public", "catalog");

const CAMPAIGN = `
Create a museum-grade editorial product photograph for one image in a tightly unified seven-product design-goods campaign.

CAMPAIGN WORLD — "PRIMARY MEASURE": contemporary industrial still life directed with Dieter Rams discipline, then energized by 1960s European color-field photography. The scene is a real physical tabletop studio, not a 3D render. Four-color system only: warm chalk mineral (#F2F0E9), graphite black (#1C1C1A), saturated signal red (#D7372F), and deep ultramarine (#2448A8). Use color as physical painted planes and one small registration prop, never as a gradient. Crisp hard late-morning sunlight from upper left creates one long, geometrically precise shadow. Fine 35mm film grain, tactile material detail, realistic imperfections, neutral color science, restrained specular highlights.

COMPOSITION LAW: vertical 3:4 frame. The product is complete, unobscured, and immediately identifiable. Place its optical center near 46% frame height, occupying roughly 54–66% of the frame. Keep generous calm negative space above and around it. Preserve clean safe zones in the top 16%, bottom 22%, and right 18% for interface controls and copy. Build the image from a strict orthogonal grid, one diagonal shadow, and no more than three supporting forms. Camera is squared and deliberate, 50–85mm equivalent, no wide-angle distortion. The product must still read beautifully when center-cropped to square or 4:5.

QUALITY: premium real campaign photography, physically plausible, pin-sharp product edges, true material behavior, subtle depth, no excessive bokeh. The image should feel authored enough to run full-page in a global design magazine.

ABSOLUTE EXCLUSIONS: no text, letters, numbers, logos, labels, watermarks, hands, people, plants, fabric draping, fake windows, levitation, liquid splashes, prop confetti, clutter, pastel gradient backgrounds, seamless infinity-cove look, glossy CGI, duplicated product, cropped product, warped geometry, impossible shadows, or generic marketplace photography.
`;

const jobs = [
  {
    file: "lumen-1.png",
    prompt: "HERO — a cordless table lamp with a low cylindrical graphite base and a broad hand-cast matte chalk-plaster dome shade, switched on with a genuinely warm pool of light. It stands on a warm mineral tabletop; a thin ultramarine vertical plane sits far behind on the left and a small signal-red rectangular charging block rests low at the far left. Front three-quarter view, whole lamp visible, quiet and monumental.",
  },
  {
    file: "lumen-2.png",
    prompt: "DETAIL CONTEXT — the same cordless plaster dome lamp, switched off, seen from a slightly higher three-quarter angle to reveal plaster texture, tactile dimmer, graphite base, and a discreet USB-C port. Place it precisely at the junction of warm chalk and ultramarine tabletop planes; one slim signal-red ruler-like bar lies parallel to the bottom edge. Whole lamp visible.",
  },
  {
    file: "strata-1.png",
    prompt: "HERO — three hand-thrown speckled stoneware bowls in graduated sizes, nested into one calm sculptural stack. Tonal chalk, sand, and graphite reactive matte glazes with handmade rims. Center the nested set on an ultramarine square tile over the warm mineral stage; one tiny signal-red ceramic cube registers scale at lower left. Whole stack visible from a slightly elevated front angle.",
  },
  {
    file: "strata-2.png",
    prompt: "DETAIL CONTEXT — the same three stoneware bowls separated into a precise diagonal rhythm: large bowl low left, medium center, small upper right. Their interiors and speckled handmade surfaces are visible. Warm chalk tabletop, graphite rear plane, one narrow signal-red stripe crossing behind them, strict overhead three-quarter composition, all bowls complete and unobscured.",
  },
  {
    file: "orbit-1.png",
    prompt: "HERO — a numberless wall clock milled from one piece of satin aircraft-grade aluminum, thin graphite hands and a tiny signal-red seconds hand. Mount it on a warm chalk architectural panel with one ultramarine rectangle inset at far left. Straight-on elevation, perfect circle, whole clock visible, precise long diagonal sunlight shadow, credible brushed-metal detail.",
  },
  {
    file: "orbit-2.png",
    prompt: "DETAIL CONTEXT — EXACTLY the same clock as the hero: a completely blank, NUMBERLESS, MARKERLESS face made from one solid disc of satin radial-brushed aluminum, with only two thin graphite hands and one tiny signal-red seconds hand. Absolutely no ticks, indices, numerals, printed marks, rim insert, or white face. Rest it upright on a shallow graphite display ledge, viewed only 8 degrees off-axis so its exceptionally thin milled edge appears while the perfect circle remains undistorted. Warm mineral wall, small signal-red square beside it, ultramarine plane low behind. Whole clock visible.",
  },
  {
    file: "compass-1.png",
    prompt: "HERO — premium hand-polished tortoiseshell acetate sunglasses with dark polarized lenses and precise five-barrel hinges, opened naturally in a symmetrical front three-quarter pose. Place them on a warm chalk plinth crossing an ultramarine tabletop plane; a small signal-red optical test card with no writing stands behind one temple. Entire frame and both temples visible, lens reflections controlled.",
  },
  {
    file: "compass-2.png",
    prompt: "DETAIL CONTEXT — the same tortoiseshell acetate sunglasses folded, photographed close but fully visible from above at a shallow angle, emphasizing polished acetate depth, hinge machining, and lens edge. Graphite tabletop with a warm mineral square beneath the frame and a thin signal-red rod aligned beside it; ultramarine rear plane. No face, no case.",
  },
  {
    file: "boxes-1.png",
    prompt: "HERO — a modular system of three solid white-oak storage boxes with crisp hand-cut dovetail joinery, stacked in an offset architectural tower. Food-safe oiled wood grain and felt-lined bases are believable. Warm chalk stage, one ultramarine backing panel visible through an open box, and a small signal-red cube in the lowest compartment. Whole stack visible, perfectly stable.",
  },
  {
    file: "boxes-2.png",
    prompt: "DETAIL CONTEXT — the same three white-oak boxes unstacked into a strict stepped arrangement viewed slightly from above, showing nesting proportions, dovetail corners, and dark felt bases. Warm mineral tabletop crossed by a broad ultramarine strip; one thin signal-red spacer sits between two boxes. All boxes complete and separated clearly.",
  },
  {
    file: "waves-1.png",
    prompt: "HERO — a single hand-thrown bone-white matte stoneware vase with a refined undulating vertical profile, watertight and empty. Set it on a deep ultramarine plinth against the warm chalk stage; one small signal-red disc lies flat nearby. Hard side light describes every wave with elegant alternating light and shadow. Whole vase visible, upright, no flowers.",
  },
  {
    file: "waves-2.png",
    prompt: "DETAIL CONTEXT — EXACTLY the same tall, narrow vase as the hero: bone-white matte stoneware with FOUR pronounced horizontal undulating waves from neck to base, a slim irregular handmade rim, and no smooth pear-shaped sections. Rotate it only 25 degrees and view slightly from above to reveal the sealed interior while preserving the unmistakable four-wave silhouette. Graphite tabletop, warm mineral rear wall, narrow ultramarine vertical plane, tiny signal-red square. Whole vase visible, never cropped, no flowers.",
  },
  {
    file: "aperture-1.png",
    prompt: "HERO — a compact full-frame camera with a fixed 35mm lens, graphite magnesium body, tactile machined-metal top dials, and hand-wrapped black leather grip. Front three-quarter product view on a warm chalk plinth; an ultramarine plane rises behind the left edge and a small signal-red shutter-release cable button sits nearby. Entire camera and lens visible, no brand marks.",
  },
  {
    file: "aperture-2.png",
    prompt: "DETAIL CONTEXT — the same compact full-frame camera from a precise elevated rear three-quarter angle, fully visible, emphasizing machined exposure dials, viewfinder, leather grip seam, and slim body depth. Graphite tabletop with a warm mineral square, one ultramarine rectangular block, and a thin signal-red registration bar. No strap, no hands, no screen text.",
  },
];

await mkdir(OUTPUT_DIR, { recursive: true });
const only = process.argv.find((arg) => arg.startsWith("--only="))?.split("=")[1];
const selected = only ? jobs.filter((job) => job.file === only) : jobs;
if (!selected.length) throw new Error(`Unknown image: ${only}`);

for (const [index, job] of selected.entries()) {
  console.log(`[${index + 1}/${selected.length}] Generating ${job.file} with ${MODEL}`);
  const result = await generateText({
    model: MODEL,
    prompt: `${CAMPAIGN}\n\nSHOT BRIEF:\n${job.prompt}`,
    providerOptions: {
      google: {
        responseModalities: ["IMAGE"],
        imageConfig: { aspectRatio: "3:4", imageSize: "2K" },
        thinkingConfig: { thinkingLevel: "high" },
      },
    },
    maxRetries: 2,
    abortSignal: AbortSignal.timeout(240_000),
  });
  const image = result.files.find((file) => file.mediaType.startsWith("image/"));
  if (!image) throw new Error(`Nano Banana 2 returned no image for ${job.file}`);
  await writeFile(join(OUTPUT_DIR, job.file), image.uint8Array);
  console.log(`Saved ${job.file} (${image.mediaType}, ${image.uint8Array.byteLength} bytes)`);
}
