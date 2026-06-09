import PptxGenJS from "pptxgenjs";
import { CANVAS, COLORS, FONT_FACE, SIZE } from "../brand";
import { iconGlyph } from "../icons";
import type { Deck, SlideSpec } from "../types";

/**
 * Deterministic JSON -> .pptx renderer.
 *
 * Every visual constant comes from brand.ts. The AI never controls colour,
 * font, size, or position — only the text/data inside each fixed layout.
 *
 * Per the fixed design standard the look is strictly FLAT: brand blue +
 * hairline rules on white, no shadows / gradients / 3D.
 */

type Slide = ReturnType<PptxGenJS["addSlide"]>;

const CONTENT_W = CANVAS.w - CANVAS.marginX * 2;

/** 4-digit hex code point for a glyph, for use as a custom bullet character. */
function glyphHex(g: string): string {
  return (g.codePointAt(0) ?? 0x25aa)
    .toString(16)
    .toUpperCase()
    .padStart(4, "0");
}

/** Shared header (kicker label + governing headline + accent rule) + footer.
 *  Returns the Y coordinate (inches) where the slide body may start. */
function addContentFrame(
  pptx: PptxGenJS,
  slide: Slide,
  spec: SlideSpec,
  pageNo: number,
): number {
  slide.background = { color: COLORS.white };

  // Short accent tab that anchors the kicker label.
  slide.addShape(pptx.ShapeType.rect, {
    x: CANVAS.marginX,
    y: CANVAS.marginTop + 0.02,
    w: 0.16,
    h: 0.2,
    fill: { color: COLORS.primary },
  });

  // Kicker label. Uppercasing only helps short ASCII labels; for Japanese it
  // does nothing useful, and wide letter-spacing on CJK looks broken, so we
  // tune both to the script.
  const kicker = spec.title.trim();
  const isAscii = /^[\x00-\x7F]*$/.test(kicker);
  slide.addText(isAscii ? kicker.toUpperCase() : kicker, {
    x: CANVAS.marginX + 0.3,
    y: CANVAS.marginTop,
    w: CONTENT_W - 0.3,
    h: 0.28,
    fontFace: FONT_FACE,
    fontSize: SIZE.kicker,
    bold: true,
    color: COLORS.primary,
    charSpacing: isAscii ? 2.5 : 0.5,
    align: "left",
    valign: "middle",
    shrinkText: true,
  });

  // Governing headline (the message). shrinkText keeps a long lead inside the
  // header band instead of overflowing onto the body.
  slide.addText(spec.lead, {
    x: CANVAS.marginX,
    y: CANVAS.marginTop + 0.34,
    w: CONTENT_W,
    h: 0.72,
    fontFace: FONT_FACE,
    fontSize: SIZE.headline,
    bold: true,
    color: COLORS.primaryDark,
    align: "left",
    valign: "top",
    lineSpacingMultiple: 1.04,
    shrinkText: true,
  });

  // Rule under the headline: a short blue segment over a full hairline.
  const ruleY = CANVAS.marginTop + 1.16;
  slide.addShape(pptx.ShapeType.line, {
    x: CANVAS.marginX,
    y: ruleY,
    w: CONTENT_W,
    h: 0,
    line: { color: COLORS.border, width: 1 },
  });
  slide.addShape(pptx.ShapeType.line, {
    x: CANVAS.marginX,
    y: ruleY,
    w: 1.4,
    h: 0,
    line: { color: COLORS.primary, width: 2.5 },
  });

  addFooter(pptx, slide, pageNo);
  return ruleY + 0.32;
}

function addFooter(pptx: PptxGenJS, slide: Slide, pageNo: number) {
  // Hairline above the footer band.
  slide.addShape(pptx.ShapeType.line, {
    x: CANVAS.marginX,
    y: CANVAS.h - 0.46,
    w: CONTENT_W,
    h: 0,
    line: { color: COLORS.border, width: 0.75 },
  });
  slide.addText("Consult Deck AI", {
    x: CANVAS.marginX,
    y: CANVAS.h - 0.4,
    w: 4,
    h: 0.3,
    fontFace: FONT_FACE,
    fontSize: SIZE.small,
    color: COLORS.gray,
    align: "left",
    charSpacing: 0.5,
  });
  slide.addText(String(pageNo), {
    x: CANVAS.w - CANVAS.marginX - 1,
    y: CANVAS.h - 0.4,
    w: 1,
    h: 0.3,
    fontFace: FONT_FACE,
    fontSize: SIZE.small,
    bold: true,
    color: COLORS.primary,
    align: "right",
  });
}

