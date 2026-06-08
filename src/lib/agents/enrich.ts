import { inferIcon } from "../icons";
import type { SlideSpec } from "../types";
import { applyDesign } from "./designer";

/**
 * Auto-illustration — the free, deterministic stand-in for "AI makes a figure".
 *
 * No LLM, no image generation. Instead we read the plain bullets the parser /
 * OCR produced and, when we are confident, promote them into NATIVE editable
 * figures (KPI cards, a process flow, a table) or at least attach meaningful
 * icons. Everything stays a real PowerPoint object, so the user can edit it.
 *
 * Deliberately conservative: it is better to leave a slide as bullets than to
 * mangle prose into the wrong figure. Slides that already carry structured data
 * (chart / kpis / table / columns / diagram / image) are left untouched.
 */
export function autoIllustrate(slides: SlideSpec[]): SlideSpec[] {
  const out = slides.map((s) => {
    if (!isPlainBullets(s)) return s;
    return asTable(s) ?? asKpi(s) ?? asProcess(s) ?? withIcons(s);
  });
  // Final pass guarantees the layout matches whatever data now exists.
  return applyDesign(out);
}

/** A bullets slide with text and no competing structured content. */
function isPlainBullets(s: SlideSpec): boolean {
  return (
    s.layout === "bullets" &&
    !!s.bullets?.length &&
    !s.chart &&
    !s.kpis?.length &&
    !s.table?.headers.length &&
    !s.columns?.length &&
    !s.diagram &&
    !s.image?.src
  );
}

const NUM_UNIT =
  /[+\-]?[\d,]+(?:\.\d+)?\s*(?:%|％|円|億|万|千|件|倍|人|社|pt|ポイント|か月|ヶ月|年|日)/u;

/** Pull a {value,label} metric out of a terse bullet, or null if it isn't one. */
function extractKpi(text: string): { value: string; label: string } | null {
  if (text.length > 18) return null; // too sentence-like for a metric card
  // Explicit "label : value" with a separator. "|" is reserved for tables.
  const sep = text.split(/\s*[:：\t]\s*|\s{2,}/).filter(Boolean);
  if (sep.length === 2) {
    const [a, b] = sep;
    if (NUM_UNIT.test(a) && !NUM_UNIT.test(b)) return { value: a.trim(), label: b.trim() };
    if (NUM_UNIT.test(b) && !NUM_UNIT.test(a)) return { value: b.trim(), label: a.trim() };
  }
  // "<short label><number+unit>" at the end, e.g. "市場規模5,000億円".
  const m = text.match(new RegExp(`^(.{1,12}?)(${NUM_UNIT.source})$`, "u"));
  if (m && m[1].trim()) return { value: m[2].trim(), label: m[1].trim() };
  return null;
}

/** 2–4 terse metric bullets -> KPI cards. */
function asKpi(s: SlideSpec): SlideSpec | null {
  const bullets = s.bullets ?? [];
  if (bullets.length < 2 || bullets.length > 4) return null;
  const kpis = bullets.map((b) => extractKpi(b.text));
  if (kpis.some((k) => k === null)) return null;
  return {
    ...s,
    layout: "kpi",
    kpis: kpis.map((k, i) => ({ value: k!.value, label: k!.label, icon: bullets[i].icon ?? inferIcon(k!.label) })),
    bullets: undefined,
  };
}

const STEP_PREFIX = /^(?:[①②③④⑤⑥⑦⑧⑨⑩]|\d+[.):、]|STEP\s*\d+|ステップ\s*\d+)\s*/iu;

/** 3–6 short, sequential bullets -> a native process flow. */
function asProcess(s: SlideSpec): SlideSpec | null {
  const bullets = s.bullets ?? [];
  if (bullets.length < 3 || bullets.length > 6) return null;
  const numbered = bullets.every((b) => STEP_PREFIX.test(b.text));
  const cueWords = /(まず|次に|続いて|その後|最後に|ステップ|フェーズ|段階)/u;
  const sequential = numbered || bullets.filter((b) => cueWords.test(b.text)).length >= 2;
  const items = bullets.map((b) => b.text.replace(STEP_PREFIX, "").trim());
  if (!sequential || items.some((it) => it.length > 14 || !it)) return null;
  return { ...s, layout: "diagram", diagram: { type: "process", items }, bullets: undefined };
}

/** Bullets that all carry "|" separators -> a native table. */
function asTable(s: SlideSpec): SlideSpec | null {
  const bullets = s.bullets ?? [];
  if (bullets.length < 2) return null;
  if (!bullets.every((b) => (b.text.match(/\|/g)?.length ?? 0) >= 1)) return null;
  const rows = bullets.map((b) =>
    b.text.replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim()),
  );
  const width = rows[0].length;
  if (width < 2 || rows.some((r) => r.length !== width)) return null;
  return {
    ...s,
    layout: "table",
    table: { headers: rows[0], rows: rows.slice(1) },
    bullets: undefined,
  };
}

/** Keep it as bullets: strip any leftover ordinal (kept only for process
 *  detection, now done) and attach inferred icons where none were set. */
function withIcons(s: SlideSpec): SlideSpec {
  return {
    ...s,
    bullets: s.bullets!.map((b) => {
      const text = b.text.replace(STEP_PREFIX, "").trim() || b.text;
      const icon = b.icon ?? inferIcon(text);
      return { ...b, text, ...(icon ? { icon } : {}) };
    }),
  };
}
