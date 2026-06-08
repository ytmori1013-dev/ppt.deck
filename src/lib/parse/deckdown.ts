import type { SlideSpec } from "../types";

/**
 * deckdown — a tiny, deterministic authoring syntax that turns pasted text
 * (e.g. Claude's story output) into slide specs WITHOUT any LLM call.
 *
 * Syntax (Markdown + a few @directives):
 *   # 資料タイトル                 -> 表紙(title) / 続く "> ..." 行は lead
 *   ## セクション名                -> 章扉(section-divider)
 *   ### 結論メッセージ            -> 本文スライド開始（lead = 結論）
 *   ### キッカー :: 結論メッセージ -> title(キッカー) と lead を分離
 *   - 箇条書き                     -> bullets（"  - " でサブ箇条書き）
 *   @kpi                           -> 次の "- 値 | ラベル" を KPI 化
 *   @chart bar|line|pie            -> "cat: a,b" / "系列: 1,2" / "note: ..."
 *   @cols                          -> "[見出し] - a - b" を2カラム化
 *   @diagram process|matrix|pyramid-> 次の "- 項目" を図解化
 *   @image [url]                   -> 画像スライド（urlは任意。"caption: ..." 可）
 *   @closing                       -> 結びスライド
 *   ---                            -> 明示的なスライド区切り
 */

type Mode = "bullets" | "kpi" | "chart" | "cols" | "diagram" | "image" | "table";

export interface ParsedDeck {
  title?: string;
  slides: SlideSpec[];
}

