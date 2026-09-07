/**
 * Daily close PDF — P&L bars, trade list, win rate, open positions, NAV sparkline.
 * Pure PDF operators (no pdfkit/jspdf dependency). Valid PDF-1.4 for Telegram attach.
 */

import "server-only";

import fs from "node:fs";
import path from "node:path";

export type DailyCloseTradeLine = {
  symbol: string;
  side: string;
  qty: number;
  price: number;
  pnl: number;
  kind: string | null;
  timestamp: string;
};

export type DailyCloseOpenLine = {
  symbol: string;
  shares: number;
  avgCost: number;
  price: number;
  pnlUsd: number;
  pnlPct: number;
};

export type DailyClosePdfInput = {
  dateKey: string;
  dateLabel: string;
  generatedAtIso: string;
  dailyPnl: number;
  dailyPnlPct: number;
  navUsd: number;
  trades: DailyCloseTradeLine[];
  opens: DailyCloseOpenLine[];
  winRate: number;
  riskReward: string;
  best: DailyCloseTradeLine | null;
  worst: DailyCloseTradeLine | null;
  /** Rough intraday NAV samples (oldest → newest). */
  navSeries: number[];
  /** Per-trade PnL for bar chart (same order as closed sells). */
  tradePnls: number[];
};

function reportsDir(): string {
  const envRoot = process.env.FORGEOS_DATA_DIR?.trim();
  if (envRoot) return path.join(envRoot, ".forgeos", "reports");
  if (fs.existsSync("/var/www/forgeos")) return "/var/www/forgeos/.forgeos/reports";
  return path.resolve(process.cwd(), ".forgeos", "reports");
}

