import { NextResponse } from "next/server";
import { z } from "zod";
import { writeSlides } from "@/lib/agents/writer";
import { applyDesign } from "@/lib/agents/designer";
import { reviewSlides } from "@/lib/agents/reviewer";
import { DeckBriefSchema, StoryOutlineSchema } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

const BodySchema = z.object({
  brief: DeckBriefSchema,
  outline: StoryOutlineSchema,
  review: z.boolean().optional().default(true),
});

export async function POST(req: Request) {
  try {
    const { brief, outline, review } = BodySchema.parse(await req.json());

    // Writer -> Designer (deterministic) -> Reviewer (optional QA pass)
    let slides = await writeSlides(brief, outline);
    slides = applyDesign(slides);
    if (review) {
      slides = applyDesign(await reviewSlides(brief, slides));
    }

    return NextResponse.json({ slides });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "slide generation failed" },
      { status: 400 },
    );
  }
}
