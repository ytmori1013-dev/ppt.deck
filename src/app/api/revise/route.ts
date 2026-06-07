import { NextResponse } from "next/server";
import { z } from "zod";
import { reviseDeck } from "@/lib/agents/reviser";
import { applyDesign } from "@/lib/agents/designer";
import { DeckSchema } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

const BodySchema = z.object({
  deck: DeckSchema,
  instruction: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const { deck, instruction } = BodySchema.parse(await req.json());
    const slides = applyDesign(await reviseDeck(deck, instruction));
    return NextResponse.json({ slides });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "revision failed" },
      { status: 400 },
    );
  }
}
