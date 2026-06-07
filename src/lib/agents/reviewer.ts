import { generateObject } from "ai";
import { getModel } from "../llm";
import {
  SlideDeckSchema,
  type DeckBrief,
  type SlideSpec,
} from "../types";
import { CONSULTING_VOICE } from "./prompts";

/**
 * Agent 4 — Reviewer.
 * Consulting-quality QA pass: rewrites weak lead messages, enforces
 * 1-slide-1-message and MECE, tightens wording. Returns the improved slides.
 */
export async function reviewSlides(
  brief: DeckBrief,
  slides: SlideSpec[],
): Promise<SlideSpec[]> {
  const { object } = await generateObject({
    model: getModel(),
    schema: SlideDeckSchema,
    system: `${CONSULTING_VOICE}

あなたの役割は「レビュー＆推敲」です。既存のスライド群を、構成・枚数・layoutは原則維持したまま品質を引き上げます。
チェック観点:
- 各 lead は「言い切りの結論」になっているか（題目・体言止め・事実羅列はメッセージに書き換える）。
- 1スライド1メッセージか。本文(bullets等)が lead を支える根拠になっているか。
- 全体としてMECE・ピラミッド構造で論理が通っているか。
- 冗長表現を削り、定量を明確にする。

出力は改善後のスライド群（同じスキーマ、同じ枚数・順序を維持）。`,
    prompt: `依頼: ${brief.title} / 目的: ${brief.purpose} / 読者: ${brief.audience}

以下のスライド群を推敲してください（枚数と順序は維持）:
${JSON.stringify(slides, null, 2)}`,
  });

  return object.slides;
}
