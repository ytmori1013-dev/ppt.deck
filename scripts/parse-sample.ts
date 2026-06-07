/**
 * Parser smoke test — no LLM, no network.
 * Feeds a deckdown sample through parseDeckdown -> renderDeckToPptx and asserts
 * the slide count / layouts, then writes tmp/parsed.pptx.
 *
 *   bun run scripts/parse-sample.ts
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { parseDeckdown } from "../src/lib/parse/deckdown";
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
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
