import { CSS_COLORS, WEB_FONT_STACK } from "@/lib/brand";
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
      <div style={{ color: CSS_COLORS.accent, fontSize: "clamp(8px,1.1vw,11px)", fontWeight: 700, letterSpacing: 1.5 }}>
        {spec.title.toUpperCase()}
      </div>
      <div style={{ color: CSS_COLORS.navy, fontSize: "clamp(12px,1.9vw,19px)", fontWeight: 700, lineHeight: 1.3, marginTop: "0.6%" }}>
        {spec.lead}
      </div>
      <div style={{ height: 1, background: CSS_COLORS.lightGray, margin: "2.5% 0" }} />
      <div style={{ flex: 1, minHeight: 0 }}>
        <Body spec={spec} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", color: CSS_COLORS.midGray, fontSize: "clamp(7px,0.9vw,9px)", marginTop: "2%" }}>
        <span>Consult Deck AI</span>
      </div>
    </div>
  );
}

function Body({ spec }: { spec: SlideSpec }) {
  if (spec.layout === "kpi" && spec.kpis?.length) {
    return (
      <div style={{ display: "flex", gap: "3%", height: "100%", alignItems: "center" }}>
        {spec.kpis.slice(0, 4).map((k, i) => (
          <div key={i} style={{ flex: 1, background: CSS_COLORS.lightGray, borderRadius: 6, padding: "6% 4%", textAlign: "center" }}>
            <div style={{ color: CSS_COLORS.navy, fontWeight: 700, fontSize: "clamp(16px,3vw,32px)" }}>{k.value}</div>
            <div style={{ color: CSS_COLORS.midGray, fontSize: "clamp(8px,1.1vw,12px)", marginTop: "8%" }}>{k.label}</div>
          </div>
        ))}
      </div>
    );
  }

  if (spec.layout === "two-column" && spec.columns?.length) {
    return (
      <div style={{ display: "flex", gap: "4%", height: "100%" }}>
        {spec.columns.slice(0, 2).map((col, i) => (
          <div key={i} style={{ flex: 1 }}>
            <div style={{ background: CSS_COLORS.lightGray, color: CSS_COLORS.navy, fontWeight: 700, fontSize: "clamp(9px,1.3vw,13px)", padding: "2% 4%", borderRadius: 4 }}>
              {col.heading}
            </div>
            <BulletList bullets={col.bullets} />
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

  return <BulletList bullets={spec.bullets ?? []} />;
}

function BulletList({ bullets }: { bullets: SlideSpec["bullets"] }) {
  return (
    <ul style={{ margin: "3% 0 0", paddingLeft: "4%", color: CSS_COLORS.navy, fontSize: "clamp(9px,1.3vw,13px)", lineHeight: 1.5 }}>
      {(bullets ?? []).map((b, i) => (
        <li key={i} style={{ marginBottom: "1.5%", listStyle: "disc" }}>
          {b.text}
          {b.sub?.length ? (
            <ul style={{ paddingLeft: "5%", color: CSS_COLORS.midGray, fontSize: "0.9em", marginTop: "0.5%" }}>
              {b.sub.map((s, j) => (
                <li key={j} style={{ listStyle: "circle" }}>{s}</li>
              ))}
            </ul>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function ChartPreview({ chart }: { chart: NonNullable<SlideSpec["chart"]> }) {
  const all = chart.series.flatMap((s) => s.values);
  const max = Math.max(1, ...all);
  const palette = [CSS_COLORS.navy, CSS_COLORS.accent, CSS_COLORS.midGray];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: "2%", paddingTop: "2%" }}>
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
            <div style={{ fontSize: "clamp(7px,0.9vw,10px)", color: CSS_COLORS.midGray, marginTop: 3 }}>{cat}</div>
          </div>
        ))}
      </div>
      {chart.note && <div style={{ fontSize: "clamp(7px,0.85vw,9px)", color: CSS_COLORS.midGray, fontStyle: "italic", marginTop: "2%" }}>※ {chart.note}</div>}
    </div>
  );
}

function DiagramPreview({ diagram }: { diagram: NonNullable<SlideSpec["diagram"]> }) {
  const items = diagram.items;
  if (diagram.type === "process") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "1%", height: "100%" }}>
        {items.slice(0, 5).map((it, i) => (
          <div key={i} style={{ display: "contents" }}>
            <div style={{ flex: 1, background: i % 2 === 0 ? CSS_COLORS.navy : CSS_COLORS.accent, color: "#fff", fontWeight: 700, fontSize: "clamp(8px,1.1vw,12px)", borderRadius: 6, padding: "4% 2%", textAlign: "center" }}>
              {it}
            </div>
            {i < Math.min(items.length, 5) - 1 && <span style={{ color: CSS_COLORS.midGray, fontWeight: 700 }}>›</span>}
          </div>
        ))}
      </div>
    );
  }
  if (diagram.type === "pyramid") {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, height: "100%" }}>
        {items.slice(0, 4).map((it, i, arr) => (
          <div key={i} style={{ width: `${40 + ((i + 1) / arr.length) * 55}%`, background: i === 0 ? CSS_COLORS.accent : CSS_COLORS.navy, color: "#fff", textAlign: "center", fontSize: "clamp(8px,1.1vw,12px)", fontWeight: 700, padding: "1.5% 0", borderRadius: 3 }}>
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
        <div key={i} style={{ background: i % 3 === 0 ? CSS_COLORS.navy : CSS_COLORS.lightGray, color: i % 3 === 0 ? "#fff" : CSS_COLORS.navy, display: "grid", placeItems: "center", textAlign: "center", fontWeight: 700, fontSize: "clamp(8px,1.1vw,12px)", padding: "4%", borderRadius: 4 }}>
          {items[i] ?? ""}
        </div>
      ))}
    </div>
  );
}