export function parseDeckdown(input: string): ParsedDeck {
  const lines = input.replace(/\r\n/g, "\n").split("\n");
  const slides: SlideSpec[] = [];
  let deckTitle: string | undefined;
  let section = "";

  let cur: SlideSpec | null = null;
  let mode: Mode = "bullets";

  const flush = () => {
    if (cur) slides.push(cur);
    cur = null;
    mode = "bullets";
  };

  const newContentSlide = (kicker: string, lead: string): SlideSpec => {
    flush();
    cur = { layout: "bullets", title: kicker || section, lead, bullets: [] };
    mode = "bullets";
    return cur;
  };

  for (let raw of lines) {
    const line = raw.replace(/\s+$/u, "");
    const trimmed = line.trim();

    // Slide separator
    if (trimmed === "---") {
      flush();
      continue;
    }
    if (trimmed === "") continue;

    // Headings
    if (/^#\s+/.test(trimmed)) {
      flush();
      const t = trimmed.replace(/^#\s+/, "");
      deckTitle = deckTitle ?? t;
      cur = { layout: "title", title: t, lead: "" };
      mode = "bullets";
      continue;
    }
    if (/^##\s+/.test(trimmed)) {
      flush();
      section = trimmed.replace(/^##\s+/, "");
      cur = { layout: "section-divider", title: section, lead: "" };
      mode = "bullets";
      // section dividers carry no body
      flush();
      continue;
    }
    if (/^###\s+/.test(trimmed)) {
      const body = trimmed.replace(/^###\s+/, "");
      const [a, b] = splitOnce(body, "::");
      if (b !== undefined) newContentSlide(a.trim(), b.trim());
      else newContentSlide("", a.trim());
      continue;
    }

    // Lead for cover / closing via "> ..."
    if (cur && (cur.layout === "title" || cur.layout === "closing") && /^>\s?/.test(trimmed)) {
      cur.lead = trimmed.replace(/^>\s?/, "");
      continue;
    }

    // If no slide open yet, start a plain bullets slide
    if (!cur) newContentSlide("", "");

    const slide = cur!;

    // Directives
    const dir = matchDirective(trimmed);
    if (dir) {
      switch (dir.name) {
        case "kpi":
          slide.layout = "kpi";
          slide.kpis = [];
          mode = "kpi";
          break;
        case "chart":
          slide.layout = "chart";
          slide.chart = { type: chartType(dir.arg), categories: [], series: [] };
          mode = "chart";
          break;
        case "cols":
          slide.layout = "two-column";
          slide.columns = [];
          mode = "cols";
          break;
        case "diagram":
          slide.layout = "diagram";
          slide.diagram = { type: diagramType(dir.arg), items: [] };
          mode = "diagram";
          break;
        case "table":
          slide.layout = "table";
          slide.table = { headers: [], rows: [] };
          mode = "table";
          break;
        case "image":
          slide.layout = "image-full";
          slide.image = { src: dir.arg?.trim() || "" };
          mode = "image";
          break;
        case "closing":
          slide.layout = "closing";
          if (!slide.lead) slide.lead = slide.title;
          mode = "bullets";
          break;
      }
      continue;
    }

    // Body lines, interpreted by current mode
    switch (mode) {
      case "kpi": {
        const m = stripBullet(trimmed);
        if (m) {
          const [value, label, icon] = m.split("|").map((p) => p.trim());
          slide.kpis!.push({
            value: value ?? "",
            label: label ?? "",
            ...(icon ? { icon } : {}),
          });
        }
        break;
      }
      case "table": {
        const cells = parseTableRow(trimmed);
        if (!cells) break; // separator row like |---|---|
        if (slide.table!.headers.length === 0) slide.table!.headers = cells;
        else slide.table!.rows.push(cells);
        break;
      }
      case "chart": {
        if (/^cat\s*:/i.test(trimmed)) {
          slide.chart!.categories = csv(afterColon(trimmed));
        } else if (/^note\s*:/i.test(trimmed)) {
          slide.chart!.note = afterColon(trimmed);
        } else if (trimmed.includes(":")) {
          const [name, vals] = splitOnce(trimmed, ":");
          slide.chart!.series.push({
            name: name.trim(),
            values: csv(vals ?? "").map((v) => Number(v.replace(/[^\d.-]/g, "")) || 0),
          });
        }
        break;
      }
      case "cols": {
        const cm = trimmed.match(/^\[(.+?)\]\s*(.*)$/);
        if (cm) {
          const heading = cm[1];
          const items = cm[2]
            .split(/\s-\s|^-\s/)
            .map((s) => s.trim())
            .filter(Boolean);
          slide.columns!.push({ heading, bullets: items.map((t) => ({ text: t })) });
        }
        break;
      }
      case "diagram": {
        const m = stripBullet(trimmed);
        if (m) slide.diagram!.items.push(m);
        break;
      }
      case "image": {
        if (/^caption\s*:/i.test(trimmed)) {
          slide.image!.caption = afterColon(trimmed);
        } else {
          const url = imageUrl(trimmed);
          if (url) slide.image!.src = url;
        }
        break;
      }
      case "bullets":
      default: {
        const isSub = /^\s{2,}[-*]\s/.test(line) || /^\t+[-*]\s/.test(line);
        const { text, icon } = extractIcon(stripBullet(trimmed));
        if (!text) break;
        slide.bullets = slide.bullets ?? [];
        if (isSub && slide.bullets.length > 0) {
          const last = slide.bullets[slide.bullets.length - 1];
          last.sub = last.sub ?? [];
          last.sub.push(text);
        } else {
          slide.bullets.push({ text, ...(icon ? { icon } : {}) });
        }
        if (!slide.lead) slide.lead = text; // fallback if no ### headline given
      }
    }
  }
  flush();

  return { title: deckTitle, slides: cleanup(slides) };
}

/**
 * Free-text fallback: split arbitrary prose/outline into slides when the user
 * pastes something that isn't deckdown. Heuristic, but tuned for the common
 * "numbered heading + paragraph" shape people paste from ChatGPT/Word, e.g.
 *
 *   #1 エグゼクティブサマリー
 *   合併により…という結論。要点は次の通り。
 *   ・コスト削減 30%
 *   ・統合は18か月で完了
 *
 * Strategy: detect heading lines (markdown #, "1." / "#1" / "15 …" numbered,
 * ■●◆ decorated, 第N章) and start a new slide at each. The heading becomes the
 * kicker (with its ordinal stripped — this is what caused the "15 / 15" double
 * number before); the first body sentence becomes the governing headline; the
 * rest become bullets. When there are no headings at all, fall back to splitting
 * on blank lines so a loose outline still produces one slide per block.
 */
export function splitFreeText(input: string): ParsedDeck {
  const lines = input.replace(/\r\n/g, "\n").split("\n");
  const hasHeadings = lines.some((l) => isHeading(l.trim()));

  type Section = { heading: string; body: string[] };
  const sections: Section[] = [];

  if (hasHeadings) {
    let curSection: Section | null = null;
    for (const raw of lines) {
      const t = raw.trim();
      if (!t) continue;
      if (isHeading(t)) {
        curSection = { heading: t, body: [] };
        sections.push(curSection);
      } else if (curSection) {
        curSection.body.push(t);
      } else {
        // preamble before the first heading -> its own headless section
        curSection = { heading: "", body: [t] };
        sections.push(curSection);
      }
    }
  } else {
    for (const block of input.replace(/\r\n/g, "\n").split(/\n\s*\n/)) {
      const body = block.split("\n").map((l) => l.trim()).filter(Boolean);
      if (body.length) sections.push({ heading: "", body });
    }
  }

  const slides = sections.map((s) => buildFreeSlide(s.heading, s.body));
  return { slides: cleanup(slides) };
}

/** Build one bullets slide from a heading line + its body lines. */
function buildFreeSlide(heading: string, bodyLines: string[]): SlideSpec {
  const kicker = stripHeading(heading);

  // No body: the heading itself is the single message of the slide.
  if (bodyLines.length === 0) {
    return { layout: "bullets", title: "", lead: kicker, bullets: [] };
  }

  const looksBulleted = (l: string) => /^([-*・‣–—●◦▪]|\d+[.)、])\s*/.test(l);
  const strip = (l: string) => l.replace(/^([-*・‣–—●◦▪]|\d+[.)、])\s*/, "").trim();

  let lead: string;
  let bulletTexts: string[];

  if (bodyLines.some(looksBulleted)) {
    // Explicit list: text before the first bullet is the lead; bullets are bullets.
    const firstBullet = bodyLines.findIndex(looksBulleted);
    const leadLines = bodyLines.slice(0, firstBullet).map(strip).filter(Boolean);
    lead = leadLines.join(" ") || kicker;
    bulletTexts = bodyLines.slice(firstBullet).filter(looksBulleted).map(strip);
  } else if (bodyLines.length === 1) {
    // A single prose paragraph: split into sentences so the slide has substance
    // instead of one long run-on line.
    const sents = toSentences(bodyLines[0]);
    lead = sents[0] ?? bodyLines[0];
    bulletTexts = sents.slice(1);
  } else {
    // Several plain lines: first is the message, the rest are points.
    lead = bodyLines[0];
    bulletTexts = bodyLines.slice(1).map(strip);
  }

  const bullets = bulletTexts
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 7)
    .map((text) => ({ text }));

  return { layout: "bullets", title: kicker, lead, bullets };
}

