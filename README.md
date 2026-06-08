# Consult Deck AI

**Claudeで作ったストーリー**と**GPTで作った画像**を、**ブランド固定のPowerPoint(.pptx)**に数秒で組み立てるツール。

> 「ストーリーはClaude、画像はGPT、PPT組み立ては人間」——その**手作業の最後の工程だけを自動化**します。
> **APIキー無し**で完結（AI生成は任意のオプション）。

## なぜ作るか

資料作成のボトルネックは「AIに何かを作らせること」ではなく、**出来た素材を手でスライドに組み立てる工程**。
そこで本ツールは、AIに全部やらせる代わりに——

1. **Claudeに貼るプロンプト**を生成（ツールが用意） → 自分のClaude/ChatGPTが所定の記法で出力
2. その出力（または手元のメモ）を**貼り付けるだけで自動スライド化**（決定論的・無料）
   - 数値の羅列 → **KPIカード**、順序 → **プロセス図**、表組み → **テーブル**に自動変換。アイコンも自動付与（すべて編集可能）。
3. **画像をドロップ**して全面配置。あるいは**「文字を抽出（OCR）」**で画像を**編集可能なスライド**に変換（[Tesseract.js](https://github.com/naptha/tesseract.js)・ブラウザ内・無料）
4. **ブランド固定で .pptx 出力**

…という、いまの運用そのままを高速化します。**すべてAPIキー不要**（サーバ側のAI下書き生成は任意のオプション）。

> OCRは日本語スライド画像で精度が中程度・レイアウトや図は復元しません（文字のみ）。出力は編集可能なので手直し前提でお使いください。

## 設計（品質の肝）

**「中身」と「デザイン」を分離**。中身はあなた（＋Claude/GPT）が作り、デザインはコードが固定する。

- スライドは構造化データ(`SlideSpec` / Zod)。テキストは `parseDeckdown()` が決定論的に生成（[`src/lib/parse/deckdown.ts`](src/lib/parse/deckdown.ts)）。
- レンダラ `pptxgenjs` がブランド(フォント/色/サイズ/レイアウト)を固定して `.pptx` 化（[`src/lib/render/pptx.ts`](src/lib/render/pptx.ts)）。
- 同じデータをWebプレビューにも流用（画面＝出力）。

ブランド定数は [`src/lib/brand.ts`](src/lib/brand.ts)。フォントは **Meiryo UI**（Windows/Office同梱＝無料。Webプレビューのみ Noto Sans JP フォールバック）。

## deckdown 記法

Claudeに「この記法で書いて」と頼める（プロンプトはアプリの「📋 Claudeに貼るプロンプト」で自動生成）。

```
# 資料タイトル
> サブタイトル（任意）

## セクション名

### キッカー :: 結論メッセージ
- 根拠の箇条書き
  - サブ箇条書き

### 数値で示す結論
@kpi
- 5,000億円 | 2030年市場規模
- +22% | 年平均成長率

### 推移で示す結論
@chart bar          # bar | line | pie
cat: 2024, 2026, 2028, 2030
普通充電: 800, 1200, 1800, 2400
note: ダミー値・要裏取り

### 対比で示す結論
@cols
[機会] - 補助金 - 法人需要
[脅威] - 大手の先行投資 - 電力価格変動

### 手順で示す結論
@diagram process    # process | matrix | pyramid
- 市場検証 - 拠点選定 - PoC - 本格展開

### 画像スライド
@image
caption: キャプション（任意。画像はアプリ上でドロップ/URLで追加）

### 提言
@closing
> 全体を一言で言い切る
```

記法でなく普通の文章/箇条書きを貼っても、「自由テキスト」モードで自動分割します。

## 使い方

```bash
bun install     # または npm install
bun run dev     # http://localhost:3000
```

1. 左で依頼を入力 →「📋 Claudeに貼るプロンプト」をコピー → Claudeへ
2. Claudeの出力を貼り付け →「スライド化」
3. 各スライドに**GPT画像をドロップ/URL/アップロード**（「📋 GPT画像プロンプト」も用意）
4. 「PowerPoint 出力」で `.pptx` ダウンロード

> ここまで **APIキー不要**。生成物はブラウザ内(IndexedDB)に保存されます。

### AI生成（任意・要APIキー）

`.env` に `ANTHROPIC_API_KEY` を設定すると、サイドバー「3. AI」で **下書き自動生成**・**チャット修正**が使えます（トークン課金あり）。完全無料で動かしたい場合は [`src/lib/llm.ts`](src/lib/llm.ts) の `getModel()` をローカルLLM(Ollama等)に差し替え。

## 検証（すべてAPI不要）

```bash
bun run parse:sample    # deckdown -> パース -> pptx（レイアウト一致を検証）
bun run render:sample   # 全レイアウト網羅 + 画像スライドの pptx を出力
bun run build           # 型チェック込みビルド
```

## 技術スタック（無料 / OSS）

Next.js 15 (App Router) + TypeScript + Tailwind 4 / `pptxgenjs`(MIT) / Vercel AI SDK + Zod（AIは任意）。永続化は IndexedDB。

## 今後の拡張

- PDF出力 / 過去資料一覧 / テンプレート切替 / スライドの並べ替え・追加UI / 画像の自動トリミング
