"use client";

import { useEffect, useRef, useState } from "react";
import { SlidePreview } from "@/components/SlidePreview";
import { parseDeckdown, splitFreeText } from "@/lib/parse/deckdown";
import { claudeStoryPrompt, gptImagePrompt } from "@/lib/prompts/templates";
import { fileToDataUrl, urlToDataUrl } from "@/lib/image";
import { loadDeck, saveDeck } from "@/lib/store/idb";
import type { DeckBrief, SlideSpec } from "@/lib/types";

type Status = { msg: string; kind: "info" | "error" } | null;
type Persisted = { brief: Partial<DeckBrief>; raw: string; slides: SlideSpec[] };

export default function Home() {
  const [brief, setBrief] = useState<Partial<DeckBrief>>({ audience: "経営会議" });
  const [raw, setRaw] = useState("");
  const [parseMode, setParseMode] = useState<"deckdown" | "free">("deckdown");
  const [slides, setSlides] = useState<SlideSpec[]>([]);
  const [current, setCurrent] = useState(0);
  const [aiOpen, setAiOpen] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>(null);
  const isMobile = useIsMobile();
  const [navOpen, setNavOpen] = useState(false);

  // Restore / persist (IndexedDB — images can be large).
  useEffect(() => {
    loadDeck<Persisted>().then((d) => {
      if (!d) return;
      if (d.brief) setBrief(d.brief);
      if (d.raw) setRaw(d.raw);
      if (d.slides) setSlides(d.slides);
    });
  }, []);
  useEffect(() => {
    saveDeck({ brief, raw, slides } satisfies Persisted);
  }, [brief, raw, slides]);

  const slide = slides[current];

  function flash(msg: string, kind: "info" | "error" = "info") {
    setStatus({ msg, kind });
  }

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      flash(`${label}をコピーしました`);
    } catch {
      flash("コピーに失敗しました（手動で選択してください）", "error");
    }
  }

  function parse() {
    if (!raw.trim()) return flash("貼り付け内容が空です", "error");
    const parsed = parseMode === "deckdown" ? parseDeckdown(raw) : splitFreeText(raw);
    if (parsed.slides.length === 0) return flash("スライドを抽出できませんでした", "error");
    if (parsed.title && !brief.title) setBrief({ ...brief, title: parsed.title });
    setSlides(parsed.slides);
    setCurrent(0);
    flash(`${parsed.slides.length} スライドを生成しました`);
    setNavOpen(false); // on mobile, reveal the result
  }

  function updateSlide(i: number, patch: Partial<SlideSpec>) {
    setSlides((prev) => prev.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  }

  async function attachImage(src: string) {
    if (!slide) return;
    // Default to full-bleed: a pasted picture (e.g. a GPT-made reference slide)
    // becomes the whole slide. If the slide already has its own text, keep that
    // visible by putting the image alongside it instead.
    const nextLayout: SlideSpec["layout"] =
      slide.bullets?.length || slide.columns?.length ? "image-right" : "image-cover";
    updateSlide(current, { image: { ...(slide.image ?? {}), src }, layout: nextLayout });
    flash("画像を追加しました");
  }

  async function onPickFile(file?: File | null) {
    if (!file) return;
    try {
      await attachImage(await fileToDataUrl(file));
    } catch {
      flash("画像の読み込みに失敗しました", "error");
    }
  }

  async function onAddUrl(url: string) {
    if (!url.trim()) return;
    setBusy("画像を取得中…");
    try {
      await attachImage(await urlToDataUrl(url.trim()));
    } catch (e) {
      flash(e instanceof Error ? e.message : "画像取得に失敗", "error");
    } finally {
      setBusy(null);
    }
  }

  async function call<T>(url: string, body: unknown): Promise<T> {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || `${res.status}`);
    return res.json();
  }

  async function aiDraft() {
    if (!brief.title || !brief.purpose) return flash("AI下書きにはタイトルと目的が必要です", "error");
    setBusy("AIで下書き生成中…（要APIキー）");
    try {
      const { outline } = await call<{ outline: unknown }>("/api/story", brief);
      const { slides } = await call<{ slides: SlideSpec[] }>("/api/slides", { brief, outline });
      setSlides(slides);
      setCurrent(0);
      flash("AI下書きを生成しました");
      setNavOpen(false);
    } catch (e) {
      flash(`AI生成に失敗: ${e instanceof Error ? e.message : ""}（APIキー未設定の可能性）`, "error");
    } finally {
      setBusy(null);
    }
  }

  async function aiRevise() {
    if (slides.length === 0 || !instruction.trim()) return;
    setBusy("AIで修正中…（要APIキー）");
    try {
      const { slides: next } = await call<{ slides: SlideSpec[] }>("/api/revise", {
        deck: { brief, slides },
        instruction,
      });
      setSlides(next);
      setInstruction("");
      flash("修正を反映しました");
    } catch (e) {
      flash(`修正に失敗: ${e instanceof Error ? e.message : ""}`, "error");
    } finally {
      setBusy(null);
    }
  }

  async function exportPptx() {
    setBusy("PowerPointを書き出し中…");
    try {
      const res = await fetch("/api/export/pptx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief, slides }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${brief.title || "deck"}.pptx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      flash(e instanceof Error ? e.message : "出力に失敗", "error");
    } finally {
      setBusy(null);
    }
  }

  const asideStyle: React.CSSProperties = isMobile
    ? {
        position: "fixed",
        top: 0,
        left: 0,
        bottom: 0,
        width: "min(88vw, 380px)",
        zIndex: 50,
        background: "#fff",
        display: "flex",
        flexDirection: "column",
        overflow: "auto",
        borderRight: "1px solid #e2e6ee",
        transform: navOpen ? "translateX(0)" : "translateX(-105%)",
        transition: "transform .25s ease",
        boxShadow: navOpen ? "0 0 40px rgba(31,42,68,.35)" : "none",
      }
    : {
        width: 380,
        flexShrink: 0,
        borderRight: "1px solid #e2e6ee",
        background: "#fff",
        display: "flex",
        flexDirection: "column",
        overflow: "auto",
      };

  return (
    <main style={{ display: "flex", height: "100dvh", overflow: "hidden", position: "relative" }}>
      {/* Backdrop behind the mobile drawer */}
      {isMobile && navOpen && (
        <div
          onClick={() => setNavOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(31,42,68,.45)", zIndex: 40 }}
        />
      )}

      {/* Sidebar */}
      <aside style={asideStyle}>
        <div style={{ padding: "16px 18px", borderBottom: "1px solid #eef1f6", display: "flex", alignItems: "flex-start", gap: 8 }}>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Consult Deck AI</h1>
            <p style={{ fontSize: 12, color: "var(--mid-gray)", margin: "4px 0 0" }}>
              Claudeのストーリー＋GPT画像を、ブランド固定のPPTへ
            </p>
          </div>
          {isMobile && (
            <button onClick={() => setNavOpen(false)} aria-label="閉じる" style={iconBtn}>✕</button>
          )}
        </div>

        <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Step 1: brief + Claude prompt */}
          <Section title="1. 依頼（任意）→ Claude用プロンプト">
            <Field label="タイトル">
              <input style={inp} value={brief.title ?? ""} onChange={(e) => setBrief({ ...brief, title: e.target.value })} placeholder="例: EV充電事業の市場性・収益性分析" />
            </Field>
            <Field label="目的">
              <textarea style={{ ...inp, height: 48 }} value={brief.purpose ?? ""} onChange={(e) => setBrief({ ...brief, purpose: e.target.value })} placeholder="例: 参入可否を経営会議で意思決定する" />
            </Field>
            <div style={{ display: "flex", gap: 8 }}>
              <Field label="想定読者"><input style={inp} value={brief.audience ?? ""} onChange={(e) => setBrief({ ...brief, audience: e.target.value })} /></Field>
              <Field label="ページ数"><input style={inp} type="number" value={brief.pageCount ?? ""} onChange={(e) => setBrief({ ...brief, pageCount: e.target.value ? Number(e.target.value) : undefined })} /></Field>
            </div>
            <button style={btnGhost} onClick={() => copy(claudeStoryPrompt(brief), "Claude用プロンプト")}>
              📋 Claudeに貼るプロンプトをコピー
            </button>
          </Section>

          {/* Step 2: paste -> slides */}
          <Section title="2. 貼り付けてスライド化">
            <div style={{ display: "flex", gap: 6, fontSize: 12 }}>
              <Toggle on={parseMode === "deckdown"} onClick={() => setParseMode("deckdown")}>記法</Toggle>
              <Toggle on={parseMode === "free"} onClick={() => setParseMode("free")}>自由テキスト</Toggle>
            </div>
            <textarea style={{ ...inp, height: 160, fontFamily: "monospace", fontSize: 12 }} value={raw} onChange={(e) => setRaw(e.target.value)} placeholder={parseMode === "deckdown" ? "Claudeのdeckdown出力を貼り付け…" : "文章/箇条書きを貼り付け（自動分割）…"} />
            <button style={btnPrimary} onClick={parse} disabled={!!busy}>スライド化</button>
          </Section>

          {/* Step 3: AI optional */}
          <Section title="3. AI（任意・要APIキー）">
            <button style={btnGhost} onClick={() => setAiOpen((v) => !v)}>{aiOpen ? "▲ 閉じる" : "▼ AI機能を開く"}</button>
            {aiOpen && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
                <button style={btnPrimary} onClick={aiDraft} disabled={!!busy}>AIで下書き生成</button>
                {slides.length > 0 && (
                  <>
                    <textarea style={{ ...inp, height: 56 }} value={instruction} onChange={(e) => setInstruction(e.target.value)} placeholder="例: 4ページ目の市場分析を強化 / 財務観点を追加" />
                    <button style={btnPrimary} onClick={aiRevise} disabled={!!busy || !instruction.trim()}>チャットで修正</button>
                  </>
                )}
                <p style={{ fontSize: 11, color: "var(--mid-gray)", margin: 0 }}>※ サーバに ANTHROPIC_API_KEY が必要です。無くても 1〜2 だけで完結します。</p>
              </div>
            )}
          </Section>
        </div>
      </aside>

      {/* Main */}
      <section style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ minHeight: 56, borderBottom: "1px solid #e2e6ee", background: "#fff", display: "flex", alignItems: "center", padding: isMobile ? "0 12px" : "0 20px", gap: isMobile ? 8 : 14 }}>
          {isMobile && (
            <button onClick={() => setNavOpen(true)} aria-label="メニュー" style={iconBtn}>☰</button>
          )}
          <strong style={{ fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: isMobile ? 140 : 360 }}>{brief.title || "（無題）"}</strong>
          {!isMobile && <span style={{ fontSize: 12, color: "var(--mid-gray)" }}>{slides.length > 0 ? `${slides.length} スライド` : ""}</span>}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
            {busy && !isMobile && <span style={{ fontSize: 12, color: "var(--mid-gray)" }}>{busy}</span>}
            <button style={{ ...btnPrimary, width: "auto", padding: "8px 16px", whiteSpace: "nowrap", opacity: slides.length ? 1 : 0.5 }} onClick={exportPptx} disabled={!!busy || slides.length === 0}>
              {isMobile ? "PPT出力" : "PowerPoint 出力"}
            </button>
          </div>
        </div>

        {status && (
          <div style={{ padding: "8px 20px", fontSize: 13, background: status.kind === "error" ? "#fdecec" : "#eef6ee", color: status.kind === "error" ? "#a12" : "#264" }}>
            {status.msg}
          </div>
        )}

        <div style={{ flex: 1, display: "flex", flexDirection: isMobile ? "column" : "row", overflow: "hidden" }}>
          {slides.length > 0 && (
            <div
              style={
                isMobile
                  ? { borderBottom: "1px solid #e2e6ee", overflowX: "auto", overflowY: "hidden", padding: 8, display: "flex", flexDirection: "row", gap: 8, background: "#fff", flexShrink: 0 }
                  : { width: 200, flexShrink: 0, borderRight: "1px solid #e2e6ee", overflow: "auto", padding: 10, display: "flex", flexDirection: "column", gap: 8, background: "#fff" }
              }
            >
              {slides.map((s, i) => (
                <button key={i} onClick={() => setCurrent(i)} style={{ flexShrink: 0, width: isMobile ? 150 : "auto", border: i === current ? "2px solid var(--navy)" : "1px solid #e2e6ee", borderRadius: 6, padding: 4, background: "transparent", cursor: "pointer" }}>
                  <div style={{ fontSize: 10, color: "var(--mid-gray)", textAlign: "left", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{i + 1}. {s.title || s.lead?.slice(0, 16)}</div>
                  <div style={{ pointerEvents: "none" }}><SlidePreview spec={s} /></div>
                </button>
              ))}
            </div>
          )}

          <div style={{ flex: 1, minHeight: 0, overflow: "auto", padding: isMobile ? 14 : 28 }}>
            {slide ? (
              <div style={{ maxWidth: 900, margin: "0 auto" }}>
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); onPickFile(e.dataTransfer.files?.[0]); }}
                >
                  <SlidePreview spec={slide} />
                </div>

                {/* Per-slide image controls */}
                <div style={{ marginTop: 14, background: "#fff", borderRadius: 8, padding: 14, display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", fontSize: 12 }}>
                  <strong style={{ fontSize: 12 }}>画像:</strong>
                  <label style={btnSmall}>
                    アップロード
                    <input type="file" accept="image/*" hidden onChange={(e) => onPickFile(e.target.files?.[0])} />
                  </label>
                  <UrlAdder onAdd={onAddUrl} />
                  <button style={btnSmall} onClick={() => copy(gptImagePrompt(slide), "GPT用画像プロンプト")}>📋 GPT画像プロンプト</button>
                  {slide.image?.src && (
                    <>
                      <button style={btnSmall} onClick={() => updateSlide(current, { layout: nextImageLayout(slide.layout) })}>
                        レイアウト: {imageLayoutLabel(slide.layout)}
                      </button>
                      <button style={{ ...btnSmall, color: "#a12" }} onClick={() => updateSlide(current, { image: undefined, layout: "bullets" })}>画像を削除</button>
                    </>
                  )}
                  <span style={{ color: "var(--mid-gray)" }}>プレビューにドラッグ&ドロップも可</span>
                </div>

                {slide.notes && (
                  <div style={{ marginTop: 10, fontSize: 12, color: "var(--mid-gray)", background: "#fff", padding: 12, borderRadius: 6 }}>
                    <strong>ノート: </strong>{slide.notes}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ height: "100%", display: "grid", placeItems: "center", color: "var(--mid-gray)", textAlign: "center" }}>
                <div style={{ maxWidth: 460 }}>
                  <p style={{ fontSize: 15, lineHeight: 1.7 }}>
                    ① {isMobile ? <>左上の <strong>☰</strong> から</> : "左の"}依頼を埋めて<strong>「Claudeに貼るプロンプト」</strong>をコピー<br />
                    ② Claudeの出力を <strong>「2. 貼り付けてスライド化」</strong><br />
                    ③ <strong>GPT画像をドロップ</strong> → <strong>PowerPoint出力</strong>
                  </p>
                  <p style={{ fontSize: 12 }}>APIキー不要で使えます。</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function UrlAdder({ onAdd }: { onAdd: (url: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <span style={{ display: "inline-flex", gap: 4 }}>
      <input ref={ref} style={{ ...inp, width: 180, padding: "5px 8px" }} placeholder="画像URLを貼り付け" />
      <button style={btnSmall} onClick={() => { onAdd(ref.current?.value ?? ""); if (ref.current) ref.current.value = ""; }}>追加</button>
    </span>
  );
}

/** Cycle a slide image through the three placements: full → right → 余白付き全面. */
function nextImageLayout(layout: SlideSpec["layout"]): SlideSpec["layout"] {
  switch (layout) {
    case "image-cover":
      return "image-right";
    case "image-right":
      return "image-full";
    default:
      return "image-cover";
  }
}

function imageLayoutLabel(layout: SlideSpec["layout"]): string {
  switch (layout) {
    case "image-right":
      return "右配置";
    case "image-full":
      return "余白付き全面";
    default:
      return "全面";
  }
}

/** Tracks a max-width media query so the layout can switch to a mobile drawer. */
function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 820px)");
    const update = () => setMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return mobile;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 style={{ fontSize: 13, fontWeight: 700, color: "var(--navy)", margin: "0 0 8px" }}>{title}</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{children}</div>
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 11, color: "var(--mid-gray)", flex: 1 }}>
      {label}
      {children}
    </label>
  );
}
function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{ flex: 1, padding: "6px", borderRadius: 6, border: "1px solid #d8deea", background: on ? "var(--navy)" : "#fff", color: on ? "#fff" : "var(--navy)", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
      {children}
    </button>
  );
}

