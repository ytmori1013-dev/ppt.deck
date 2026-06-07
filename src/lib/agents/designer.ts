import type { SlideSpec } from "../types";

/**
 * Agent 3 — Designer.
 *
 * Deterministic (no LLM, no cost) layout normalizer. The Writer suggests a
 * layout, but the Designer guarantees the chosen layout actually matches the
 * content present so the renderer never falls back awkwardly. Kept as a
 * separate, swappable step so it can later be upgraded to an LLM pass.
 */
export function applyDesign(slides: SlideSpec[]): SlideSpec[] {
  return slides.map((s) => ({ ...s, layout: pickLayout(s) }));
}

function pickLayout(s: SlideSpec): SlideSpec["layout"] {
  // Structural layouts the Writer assigned are trusted as-is.
  if (s.layout === "title" || s.layout === "section-divider" || s.layout === "closing") {
    return s.layout;
  }

  // Repair content layouts to whatever data is actually present.
  if (s.image && s.image.src) {
    // Keep image-right when there is supporting text; otherwise full-bleed.
    if (s.layout === "image-right" && (s.bullets?.length || s.columns?.length)) {
      return "image-right";
    }
    return "image-full";
  }
  if (s.chart && s.chart.series.length > 0) return "chart";
  if (s.diagram && s.diagram.items.length > 0) return "diagram";
  if (s.kpis && s.kpis.length > 0) return "kpi";
  if (s.columns && s.columns.length >= 2) return "two-column";
  return "bullets";
}
