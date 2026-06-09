import { generateObject } from "ai";
import { getModel } from "../llm";
import { SlideDeckSchema, type SlideSpec } from "../types";
import { CONSULTING_VOICE } from "./prompts";

/**
 * Vision agent — reconstruct an image (a slide screenshot, a GPT-made reference
 * slide, a chart/figure) into EDITABLE native slides. Unlike the free Tesseract
 * path, this reads the picture with Claude vision and emits structured SlideSpecs
 * (titles, bullets, tables, KPIs, charts, diagrams) so the result is real,
 * editable PowerPoint — not a raster image. Requires ANTHROPIC_API_KEY.
 */
export async function reconstructFromImage(
  dataUrl: string,
  hint?: string,
): Promise<SlideSpec[]> {
  const { object } = await generateObject({
    model: getModel(),
    schema: SlideDeckSchema,
    system: `${CONSULTING_VOICE}

あなたの役割は「画像 → 編集可能スライドの再構築」です。与えられた画像（プレゼンのスライド、図表、参考デザイン）を読み取り、文字・数値・表・図の構造を抽出して、編集可能なネイティブスライドに作り直します。

- 画像の見出しは title(kicker) と lead(言い切りの結論) に分ける。
- 箇条書きは bullets に。数値の比較やKPIは kpis / chart / table に、手順は diagram(process) に構造化する。
- 画像をそのまま貼るのではなく、中身を構造化データとして書き出す（後から編集できるように）。
- 画像内の文言は尊重しつつ、結論が曖昧なら言い切りに整える。読み取れない箇所は無理に創作しない。
- 1枚の画像でも、内容が多ければ複数スライドに分けてよい。`,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: hint
              ? `補足: ${hint}\nこの画像を編集可能なスライドに再構築してください。`
              : "この画像を編集可能なスライドに再構築してください。",
          },
          { type: "image", image: dataUrl },
        ],
      },
    ],
  });

  return object.slides ?? [];
}
