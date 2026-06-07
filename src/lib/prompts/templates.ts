import type { DeckBrief, SlideSpec } from "../types";

/**
 * Copy-paste prompt helpers — the bridge to the user's existing manual loop
 * (story in Claude, images in GPT). No API calls; these just produce text the
 * user pastes into their own chat tools so the output matches deckdown syntax.
 */

/** Prompt to paste into Claude so its story comes back in deckdown syntax. */
export function claudeStoryPrompt(brief: Partial<DeckBrief>): string {
  const pages = brief.pageCount ? `${brief.pageCount}ページ程度` : "適切な枚数";
  return `あなたはBCG・マッキンゼー級の戦略コンサルタントです。
以下の依頼に対する資料を、必ず下記の「deckdown記法」だけで出力してください（前置き・後書き不要）。

# 依頼
- タイトル: ${brief.title || "（タイトルを補完）"}
- 目的: ${brief.purpose || "（目的を補完）"}
- 想定読者: ${brief.audience || "経営会議"}
- 分量: ${pages}
- トーン: ${brief.tone || "論理的・端的・定量的"}

# 品質ルール
- 1スライド=1メッセージ。各 ### の見出しは「言い切りの結論」にする（事実羅列・体言止め禁止）。
- 全体はMECE／ピラミッド構造（背景→課題→分析→打ち手→効果/提言）。
- 数値は具体的に。不確かな数値は @chart の note に「ダミー値・要裏取り」と明記。

# deckdown記法
# 資料タイトル
> サブタイトル（任意）

## セクション名

### キッカー :: 結論メッセージ
- 根拠の箇条書き
  - 補足（インデントでサブ箇条書き）

### 数値で示す結論
@kpi
- 5,000億円 | 2030年市場規模
- +22% | 年平均成長率

### 推移で示す結論
@chart bar
cat: 2024, 2026, 2028, 2030
普通充電: 800, 1200, 1800, 2400
急速充電: 600, 1000, 1700, 2600
note: ダミー値・要裏取り

### 対比で示す結論
@cols
[機会] - 補助金 - 法人需要
[脅威] - 大手の先行投資 - 電力価格変動

### 手順で示す結論
@diagram process
- 市場検証 - 拠点選定 - PoC - 本格展開 - 横展開

### 画像を入れたい結論
@image
caption: 図のキャプション（任意）

### 提言（最後）
@closing
> 全体を一言で言い切る提言

上記の記法のみで、資料全体を出力してください。`;
}

/** Prompt to paste into ChatGPT (image gen) for one slide. */
export function gptImagePrompt(spec: SlideSpec): string {
  const topic = spec.lead || spec.title || "プレゼン資料の挿絵";
  return `16:9・横長のプレゼン用画像を生成してください。
- 内容: ${topic}
- スタイル: 経営層向けのクリーンでミニマルなビジネス図版。ネイビー(#1F2A44)を基調に、白・ライトグレー・ゴールド(#C8A45C)のアクセント。
- 文字は入れない（または最小限）。写実すぎずモダンなフラットイラスト/図解。
- 余白を活かし、スライドに載せても読みやすい構図。`;
}