const inp: React.CSSProperties = {
  width: "100%", border: "1px solid #d8deea", borderRadius: 6, padding: "7px 9px",
  fontSize: 13, fontFamily: "inherit", color: "var(--navy)", background: "#fff",
  boxSizing: "border-box", resize: "vertical",
};
const btnPrimary: React.CSSProperties = {
  width: "100%", background: "var(--navy)", color: "#fff", border: "none", borderRadius: 6,
  padding: "10px", fontSize: 13, fontWeight: 700, cursor: "pointer",
};
const btnGhost: React.CSSProperties = {
  width: "100%", background: "#fff", color: "var(--navy)", border: "1px solid #c2cad8",
  borderRadius: 6, padding: "9px", fontSize: 12, fontWeight: 700, cursor: "pointer",
};
const btnSmall: React.CSSProperties = {
  background: "#fff", color: "var(--navy)", border: "1px solid #d8deea", borderRadius: 6,
  padding: "6px 10px", fontSize: 12, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4,
};
const iconBtn: React.CSSProperties = {
  background: "#fff", color: "var(--navy)", border: "1px solid #d8deea", borderRadius: 8,
  width: 38, height: 38, fontSize: 18, lineHeight: 1, cursor: "pointer", flexShrink: 0,
  display: "inline-flex", alignItems: "center", justifyContent: "center",
};
