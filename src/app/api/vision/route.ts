import { z } from "zod";
import { reconstructFromImage } from "@/lib/agents/vision";
import { applyDesign } from "@/lib/agents/designer";

export const runtime = "nodejs";
export const maxDuration = 60;

// ~9MB of base64 (a data URL is ~1.37x the raw bytes) — keeps payloads and the
// vision request from blowing up memory / timing out.
const MAX_IMAGE_CHARS = 12_000_000;

const BodySchema = z.object({
  image: z
    .string()
    .min(1)
    .max(MAX_IMAGE_CHARS, "画像が大きすぎます。縮小してからお試しください。")
    .describe("data URL or https URL of the image"),
  hint: z.string().max(2000).optional(),
});

export async function POST(req: Request) {
  try {
    const { image, hint } = BodySchema.parse(await req.json());
    const built = await reconstructFromImage(image, hint);
    if (!built.length) {
      return new Response(
        JSON.stringify({ error: "画像から内容を読み取れませんでした" }),
        { status: 422, headers: { "Content-Type": "application/json" } },
      );
    }
    return Response.json({ slides: applyDesign(built) });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "vision failed" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }
}
