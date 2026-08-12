/**
 * Minimal PDF writer (no external deps) for daily investment reports.
 * Text + simple vector charts/heat cells on letter pages.
 */

import type { DailyReportGatherBundle } from "@/lib/investment/daily-report-types";
import type { ReportEquityPoint } from "@/lib/investment/reports-types";

type Op = string;

function pdfEscape(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function sanitize(text: string): string {
  // WinAnsi-ish: drop non-latin1 for built-in Helvetica
  return text
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, "?")
    .replace(/[—–]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'");
}

class MinimalPdf {
  private pages: Op[][] = [];
  private current: Op[] = [];

  constructor(
    private readonly width = 612,
    private readonly height = 792,
  ) {
    this.newPage();
  }

  newPage(): void {
    if (this.current.length) this.pages.push(this.current);
    this.current = [];
  }

  finishPages(): void {
    if (this.current.length) {
      this.pages.push(this.current);
      this.current = [];
    }
  }

  text(x: number, y: number, size: number, raw: string, options?: { bold?: boolean }): void {
    const font = options?.bold ? "F2" : "F1";
    const t = pdfEscape(sanitize(raw).slice(0, 220));
    this.current.push(`BT /${font} ${size} Tf ${x.toFixed(1)} ${y.toFixed(1)} Td (${t}) Tj ET`);
  }

  line(x1: number, y1: number, x2: number, y2: number, gray = 0.2): void {
    this.current.push(`${gray} g ${gray} G ${x1.toFixed(1)} ${y1.toFixed(1)} m ${x2.toFixed(1)} ${y2.toFixed(1)} l S`);
  }

  rect(x: number, y: number, w: number, h: number, fillGray: number): void {
    this.current.push(`${fillGray.toFixed(3)} g ${x.toFixed(1)} ${y.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)} re f`);
  }

  strokeRect(x: number, y: number, w: number, h: number): void {
    this.current.push(`0.55 G ${x.toFixed(1)} ${y.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)} re S`);
  }

  polyline(points: Array<{ x: number; y: number }>, gray = 0.15): void {
    if (points.length < 2) return;
    const [first, ...rest] = points;
    const parts = [`${gray} G ${first!.x.toFixed(1)} ${first!.y.toFixed(1)} m`];
    for (const p of rest) parts.push(`${p.x.toFixed(1)} ${p.y.toFixed(1)} l`);
    parts.push("S");
    this.current.push(parts.join(" "));
  }

  build(): Buffer {
    this.finishPages();
    const objects: string[] = [];
    objects.push("<< /Type /Catalog /Pages 2 0 R >>"); // 1
    // pages object placeholder index 2
    const pageObjectNumbers: number[] = [];
    const contentObjectNumbers: number[] = [];

    // We'll assemble carefully:
    // 1 Catalog, 2 Pages, 3 F1, 4 F2, then pairs of Page+Content
    objects.push(""); // placeholder for Pages
    objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
    objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");

    for (const ops of this.pages) {
      const stream = ops.join("\n");
      const contentObj = `<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream`;
      objects.push(contentObj);
      const contentNum = objects.length; // 1-based later
      contentObjectNumbers.push(contentNum);
      const pageObj = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${this.width} ${this.height}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentNum} 0 R >>`;
      objects.push(pageObj);
      pageObjectNumbers.push(objects.length);
    }

    // Fix pages object at index 1 (object 2)
    const kids = pageObjectNumbers.map((n) => `${n} 0 R`).join(" ");
    objects[1] = `<< /Type /Pages /Kids [${kids}] /Count ${pageObjectNumbers.length} >>`;

    let out = "%PDF-1.4\n";
    const offsets: number[] = [0];
    for (let i = 0; i < objects.length; i += 1) {
      offsets.push(Buffer.byteLength(out, "utf8"));
      out += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
    }
    const xrefPos = Buffer.byteLength(out, "utf8");
    out += `xref\n0 ${objects.length + 1}\n`;
    out += "0000000000 65535 f \n";
    for (let i = 1; i <= objects.length; i += 1) {
      out += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
    }
    out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`;
    return Buffer.from(out, "utf8");
  }
}

function drawEquity(
  pdf: MinimalPdf,
  x: number,
  y: number,
  w: number,
  h: number,
  points: readonly ReportEquityPoint[],
  label: string,
): void {
  pdf.strokeRect(x, y, w, h);
  pdf.text(x + 4, y + h + 10, 8, label);
  if (points.length < 2) {
    pdf.text(x + 8, y + h / 2, 9, "NO_DATA");
    return;
  }
  const vals = points.map((p) => p.equity);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || 1;
  const pts = points.map((p, i) => ({
    x: x + 4 + (i / (points.length - 1)) * (w - 8),
    y: y + 4 + ((p.equity - min) / span) * (h - 8),
  }));
  pdf.polyline(pts);
}

/**
 * Render a multi-page PDF buffer from the daily gather bundle.
 */
export function renderDailyReportPdf(bundle: DailyReportGatherBundle): Buffer {
  const pdf = new MinimalPdf();
  const left = 40;
  const right = 572;
  let y = 752;

  const ensure = (need: number) => {
    if (y - need < 40) {
      pdf.newPage();
      y = 752;
      pdf.text(left, y, 9, `ForgeOS Investment — Daily Report ${bundle.periodKey} (cont.)`, {
        bold: true,
      });
      y -= 22;
    }
  };

  pdf.text(left, y, 18, "ForgeOS Investment", { bold: true });
  y -= 22;
  pdf.text(left, y, 11, `Informe diario · ${bundle.periodKey}`);
  y -= 14;
  pdf.text(left, y, 9, `${bundle.generatedAt} · ANALYSIS_ONLY · orders disabled · LIVE_TRADING=false`);
  y -= 18;
  pdf.line(left, y, right, y, 0.7);
  y -= 16;

  for (const m of bundle.summaryMetrics.slice(0, 10)) {
    ensure(14);
    pdf.text(left, y, 9, `${m.label}: ${m.value}`);
    y -= 12;
  }

  y -= 8;
  ensure(110);
  drawEquity(pdf, left, y - 90, 250, 90, bundle.paperEquityCurve, "Paper equity");
  drawEquity(pdf, left + 270, y - 90, 250, 90, bundle.shadowEquityCurve, "Shadow equity");
  y -= 120;

  for (const sec of bundle.sections) {
    ensure(48);
    pdf.text(left, y, 12, sec.title, { bold: true });
    pdf.text(right - 70, y, 8, sec.state);
    y -= 14;
    pdf.line(left, y, right, y, 0.85);
    y -= 12;

    for (const line of sec.lines.slice(0, 14)) {
      ensure(12);
      pdf.text(left, y, 9, `• ${line}`);
      y -= 11;
    }

    if (sec.aiConclusions?.length) {
      ensure(14);
      pdf.text(left, y, 9, "Conclusiones IA:", { bold: true });
      y -= 11;
      for (const c of sec.aiConclusions.slice(0, 6)) {
        ensure(12);
        pdf.text(left + 8, y, 8, c);
        y -= 10;
      }
    }

    if (sec.heatmaps?.length) {
      ensure(36);
      let hx = left;
      const hy = y - 28;
      for (const cell of sec.heatmaps.slice(0, 8)) {
        const gray = cell.intensity == null ? 0.82 : Math.max(0.25, 0.9 - cell.intensity * 0.55);
        pdf.rect(hx, hy, 62, 28, gray);
        pdf.text(hx + 3, hy + 16, 7, cell.label);
        pdf.text(hx + 3, hy + 6, 7, cell.intensity == null ? "NO_DATA" : cell.value);
        hx += 66;
      }
      y -= 40;
    }

    if (sec.table?.rows.length) {
      ensure(16);
      pdf.text(left, y, 8, sec.table.headers.join(" | "), { bold: true });
      y -= 10;
      for (const row of sec.table.rows.slice(0, 12)) {
        ensure(11);
        pdf.text(left, y, 7, row.join(" | "));
        y -= 9;
      }
    }

    y -= 10;
  }

  ensure(40);
  pdf.text(left, y, 8, bundle.note);
  y -= 12;
  pdf.text(
    left,
    y,
    8,
    `Comparative paper=${bundle.comparative.paperPnl} shadow=${bundle.comparative.shadowPnl} · Email stub phase`,
  );

  return pdf.build();
}