type BulletItem = { text: string; sub?: string[]; icon?: string };

function bulletRuns(bullets: BulletItem[]) {
  const runs: PptxGenJS.TextProps[] = [];
  for (const b of bullets) {
    const glyph = iconGlyph(b.icon);
    runs.push({
      text: b.text,
      options: {
        // Icon glyph (if any) replaces the default square marker.
        bullet: { code: glyph ? glyphHex(glyph) : "25AA", indent: 20 },
        fontSize: SIZE.body,
        color: COLORS.text,
        paraSpaceAfter: 11,
        lineSpacingMultiple: 1.12,
      },
    });
    for (const s of b.sub ?? []) {
      runs.push({
        text: s,
        options: {
          bullet: { code: "2013", indent: 18 }, // en dash for sub-points
          indentLevel: 1,
          fontSize: SIZE.body - 1.5,
          color: COLORS.gray,
          paraSpaceAfter: 5,
          lineSpacingMultiple: 1.1,
        },
      });
    }
  }
  return runs;
}

// --- Layout renderers ------------------------------------------------------

function renderTitle(pptx: PptxGenJS, slide: Slide, spec: SlideSpec) {
  slide.background = { color: COLORS.primaryDark };
  // Full-height accent spine.
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 0.22,
    h: CANVAS.h,
    fill: { color: COLORS.primary },
  });
  slide.addShape(pptx.ShapeType.line, {
    x: CANVAS.marginX,
    y: 2.35,
    w: 1.5,
    h: 0,
    line: { color: COLORS.primary, width: 2.5 },
  });
  slide.addText(spec.title, {
    x: CANVAS.marginX,
    y: 2.6,
    w: CONTENT_W,
    h: 1.8,
    fontFace: FONT_FACE,
    fontSize: SIZE.coverTitle,
    bold: true,
    color: COLORS.white,
    align: "left",
    valign: "top",
    lineSpacingMultiple: 1.08,
  });
  if (spec.lead) {
    slide.addText(spec.lead, {
      x: CANVAS.marginX,
      y: 4.55,
      w: CONTENT_W,
      h: 0.9,
      fontFace: FONT_FACE,
      fontSize: SIZE.lead,
      color: COLORS.paleBlue,
      align: "left",
      lineSpacingMultiple: 1.2,
    });
  }
  slide.addText("Consult Deck AI", {
    x: CANVAS.marginX,
    y: CANVAS.h - 0.65,
    w: 5,
    h: 0.3,
    fontFace: FONT_FACE,
    fontSize: SIZE.small,
    color: COLORS.paleBlue,
    charSpacing: 1.5,
  });
}

function renderSectionDivider(pptx: PptxGenJS, slide: Slide, spec: SlideSpec) {
  slide.background = { color: COLORS.primaryDark };
  // Subtle band to lift the title off the flat background.
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 2.7,
    w: CANVAS.w,
    h: 2.1,
    fill: { color: COLORS.navyLight },
  });
  slide.addText(spec.title, {
    x: CANVAS.marginX,
    y: 3.0,
    w: CONTENT_W,
    h: 1.0,
    fontFace: FONT_FACE,
    fontSize: SIZE.sectionTitle,
    bold: true,
    color: COLORS.white,
    align: "center",
  });
  slide.addShape(pptx.ShapeType.line, {
    x: CANVAS.w / 2 - 0.7,
    y: 4.15,
    w: 1.4,
    h: 0,
    line: { color: COLORS.primary, width: 2.5 },
  });
}

function renderBullets(pptx: PptxGenJS, slide: Slide, spec: SlideSpec, top: number) {
  const bullets = spec.bullets ?? [];
  slide.addText(bulletRuns(bullets), {
    x: CANVAS.marginX,
    y: top,
    w: CONTENT_W,
    h: CANVAS.h - top - 0.6,
    fontFace: FONT_FACE,
    valign: "top",
  });
}

