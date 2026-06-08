import { z } from "zod";
import { renderDeckToPptx } from "@/lib/render/pptx";
import { DeckSchema } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const deck = DeckSchema.parse(await req.json());
    const buf = await renderDeckToPptx(deck);

    // Keep Unicode (incl. Japanese) for the human-friendly name...
    const safeName =
      (deck.brief?.title ?? "deck").replace(/[^\p{L}\p{N}_-]+/gu, "_").slice(0, 60) ||
      "deck";
    // ...but HTTP headers are Latin-1 only, so emit an ASCII fallback plus an
    // RFC 5987 UTF-8 filename* (modern browsers use the latter, old ones the former).
    const utf8 = encodeURIComponent(`${safeName}.pptx`);
    const ascii = `${safeName.replace(/[^\x20-\x7E]/g, "_") || "deck"}.pptx`;

    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="${ascii}"; filename*=UTF-8''${utf8}`,
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "export failed" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }
}
