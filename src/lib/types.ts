import { z } from "zod";

/**
 * Single source of truth for the data model.
 * The same Zod schemas are used to (a) constrain LLM output (generateObject),
 * (b) type the API routes, and (c) drive both the pptx renderer and the
 * web preview. This keeps "what the AI produces" and "what we render"
 * perfectly aligned.
 */

// --- User input -----------------------------------------------------------
export const DeckBriefSchema = z.object({
  title: z.string().describe("資料のタイトル"),
  purpose: z.string().describe("資料の目的・狙い"),
  audience: z.string().describe("想定読者（例: 経営会議、投資家）"),
  pageCount: z.number().int().min(3).max(40).optional().describe("希望ページ数"),
  tone: z.string().optional().describe("トーン（例: 論理的・端的）"),
  notes: z.string().optional().describe("補足・参考情報の自由記述"),
});
export type DeckBrief = z.infer<typeof DeckBriefSchema>;

// --- Story outline (Story Builder output) ---------------------------------
export const OutlineSectionSchema = z.object({
  title: z.string().describe("セクションの短いラベル"),
  governingMessage: z.string().describe("このセクションで言い切るメッセージ（一文）"),
  purpose: z.string().describe("このセクションの役割（背景/課題/分析/打ち手/効果 等）"),
});
export type OutlineSection = z.infer<typeof OutlineSectionSchema>;

export const StoryOutlineSchema = z.object({
  sections: z.array(OutlineSectionSchema).min(3).max(40),
});
export type StoryOutline = z.infer<typeof StoryOutlineSchema>;

// --- Slide spec (Slide Writer / Designer output) --------------------------
export const SlideLayoutSchema = z.enum([
  "title", // 表紙
  "section-divider", // 章扉
  "bullets", // 箇条書き本文
  "two-column", // 2カラム
  "chart", // グラフ中心
  "diagram", // 図解
  "kpi", // 数値ハイライト
  "table", // 表
  "image-full", // 画像全面（GPT画像など）
  "image-right", // 左テキスト＋右画像
  "closing", // 結び
]);
export type SlideLayout = z.infer<typeof SlideLayoutSchema>;

export const BulletSchema = z.object({
  text: z.string(),
  sub: z.array(z.string()).optional(),
  icon: z.string().optional().describe("行頭アイコン名（例: check, growth, target）"),
});

export const ColumnSchema = z.object({
  heading: z.string(),
  bullets: z.array(BulletSchema),
});

export const ChartSchema = z.object({
  type: z.enum(["bar", "line", "pie"]),
  categories: z.array(z.string()).describe("X軸カテゴリ"),
  series: z
    .array(z.object({ name: z.string(), values: z.array(z.number()) }))
    .describe("系列ごとの数値"),
  note: z.string().optional().describe("出典・前提（※ダミー値である旨など）"),
});

export const DiagramSchema = z.object({
  type: z.enum(["process", "matrix", "pyramid"]),
  items: z.array(z.string()).describe("構成要素（process=順序, pyramid=上→下, matrix=4象限）"),
  axisX: z.string().optional(),
  axisY: z.string().optional(),
});

export const KpiSchema = z.object({
  value: z.string().describe("数値（例: 5,000億円, +32%）"),
  label: z.string().describe("数値の意味"),
  caption: z.string().optional().describe("補足（任意・カード下部の小さな説明）"),
  icon: z.string().optional().describe("アイコン名（例: time, money, check）"),
});

export const TableSchema = z.object({
  headers: z.array(z.string()).describe("ヘッダ行のセル"),
  rows: z.array(z.array(z.string())).describe("各データ行のセル配列"),
});
export type DeckTable = z.infer<typeof TableSchema>;

export const ImageSchema = z.object({
  // data URL (data:image/png;base64,...) を基本とする。URL画像はブラウザ側で
  // dataURL化してから保存するため、レンダラは常に dataURL を前提にできる。
  src: z.string(),
  caption: z.string().optional(),
});
export type SlideImage = z.infer<typeof ImageSchema>;

export const SlideSpecSchema = z.object({
  layout: SlideLayoutSchema,
  title: z.string().describe("スライドの短いラベル（kicker）"),
  lead: z.string().describe("リード文＝言い切りメッセージ（このスライドの結論）"),
  bullets: z.array(BulletSchema).optional(),
  columns: z.array(ColumnSchema).optional(),
  chart: ChartSchema.optional(),
  diagram: DiagramSchema.optional(),
  kpis: z.array(KpiSchema).optional(),
  table: TableSchema.optional(),
  image: ImageSchema.optional(),
  notes: z.string().optional().describe("スピーカーノート"),
});
export type SlideSpec = z.infer<typeof SlideSpecSchema>;

export const SlideDeckSchema = z.object({
  slides: z.array(SlideSpecSchema),
});

// --- Full deck (carried in client state) ----------------------------------
// brief/outline are optional so a paste-only deck (no AI, no outline) still
// validates and can be exported. slides is the only required part.
export const DeckSchema = z.object({
  brief: DeckBriefSchema.partial().optional(),
  outline: StoryOutlineSchema.optional(),
  slides: z.array(SlideSpecSchema),
});
export type Deck = z.infer<typeof DeckSchema>;
