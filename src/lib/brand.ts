/**
 * Brand constants — the design contract.
 *
 * The whole point of separating "AI writes content" from "code renders design"
 * is that EVERY visual decision lives here, not in the model output. The pptx
 * renderer and the web preview both read from this module so the on-screen
 * preview matches the exported file.
 */

// Hex without leading '#': pptxgenjs wants "1F2A44".
export const COLORS = {
  navy: "1F2A44",
  navyLight: "33415E", // secondary navy for headers / accents
  white: "FFFFFF",
  lightGray: "F2F4F7",
  border: "DCE1EB", // hairline borders on cards / rules
  midGray: "8A94A6",
  textGray: "5B6678", // body text on white that isn't full navy
  accent: "C8A45C", // muted gold — used sparingly for rules/highlights
  accentSoft: "F3ECDC", // pale gold tint for fills behind highlights
} as const;

// CSS variants (with '#') for the web preview.
export const CSS_COLORS = {
  navy: `#${COLORS.navy}`,
  navyLight: `#${COLORS.navyLight}`,
  white: `#${COLORS.white}`,
  lightGray: `#${COLORS.lightGray}`,
  border: `#${COLORS.border}`,
  midGray: `#${COLORS.midGray}`,
  textGray: `#${COLORS.textGray}`,
  accent: `#${COLORS.accent}`,
  accentSoft: `#${COLORS.accentSoft}`,
} as const;

// Font: Meiryo UI is bundled with Windows / Office, so naming it in the .pptx
// renders natively with no licensing cost. The web preview falls back through
// Meiryo -> Noto Sans JP so non-Windows browsers stay close.
export const FONT_FACE = "Meiryo UI";
export const WEB_FONT_STACK =
  '"Meiryo UI", "Meiryo", "Noto Sans JP", "Hiragino Kaku Gothic ProN", sans-serif';

// Type scale in points (shared by pptx and preview).
export const SIZE = {
  coverTitle: 34,
  sectionTitle: 28,
  title: 24, // slide kicker label
  kicker: 11, // small caps label above the headline
  headline: 21, // governing message / リード文 (body slides)
  lead: 15, // cover subtitle
  body: 13,
  small: 9.5,
  kpiValue: 40,
} as const;

// 16:9 widescreen canvas in inches (pptxgenjs LAYOUT_WIDE).
export const CANVAS = {
  w: 13.33,
  h: 7.5,
  marginX: 0.7,
  marginTop: 0.55,
  marginBottom: 0.5,
} as const;
