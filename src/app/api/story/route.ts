import { NextResponse } from "next/server";
import { buildStory } from "@/lib/agents/story";
import { DeckBriefSchema } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const brief = DeckBriefSchema.parse(body);
    const outline = await buildStory(brief);
    return NextResponse.json({ outline });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "story generation failed" },
      { status: 400 },
    );
  }
}
