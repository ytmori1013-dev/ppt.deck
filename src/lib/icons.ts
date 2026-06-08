/**
 * Lightweight icon set.
 *
 * The design standard calls for "シンプルなモノラインアイコン". True line-icon
 * artwork would need embedded assets that don't render reliably across
 * PowerPoint; instead we map a small, curated set of concept names to Unicode
 * glyphs that exist in Meiryo UI / Noto Sans JP, so they render identically in
 * the .pptx and the web preview with zero assets and full determinism.
 */

const ICON_GLYPHS: Record<string, string> = {
  // direction / trend
  up: "▲", growth: "▲", increase: "▲", down: "▼", decrease: "▼",
  right: "→", arrow: "→", flow: "→",
  // status
  check: "✓", done: "✓", ok: "✓", good: "✓",
  star: "★", best: "★", priority: "★",
  warning: "！", risk: "！", alert: "！",
  // business concepts
  target: "◎", goal: "◎", focus: "◎",
  idea: "◆", insight: "◆", point: "◆",
  money: "¥", cost: "¥", revenue: "¥", price: "¥",
  percent: "％", rate: "％",
  time: "⏱", speed: "⏱", fast: "⏱",
  data: "▤", doc: "▤", report: "▤",
  people: "♟", team: "♟", user: "♟", customer: "♟",
  plus: "＋", add: "＋", minus: "－",
  dot: "●", bullet: "●",
};

/**
 * Infer an icon concept name from Japanese/English bullet text, so plain pasted
 * or OCR'd content gets meaningful line markers with zero AI. First keyword hit
 * wins; returns undefined when nothing matches (renderer falls back to a square).
 */
const ICON_KEYWORDS: Array<[RegExp, string]> = [
  [/コスト|費用|原価|円|億|万円|予算|投資|収益|売上|利益|価格|金額/u, "money"],
  [/時間|期間|年|月|日|週|スピード|迅速|短縮|納期/u, "time"],
  [/成長|拡大|増加|上昇|向上|改善|伸び|アップ/u, "growth"],
  [/減少|低下|削減|縮小|低減|ダウン/u, "decrease"],
  [/リスク|課題|問題|懸念|注意|脅威|不安/u, "risk"],
  [/目標|狙い|ゴール|目的|ターゲット|KPI/u, "target"],
  [/人員|人材|組織|チーム|顧客|ユーザー|社員|体制/u, "people"],
  [/率|割合|シェア|％|%|パーセント/u, "percent"],
  [/データ|分析|資料|レポート|指標|実績/u, "data"],
  [/完了|達成|実現|対応済|済|合意/u, "check"],
  [/重要|優先|最重要|鍵|最大/u, "priority"],
  [/施策|アイデア|提案|打ち手|方針|戦略/u, "idea"],
];

export function inferIcon(text?: string): string | undefined {
  if (!text) return undefined;
  for (const [re, name] of ICON_KEYWORDS) if (re.test(text)) return name;
  return undefined;
}

/** Resolve a concept name (or raw glyph) to a render-safe glyph, or undefined. */
export function iconGlyph(name?: string): string | undefined {
  if (!name) return undefined;
  const key = name.trim().toLowerCase();
  if (ICON_GLYPHS[key]) return ICON_GLYPHS[key];
  // Allow passing a literal single glyph straight through.
  if ([...name.trim()].length === 1) return name.trim();
  return undefined;
}
