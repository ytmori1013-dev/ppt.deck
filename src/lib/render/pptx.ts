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

const CONTENT_W = CANVAS.w - CANVAS.marginX * 2;

/** Shared header (kicker label + governing headline + accent rule) + footer.
 *  Returns the Y coordinate (inches) where the slide body may start. */
function addContentFrame(
  pptx: PptxGenJS,
  slide: Slide,
  spec: SlideSpec,
  pageNo: number,
): number {
  slide.background = { color: COLORS.white };

  // Kicker label
  slide.addText(spec.title.toUpperCase(), {
    x: CANVAS.marginX,
    y: CANVAS.marginTop,
    w: CONTENT_W,
    h: 0.3,
    fontFace: FONT_FACE,
    fontSize: 11,
    bold: true,
    color: COLORS.accent,
    charSpacing: 2,
    align: "left",
  });

  // Governing headline (the message)
  slide.addText(spec.lead, {
    x: CANVAS.marginX,
    y: CANVAS.marginTop + 0.32,
    w: CONTENT_W,
    h: 0.7,
    fontFace: FONT_FACE,
    fontSize: 18,
    bold: true,
    color: COLORS.navy,
    align: "left",
    valign: "top",
  });

  // Accent rule under the headline
  slide.addShape(pptx.ShapeType.line, {
    x: CANVAS.marginX,
    y: CANVAS.marginTop + 1.05,
    w: CONTENT_W,
    h: 0,
    line: { color: COLORS.lightGray, width: 1.5 },
  });

  addFooter(slide, pageNo);
  return CANVAS.marginTop + 1.3;
}

function addFooter(slide: Slide, pageNo: number) {
  slide.addText("Consult Deck AI", {
    x: CANVAS.marginX,
    y: CANVAS.h - 0.4,
    w: 4,
    h: 0.3,
    fontFace: FONT_FACE,
    fontSize: SIZE.small,
    color: COLORS.midGray,
    align: "left",
  });
  slide.addText(String(pageNo), {
    x: CANVAS.w - CANVAS.marginX - 1,
    y: CANVAS.h - 0.4,
    w: 1,
    h: 0.3,
    fontFace: FONT_FACE,
    fontSize: SIZE.small,
    color: COLORS.midGray,
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
        bullet: { indent: 16 },
        fontSize: SIZE.body,
        color: COLORS.navy,
        paraSpaceAfter: 6,
      },
    });
    for (const s of b.sub ?? []) {
      runs.push({
        text: s,
        options: {
          bullet: { indent: 16 },
          indentLevel: 1,
          fontSize: SIZE.body - 1,
          color: COLORS.midGray,
          paraSpaceAfter: 3,
        },
      });
    }
  }
  return runs;
}

// --- Layout renderers ------------------------------------------------------

function renderTitle(pptx: PptxGenJS, slide: Slide, spec: SlideSpec) {
  slide.background = { color: COLORS.navy };
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 0.25,
    h: CANVAS.h,
    fill: { color: COLORS.accent },
  });
  slide.addText(spec.title, {
    x: CANVAS.marginX,
    y: 2.6,
    w: CONTENT_W,
    h: 1.6,
    fontFace: FONT_FACE,
    fontSize: SIZE.coverTitle,
    bold: true,
    color: COLORS.white,
    align: "left",
    valign: "bottom",
  });
  if (spec.lead) {
    slide.addText(spec.lead, {
      x: CANVAS.marginX,
      y: 4.3,
      w: CONTENT_W,
      h: 0.8,
      fontFace: FONT_FACE,
      fontSize: SIZE.lead,
      color: COLORS.lightGray,
      align: "left",
    });
  }
}