function renderTwoColumn(pptx: PptxGenJS, slide: Slide, spec: SlideSpec, top: number) {
  const cols = spec.columns ?? [];
  const gap = 0.5;
  const colW = (CONTENT_W - gap) / 2;
  const headH = 0.5;
  cols.slice(0, 2).forEach((col, i) => {
    const x = CANVAS.marginX + i * (colW + gap);
    // Blue header bar.
    slide.addShape(pptx.ShapeType.rect, {
      x,
      y: top,
      w: colW,
      h: headH,
      fill: { color: COLORS.primary },
    });
    slide.addText(col.heading, {
      x: x + 0.22,
      y: top,
      w: colW - 0.4,
      h: headH,
      fontFace: FONT_FACE,
      fontSize: SIZE.body + 1,
      bold: true,
      color: COLORS.white,
      valign: "middle",
    });
    // Light panel behind the bullets to bind the column together.
    slide.addShape(pptx.ShapeType.rect, {
      x,
      y: top + headH,
      w: colW,
      h: CANVAS.h - top - headH - 0.7,
      fill: { color: COLORS.lightGray },
      line: { color: COLORS.border, width: 0.75 },
    });
    slide.addText(bulletRuns(col.bullets), {
      x: x + 0.18,
      y: top + headH + 0.18,
      w: colW - 0.36,
      h: CANVAS.h - top - headH - 1.05,
      fontFace: FONT_FACE,
      valign: "top",
    });
  });
}

function renderTable(pptx: PptxGenJS, slide: Slide, spec: SlideSpec, top: number) {
  const table = spec.table;
  if (!table || table.headers.length === 0) return renderBullets(pptx, slide, spec, top);

  // Cap rows so they stay legible instead of compressing to a hairline; surface
  // the remainder as a final "ほか N 件" row rather than silently dropping them.
  const MAX_ROWS = 9;
  let dataRows = table.rows;
  let overflow = 0;
  if (dataRows.length > MAX_ROWS) {
    overflow = dataRows.length - (MAX_ROWS - 1);
    dataRows = dataRows.slice(0, MAX_ROWS - 1);
  }

  const bodyH = CANVAS.h - top - 0.7;
  const rowCount = dataRows.length + 1 + (overflow ? 1 : 0);
  const rowH = Math.min(0.7, Math.max(0.4, bodyH / rowCount));

  const header: PptxGenJS.TableRow = table.headers.map((h) => ({
    text: h,
    options: {
      fill: { color: COLORS.primary },
      color: COLORS.white,
      bold: true,
      align: "center" as const,
      valign: "middle" as const,
    },
  }));

  const rows: PptxGenJS.TableRow[] = dataRows.map((r, ri) =>
    table.headers.map((_, ci) => ({
      text: r[ci] ?? "", // normalises ragged rows to the header width
      options: {
        fill: { color: ri % 2 === 0 ? COLORS.white : COLORS.lightGray },
        color: COLORS.text,
        // First column slightly emphasised (row label).
        bold: ci === 0,
        align: (ci === 0 ? "left" : "center") as "left" | "center",
        valign: "middle" as const,
      },
    })),
  );
  if (overflow) {
    rows.push(
      table.headers.map((_, ci) => ({
        text: ci === 0 ? `ほか ${overflow} 件` : "",
        options: { fill: { color: COLORS.lightGray }, color: COLORS.gray, italic: true, valign: "middle" as const },
      })),
    );
  }

  slide.addTable([header, ...rows], {
    x: CANVAS.marginX,
    y: top,
    w: CONTENT_W,
    rowH,
    fontFace: FONT_FACE,
    fontSize: rowCount > 8 ? SIZE.small : SIZE.body - 0.5,
    border: { type: "solid", color: COLORS.border, pt: 1 },
    valign: "middle",
    autoPage: false,
  });
}

