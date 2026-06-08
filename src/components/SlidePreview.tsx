import { CSS_COLORS, WEB_FONT_STACK } from "@/lib/brand";
import { iconGlyph } from "@/lib/icons";
import type { SlideSpec } from "@/lib/types";

/**
 * HTML mirror of the pptx renderer. Reads the same SlideSpec + brand tokens so
 * the on-screen preview tracks the exported file. 16:9, scales to its container.
 */
export function SlidePreview({ spec }: { spec: SlideSpec }) {
  const base: React.CSSProperties = {
    fontFamily: WEB_FONT_STACK,
    aspectRatio: "16 / 9",
    width: "100%",
    boxShadow: "0 1px 8px rgba(31,42,68,0.12)",
    borderRadius: 6,
    overflow: "hidden",
    position: "relative",
  };

  if (spec.layout === "title") {
    return (
      <div style={{ ...base, background: CSS_COLORS.navy, padding: "8% 7%" }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "2%", background: CSS_COLORS.accent }} />
        <div style={{ position: "absolute", bottom: "32%", left: "7%", right: "7%" }}>
          <div style={{ color: "#fff", fontSize: "clamp(16px,3.2vw,34px)", fontWeight: 700, lineHeight: 1.25 }}>{spec.title}</div>
          {spec.lead && <div style={{ color: CSS_COLORS.lightGray, fontSize: "clamp(10px,1.6vw,16px)", marginTop: "1.5%" }}>{spec.lead}</div>}
        </div>
      </div>
    );
  }

  if (spec.layout === "section-divider") {
    return (
      <div style={{ ...base, background: CSS_COLORS.navy, display: "grid", placeItems: "center", textAlign: "center" }}>
        <div>
          <div style={{ color: "#fff", fontSize: "clamp(15px,2.8vw,30px)", fontWeight: 700 }}>{spec.title}</div>
          <div style={{ width: 56, height: 3, background: CSS_COLORS.accent, margin: "3% auto 0" }} />
        </div>
      </div>
    );
  }

  if (spec.layout === "image-cover") {
    return (
      <div style={{ ...base, background: "#fff", display: "grid", placeItems: "center" }}>
        {spec.image?.src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={spec.image.src} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
        ) : (
          <div style={{ display: "grid", placeItems: "center", width: "92%", height: "88%", border: `1.5px dashed ${CSS_COLORS.midGray}`, borderRadius: 6, color: CSS_COLORS.midGray, fontSize: "clamp(8px,1.1vw,12px)", textAlign: "center", padding: "4%" }}>
            画像をドロップ / 貼り付け（スライド全面に配置されます）
          </div>
        )}
      </div>
    );
  }

  if (spec.layout === "closing") {
    return (
      <div style={{ ...base, background: CSS_COLORS.navy, display: "grid", placeItems: "center", padding: "8%", textAlign: "center" }}>
        <div style={{ color: "#fff", fontSize: "clamp(14px,2.4vw,26px)", fontWeight: 700, lineHeight: 1.35 }}>{spec.lead || spec.title}</div>
      </div>
    );
  }

  // Content frame (shared header + footer)
  return (
    <div style={{ ...base, background: "#fff", padding: "5% 5.5%", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "1.2%" }}>
        <span style={{ width: "0.9%", minWidth: 3, height: "1.3em", background: CSS_COLORS.accent, flexShrink: 0 }} />
        <div style={{ color: CSS_COLORS.accent, fontSize: "clamp(8px,1.1vw,11px)", fontWeight: 700, letterSpacing: /^[\x00-\x7F]*$/.test(spec.title) ? 2 : 0.5 }}>
          {/^[\x00-\x7F]*$/.test(spec.title) ? spec.title.toUpperCase() : spec.title}
        </div>
      </div>
      <div style={{ color: CSS_COLORS.navy, fontSize: "clamp(12px,2vw,21px)", fontWeight: 700, lineHeight: 1.28, marginTop: "0.8%" }}>
        {spec.lead}
      </div>
      {/* Two-tone rule: short gold over a full hairline. */}
      <div style={{ position: "relative", height: 1.5, margin: "2.5% 0", background: CSS_COLORS.border }}>
        <div style={{ position: "absolute", left: 0, top: 0, width: "12%", height: 2.5, background: CSS_COLORS.accent }} />
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <Body spec={spec} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `1px solid ${CSS_COLORS.border}`, paddingTop: "1.5%", color: CSS_COLORS.midGray, fontSize: "clamp(7px,0.9vw,9px)", marginTop: "2%" }}>
        <span>Consult Deck AI</span>
      </div>
    </div>
  );
}

