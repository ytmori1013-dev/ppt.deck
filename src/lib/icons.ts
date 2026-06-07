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

/** Resolve a concept name (or raw glyph) to a render-safe glyph, or undefined. */
export function iconGlyph(name?: string): string | undefined {
  if (!name) return undefined;
  const key = name.trim().toLowerCase();
  if (ICON_GLYPHS[key]) return ICON_GLYPHS[key];
  // Allow passing a literal single glyph straight through.
  if ([...name.trim()].length === 1) return name.trim();
  return undefined;
}
