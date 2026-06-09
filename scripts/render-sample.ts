/**
 * Renderer smoke test — no LLM, no network.
 * Builds a representative Deck covering every layout and writes a .pptx so we
 * can confirm the deterministic renderer works and opens cleanly in PowerPoint.
 *
 *   bun run scripts/render-sample.ts
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { renderDeckToPptx } from "../src/lib/render/pptx";
import type { Deck } from "../src/lib/types";

// 1x1 PNG so the image layout can be smoke-tested without a real asset.
const TINY_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

const deck: Deck = {
  brief: {
    title: "EV充電事業の市場性・収益性分析",
    purpose: "新規事業としての参入可否を経営会議で意思決定する",
    audience: "経営会議",
    pageCount: 8,
  },
  outline: {
    sections: [
      { title: "背景", governingMessage: "EVシフトが充電インフラ需要を押し上げる", purpose: "背景" },
      { title: "市場", governingMessage: "国内市場は2030年に5,000億円規模へ", purpose: "分析" },
    ],
  },
  slides: [
    {
      layout: "title",
      title: "EV充電事業の市場性・収益性分析",
      lead: "経営会議用 / 2026年6月",
    },
    {
      layout: "section-divider",
      title: "1. 市場環境",
      lead: "",
    },
    {
      layout: "kpi",
      title: "市場規模",
      lead: "国内EV充電市場は2030年に向け年率20%超で拡大する",
      kpis: [
        { value: "5,000億円", label: "2030年市場規模", icon: "money" },
        { value: "+22%", label: "年平均成長率(CAGR)", icon: "growth" },
        { value: "30万基", label: "想定設置基数", icon: "target" },
      ],
    },
    {
      layout: "table",
      title: "シナリオ比較",
      lead: "段階投資シナリオが投資効率の点で優位となる",
      table: {
        headers: ["項目", "一括投資", "段階投資"],
        rows: [
          ["初期投資", "大", "小"],
          ["回収期間", "7年", "5年"],
          ["リスク", "高", "中"],
        ],
      },
    },
    {
      layout: "chart",
      title: "市場推移",
      lead: "急速充電を中心に市場は一貫して拡大する見通し",
      chart: {
        type: "bar",
        categories: ["2024", "2026", "2028", "2030"],
        series: [
          { name: "普通充電", values: [800, 1200, 1800, 2400] },
          { name: "急速充電", values: [600, 1000, 1700, 2600] },
        ],
        note: "ダミー値（要一次情報での裏取り）",
      },
    },
    {
      layout: "bullets",
      title: "参入論点",
      lead: "収益性は設置場所と稼働率の確保に大きく依存する",
      bullets: [
        { text: "立地が稼働率を決定づける", icon: "target", sub: ["商業施設・幹線道路沿いが有利", "用地確保競争が激化"] },
        { text: "初期投資の回収には平均5〜7年を要する", icon: "time" },
        { text: "電力調達コストが収益を左右する", icon: "money" },
      ],
    },
    {
      layout: "two-column",
      title: "機会と脅威",
      lead: "政策追い風がある一方、競争激化への備えが要る",
      columns: [
        { heading: "機会", bullets: [{ text: "補助金による初期投資軽減" }, { text: "法人需要の拡大" }] },
        { heading: "脅威", bullets: [{ text: "大手の先行投資" }, { text: "電力価格の変動" }] },
      ],
    },
    {
      layout: "diagram",
      title: "参入ステップ",
      lead: "段階的に投資し、検証しながら拡大する",
      diagram: {
        type: "process",
        items: ["市場検証", "拠点選定", "PoC設置", "本格展開", "横展開"],
      },
    },
    {
      layout: "image-right",
      title: "イメージ",
      lead: "拠点イメージを添えて訴求力を高める",
      bullets: [{ text: "GPTで生成した画像を右に配置" }, { text: "テキストは左に要点を残す" }],
      image: { src: TINY_PNG, caption: "サンプル画像" },
    },
    {
      layout: "image-cover",
      title: "参考スライド",
      lead: "GPTで作った参考スライドはそのまま全面に",
      image: { src: TINY_PNG },
    },
    {
      layout: "closing",
      title: "結び",
      lead: "立地戦略を磨けば、EV充電事業は十分な収益機会となる",
    },
  ],
};

// Degenerate / overflow inputs must not crash or overflow — they should fall
// back (empty chart/diagram -> bullets) and shrink/cap long content.
const edgeDeck: Deck = {
  brief: { title: "エッジケース検証" },
  slides: [
    { layout: "chart", title: "空グラフ", lead: "系列が空でも落ちずに本文へフォールバックする", chart: { type: "bar", categories: [], series: [] } },
    { layout: "diagram", title: "空図解", lead: "項目が空でも落ちない", diagram: { type: "process", items: [] } },
    {
      layout: "bullets",
      title: "とても長い見出しでもヘッダ内に収まること",
      lead: "本スライドの言い切りメッセージが非常に長く、複数行にわたって続いたとしても、縮小により枠内に収まり、本文領域へはみ出さないことを確認するためのケースである。",
      bullets: [{ text: "長い箇条書きの行も枠内に収める" }],
    },
    {
      layout: "kpi",
      title: "長いKPIラベル",
      lead: "ラベルが長くても縮小して収まる",
      kpis: [
        { value: "5,000億円", label: "2030年における国内EV充電インフラ市場の総額（普通＋急速）" },
        { value: "+22%", label: "年平均成長率(CAGR)・2024-2030" },
      ],
    },
    {
      layout: "table",
      title: "多行テーブル",
      lead: "行が多くても潰れず『ほかN件』で集約する",
      table: {
        headers: ["項目", "値"],
        rows: Array.from({ length: 20 }, (_, i) => [`項目 ${i + 1}`, `${(i + 1) * 100}`]),
      },
    },
  ],
};

async function main() {
  const buf = await renderDeckToPptx(deck);
  mkdirSync("tmp", { recursive: true });
  const path = "tmp/sample.pptx";
  writeFileSync(path, buf);
  console.log(`OK: wrote ${path} (${buf.length} bytes, ${deck.slides.length} slides)`);

  const edgeBuf = await renderDeckToPptx(edgeDeck);
  writeFileSync("tmp/edge.pptx", edgeBuf);
  console.log(`OK: edge cases rendered without throwing (tmp/edge.pptx, ${edgeBuf.length} bytes)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