function Body({ spec }: { spec: SlideSpec }) {
  if (spec.layout === "kpi" && spec.kpis?.length) {
    return (
      <div style={{ display: "flex", gap: "3%", height: "100%", alignItems: "center" }}>
        {spec.kpis.slice(0, 4).map((k, i) => {
          const glyph = iconGlyph(k.icon);
          return (
            <div
              key={i}
              style={{
                flex: 1,
                alignSelf: "stretch",
                maxHeight: "84%",
                background: CSS_COLORS.paleBlue,
                border: `1px solid ${CSS_COLORS.border}`,
                borderRadius: 4,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "6% 4%",
                textAlign: "center",
              }}
            >
              {glyph && <div style={{ color: CSS_COLORS.primary, fontSize: "clamp(11px,1.8vw,18px)", marginBottom: "4%" }}>{glyph}</div>}
              <div style={{ color: CSS_COLORS.primaryDark, fontWeight: 700, fontSize: "clamp(16px,3.2vw,34px)", lineHeight: 1.05 }}>{k.value}</div>
              <div style={{ color: CSS_COLORS.text, fontWeight: 700, fontSize: "clamp(8px,1.1vw,12px)", marginTop: "6%" }}>{k.label}</div>
              {k.caption && <div style={{ color: CSS_COLORS.gray, fontSize: "clamp(7px,0.85vw,10px)", marginTop: "3%" }}>{k.caption}</div>}
            </div>
          );
        })}
      </div>
    );
  }

  if (spec.layout === "table" && spec.table?.headers.length) {
    return <TablePreview table={spec.table} />;
  }

  if (spec.layout === "two-column" && spec.columns?.length) {
    return (
      <div style={{ display: "flex", gap: "4%", height: "100%" }}>
        {spec.columns.slice(0, 2).map((col, i) => (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
            <div style={{ background: CSS_COLORS.primary, color: "#fff", fontWeight: 700, fontSize: "clamp(9px,1.3vw,13px)", padding: "2.5% 4%", borderRadius: "3px 3px 0 0" }}>
              {col.heading}
            </div>
            <div style={{ flex: 1, background: CSS_COLORS.lightGray, border: `1px solid ${CSS_COLORS.border}`, borderTop: "none", borderRadius: "0 0 3px 3px", padding: "2% 4%", minHeight: 0, overflow: "hidden" }}>
              <BulletList bullets={col.bullets} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (spec.layout === "chart" && spec.chart) {
    return <ChartPreview chart={spec.chart} />;
  }

  if (spec.layout === "diagram" && spec.diagram) {
    return <DiagramPreview diagram={spec.diagram} />;
  }

  if (spec.layout === "image-full") {
    return (
      <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
        <ImageBox src={spec.image?.src} style={{ flex: 1 }} />
        {spec.image?.caption && (
          <div style={{ fontSize: "clamp(7px,0.85vw,9px)", color: CSS_COLORS.midGray, fontStyle: "italic", textAlign: "center", marginTop: "1.5%" }}>
            {spec.image.caption}
          </div>
        )}
      </div>
    );
  }

  if (spec.layout === "image-right") {
    return (
      <div style={{ display: "flex", gap: "4%", height: "100%" }}>
        <div style={{ flex: 1 }}>
          <BulletList bullets={spec.bullets ?? []} />
        </div>
        <ImageBox src={spec.image?.src} style={{ flex: 1 }} />
      </div>
    );
  }

  return <BulletList bullets={spec.bullets ?? []} />;
}

function ImageBox({ src, style }: { src?: string; style?: React.CSSProperties }) {
  if (src) {
    return (
      <div style={{ ...style, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: 4 }} />
      </div>
    );
  }
  return (
    <div style={{ ...style, display: "grid", placeItems: "center", border: `1.5px dashed ${CSS_COLORS.midGray}`, borderRadius: 6, color: CSS_COLORS.midGray, fontSize: "clamp(8px,1.1vw,12px)", textAlign: "center", padding: "4%" }}>
      画像をドロップ / 貼り付け
    </div>
  );
}

function BulletList({ bullets }: { bullets: SlideSpec["bullets"] }) {
  return (
    <ul style={{ margin: "3% 0 0", paddingLeft: "4%", color: CSS_COLORS.text, fontSize: "clamp(9px,1.3vw,13px)", lineHeight: 1.5 }}>
      {(bullets ?? []).map((b, i) => {
        const glyph = iconGlyph(b.icon);
        return (
          <li key={i} style={{ marginBottom: "1.5%", listStyle: glyph ? "none" : "disc" }}>
            {glyph && <span style={{ color: CSS_COLORS.primary, marginLeft: "-4%", marginRight: "1.5%" }}>{glyph}</span>}
            {b.text}
            {b.sub?.length ? (
              <ul style={{ paddingLeft: "5%", color: CSS_COLORS.gray, fontSize: "0.9em", marginTop: "0.5%" }}>
                {b.sub.map((s, j) => (
                  <li key={j} style={{ listStyle: "circle" }}>{s}</li>
                ))}
              </ul>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function TablePreview({ table }: { table: NonNullable<SlideSpec["table"]> }) {
  const cell: React.CSSProperties = {
    border: `1px solid ${CSS_COLORS.border}`,
    padding: "1.4% 2%",
    fontSize: "clamp(7px,1vw,11px)",
    textAlign: "left",
  };
  return (
    <div style={{ height: "100%", overflow: "hidden", paddingTop: "1%" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
        <thead>
          <tr>
            {table.headers.map((h, i) => (
              <th key={i} style={{ ...cell, background: CSS_COLORS.primary, color: "#fff", fontWeight: 700, textAlign: "center" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((r, ri) => (
            <tr key={ri} style={{ background: ri % 2 === 0 ? "#fff" : CSS_COLORS.lightGray }}>
              {table.headers.map((_, ci) => (
                <td key={ci} style={{ ...cell, color: CSS_COLORS.text, fontWeight: ci === 0 ? 700 : 400, textAlign: ci === 0 ? "left" : "center" }}>{r[ci] ?? ""}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ChartPreview({ chart }: { chart: NonNullable<SlideSpec["chart"]> }) {
  const palette = [CSS_COLORS.primary, CSS_COLORS.navyLight, CSS_COLORS.gray, CSS_COLORS.red];
  const note = chart.note ? (
    <div style={{ fontSize: "clamp(7px,0.85vw,9px)", color: CSS_COLORS.gray, fontStyle: "italic", marginTop: "2%" }}>※ {chart.note}</div>
  ) : null;
  const legend = chart.series.length > 1 || chart.type === "pie" ? (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "3%", marginTop: "2%", fontSize: "clamp(7px,0.9vw,10px)", color: CSS_COLORS.text }}>
      {(chart.type === "pie" ? chart.categories : chart.series.map((s) => s.name)).map((name, i) => (
        <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 9, height: 9, borderRadius: 2, background: palette[i % palette.length] }} />
          {name}
        </span>
      ))}
    </div>
  ) : null;

  // --- Pie -----------------------------------------------------------------
  if (chart.type === "pie") {
    const vals = chart.series[0]?.values ?? [];
    const total = Math.max(1, vals.reduce((a, b) => a + Number(b || 0), 0));
    let acc = 0;
    const stops = vals.map((v, i) => {
      const start = (acc / total) * 360;
      acc += Number(v || 0);
      const end = (acc / total) * 360;
      return `${palette[i % palette.length]} ${start}deg ${end}deg`;
    });
    return (
      <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1, display: "grid", placeItems: "center", minHeight: 0 }}>
          <div style={{ aspectRatio: "1", height: "84%", maxWidth: "84%", borderRadius: "50%", background: `conic-gradient(${stops.join(",")})` }} />
        </div>
        {legend}
        {note}
      </div>
    );
  }

  // --- Line ----------------------------------------------------------------
  if (chart.type === "line") {
    const all = chart.series.flatMap((s) => s.values.map(Number));
    const max = Math.max(1, ...all);
    const n = chart.categories.length;
    const xAt = (i: number) => (n <= 1 ? 50 : (i / (n - 1)) * 100);
    return (
      <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1, minHeight: 0 }}>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: "100%", height: "100%" }}>
            {chart.series.map((s, si) => (
              <polyline
                key={si}
                fill="none"
                stroke={palette[si % palette.length]}
                strokeWidth={1.2}
                vectorEffect="non-scaling-stroke"
                points={s.values.map((v, i) => `${xAt(i)},${100 - (Number(v || 0) / max) * 92 - 4}`).join(" ")}
              />
            ))}
          </svg>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "clamp(7px,0.9vw,10px)", color: CSS_COLORS.gray, marginTop: 3 }}>
          {chart.categories.map((c, i) => <span key={i}>{c}</span>)}
        </div>
        {legend}
        {note}
      </div>
    );
  }

  // --- Bar (default) -------------------------------------------------------
  const all = chart.series.flatMap((s) => s.values.map(Number));
  const max = Math.max(1, ...all);
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: "2%", paddingTop: "2%", minHeight: 0 }}>
        {chart.categories.map((cat, ci) => (
          <div key={ci} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%" }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: "85%" }}>
              {chart.series.map((s, si) => (
                <div
                  key={si}
                  title={`${s.name}: ${s.values[ci]}`}
                  style={{ width: 10, height: `${(Number(s.values[ci] ?? 0) / max) * 100}%`, background: palette[si % palette.length], borderRadius: "2px 2px 0 0" }}
                />
              ))}
            </div>
            <div style={{ fontSize: "clamp(7px,0.9vw,10px)", color: CSS_COLORS.gray, marginTop: 3 }}>{cat}</div>
          </div>
        ))}
      </div>
      {legend}
      {note}
    </div>
  );
}

function DiagramPreview({ diagram }: { diagram: NonNullable<SlideSpec["diagram"]> }) {
  const items = diagram.items;
  if (diagram.type === "process") {
    const shown = items.slice(0, 6);
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "1%", height: "100%" }}>
        {shown.map((it, i) => (
          <div key={i} style={{ display: "contents" }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "8%" }}>
              <div style={{ aspectRatio: "1", width: "min(46%, 56px)", borderRadius: "50%", background: CSS_COLORS.primary, color: "#fff", fontWeight: 700, fontSize: "clamp(10px,1.6vw,18px)", display: "grid", placeItems: "center" }}>
                {i + 1}
              </div>
              <div style={{ color: CSS_COLORS.text, fontWeight: 700, fontSize: "clamp(8px,1.05vw,12px)", textAlign: "center", lineHeight: 1.2 }}>{it}</div>
            </div>
            {i < shown.length - 1 && <span style={{ color: CSS_COLORS.primary, fontWeight: 700, alignSelf: "flex-start", marginTop: "8%" }}>›</span>}
          </div>
        ))}
      </div>
    );
  }
  if (diagram.type === "pyramid") {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, height: "100%" }}>
        {items.slice(0, 4).map((it, i, arr) => (
          <div key={i} style={{ width: `${40 + ((i + 1) / arr.length) * 55}%`, background: i === 0 ? CSS_COLORS.primary : CSS_COLORS.navyLight, color: "#fff", textAlign: "center", fontSize: "clamp(8px,1.1vw,12px)", fontWeight: 700, padding: "1.5% 0", borderRadius: 3 }}>
            {it}
          </div>
        ))}
      </div>
    );
  }
  // matrix
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3%", height: "100%" }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} style={{ background: i % 3 === 0 ? CSS_COLORS.primary : CSS_COLORS.lightGray, border: `1px solid ${CSS_COLORS.border}`, color: i % 3 === 0 ? "#fff" : CSS_COLORS.text, display: "grid", placeItems: "center", textAlign: "center", fontWeight: 700, fontSize: "clamp(8px,1.1vw,12px)", padding: "4%", borderRadius: 4 }}>
          {items[i] ?? ""}
        </div>
      ))}
    </div>
  );
}