function renderChart(pptx: PptxGenJS, slide: Slide, spec: SlideSpec, top: number) {
  const chart = spec.chart;
  // Empty/degenerate data would make PptxGenJS emit a broken chart — fall back.
  if (!chart || chart.series.length === 0 || chart.categories.length === 0) {
    return renderBullets(pptx, slide, spec, top);
  }

  const data = chart.series.map((s) => ({
    name: s.name,
    labels: chart.categories,
    values: s.values,
  }));
  const typeMap = {
    bar: pptx.ChartType.bar,
    line: pptx.ChartType.line,
    pie: pptx.ChartType.pie,
  } as const;

  const isPie = chart.type === "pie";
  slide.addChart(typeMap[chart.type], data, {
    x: CANVAS.marginX,
    y: top,
    w: CONTENT_W,
    h: CANVAS.h - top - (chart.note ? 0.9 : 0.6),
    chartColors: [COLORS.primary, COLORS.navyLight, COLORS.gray, COLORS.red],
    showLegend: chart.series.length > 1 || isPie,
    legendPos: "b",
    legendFontFace: FONT_FACE,
    legendFontSize: SIZE.small,
    // Value labels make the chart self-explanatory without a data table.
    showValue: !isPie,
    showPercent: isPie,
    dataLabelFontFace: FONT_FACE,
    dataLabelFontSize: SIZE.small,
    dataLabelColor: isPie ? COLORS.white : COLORS.text,
    dataLabelPosition: chart.type === "bar" ? "outEnd" : undefined,
    catAxisLabelFontFace: FONT_FACE,
    catAxisLabelFontSize: SIZE.small,
    catAxisLabelColor: COLORS.text,
    catAxisLineColor: COLORS.border,
    valAxisHidden: !isPie,
    valGridLine: { style: "none" },
    barGapWidthPct: 45,
  });

  if (chart.note) {
    slide.addText(`※ ${chart.note}`, {
      x: CANVAS.marginX,
      y: CANVAS.h - 0.78,
      w: CONTENT_W,
      h: 0.3,
      fontFace: FONT_FACE,
      fontSize: SIZE.small,
      italic: true,
      color: COLORS.gray,
      shrinkText: true,
    });
  }
}

function renderKpi(pptx: PptxGenJS, slide: Slide, spec: SlideSpec, top: number) {
  const kpis = (spec.kpis ?? []).slice(0, 4);
  if (kpis.length === 0) return renderBullets(pptx, slide, spec, top);
  const gap = 0.4;
  const cardW = (CONTENT_W - gap * (kpis.length - 1)) / kpis.length;
  const cardH = 2.5;
  const y = top + 0.55;
  kpis.forEach((k, i) => {
    const x = CANVAS.marginX + i * (cardW + gap);
    const glyph = iconGlyph(k.icon);
    // Flat pale-blue card with a hairline border (no shadow).
    slide.addShape(pptx.ShapeType.rect, {
      x,
      y,
      w: cardW,
      h: cardH,
      fill: { color: COLORS.paleBlue },
      line: { color: COLORS.border, width: 1 },
    });
    // Optional icon glyph at the top.
    if (glyph) {
      slide.addText(glyph, {
        x: x + 0.12,
        y: y + 0.22,
        w: cardW - 0.24,
        h: 0.4,
        fontFace: FONT_FACE,
        fontSize: 18,
        color: COLORS.primary,
        align: "center",
        valign: "middle",
      });
    }
    // Big metric value.
    slide.addText(k.value, {
      x: x + 0.12,
      y: y + (glyph ? 0.62 : 0.42),
      w: cardW - 0.24,
      h: 1.0,
      fontFace: FONT_FACE,
      fontSize: SIZE.kpiValue,
      bold: true,
      color: COLORS.primaryDark,
      align: "center",
      valign: "middle",
      shrinkText: true,
    });
    // Label.
    slide.addText(k.label, {
      x: x + 0.18,
      y: y + 1.7,
      w: cardW - 0.36,
      h: 0.5,
      fontFace: FONT_FACE,
      fontSize: SIZE.body - 1,
      bold: true,
      color: COLORS.text,
      align: "center",
      valign: "top",
      lineSpacingMultiple: 1.05,
      shrinkText: true,
    });
    // Optional caption.
    if (k.caption) {
      slide.addText(k.caption, {
        x: x + 0.18,
        y: y + cardH - 0.5,
        w: cardW - 0.36,
        h: 0.4,
        fontFace: FONT_FACE,
        fontSize: SIZE.small,
        color: COLORS.gray,
        align: "center",
        valign: "bottom",
      });
    }
  });
}

