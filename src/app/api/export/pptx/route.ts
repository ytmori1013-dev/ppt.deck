import { z } from "zod";
import { renderDeckToPptx } from "@/lib/render/pptx";
import { DeckSchema } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const deck = DeckSchema.parse(await req.json());
    const buf = await renderDeckToPptx(deck);

    const safeName =
      deck.brief.title.replace(/[^\p{L}\p{N}_-]+/gu, "_").slice(0, 60) || "deck";

    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="${safeName}.pptx"`,
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "export failed" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }
}
