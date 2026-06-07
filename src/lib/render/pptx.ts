import PptxGenJS from "pptxgenjs";
import { CANVAS, COLORS, FONT_FACE, SIZE } from "../brand";
import type { Deck, SlideSpec } from "../types";

/**
 * Deterministic JSON -> .pptx renderer.
 *
 * Every visual constant comes from brand.ts. The AI never controls colour,
 * font, size, or position — only the text/data inside each fixed layout.
 * That separation is what keeps output at a consistent "consulting" quality.
 */

type Slide = ReturnType<PptxGenJS["addSlide"]>;
type Shadow = NonNullable<PptxGenJS.ShapeProps["shadow"]>;

const CONTENT_W = CANVAS.w - CANVAS.marginX * 2;

// Soft drop shadow shared by cards / process boxes for a little depth.
const CARD_SHADOW: Shadow = {
  type: "outer",
  color: COLORS.navy,
  opacity: 0.16,
  blur: 5,
  offset: 2,
  angle: 90,
};

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
    fill: { color: COLORS.accent },
  });

  // Kicker label
  slide.addText(spec.title.toUpperCase(), {
    x: CANVAS.marginX + 0.3,
    y: CANVAS.marginTop,
    w: CONTENT_W - 0.3,
    h: 0.28,
    fontFace: FONT_FACE,
    fontSize: SIZE.kicker,
    bold: true,
    color: COLORS.accent,
    charSpacing: 2.5,
    align: "left",
    valign: "middle",
  });

  // Governing headline (the message)
  slide.addText(spec.lead, {
    x: CANVAS.marginX,
    y: CANVAS.marginTop + 0.34,
    w: CONTENT_W,
    h: 0.72,
    fontFace: FONT_FACE,
    fontSize: SIZE.headline,
    bold: true,
    color: COLORS.navy,
    align: "left",
    valign: "top",
    lineSpacingMultiple: 1.04,
  });

  // Two-tone rule under the headline: a short gold segment over a full hairline.
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
    w: 1.3,
    h: 0,
    line: { color: COLORS.accent, width: 2.5 },
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
    color: COLORS.midGray,
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
    color: COLORS.navy,
    align: "right",
  });
}

type BulletItem = { text: string; sub?: string[] };