function renderDiagram(pptx: PptxGenJS, slide: Slide, spec: SlideSpec, top: number) {
  const dg = spec.diagram;
  if (!dg || dg.items.length === 0) return renderBullets(pptx, slide, spec, top);
  const items = dg.items;

  if (dg.type === "process") {
    // Numbered blue circles + label below, joined by arrows (workflow style).
    const n = Math.min(items.length, 6);
    const gap = 0.24;
    const colW = (CONTENT_W - gap * (n - 1)) / n;
    const cy = top + 1.0;
    const dia = Math.min(1.0, colW * 0.7);
    items.slice(0, n).forEach((it, i) => {
      const x = CANVAS.marginX + i * (colW + gap);
      const cx = x + colW / 2;
      slide.addShape(pptx.ShapeType.ellipse, {
        x: cx - dia / 2,
        y: cy,
        w: dia,
        h: dia,
        fill: { color: COLORS.primary },
      });
      slide.addText(String(i + 1), {
        x: cx - dia / 2,
        y: cy,
        w: dia,
        h: dia,
        fontFace: FONT_FACE,
        fontSize: 20,
        bold: true,
        color: COLORS.white,
        align: "center",
        valign: "middle",
      });
      slide.addText(it, {
        x,
        y: cy + dia + 0.12,
        w: colW,
        h: 0.9,
        fontFace: FONT_FACE,
        fontSize: SIZE.body,
        bold: true,
        color: COLORS.text,
        align: "center",
        valign: "top",
        lineSpacingMultiple: 1.05,
        shrinkText: true,
      });
      if (i < n - 1) {
        slide.addText("›", {
          x: x + colW,
          y: cy,
          w: gap,
          h: dia,
          fontFace: FONT_FACE,
          fontSize: 20,
          bold: true,
          color: COLORS.primary,
          align: "center",
          valign: "middle",
        });
      }
    });
    return;
  }

  if (dg.type === "pyramid") {
    const n = Math.min(items.length, 4);
    const y0 = top + 0.5;
    const rowH = 0.95;
    const maxW = CONTENT_W * 0.8;
    items.slice(0, n).forEach((it, i) => {
      const w = maxW * ((i + 1) / n);
      const x = CANVAS.w / 2 - w / 2;
      slide.addShape(pptx.ShapeType.trapezoid, {
        x,
        y: y0 + i * rowH,
        w,
        h: rowH - 0.12,
        fill: { color: i === 0 ? COLORS.primary : COLORS.navyLight },
        flipV: true,
      });
      slide.addText(it, {
        x,
        y: y0 + i * rowH,
        w,
        h: rowH - 0.12,
        fontFace: FONT_FACE,
        fontSize: SIZE.body,
        bold: true,
        color: COLORS.white,
        align: "center",
        valign: "middle",
      });
    });
    return;
  }

  // matrix (2x2)
  const cells = items.slice(0, 4);
  const gap = 0.3;
  const cellW = (CONTENT_W - gap) / 2;
  const cellH = (CANVAS.h - top - 0.9) / 2;
  const y0 = top + 0.4;
  for (let i = 0; i < 4; i++) {
    const r = Math.floor(i / 2);
    const c = i % 2;
    const x = CANVAS.marginX + c * (cellW + gap);
    const y = y0 + r * (cellH + gap);
    const dark = i % 3 === 0;
    slide.addShape(pptx.ShapeType.rect, {
      x,
      y,
      w: cellW,
      h: cellH,
      fill: { color: dark ? COLORS.primary : COLORS.lightGray },
      line: { color: dark ? COLORS.primary : COLORS.border, width: 1 },
    });
    slide.addText(cells[i] ?? "", {
      x: x + 0.2,
      y: y + 0.15,
      w: cellW - 0.4,
      h: cellH - 0.3,
      fontFace: FONT_FACE,
      fontSize: SIZE.body,
      bold: true,
      color: dark ? COLORS.white : COLORS.text,
      align: "center",
      valign: "middle",
      lineSpacingMultiple: 1.1,
    });
  }
}

function renderImageFull(pptx: PptxGenJS, slide: Slide, spec: SlideSpec, top: number) {
  const img = spec.image;
  if (!img?.src) return renderBullets(pptx, slide, spec, top);
  const capH = img.caption ? 0.4 : 0;
  slide.addImage({
    data: img.src,
    x: CANVAS.marginX,
    y: top,
    w: CONTENT_W,
    h: CANVAS.h - top - 0.55 - capH,
    sizing: { type: "contain", w: CONTENT_W, h: CANVAS.h - top - 0.55 - capH },
  });
  if (img.caption) {
    slide.addText(img.caption, {
      x: CANVAS.marginX,
      y: CANVAS.h - 0.85,
      w: CONTENT_W,
      h: 0.35,
      fontFace: FONT_FACE,
      fontSize: SIZE.small,
      italic: true,
      color: COLORS.gray,
      align: "center",
    });
  }
}

