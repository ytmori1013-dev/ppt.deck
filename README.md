# Consult Deck AI

自然言語で「こういう資料が欲しい」と伝えるだけで、**コンサルファーム品質のストーリー → スライド構成 → 各スライド本文 → PowerPoint(.pptx) 出力**まで一気通貫で生成するWebアプリ（MVP）。

操作体験は **ChatGPTライクなチャット指示 ＋ Canvaライクなプレビュー**。

## 設計思想（品質の肝）

AIに自由にデザインさせると品質が崩れる。そこで責務を分離している:

- **AIは「中身」だけ**を担当 → 構造化スライド仕様(JSON / Zodで型固定)を出力。
- **デザインはコード側で固定** → 決定論的レンダラ(`pptxgenjs`)がブランド(フォント/色/サイズ/レイアウト)を縛って `.pptx` 化。
- 同じJSONを **Webプレビュー** にも流用し、画面と出力ファイルを一致させる。

ブランド定数は [`src/lib/brand.ts`](src/lib/brand.ts) に集約。フォントは **Meiryo UI**（Windows/Office 同梱のため追加コストなし。Webプレビューのみ Noto Sans JP にフォールバック）。

## AIエージェント・パイプライン

| 役割 | 実装 | 内容 |
| --- | --- | --- |
| 1. Story Builder | `src/lib/agents/story.ts` | 依頼 → MECEなストーリー構成 |
| 2. Slide Writer | `src/lib/agents/writer.ts` | 構成 → 各スライド本文(タイトル/リード文/本文/グラフ/図解/KPI) |
| 3. Designer | `src/lib/agents/designer.ts` | レイアウトを内容に合わせて正規化（決定論的・無料） |
| 4. Reviewer | `src/lib/agents/reviewer.ts` | コンサル品質チェック（1スライド1メッセージ/MECE/言い切り） |
| — Reviser | `src/lib/agents/reviser.ts` | チャット修正（「4ページ目を強化」等） |

## 技術スタック（すべて無料 / OSS）

- Next.js 15 (App Router) + TypeScript + Tailwind CSS 4
- `pptxgenjs`（MIT）で `.pptx` 生成
- Vercel AI SDK (`ai` + `@ai-sdk/anthropic`) + Zod で構造化出力
- 永続化はMVPでは localStorage（DB不要）

> ライブラリ・レンダリングは完全無料ですが、**文章生成のLLMトークンは課金対象**です（既定は Claude）。完全無料で動かしたい場合は下記の Ollama 差替えを参照。

## セットアップ

```bash
bun install            # または npm install
cp .env.example .env   # ANTHROPIC_API_KEY を設定
bun run dev            # http://localhost:3000
```

## 使い方

1. 左で **依頼内容**（タイトル・目的・想定読者…）を入力 →「ストーリー生成」
2. **ストーリー構成**を確認（並び替え/削除/追加/編集可）→「スライド生成」
3. 右でサムネイル＋プレビューを確認
4. **チャットで修正**（例:「4ページ目の市場分析を強化」「財務観点を追加」）
5. **PowerPoint 出力** で `.pptx` をダウンロード

## 検証

LLM不要のレンダラ単体テスト（全レイアウトを網羅した `.pptx` を `tmp/sample.pptx` に出力）:

```bash
bun run render:sample
```

型チェック込みのビルド:

```bash
bun run build
```

## API

| エンドポイント | 入力 | 出力 |
| --- | --- | --- |
| `POST /api/story` | `DeckBrief` | `{ outline }` |
| `POST /api/slides` | `{ brief, outline, review? }` | `{ slides }` |
| `POST /api/revise` | `{ deck, instruction }` | `{ slides }` |
| `POST /api/export/pptx` | `Deck` | `.pptx` ファイル |

## 完全無料で動かす（Ollama 差替え）

LLMは [`src/lib/llm.ts`](src/lib/llm.ts) の `getModel()` だけに依存しています。
`ollama-ai-provider` 等を導入し、`getModel()` がローカルモデルを返すよう差し替えれば、
他のコードを変更せずトークン課金なしで動かせます。

## 今後の拡張（MVP外）

- PDF出力 / デッキ永続化(DB) / 過去資料一覧 / テンプレート設定 / 認証