function pdfEscape(raw: string): string {
  return raw
    .replace(/[^\x20-\x7E]/g, "?")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function fmtUsd(n: number): string {
  const abs = Math.abs(n).toFixed(2);
  return n >= 0 ? `+$${abs}` : `-$${abs}`;
}

type DrawCtx = {
  ops: string[];
  y: number;
};

function setFill(ctx: DrawCtx, r: number, g: number, b: number): void {
  ctx.ops.push(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg`);
}

function setStroke(ctx: DrawCtx, r: number, g: number, b: number): void {
  ctx.ops.push(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} RG`);
}

function text(
  ctx: DrawCtx,
  line: string,
  size: number,
  bold = false,
  color?: [number, number, number],
): void {
  if (ctx.y < 40) return;
  if (color) setFill(ctx, color[0], color[1], color[2]);
  else setFill(ctx, 0.1, 0.1, 0.12);
  const font = bold ? "/F2" : "/F1";
  ctx.ops.push("BT");
  ctx.ops.push(`${font} ${size} Tf`);
  ctx.ops.push(`40 ${ctx.y} Td`);
  ctx.ops.push(`(${pdfEscape(line)}) Tj`);
  ctx.ops.push("ET");
  ctx.y -= size + 4;
}

function rect(ctx: DrawCtx, x: number, y: number, w: number, h: number, fill = true): void {
  ctx.ops.push(`${x.toFixed(1)} ${y.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)} re`);
  ctx.ops.push(fill ? "f" : "S");
}

function drawTradeBars(ctx: DrawCtx, pnls: number[]): void {
  if (pnls.length === 0) {
    text(ctx, "(sin operaciones cerradas)", 9);
    return;
  }
  const maxAbs = Math.max(...pnls.map((p) => Math.abs(p)), 1);
  const chartH = 90;
  const chartW = 520;
  const left = 50;
  const baseY = ctx.y - chartH;
  const barW = Math.min(28, chartW / Math.max(pnls.length, 1) - 4);

  setStroke(ctx, 0.7, 0.7, 0.75);
  ctx.ops.push("0.5 w");
  ctx.ops.push(`${left} ${baseY + chartH / 2} m ${left + chartW} ${baseY + chartH / 2} l S`);

  pnls.slice(0, 18).forEach((pnl, i) => {
    const h = (Math.abs(pnl) / maxAbs) * (chartH / 2 - 4);
    const x = left + i * (barW + 4);
    if (pnl >= 0) {
      setFill(ctx, 0.15, 0.65, 0.35);
      rect(ctx, x, baseY + chartH / 2, barW, Math.max(2, h));
    } else {
      setFill(ctx, 0.85, 0.2, 0.25);
      rect(ctx, x, baseY + chartH / 2 - Math.max(2, h), barW, Math.max(2, h));
    }
  });

  ctx.y = baseY - 14;
  text(ctx, "Barras: verde = ganancia | rojo = perdida (P&L por operacion)", 8, false, [0.4, 0.4, 0.45]);
}

function drawNavSparkline(ctx: DrawCtx, series: number[]): void {
  if (series.length < 2) {
    text(ctx, "(NAV intraday: datos insuficientes)", 9);
    return;
  }
  const chartH = 70;
  const chartW = 520;
  const left = 50;
  const bottom = ctx.y - chartH;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = Math.max(max - min, 1);

  setStroke(ctx, 0.85, 0.85, 0.88);
  ctx.ops.push("0.4 w");
  rect(ctx, left, bottom, chartW, chartH, false);

  setStroke(ctx, 0.15, 0.45, 0.85);
  ctx.ops.push("1.2 w");
  const pts = series.map((v, i) => {
    const x = left + (i / (series.length - 1)) * chartW;
    const y = bottom + ((v - min) / span) * (chartH - 8) + 4;
    return { x, y };
  });
  ctx.ops.push(`${pts[0]!.x.toFixed(1)} ${pts[0]!.y.toFixed(1)} m`);
  for (let i = 1; i < pts.length; i += 1) {
    ctx.ops.push(`${pts[i]!.x.toFixed(1)} ${pts[i]!.y.toFixed(1)} l`);
  }
  ctx.ops.push("S");

  ctx.y = bottom - 14;
  text(
    ctx,
    `NAV min $${min.toFixed(0)} | max $${max.toFixed(0)} | fin $${series[series.length - 1]!.toFixed(0)}`,
    8,
    false,
    [0.4, 0.4, 0.45],
  );
}

function drawWinRateBar(ctx: DrawCtx, winRate: number): void {
  const left = 50;
  const w = 400;
  const h = 14;
  const y = ctx.y - h;
  setFill(ctx, 0.9, 0.9, 0.92);
  rect(ctx, left, y, w, h);
  const filled = Math.max(0, Math.min(1, winRate / 100)) * w;
  setFill(ctx, 0.15, 0.55, 0.9);
  rect(ctx, left, y, filled, h);
  ctx.y = y - 16;
  text(ctx, `Win Rate: ${winRate.toFixed(0)}%`, 10, true);
}

function buildContent(input: DailyClosePdfInput): string {
  const ctx: DrawCtx = { ops: [], y: 780 };

  text(ctx, `FORGEOS — Informe diario ${input.dateLabel}`, 16, true);
  text(ctx, `Generado: ${input.generatedAtIso}`, 9, false, [0.45, 0.45, 0.5]);
  ctx.y -= 6;

  text(ctx, "1. Resumen P&L del dia", 12, true);
  const pnlColor: [number, number, number] =
    input.dailyPnl >= 0 ? [0.1, 0.55, 0.3] : [0.75, 0.15, 0.2];
  text(
    ctx,
    `P&L: ${fmtUsd(input.dailyPnl)} (${input.dailyPnlPct >= 0 ? "+" : ""}${input.dailyPnlPct.toFixed(2)}%) | NAV: $${input.navUsd.toFixed(2)}`,
    11,
    true,
    pnlColor,
  );
  text(
    ctx,
    `Ops: ${input.trades.length} | Win rate: ${input.winRate.toFixed(0)}% | R/R: ${input.riskReward}`,
    10,
  );
  if (input.best) {
    text(ctx, `Mejor: ${input.best.symbol} ${fmtUsd(input.best.pnl)}`, 10, false, [0.1, 0.55, 0.3]);
  }
  if (input.worst) {
    text(ctx, `Peor: ${input.worst.symbol} ${fmtUsd(input.worst.pnl)}`, 10, false, [0.75, 0.15, 0.2]);
  }
  ctx.y -= 4;
  drawWinRateBar(ctx, input.winRate);
  ctx.y -= 6;

  text(ctx, "2. Grafica P&L por operacion", 12, true);
  drawTradeBars(ctx, input.tradePnls);
  ctx.y -= 8;

  text(ctx, "3. Evolucion NAV del dia", 12, true);
  drawNavSparkline(ctx, input.navSeries);
  ctx.y -= 8;

  text(ctx, "4. Operaciones del dia", 12, true);
  if (input.trades.length === 0) {
    text(ctx, "(ninguna)", 10);
  } else {
    for (const t of input.trades.slice(0, 40)) {
      const color: [number, number, number] =
        t.pnl >= 0 ? [0.1, 0.55, 0.3] : [0.75, 0.15, 0.2];
      const kind = t.kind ? ` [${t.kind}]` : "";
      text(
        ctx,
        `${t.side} ${t.symbol} x${t.qty} @$${t.price.toFixed(2)}  ${fmtUsd(t.pnl)}${kind}`,
        9,
        false,
        color,
      );
    }
  }
  ctx.y -= 8;

  text(ctx, "5. Posiciones abiertas (P&L flotante)", 12, true);
  if (input.opens.length === 0) {
    text(ctx, "(sin posiciones)", 10);
  } else {
    for (const o of input.opens.slice(0, 25)) {
      const color: [number, number, number] =
        o.pnlUsd >= 0 ? [0.1, 0.55, 0.3] : [0.75, 0.15, 0.2];
      text(
        ctx,
        `${o.symbol} ${Math.floor(o.shares)}acc @$${o.price.toFixed(2)}  ${fmtUsd(o.pnlUsd)} (${o.pnlPct >= 0 ? "+" : ""}${o.pnlPct.toFixed(1)}%)`,
        9,
        false,
        color,
      );
    }
  }

  ctx.y -= 10;
  text(ctx, "ForgeOS App Factory — informe automatico 22:00 Madrid", 8, false, [0.5, 0.5, 0.55]);

  return ctx.ops.join("\n");
}

function assemblePdf(contentStream: string): Buffer {
  const objects: string[] = [];
  objects.push("1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n");
  objects.push("2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n");
  objects.push(
    "3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>endobj\n",
  );
  objects.push(
    `4 0 obj<< /Length ${Buffer.byteLength(contentStream, "utf8")} >>stream\n${contentStream}\nendstream\nendobj\n`,
  );
  objects.push("5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n");
  objects.push("6 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>endobj\n");

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += obj;
  }
  const xrefPos = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i <= objects.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefPos}\n%%EOF\n`;
  return Buffer.from(pdf, "utf8");
}

/** Build daily close PDF buffer. */
export function buildDailyClosePdfBuffer(input: DailyClosePdfInput): Buffer {
  return assemblePdf(buildContent(input));
}

/** Write to `.forgeos/reports/YYYY-MM-DD.pdf` (or FORGEOS_DATA_DIR /var/www/forgeos). */
export function writeDailyClosePdf(input: DailyClosePdfInput): { absolutePath: string; buffer: Buffer } {
  const dir = reportsDir();
  fs.mkdirSync(dir, { recursive: true });
  const absolutePath = path.join(dir, `${input.dateKey}.pdf`);
  const buffer = buildDailyClosePdfBuffer(input);
  fs.writeFileSync(absolutePath, buffer);
  console.log(`[DailyClosePdf] guardado ${absolutePath} (${buffer.length} bytes)`);
  return { absolutePath, buffer };
}