function renderImageRight(pptx: PptxGenJS, slide: Slide, spec: SlideSpec, top: number) {
  const img = spec.image;
  if (!img?.src) return renderBullets(pptx, slide, spec, top);
  const gap = 0.5;
  const colW = (CONTENT_W - gap) / 2;
  const h = CANVAS.h - top - 0.6;
  // Text on the left
  slide.addText(bulletRuns(spec.bullets ?? []), {
    x: CANVAS.marginX,
    y: top,
    w: colW,
    h,
    fontFace: FONT_FACE,
    valign: "top",
  });
  // Subtle frame behind the image on the right.
  slide.addShape(pptx.ShapeType.rect, {
    x: CANVAS.marginX + colW + gap,
    y: top,
    w: colW,
    h,
    fill: { color: COLORS.lightGray },
    line: { color: COLORS.border, width: 0.75 },
  });
  slide.addImage({
    data: img.src,
    x: CANVAS.marginX + colW + gap + 0.1,
    y: top + 0.1,
    w: colW - 0.2,
    h: h - 0.2,
    sizing: { type: "contain", w: colW - 0.2, h: h - 0.2 },
  });
}

/** Full-bleed image: the whole slide IS the image (no header/footer). Used for
 *  GPT-made reference slides where the picture already is a finished slide. */
function renderImageCover(pptx: PptxGenJS, slide: Slide, spec: SlideSpec, pageNo: number) {
  const img = spec.image;
  if (!img?.src) {
    // No image yet — fall back to a normal framed slide so nothing renders blank.
    const top = addContentFrame(pptx, slide, spec, pageNo);
    return renderBullets(pptx, slide, spec, top);
  }
  // White backdrop so a non-16:9 image is letterboxed cleanly rather than
  // stretched. Edge-to-edge, no margins.
  slide.background = { color: COLORS.white };
  slide.addImage({
    data: img.src,
    x: 0,
    y: 0,
    w: CANVAS.w,
    h: CANVAS.h,
    sizing: { type: "contain", w: CANVAS.w, h: CANVAS.h },
  });
}

function renderClosing(pptx: PptxGenJS, slide: Slide, spec: SlideSpec) {
  slide.background = { color: COLORS.primaryDark };
  slide.addShape(pptx.ShapeType.line, {
    x: CANVAS.w / 2 - 0.7,
    y: 2.45,
    w: 1.4,
    h: 0,
    line: { color: COLORS.primary, width: 2.5 },
  });
  slide.addText(spec.lead || spec.title, {
    x: CANVAS.marginX,
    y: 2.8,
    w: CONTENT_W,
    h: 1.8,
    fontFace: FONT_FACE,
    fontSize: SIZE.sectionTitle - 2,
    bold: true,
    color: COLORS.white,
    align: "center",
    valign: "middle",
    lineSpacingMultiple: 1.2,
  });
}

/** Render one slide spec onto a fresh slide. */
function renderSlide(pptx: PptxGenJS, spec: SlideSpec, pageNo: number) {
  const slide = pptx.addSlide();

  switch (spec.layout) {
    case "title":
      return renderTitle(pptx, slide, spec);
    case "section-divider":
      return renderSectionDivider(pptx, slide, spec);
    case "closing":
      return renderClosing(pptx, slide, spec);
    case "image-cover":
      return renderImageCover(pptx, slide, spec, pageNo);
  }

  // Content layouts share the header/footer frame.
  const top = addContentFrame(pptx, slide, spec, pageNo);
  switch (spec.layout) {
    case "two-column":
      return renderTwoColumn(pptx, slide, spec, top);
    case "table":
      return renderTable(pptx, slide, spec, top);
    case "chart":
      return renderChart(pptx, slide, spec, top);
    case "kpi":
      return renderKpi(pptx, slide, spec, top);
    case "diagram":
      return renderDiagram(pptx, slide, spec, top);
    case "image-full":
      return renderImageFull(pptx, slide, spec, top);
    case "image-right":
      return renderImageRight(pptx, slide, spec, top);
    case "bullets":
    default:
      return renderBullets(pptx, slide, spec, top);
  }
}

/** Build a .pptx Buffer from a Deck. */
export async function renderDeckToPptx(deck: Deck): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "Consult Deck AI";
  pptx.title = deck.brief?.title ?? "Consult Deck";

  deck.slides.forEach((spec, i) => renderSlide(pptx, spec, i + 1));

  const out = (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
  return out;
}
