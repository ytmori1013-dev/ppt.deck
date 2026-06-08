/**
 * Parser smoke test — no LLM, no network.
 * Feeds a deckdown sample through parseDeckdown -> renderDeckToPptx and asserts
 * the slide count / layouts, then writes tmp/parsed.pptx.
 *
 *   bun run scripts/parse-sample.ts
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { parseDeckdown, splitFreeText, textToSlide } from "../src/lib/parse/deckdown";
import { autoIllustrate } from "../src/lib/agents/enrich";
import { renderDeckToPptx } from "../src/lib/render/pptx";

const sample = `# EV充電事業の市場性・収益性分析
> 経営会議用 / 2026年6月

## 市場環境

### 市場規模 :: 国内EV充電市場は2030年に5,000億円規模へ拡大する
@kpi
- 5,000億円 | 2030年市場規模 | money
- +22% | 年平均成長率(CAGR) | growth
- 30万基 | 想定設置基数 | target

### 市場推移 :: 急速充電を中心に市場は一貫して拡大する
@chart bar
cat: 2024, 2026, 2028, 2030
普通充電: 800, 1200, 1800, 2400
急速充電: 600, 1000, 1700, 2600
note: ダミー値・要裏取り

## 参入論点

### 収益性 :: 収益性は立地と稼働率の確保に大きく依存する
- [#target] 立地が稼働率を決定づける
  - 商業施設・幹線道路沿いが有利
- [#time] 初期投資の回収には平均5〜7年を要する

### シナリオ比較 :: 段階投資シナリオが投資効率の点で優位
@table
| 項目 | 一括投資 | 段階投資 |
| 初期投資 | 大 | 小 |
| 回収期間 | 7年 | 5年 |

### 機会と脅威 :: 政策追い風がある一方、競争激化への備えが要る
@cols
[機会] - 補助金による初期投資軽減 - 法人需要の拡大
[脅威] - 大手の先行投資 - 電力価格の変動

### 参入ステップ :: 段階的に投資し検証しながら拡大する
@diagram process
- 市場検証 - 拠点選定 - PoC設置 - 本格展開 - 横展開

### 提言
@closing
> 立地戦略を磨けば、EV充電事業は十分な収益機会となる
`;

async function main() {
  const { title, slides } = parseDeckdown(sample);
  console.log(`title: ${title}`);
  console.log(`slides: ${slides.length}`);
  slides.forEach((s, i) => console.log(`  ${i + 1}. [${s.layout}] ${s.title || s.lead}`));

  const expected = ["title", "section-divider", "kpi", "chart", "section-divider", "bullets", "table", "two-column", "diagram", "closing"];
  const got = slides.map((s) => s.layout);
  const ok = expected.length === got.length && expected.every((e, i) => e === got[i]);
  if (!ok) {
    console.error("LAYOUT MISMATCH\n expected:", expected, "\n got:     ", got);
    process.exit(1);
  }

  const buf = await renderDeckToPptx({ slides });
  mkdirSync("tmp", { recursive: true });
  writeFileSync("tmp/parsed.pptx", buf);
  console.log(`OK: parsed deckdown -> tmp/parsed.pptx (${buf.length} bytes)`);

  // --- Free-text fallback (the "pasted from ChatGPT" shape) ---------------
  const free = `#1 エグゼクティブサマリー
合併により売上は1.5倍に拡大する。統合効果は3年で発現する。
・コスト削減は年間30億円
・組織統合は18か月で完了

15 次のステップ
来月までに統合計画を確定する。`;
  const ft = splitFreeText(free);
  console.log(`\nfree-text slides: ${ft.slides.length}`);
  ft.slides.forEach((s, i) =>
    console.log(`  ${i + 1}. kicker="${s.title}" lead="${s.lead}" bullets=${s.bullets?.length ?? 0}`),
  );
  const s1 = ft.slides[0];
  const s2 = ft.slides[1];
  // Ordinals must be stripped from kickers, and the kicker must not equal the lead
  // (that was the old duplicated-number bug).
  const freeOk =
    ft.slides.length === 2 &&
    s1.title === "エグゼクティブサマリー" &&
    s1.lead !== s1.title &&
    (s1.bullets?.length ?? 0) >= 2 &&
    s2.title === "次のステップ";
  if (!freeOk) {
    console.error("FREE-TEXT PARSE MISMATCH");
    process.exit(1);
  }
  console.log("OK: free-text parse (ordinals stripped, no number duplication)");

  // --- Auto-illustration (free, deterministic native figures) -------------
  // Numbers (colon-separated) -> KPI cards.
  const kpiIn = splitFreeText(`市場規模
売上高：5,000億円
営業利益率：22%
店舗数：30万件`).slides;
  const kpiOut = autoIllustrate(kpiIn);
  // Pipe-separated rows -> native table.
  const tableOut = autoIllustrate(
    splitFreeText(`シナリオ比較
項目 | 一括投資 | 段階投資
初期投資 | 大 | 小
回収期間 | 7年 | 5年`).slides,
  );
  // Ordered steps -> process diagram.
  const procOut = autoIllustrate(
    splitFreeText(`参入ステップ
1. 市場検証
2. 拠点選定
3. PoC設置
4. 本格展開`).slides,
  );
  // Keyword -> icon on plain bullets.
  const iconOut = autoIllustrate(
    splitFreeText(`コスト構造
電力コストが収益を左右する
回収期間は平均5年`).slides,
  );
  console.log(`\nauto-illustrate: kpi=${kpiOut[0]?.layout} table=${tableOut[0]?.layout} process=${procOut[0]?.layout} icon=${iconOut[0]?.bullets?.[0]?.icon}`);
  const enrichOk =
    kpiOut[0]?.layout === "kpi" &&
    (kpiOut[0]?.kpis?.length ?? 0) === 3 &&
    tableOut[0]?.layout === "table" &&
    (tableOut[0]?.table?.rows.length ?? 0) === 2 &&
    procOut[0]?.layout === "diagram" &&
    procOut[0]?.diagram?.type === "process" &&
    (procOut[0]?.diagram?.items.length ?? 0) === 4 &&
    iconOut[0]?.layout === "bullets" &&
    !!iconOut[0]?.bullets?.some((b) => b.icon);
  if (!enrichOk) {
    console.error("AUTO-ILLUSTRATE MISMATCH", JSON.stringify({ kpiOut, procOut, iconOut }, null, 2));
    process.exit(1);
  }
  console.log("OK: auto-illustrate (numbers->KPI, steps->process, keywords->icons)");

  // --- textToSlide (OCR -> one editable slide) ----------------------------
  const ocrSlide = textToSlide(`市場環境のまとめ
EVシフトが充電需要を押し上げる
法人需要が拡大している`);
  console.log(`textToSlide: kicker="${ocrSlide.title}" lead="${ocrSlide.lead}" bullets=${ocrSlide.bullets?.length ?? 0}`);
  if (ocrSlide.title !== "市場環境のまとめ" || !ocrSlide.lead) {
    console.error("textToSlide MISMATCH");
    process.exit(1);
  }
  console.log("OK: textToSlide (heading->kicker, body->lead+bullets)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
