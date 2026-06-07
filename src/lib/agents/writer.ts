import { generateObject } from "ai";
import { getModel } from "../llm";
import {
  SlideDeckSchema,
  type DeckBrief,
  type SlideSpec,
  type StoryOutline,
} from "../types";
import { CONSULTING_VOICE } from "./prompts";

/**
 * Agent 2 — Slide Writer.
 * Expands the outline into concrete slide specs (title, lead, body, chart,
 * diagram, kpi). Produces the whole deck in one pass so the narrative stays
 * coherent. Layout choice is a *suggestion* here; the Designer normalizes it.
 */
export async function writeSlides(
  brief: DeckBrief,
  outline: StoryOutline,
): Promise<SlideSpec[]> {
  const { object } = await generateObject({
    model: getModel(),
    schema: SlideDeckSchema,
    system: `${CONSULTING_VOICE}

あなたの役割は「スライド執筆」です。与えられたストーリー構成から、実際のスライド群を作ります。

各スライドのフィールド:
- title: スライドの短いラベル（kicker、例:「市場規模」）。
- lead: そのスライドの結論＝言い切りの一文（最重要）。
- layout: 内容に最適なものを次から選ぶ:
  - "title"（表紙、先頭に1枚）/ "section-divider"（章扉）/ "bullets"（箇条書き）
  - "two-column"（対比・機会脅威など）/ "chart"（推移・比較の定量）
  - "diagram"（process=手順, matrix=2x2, pyramid=階層）/ "kpi"（数値ハイライト3〜4個）
  - "closing"（最後に1枚、提言/結び）
- 内容は layout に応じて bullets / columns / chart / diagram / kpis を埋める。
  - chart は categories と series(name,values) を必ず数値で埋め、不確かなら note に「ダミー値・要裏取り」。
  - kpi は kpis(value,label) を3〜4個。
- notes: 口頭補足（任意）。

構成ルール:
- 先頭に "title" を1枚（title=資料タイトル、lead=想定読者/日付など）。
- 各セクションは必要に応じ "section-divider" + 1〜2枚の本文。
- 最後に "closing" を1枚（lead=全体の提言を言い切る）。
- 多様なlayoutを使い、箇条書きばかりにしない。`,
    prompt: `次のストーリー構成からスライド群を作成してください。

【依頼】
タイトル: ${brief.title}
目的: ${brief.purpose}
想定読者: ${brief.audience}
希望ページ数: ${brief.pageCount ?? "指定なし"}

【ストーリー構成】
${outline.sections
  .map((s, i) => `${i + 1}. [${s.purpose}] ${s.title} — ${s.governingMessage}`)
  .join("\n")}`,
  });

  return object.slides;
}
