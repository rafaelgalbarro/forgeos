/**
 * Professional HTML twin for the daily investment report (print CSS).
 * Charts: SVG equity sparklines. Heatmaps: CSS grid. ANALYSIS_ONLY labels preserved.
 */

import type { DailyReportGatherBundle } from "@/lib/investment/daily-report-types";
import type { ReportEquityPoint } from "@/lib/investment/reports-types";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function equitySvg(points: readonly ReportEquityPoint[], label: string): string {
  if (points.length < 2) {
    return `<div class="chart-empty">${esc(label)}: NO_DATA</div>`;
  }
  const vals = points.map((p) => p.equity);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || 1;
  const w = 640;
  const h = 120;
  const d = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * (w - 8) + 4;
      const y = h - 4 - ((p.equity - min) / span) * (h - 8);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return `<figure class="chart"><figcaption>${esc(label)}</figcaption>
<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)}">
  <path d="${d}" fill="none" stroke="#1a3a4a" stroke-width="2"/>
</svg></figure>`;
}

function heatCell(label: string, value: string, intensity: number | null): string {
  if (intensity == null) {
    return `<div class="heat no-data"><span>${esc(label)}</span><strong>NO_DATA</strong></div>`;
  }
  const alpha = Math.max(0.12, Math.min(0.85, intensity));
  return `<div class="heat" style="background:rgba(26,90,110,${alpha.toFixed(2)})"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`;
}

/**
 * Render print-ready HTML for the daily report.
 */
export function renderDailyReportHtml(bundle: DailyReportGatherBundle): string {
  const sectionsHtml = bundle.sections
    .map((sec) => {
      const metrics =
        sec.metrics?.length || sec.indicators?.length
          ? `<div class="metrics">${[...(sec.metrics ?? []), ...(sec.indicators ?? [])]
              .map(
                (m) =>
                  `<div class="metric"><span>${esc(m.label)}</span><strong>${esc(m.value)}</strong></div>`,
              )
              .join("")}</div>`
          : "";
      const lines = `<ul>${sec.lines.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>`;
      const ai = sec.aiConclusions?.length
        ? `<div class="ai"><h3>Conclusiones IA</h3><ul>${sec.aiConclusions
            .map((c) => `<li>${esc(c)}</li>`)
            .join("")}</ul></div>`
        : "";
      const heat = sec.heatmaps?.length
        ? `<div class="heatmap">${sec.heatmaps.map((h) => heatCell(h.label, h.value, h.intensity)).join("")}</div>`
        : "";
      const table = sec.table?.rows.length
        ? `<table><thead><tr>${sec.table.headers.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead>
<tbody>${sec.table.rows
            .map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`)
            .join("")}</tbody></table>`
        : "";
      return `<section class="sec state-${sec.state}" id="${esc(sec.id)}">
  <header><h2>${esc(sec.title)}</h2><span class="badge">${esc(sec.state)}</span></header>
  ${metrics}${lines}${ai}${heat}${table}
</section>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8"/>
<title>ForgeOS Daily Report ${esc(bundle.periodKey)}</title>
<style>
  :root { --ink:#14222a; --muted:#5a6b74; --line:#d5dde2; --bg:#f7f5f1; --accent:#1a5a6e; }
  * { box-sizing: border-box; }
  body { margin:0; font: 12.5px/1.45 "Segoe UI", "Helvetica Neue", sans-serif; color:var(--ink); background:
    radial-gradient(1200px 600px at 10% -10%, #e8eef1 0%, transparent 55%),
    linear-gradient(180deg, #fbfaf7 0%, var(--bg) 40%, #f3f0ea 100%); }
  .sheet { max-width: 920px; margin: 0 auto; padding: 32px 28px 64px; }
  .brand { font-size: 28px; letter-spacing: 0.04em; font-weight: 700; color: var(--accent); }
  .sub { color: var(--muted); margin: 4px 0 18px; }
  .banner { display:flex; flex-wrap:wrap; gap:10px; margin-bottom: 22px; }
  .pill { border:1px solid var(--line); background:#fff; padding:6px 10px; font-size:11px; }
  .pill strong { display:block; font-size:13px; }
  .charts { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin: 12px 0 24px; }
  .chart { background:#fff; border:1px solid var(--line); padding:8px 10px; margin:0; }
  .chart figcaption { font-size:11px; color:var(--muted); margin-bottom:4px; }
  .chart-empty { border:1px dashed var(--line); padding:24px; color:var(--muted); text-align:center; }
  .sec { background:#fff; border:1px solid var(--line); padding:16px 18px; margin: 0 0 14px; break-inside: avoid; }
  .sec header { display:flex; justify-content:space-between; align-items:baseline; gap:12px; border-bottom:1px solid var(--line); padding-bottom:8px; margin-bottom:10px; }
  .sec h2 { margin:0; font-size:15px; }
  .badge { font-size:10px; letter-spacing:0.06em; color:var(--muted); }
  .metrics { display:grid; grid-template-columns: repeat(auto-fill,minmax(140px,1fr)); gap:8px; margin-bottom:10px; }
  .metric { background:#f4f7f8; padding:8px; }
  .metric span { display:block; font-size:10px; color:var(--muted); }
  ul { margin: 0 0 8px; padding-left: 18px; }
  .ai { background:#f0f6f8; border-left:3px solid var(--accent); padding:8px 10px; margin: 8px 0; }
  .ai h3 { margin:0 0 4px; font-size:12px; }
  .heatmap { display:grid; grid-template-columns: repeat(auto-fill,minmax(100px,1fr)); gap:6px; margin:8px 0; }
  .heat { padding:8px; color:#fff; min-height:52px; }
  .heat.no-data { background:#cfd6da; color:var(--ink); }
  .heat span { display:block; font-size:10px; opacity:0.9; }
  table { width:100%; border-collapse: collapse; font-size:11px; margin-top:8px; }
  th, td { border:1px solid var(--line); padding:5px 6px; text-align:left; vertical-align:top; }
  th { background:#eef3f5; }
  footer { margin-top: 28px; color:var(--muted); font-size:11px; }
  @media print {
    body { background:#fff; }
    .sheet { padding: 0; max-width: none; }
    .sec { break-inside: avoid; }
  }
  @media (max-width: 720px) { .charts { grid-template-columns: 1fr; } }
</style>
</head>
<body>
<main class="sheet">
  <div class="brand">ForgeOS Investment</div>
  <div class="sub">Informe diario · ${esc(bundle.periodKey)} · ${esc(bundle.generatedAt)} · ANALYSIS_ONLY · orders disabled</div>
  <div class="banner">
    ${bundle.summaryMetrics
      .map((m) => `<div class="pill"><span>${esc(m.label)}</span><strong>${esc(m.value)}</strong></div>`)
      .join("")}
  </div>
  <div class="charts">
    ${equitySvg(bundle.paperEquityCurve, "Paper equity")}
    ${equitySvg(bundle.shadowEquityCurve, "Shadow equity (hypothetical)")}
  </div>
  ${sectionsHtml}
  <footer>
    <p>${esc(bundle.note)}</p>
    <p>Comparative: paper=${esc(bundle.comparative.paperPnl)} · shadow=${esc(bundle.comparative.shadowPnl)} · matched=${bundle.comparative.matchedCount}</p>
    <p>Sources: ${esc(bundle.sourceSnapshots.join(", "))}</p>
    <p>LIVE_TRADING_ENABLED=false · IBKR read-only analysis · Email delivery stubbed unless INVESTMENT_REPORT_EMAIL_ENABLED=true (phase 2)</p>
  </footer>
</main>
</body>
</html>`;
}
