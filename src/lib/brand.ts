/**
 * Brand constants — the design contract.
 *
 * The whole point of separating "AI writes content" from "code renders design"
 * is that EVERY visual decision lives here, not in the model output. The pptx
 * renderer and the web preview both read from this module so the on-screen
 * preview matches the exported file.
 *
 * Palette + rules follow the fixed "デザイン・スタイル標準":
 *   Primary #1976D2 / Pale #E8F4FB / Emphasis(red) #DB4315 /
 *   Text #222222 / Gray #888888 / Border #E0E0E0.
 *   Flat only — NO shadows / gradients / 3D.
 */

// Hex without leading '#': pptxgenjs wants "1976D2".
export const COLORS = {
  primary: "1976D2", // brand blue — structure, headers, accents
  primaryDark: "13294B", // deep navy for cover / section / closing backgrounds
  navy: "13294B", // alias kept for existing references (dark backgrounds)
  red: "DB4315", // emphasis only — used very sparingly
  white: "FFFFFF",
  paleBlue: "E8F4FB", // card / highlight fills
  lightGray: "F4F6F8",
  border: "E0E0E0", // hairline rules & card borders
  gray: "888888", // secondary text / footnotes
  text: "222222", // body text
  // --- aliases (so existing code keeps compiling) ------------------------
  navyLight: "1F4E89",
  accent: "1976D2",
  accentSoft: "E8F4FB",
  midGray: "888888",
  textGray: "555F6D",
} as const;

// CSS variants (with '#') for the web preview.
export const CSS_COLORS = {
  primary: `#${COLORS.primary}`,
  primaryDark: `#${COLORS.primaryDark}`,
  navy: `#${COLORS.navy}`,
  navyLight: `#${COLORS.navyLight}`,
  red: `#${COLORS.red}`,
  white: `#${COLORS.white}`,
  paleBlue: `#${COLORS.paleBlue}`,
  lightGray: `#${COLORS.lightGray}`,
  border: `#${COLORS.border}`,
  gray: `#${COLORS.gray}`,
  text: `#${COLORS.text}`,
  accent: `#${COLORS.accent}`,
  accentSoft: `#${COLORS.accentSoft}`,
  midGray: `#${COLORS.midGray}`,
  textGray: `#${COLORS.textGray}`,
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
  headline: 20, // governing message / リード文 (body slides)
  lead: 14, // cover subtitle / リード文 (14pt fixed)
  body: 12.5,
  small: 9.5,
  kpiValue: 38,
} as const;

// 16:9 widescreen canvas in inches (pptxgenjs LAYOUT_WIDE).
export const CANVAS = {
  w: 13.33,
  h: 7.5,
  marginX: 0.7,
  marginTop: 0.55,
  marginBottom: 0.5,
} as const;