function renderSectionDivider(pptx: PptxGenJS, slide: Slide, spec: SlideSpec) {
  slide.background = { color: COLORS.navy };
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
    x: CANVAS.w / 2 - 0.6,
    y: 4.1,
    w: 1.2,
    h: 0,
    line: { color: COLORS.accent, width: 2 },
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
  cols.slice(0, 2).forEach((col, i) => {
    const x = CANVAS.marginX + i * (colW + gap);
    slide.addShape(pptx.ShapeType.rect, {
      x,
      y: top,
      w: colW,
      h: 0.45,
      fill: { color: COLORS.lightGray },
    });
    slide.addText(col.heading, {
      x: x + 0.15,
      y: top,
      w: colW - 0.3,
      h: 0.45,
      fontFace: FONT_FACE,
      fontSize: SIZE.body + 1,
      bold: true,
      color: COLORS.navy,
      valign: "middle",
    });
    slide.addText(bulletRuns(col.bullets), {
      x,
      y: top + 0.6,
      w: colW,
      h: CANVAS.h - top - 1.2,
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

  slide.addChart(typeMap[chart.type], data, {
    x: CANVAS.marginX,
    y: top,
    w: CONTENT_W,
    h: CANVAS.h - top - (chart.note ? 0.9 : 0.6),
    chartColors: [COLORS.navy, COLORS.accent, COLORS.midGray, COLORS.lightGray],
    showLegend: chart.series.length > 1,
    legendPos: "b",
    showValue: false,
    catAxisLabelFontFace: FONT_FACE,
    catAxisLabelFontSize: SIZE.small,
    valAxisLabelFontFace: FONT_FACE,
    valAxisLabelFontSize: SIZE.small,
  });

  if (chart.note) {
    slide.addText(`※ ${chart.note}`, {
      x: CANVAS.marginX,
      y: CANVAS.h - 0.75,
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
  const cardH = 2.2;
  const y = top + 0.6;
  kpis.forEach((k, i) => {
    const x = CANVAS.marginX + i * (cardW + gap);
    slide.addShape(pptx.ShapeType.rect, {
      x,
      y,
      w: cardW,
      h: cardH,
      fill: { color: COLORS.lightGray },
      line: { color: COLORS.lightGray, width: 0 },
    });
    slide.addText(k.value, {
      x,
      y: y + 0.3,
      w: cardW,
      h: 1.0,
      fontFace: FONT_FACE,
      fontSize: SIZE.kpiValue,
      bold: true,
      color: COLORS.navy,
      align: "center",
      valign: "middle",
    });
    slide.addText(k.label, {
      x: x + 0.2,
      y: y + 1.35,
      w: cardW - 0.4,
      h: 0.7,
      fontFace: FONT_FACE,
      fontSize: SIZE.body,
      color: COLORS.midGray,
      align: "center",
      valign: "top",
    });
  });
}

function renderDiagram(pptx: PptxGenJS, slide: Slide, spec: SlideSpec, top: number) {
  const dg = spec.diagram;
  if (!dg) return renderBullets(pptx, slide, spec, top);
  const items = dg.items;

  if (dg.type === "process") {
    const n = Math.min(items.length, 5);
    const gap = 0.3;
    const boxW = (CONTENT_W - gap * (n - 1)) / n;
    const y = top + 0.8;
    const h = 1.4;
    items.slice(0, n).forEach((it, i) => {
      const x = CANVAS.marginX + i * (boxW + gap);
      slide.addShape(pptx.ShapeType.roundRect, {
        x,
        y,
        w: boxW,
        h,
        rectRadius: 0.08,
        fill: { color: i % 2 === 0 ? COLORS.navy : COLORS.accent },
      });
      slide.addText(it, {
        x: x + 0.1,
        y,
        w: boxW - 0.2,
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
          fontSize: 20,
          bold: true,
          color: COLORS.midGray,
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
    slide.addShape(pptx.ShapeType.rect, {
      x,
      y,
      w: cellW,
      h: cellH,
      fill: { color: i % 3 === 0 ? COLORS.navy : COLORS.lightGray },
    });
    slide.addText(cells[i] ?? "", {
      x: x + 0.2,
      y: y + 0.15,
      w: cellW - 0.4,
      h: cellH - 0.3,
      fontFace: FONT_FACE,
      fontSize: SIZE.body,
      bold: true,
      color: i % 3 === 0 ? COLORS.white : COLORS.navy,
      align: "center",
      valign: "middle",
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
  const gap = 0.4;
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
  // Image on the right
  slide.addImage({
    data: img.src,
    x: CANVAS.marginX + colW + gap,
    y: top,
    w: colW,
    h,
    sizing: { type: "contain", w: colW, h },
  });
}

function renderClosing(pptx: PptxGenJS, slide: Slide, spec: SlideSpec) {
  slide.background = { color: COLORS.navy };
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
