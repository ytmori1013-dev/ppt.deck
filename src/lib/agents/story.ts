import { generateObject } from "ai";
import { getModel } from "../llm";
import { StoryOutlineSchema, type DeckBrief, type StoryOutline } from "../types";
import { CONSULTING_VOICE } from "./prompts";

/**
 * Agent 1 — Story Builder.
 * Turns a free-form brief into a MECE, pyramid-structured outline.
 */
export async function buildStory(brief: DeckBrief): Promise<StoryOutline> {
  const target = brief.pageCount ?? 10;
  // Content sections exclude cover/closing, so aim a little lower.
  const sectionTarget = Math.max(3, Math.min(12, Math.round(target * 0.7)));

  const { object } = await generateObject({
    model: getModel(),
    schema: StoryOutlineSchema,
    system: `${CONSULTING_VOICE}

あなたの役割は「ストーリー設計」です。資料全体の論理構成（セクション）を作ります。
- 各セクションは {title: 短いラベル, governingMessage: 言い切りの一文, purpose: 役割} を持つ。
- purpose は 背景/課題/分析/打ち手/効果/提言 などストーリー上の役割を表す。
- 全体で「背景→課題→分析→打ち手→効果/提言」のような論理の流れになるようにする。
- セクション数は概ね ${sectionTarget} 個（表紙・結びは含めない）。`,
    prompt: `以下の依頼に対する資料のストーリー構成を作ってください。

タイトル: ${brief.title}
目的: ${brief.purpose}
想定読者: ${brief.audience}
希望ページ数: ${brief.pageCount ?? "指定なし"}
トーン: ${brief.tone ?? "指定なし"}
補足: ${brief.notes ?? "なし"}`,
  });

  return object;
}