function bulletRuns(bullets: BulletItem[]) {
  const runs: PptxGenJS.TextProps[] = [];
  for (const b of bullets) {
    runs.push({
      text: b.text,
      options: {
        // Square gold-tinted marker reads cleaner than a default round dot.
        bullet: { code: "25AA", indent: 20 },
        fontSize: SIZE.body,
        color: COLORS.navy,
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
          color: COLORS.textGray,
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
  slide.background = { color: COLORS.navy };
  // Full-height accent spine.
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 0.22,
    h: CANVAS.h,
    fill: { color: COLORS.accent },
  });
  // Faint oversized rule near the top for structure.
  slide.addShape(pptx.ShapeType.line, {
    x: CANVAS.marginX,
    y: 2.35,
    w: 1.5,
    h: 0,
    line: { color: COLORS.accent, width: 2.5 },
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
      color: COLORS.lightGray,
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
    color: COLORS.midGray,
    charSpacing: 1.5,
  });
}

function renderSectionDivider(pptx: PptxGenJS, slide: Slide, spec: SlideSpec) {
  slide.background = { color: COLORS.navy };
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
    line: { color: COLORS.accent, width: 2.5 },
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
    // Navy header bar with an accent left tab.
    slide.addShape(pptx.ShapeType.rect, {
      x,
      y: top,
      w: colW,
      h: headH,
      fill: { color: COLORS.navy },
    });
    slide.addShape(pptx.ShapeType.rect, {
      x,
      y: top,
      w: 0.1,
      h: headH,
      fill: { color: COLORS.accent },
    });
    slide.addText(col.heading, {
      x: x + 0.25,
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

function renderChart(pptx: PptxGenJS, slide: Slide, spec: SlideSpec, top: number) {
  const chart = spec.chart;
  if (!chart) return renderBullets(pptx, slide, spec, top);

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
    chartColors: [COLORS.navy, COLORS.accent, COLORS.navyLight, COLORS.midGray],
    showLegend: chart.series.length > 1 || isPie,
    legendPos: "b",
    legendFontFace: FONT_FACE,
    legendFontSize: SIZE.small,
    // Value labels make the chart self-explanatory without a data table.
    showValue: !isPie,
    showPercent: isPie,
    dataLabelFontFace: FONT_FACE,
    dataLabelFontSize: SIZE.small,
    dataLabelColor: isPie ? COLORS.white : COLORS.navy,
    dataLabelPosition: chart.type === "bar" ? "outEnd" : undefined,
    // Axes: keep the category axis, mute the value axis + gridlines.
    catAxisLabelFontFace: FONT_FACE,
    catAxisLabelFontSize: SIZE.small,
    catAxisLabelColor: COLORS.textGray,
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
      color: COLORS.midGray,
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
    // White card with hairline border + soft shadow.
    slide.addShape(pptx.ShapeType.rect, {
      x,
      y,
      w: cardW,
      h: cardH,
      fill: { color: COLORS.white },
      line: { color: COLORS.border, width: 1 },
      shadow: CARD_SHADOW,
    });
    // Accent bar across the top edge.
    slide.addShape(pptx.ShapeType.rect, {
      x,
      y,
      w: cardW,
      h: 0.1,
      fill: { color: COLORS.accent },
    });
    // Big metric value.
    slide.addText(k.value, {
      x: x + 0.12,
      y: y + 0.45,
      w: cardW - 0.24,
      h: 1.0,
      fontFace: FONT_FACE,
      fontSize: SIZE.kpiValue,
      bold: true,
      color: COLORS.navy,
      align: "center",
      valign: "middle",
      shrinkText: true,
    });
    // Short accent divider between value and label.
    slide.addShape(pptx.ShapeType.line, {
      x: x + cardW / 2 - 0.3,
      y: y + 1.6,
      w: 0.6,
      h: 0,
      line: { color: COLORS.accent, width: 1.5 },
    });
    // Label.
    slide.addText(k.label, {
      x: x + 0.18,
      y: y + 1.75,
      w: cardW - 0.36,
      h: 0.65,
      fontFace: FONT_FACE,
      fontSize: SIZE.body - 1,
      color: COLORS.textGray,
      align: "center",
      valign: "top",
      lineSpacingMultiple: 1.05,
    });
  });
}

function renderDiagram(pptx: PptxGenJS, slide: Slide, spec: SlideSpec, top: number) {
  const dg = spec.diagram;
  if (!dg) return renderBullets(pptx, slide, spec, top);
  const items = dg.items;

  if (dg.type === "process") {
    const n = Math.min(items.length, 5);
    const gap = 0.34;
    const boxW = (CONTENT_W - gap * (n - 1)) / n;
    const y = top + 0.9;
    const h = 1.5;
    items.slice(0, n).forEach((it, i) => {
      const x = CANVAS.marginX + i * (boxW + gap);
      slide.addShape(pptx.ShapeType.roundRect, {
        x,
        y,
        w: boxW,
        h,
        rectRadius: 0.1,
        fill: { color: i % 2 === 0 ? COLORS.navy : COLORS.navyLight },
        line: { color: COLORS.navy, width: 0 },
        shadow: CARD_SHADOW,
      });
      // Step number chip.
      slide.addText(String(i + 1), {
        x: x + 0.12,
        y: y + 0.12,
        w: 0.5,
        h: 0.32,
        fontFace: FONT_FACE,
        fontSize: SIZE.small,
        bold: true,
        color: COLORS.accent,
        align: "left",
        valign: "middle",
      });
      slide.addText(it, {
        x: x + 0.12,
        y,
        w: boxW - 0.24,
        h,
        fontFace: FONT_FACE,
        fontSize: SIZE.body,
        bold: true,
        color: COLORS.white,
        align: "center",
        valign: "middle",
      });
      if (i < n - 1) {
        slide.addText("›", {
          x: x + boxW,
          y,
          w: gap,
          h,
          fontFace: FONT_FACE,
          fontSize: 22,
          bold: true,
          color: COLORS.accent,
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
        fill: { color: i === 0 ? COLORS.accent : COLORS.navy },
        flipV: true,
        shadow: CARD_SHADOW,
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
      fill: { color: dark ? COLORS.navy : COLORS.lightGray },
      line: { color: dark ? COLORS.navy : COLORS.border, width: 1 },
      shadow: CARD_SHADOW,
    });
    slide.addText(cells[i] ?? "", {
      x: x + 0.2,
      y: y + 0.15,
      w: cellW - 0.4,
      h: cellH - 0.3,
      fontFace: FONT_FACE,
      fontSize: SIZE.body,
      bold: true,
      color: dark ? COLORS.white : COLORS.navy,
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
      color: COLORS.midGray,
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

function renderClosing(pptx: PptxGenJS, slide: Slide, spec: SlideSpec) {
  slide.background = { color: COLORS.navy };
  slide.addShape(pptx.ShapeType.line, {
    x: CANVAS.w / 2 - 0.7,
    y: 2.45,
    w: 1.4,
    h: 0,
    line: { color: COLORS.accent, width: 2.5 },
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
  }

  // Content layouts share the header/footer frame.
  const top = addContentFrame(pptx, slide, spec, pageNo);
  switch (spec.layout) {
    case "two-column":
      return renderTwoColumn(pptx, slide, spec, top);
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
