"use client";

import { useEffect, useState } from "react";
import { SlidePreview } from "@/components/SlidePreview";
import type { DeckBrief, SlideSpec, StoryOutline } from "@/lib/types";

type Status = { msg: string; kind: "info" | "error" } | null;

const STORAGE_KEY = "consult-deck-ai:v1";

export default function Home() {
  const [brief, setBrief] = useState<DeckBrief>({
    title: "",
    purpose: "",
    audience: "経営会議",
  });
  const [outline, setOutline] = useState<StoryOutline | null>(null);
  const [slides, setSlides] = useState<SlideSpec[]>([]);
  const [current, setCurrent] = useState(0);
  const [instruction, setInstruction] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>(null);

  // Restore / persist (no DB in MVP).
  useEffect(() => {
    const raw = typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const d = JSON.parse(raw);
        if (d.brief) setBrief(d.brief);
        if (d.outline) setOutline(d.outline);
        if (d.slides) setSlides(d.slides);
      } catch {}
    }
  }, []);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ brief, outline, slides }));
  }, [brief, outline, slides]);

  async function call<T>(url: string, body: unknown): Promise<T> {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(e.error || `${res.status} ${res.statusText}`);
    }
    return res.json();
  }

  async function genStory() {
    if (!brief.title || !brief.purpose) {
      setStatus({ msg: "タイトルと目的は必須です", kind: "error" });
      return;
    }
    setBusy("ストーリーを生成中…");
    setStatus(null);
    try {
      const { outline } = await call<{ outline: StoryOutline }>("/api/story", brief);
      setOutline(outline);
      setSlides([]);
    } catch (e) {
      setStatus({ msg: msg(e), kind: "error" });
    } finally {
      setBusy(null);
    }
  }

  async function genSlides() {
    if (!outline) return;
    setBusy("スライドを生成中…（執筆→レビュー）");
    setStatus(null);
    try {
      const { slides } = await call<{ slides: SlideSpec[] }>("/api/slides", { brief, outline });
      setSlides(slides);
      setCurrent(0);
    } catch (e) {
      setStatus({ msg: msg(e), kind: "error" });
    } finally {
      setBusy(null);
    }
  }

  async function revise() {
    if (!outline || slides.length === 0 || !instruction.trim()) return;
    setBusy("修正を反映中…");
    setStatus(null);
    try {
      const { slides: next } = await call<{ slides: SlideSpec[] }>("/api/revise", {
        deck: { brief, outline, slides },
        instruction,
      });
      setSlides(next);
      setInstruction("");
      setStatus({ msg: "修正を反映しました", kind: "info" });
    } catch (e) {
      setStatus({ msg: msg(e), kind: "error" });
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
        body: JSON.stringify({ brief, outline, slides }),
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
      setStatus({ msg: msg(e), kind: "error" });
    } finally {
      setBusy(null);
    }
  }

  // Outline editing helpers
  const sections = outline?.sections ?? [];
  function updateSection(i: number, patch: Partial<(typeof sections)[number]>) {
    if (!outline) return;
    const next = sections.map((s, j) => (j === i ? { ...s, ...patch } : s));
    setOutline({ sections: next });
  }
  function moveSection(i: number, dir: -1 | 1) {
    if (!outline) return;
    const j = i + dir;
    if (j < 0 || j >= sections.length) return;
    const next = [...sections];
    [next[i], next[j]] = [next[j], next[i]];
    setOutline({ sections: next });
  }
  function deleteSection(i: number) {
    if (!outline) return;
    setOutline({ sections: sections.filter((_, j) => j !== i) });
  }
  function addSection() {
    setOutline({
      sections: [...sections, { title: "新規セクション", governingMessage: "", purpose: "分析" }],
    });
  }

  return (
    <main style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {/* Sidebar */}
      <aside style={{ width: 380, borderRight: "1px solid #e2e6ee", background: "#fff", display: "flex", flexDirection: "column", overflow: "auto" }}>
        <div style={{ padding: "16px 18px", borderBottom: "1px solid #eef1f6" }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Consult Deck AI</h1>
          <p style={{ fontSize: 12, color: "var(--mid-gray)", margin: "4px 0 0" }}>
            自然言語からコンサル品質の資料を生成
          </p>
        </div>

        <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Step 1: Brief */}
          <Section title="1. 依頼内容">
            <Field label="タイトル *">
              <input style={inp} value={brief.title} onChange={(e) => setBrief({ ...brief, title: e.target.value })} placeholder="例: EV充電事業の市場性・収益性分析" />
            </Field>
            <Field label="目的 *">
              <textarea style={{ ...inp, height: 60 }} value={brief.purpose} onChange={(e) => setBrief({ ...brief, purpose: e.target.value })} placeholder="例: 新規事業としての参入可否を経営会議で意思決定する" />
            </Field>
            <Field label="想定読者">
              <input style={inp} value={brief.audience} onChange={(e) => setBrief({ ...brief, audience: e.target.value })} />
            </Field>
            <div style={{ display: "flex", gap: 8 }}>
              <Field label="ページ数">
                <input style={inp} type="number" value={brief.pageCount ?? ""} onChange={(e) => setBrief({ ...brief, pageCount: e.target.value ? Number(e.target.value) : undefined })} placeholder="例: 12" />
              </Field>
              <Field label="トーン">
                <input style={inp} value={brief.tone ?? ""} onChange={(e) => setBrief({ ...brief, tone: e.target.value || undefined })} placeholder="例: 論理的・端的" />
              </Field>
            </div>
            <Field label="補足（自由記述）">
              <textarea style={{ ...inp, height: 50 }} value={brief.notes ?? ""} onChange={(e) => setBrief({ ...brief, notes: e.target.value || undefined })} />
            </Field>
            <button style={btnPrimary} onClick={genStory} disabled={!!busy}>
              ストーリー生成
            </button>
          </Section>

          {/* Step 2: Outline */}
          {outline && (
            <Section title="2. ストーリー構成">
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {sections.map((s, i) => (
                  <div key={i} style={{ border: "1px solid #e2e6ee", borderRadius: 6, padding: 8 }}>
                    <div style={{ display: "flex", gap: 4, alignItems: "center", marginBottom: 4 }}>
                      <span style={{ fontSize: 11, color: "var(--accent)", fontWeight: 700 }}>{s.purpose}</span>
                      <span style={{ marginLeft: "auto", display: "flex", gap: 2 }}>
                        <IconBtn onClick={() => moveSection(i, -1)}>↑</IconBtn>
                        <IconBtn onClick={() => moveSection(i, 1)}>↓</IconBtn>
                        <IconBtn onClick={() => deleteSection(i)}>✕</IconBtn>
                      </span>
                    </div>
                    <input style={{ ...inp, fontWeight: 700 }} value={s.title} onChange={(e) => updateSection(i, { title: e.target.value })} />
                    <textarea style={{ ...inp, height: 44, marginTop: 4 }} value={s.governingMessage} onChange={(e) => updateSection(i, { governingMessage: e.target.value })} placeholder="言い切りメッセージ" />
                  </div>
                ))}
                <button style={btnGhost} onClick={addSection}>＋ セクション追加</button>
                <button style={btnPrimary} onClick={genSlides} disabled={!!busy}>スライド生成</button>
              </div>
            </Section>
          )}

          {/* Step 4: Chat revise */}
          {slides.length > 0 && (
            <Section title="3. チャットで修正">
              <textarea style={{ ...inp, height: 60 }} value={instruction} onChange={(e) => setInstruction(e.target.value)} placeholder="例: 4ページ目の市場分析を強化 / 財務観点を追加" />
              <button style={btnPrimary} onClick={revise} disabled={!!busy || !instruction.trim()}>修正を反映</button>
            </Section>
          )}
        </div>
      </aside>

      {/* Main: preview */}
      <section style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ height: 56, borderBottom: "1px solid #e2e6ee", background: "#fff", display: "flex", alignItems: "center", padding: "0 20px", gap: 14 }}>
          <strong style={{ fontSize: 14 }}>{brief.title || "（無題）"}</strong>
          <span style={{ fontSize: 12, color: "var(--mid-gray)" }}>{slides.length > 0 ? `${slides.length} スライド` : ""}</span>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
            {busy && <span style={{ fontSize: 12, color: "var(--mid-gray)" }}>{busy}</span>}
            <button style={{ ...btnPrimary, width: "auto", padding: "8px 16px", opacity: slides.length ? 1 : 0.5 }} onClick={exportPptx} disabled={!!busy || slides.length === 0}>
              PowerPoint 出力
            </button>
          </div>
        </div>

        {status && (
          <div style={{ padding: "8px 20px", fontSize: 13, background: status.kind === "error" ? "#fdecec" : "#eef6ee", color: status.kind === "error" ? "#a12" : "#264" }}>
            {status.msg}
          </div>
        )}

        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          {/* Thumbnails */}
          {slides.length > 0 && (
            <div style={{ width: 200, borderRight: "1px solid #e2e6ee", overflow: "auto", padding: 10, display: "flex", flexDirection: "column", gap: 8, background: "#fff" }}>
              {slides.map((s, i) => (
                <button key={i} onClick={() => setCurrent(i)} style={{ border: i === current ? "2px solid var(--navy)" : "1px solid #e2e6ee", borderRadius: 6, padding: 0, background: "transparent", cursor: "pointer", textAlign: "left" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "2px 6px" }}>
                    <span style={{ fontSize: 10, color: "var(--mid-gray)" }}>{i + 1}</span>
                    <span style={{ fontSize: 10, color: "var(--mid-gray)", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{s.title}</span>
                  </div>
                  <div style={{ pointerEvents: "none", padding: 4 }}>
                    <SlidePreview spec={s} />
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Main preview */}
          <div style={{ flex: 1, overflow: "auto", display: "grid", placeItems: "center", padding: 32 }}>
            {slides.length > 0 ? (
              <div style={{ width: "min(100%, 900px)" }}>
                <SlidePreview spec={slides[current]} />
                {slides[current]?.notes && (
                  <div style={{ marginTop: 12, fontSize: 12, color: "var(--mid-gray)", background: "#fff", padding: 12, borderRadius: 6 }}>
                    <strong>ノート: </strong>{slides[current].notes}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ color: "var(--mid-gray)", textAlign: "center", maxWidth: 420 }}>
                <p style={{ fontSize: 15 }}>左で依頼内容を入力し、<br />「ストーリー生成 → スライド生成」へ進んでください。</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function msg(e: unknown) {
  return e instanceof Error ? e.message : "エラーが発生しました";
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
function IconBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{ width: 22, height: 22, borderRadius: 4, border: "1px solid #e2e6ee", background: "#fff", cursor: "pointer", fontSize: 11, color: "var(--mid-gray)" }}>
      {children}
    </button>
  );
}

const inp: React.CSSProperties = {
  width: "100%",
  border: "1px solid #d8deea",
  borderRadius: 6,
  padding: "7px 9px",
  fontSize: 13,
  fontFamily: "inherit",
  color: "var(--navy)",
  background: "#fff",
  boxSizing: "border-box",
  resize: "vertical",
};
const btnPrimary: React.CSSProperties = {
  width: "100%",
  background: "var(--navy)",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  padding: "10px",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};
const btnGhost: React.CSSProperties = {
  width: "100%",
  background: "#fff",
  color: "var(--navy)",
  border: "1px dashed #c2cad8",
  borderRadius: 6,
  padding: "8px",
  fontSize: 12,
  cursor: "pointer",
};