/** Does this line read like a heading / section title? */
function isHeading(t: string): boolean {
  if (!t) return false;
  if (/^#+\s*/.test(t)) return true; // markdown heading (any level)
  if (/^#?\s*\d+(\s*[.)、:：]|\s+)\S/.test(t)) return true; // "#1 X", "1. X", "15 X"
  if (/^[■◆▶【「]\s*\S/.test(t) && t.length <= 40) return true; // decorated short title (not ・●○, which are bullets)
  if (/^第\s*\d+\s*[章節部]/.test(t)) return true; // 第N章
  return false;
}

/** Strip heading markers and a leading ordinal ("#15 次のステップ" -> "次のステップ"). */
function stripHeading(t: string): string {
  return t
    .replace(/^#+\s*/, "") // markdown #
    .replace(/^[■●◆▶▪【「○]\s*/, "") // decoration
    .replace(/[】」]\s*$/, "")
    .replace(/^\d+(\s*[.)、:：]\s*|\s+)/, "") // ordinal: needs a separator so "2025年" survives
    .trim();
}

/** Split Japanese/English prose into sentences (keeps 。! ?), trimming empties. */
function toSentences(text: string): string[] {
  return text
    .split(/(?<=[。！？!?])\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// --- helpers --------------------------------------------------------------

function matchDirective(line: string): { name: string; arg?: string } | null {
  const m = line.match(/^@(\w+)\s*(.*)$/);
  if (!m) return null;
  return { name: m[1].toLowerCase(), arg: m[2] || undefined };
}

function splitOnce(s: string, sep: string): [string, string?] {
  const i = s.indexOf(sep);
  if (i === -1) return [s, undefined];
  return [s.slice(0, i), s.slice(i + sep.length)];
}

function afterColon(s: string): string {
  return s.slice(s.indexOf(":") + 1).trim();
}

function csv(s: string): string[] {
  return s.split(/[,、]/).map((x) => x.trim()).filter(Boolean);
}

function stripBullet(s: string): string {
  return s.replace(/^[-*]\s?/, "").trim();
}

/** Pull a leading "[#icon]" marker off a bullet, if present. */
function extractIcon(s: string): { text: string; icon?: string } {
  const m = s.match(/^\[#([\w-]+)\]\s*/);
  if (m) return { text: s.slice(m[0].length).trim(), icon: m[1] };
  return { text: s };
}

/** Split a "| a | b |" (or "a | b") table row; null for separator rows. */
function parseTableRow(s: string): string[] | null {
  const cells = s
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());
  if (cells.every((c) => /^:?-{2,}:?$/.test(c) || c === "")) return null;
  return cells;
}

function imageUrl(s: string): string | null {
  const md = s.match(/!\[[^\]]*\]\(([^)]+)\)/);
  if (md) return md[1];
  if (/^(https?:|data:)/.test(s)) return s;
  return null;
}

function chartType(arg?: string): "bar" | "line" | "pie" {
  const a = (arg ?? "").toLowerCase();
  return a === "line" || a === "pie" ? a : "bar";
}

function diagramType(arg?: string): "process" | "matrix" | "pyramid" {
  const a = (arg ?? "").toLowerCase();
  return a === "matrix" || a === "pyramid" ? a : "process";
}

/** Drop empty bullets arrays and slides that ended up with no content. */
function cleanup(slides: SlideSpec[]): SlideSpec[] {
  return slides
    .map((s) => {
      if (s.bullets && s.bullets.length === 0) delete s.bullets;
      return s;
    })
    .filter((s) => {
      if (s.layout === "title" || s.layout === "section-divider" || s.layout === "closing") {
        return Boolean(s.title || s.lead);
      }
      return Boolean(
        s.lead ||
          s.bullets?.length ||
          s.kpis?.length ||
          s.chart ||
          s.diagram ||
          s.columns?.length ||
          s.table?.headers.length ||
          s.image,
      );
    });
}
