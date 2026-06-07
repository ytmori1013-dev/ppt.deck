import { generateObject } from "ai";
import { getModel } from "../llm";
import { SlideDeckSchema, type Deck, type SlideSpec } from "../types";
import { CONSULTING_VOICE } from "./prompts";

/**
 * Chat-driven reviser.
 * Applies a natural-language instruction ("4ページ目の市場分析を強化",
 * "財務観点を追加") to the current deck and returns the updated slides.
 */
export async function reviseDeck(
  deck: Deck,
  instruction: string,
): Promise<SlideSpec[]> {
  const b = deck.brief ?? {};
  const { object } = await generateObject({
    model: getModel(),
    schema: SlideDeckSchema,
    system: `${CONSULTING_VOICE}

あなたの役割は「対話による修正」です。ユーザーの指示に従って既存スライドを更新します。
- 指示に関係するスライドだけを過不足なく修正する（無関係なスライドは内容を保持）。
- 「○ページ目」はスライド番号(1始まり)を指す。
- 「追加して」なら適切な位置に新規スライドを挿入、「短く」なら情報量を保ちつつ簡潔化。
- 各 lead は言い切りの結論を維持。layout は内容に合うものを選ぶ。
- 出力は更新後のスライド群全体（同じスキーマ）。`,
    prompt: `依頼: ${b.title ?? "(無題)"} / 目的: ${b.purpose ?? "-"} / 読者: ${b.audience ?? "-"}

【ユーザーの修正指示】
${instruction}

【現在のスライド群】
${JSON.stringify(deck.slides, null, 2)}`,
  });

  return object.slides;
}
