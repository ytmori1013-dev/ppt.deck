import { z } from "zod";
import { reconstructFromImage } from "@/lib/agents/vision";
import { applyDesign } from "@/lib/agents/designer";

export const runtime = "nodejs";
export const maxDuration = 60;

const BodySchema = z.object({
  image: z.string().describe("data URL or https URL of the image"),
  hint: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const { image, hint } = BodySchema.parse(await req.json());
    const slides = applyDesign(await reconstructFromImage(image, hint));
    return Response.json({ slides });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "vision failed" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }
}
