/**
 * Quicker exits for the OANDA combinations that trade real (forum40-latest.json: locked + liveEligible).
 *   node scripts/forex-bot.cjs f40exits
 * Same entries, same 2×ATR stop; only the exit changes: the current one, fixed take-profit at 1 / 1.5 / 2 R,
 * breakeven at +1 R, and take-profit 1.5 R + breakeven at +0.75 R. Spread as in the backtest (×1.5 stress).
 * Writes .forgeos/forex-bot/f40-exits-latest.json.
 */

import fs from "node:fs";
import path from "node:path";
import { fxBotDir } from "@/lib/forex-bot/journal";
import { mt5Candles, mt5Configured, mt5SymbolInfo } from "@/lib/forex-bot/mt5";
import { mrSpecs } from "@/lib/forex-bot/meanrev";
import { backtestF40, f40Ctx, f40Stats, F40_GATE, F40_RULES, type F40Opts, type F40Result, type F40Tf, type F40Trade } from "@/lib/forex-bot/forum40";
import type { FxCandle } from "@/lib/forex-bot/types";

const WANT: Record<F40Tf, number> = { M15: 25000, M30: 25000, H1: 30000, H4: 8000, D1: 2600 };
const TF_H: Record<F40Tf, number> = { M15: 0.25, M30: 0.5, H1: 1, H4: 4, D1: 24 };
const EXTRA: Record<string, string[]> = { SILVER: ["XAGUSD", "SILVER"], UK100: ["UK100"], JP225: ["JP225", "JPN225"], FR40: ["FR40", "FRA40"], AUS200: ["AUS200", "AU200"], US30: ["US30"], OIL: ["WTI", "USOIL", "XTIUSD"] };

const VARIANTS: Array<{ id: string; label: string; opts: F40Opts }> = [
  { id: "actual", label: "Actual (regla / 3R)", opts: {} },
  { id: "tp1", label: "TP 1R", opts: { tpR: 1 } },
  { id: "tp15", label: "TP 1,5R", opts: { tpR: 1.5 } },
  { id: "tp2", label: "TP 2R", opts: { tpR: 2 } },
  { id: "be1", label: "Breakeven en +1R", opts: { beAtR: 1 } },
  { id: "tp15be", label: "TP 1,5R + BE en +0,75R", opts: { tpR: 1.5, beAtR: 0.75 } },
];

async function history(symbols: string[], tf: F40Tf, minSpread: number): Promise<{ bars: FxCandle[]; spread: number }> {
  for (const base of symbols) {
    for (const n of [WANT[tf], Math.floor(WANT[tf] * 0.6), Math.floor(WANT[tf] * 0.3)]) {
      for (let attempt = 0; attempt < 6; attempt += 1) {
        try {
          const bars = await mt5Candles(base, tf, n);
          if (bars.length < 500) break;
          const info = await mt5SymbolInfo(base).catch(() => null);
          const live = info?.bid && info?.ask ? info.ask - info.bid : 0;
          return { bars, spread: Math.max(minSpread, live) };
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          if (!/fetch failed|ECONNREFUSED|aborted|timeout/i.test(msg)) break;
          await new Promise((r) => setTimeout(r, 30_000));
        }
      }
    }
  }
  return { bars: [], spread: minSpread };
}

function offsetSec(bars: readonly FxCandle[], tf: F40Tf): number {
  const last = bars[bars.length - 1];
  if (!last || (tf !== "M15" && tf !== "M30")) return 0;
  const h = Math.round((last.time + TF_H[tf] * 3600 - Date.now() / 1000) / 3600);
  return Math.abs(h) <= 4 ? h * 3600 : 0;
}

type Cell = { trades: number; winRate: number; meanR: number; totalR: number; h1: number; h2: number; stressed: number; holdH: number; perMonthR: number; ok: boolean };

function cell(t: F40Trade[], st: F40Trade[], bars: readonly FxCandle[], tf: F40Tf): Cell {
  const from = bars[0]!.time; const to = bars[bars.length - 1]!.time; const mid = from + (to - from) / 2;
  const a = f40Stats(t); const h1 = f40Stats(t.filter((q) => q.entryTime < mid)); const h2 = f40Stats(t.filter((q) => q.entryTime >= mid)); const s = f40Stats(st);
  const months = Math.max(1, (to - from) / (30 * 86400));
  const holdH = t.length ? (t.reduce((x, q) => x + (q.bars ?? 0), 0) / t.length) * TF_H[tf] : 0;
  const ok = a.trades >= F40_GATE.minTrades && a.pf >= F40_GATE.minPF && a.meanR >= F40_GATE.minMeanR && h1.meanR > 0 && h2.meanR > 0 && s.meanR > 0;
  return { trades: a.trades, winRate: a.winRate, meanR: a.meanR, totalR: a.totalR, h1: h1.meanR, h2: h2.meanR, stressed: s.meanR, holdH, perMonthR: a.totalR / months, ok };
}

async function main(): Promise<void> {
  if (!mt5Configured()) throw new Error("MT5 no configurado");
  const live = (JSON.parse(fs.readFileSync(path.join(fxBotDir(), "forum40-latest.json"), "utf8")) as { results: F40Result[] }).results
    .filter((r) => r.locked && r.liveEligible);
  const specs = new Map(mrSpecs().map((s) => [s.instrument, s]));
  const out: Array<{ id: string; tf: F40Tf; cells: Record<string, Cell> }> = [];
  for (const row of live) {
    const rule = F40_RULES.find((r) => r.id === row.rule);
    if (!rule) continue;
    const sp = specs.get(row.instrument);
    const symbols = sp?.symbols ?? EXTRA[row.instrument] ?? [row.instrument.replace("_", "")];
    const got = await history(symbols, row.tf, sp?.spread ?? 0);
    if (!got.bars.length) { console.log(`[salidas] ${row.id}: sin historia`); continue; }
    const off = offsetSec(got.bars, row.tf);
    const bars = off ? got.bars.map((b) => ({ ...b, time: b.time - off })) : got.bars;
    const ctx = f40Ctx(bars);
    const cells: Record<string, Cell> = {};
    for (const v of VARIANTS) {
      const t = backtestF40(rule, bars, row.tf, got.spread, got.spread, ctx, v.opts);
      const st = backtestF40(rule, bars, row.tf, got.spread, got.spread * F40_GATE.stress, ctx, v.opts);
      cells[v.id] = cell(t, st, bars, row.tf);
    }
    out.push({ id: row.id, tf: row.tf, cells });
    const best = VARIANTS.filter((v) => cells[v.id]!.ok).sort((a, b) => cells[b.id]!.perMonthR - cells[a.id]!.perMonthR)[0];
    console.log(`[salidas] ${row.id}: ` + VARIANTS.map((v) => `${v.id}=${cells[v.id]!.meanR.toFixed(3)}R/${cells[v.id]!.holdH.toFixed(1)}h${cells[v.id]!.ok ? "" : "✗"}`).join(" ") + ` → mejor: ${best?.id ?? "ninguna"}`);
  }
  fs.writeFileSync(path.join(fxBotDir(), "f40-exits-latest.json"), JSON.stringify({ generatedAt: new Date().toISOString(), variants: VARIANTS, rows: out }, null, 2));

  console.log(`\n## Resumen por variante (${out.length} combinaciones en real)`);
  console.log(`| Variante | Aptas | Acierto medio | Media R/op | R al mes (suma) | Duración media |`);
  console.log(`|---|---|---|---|---|---|`);
  for (const v of VARIANTS) {
    const cs = out.map((o) => o.cells[v.id]!);
    const n = cs.length || 1;
    console.log(`| ${v.label} | ${cs.filter((c) => c.ok).length}/${cs.length} | ${(cs.reduce((s, c) => s + c.winRate, 0) / n * 100).toFixed(0)}% | ${(cs.reduce((s, c) => s + c.meanR, 0) / n).toFixed(3)} | ${cs.reduce((s, c) => s + c.perMonthR, 0).toFixed(2)} | ${(cs.reduce((s, c) => s + c.holdH, 0) / n).toFixed(1)} h |`);
  }
  console.log(`\n## Detalle (media R · acierto · duración · ✗ = deja de pasar el filtro)`);
  console.log(`| Combinación | ${VARIANTS.map((v) => v.label).join(" | ")} |`);
  console.log(`|---|${VARIANTS.map(() => "---").join("|")}|`);
  for (const o of out) {
    console.log(`| ${o.id} | ${VARIANTS.map((v) => { const c = o.cells[v.id]!; return `${c.meanR.toFixed(3)} · ${(c.winRate * 100).toFixed(0)}% · ${c.holdH.toFixed(1)}h${c.ok ? "" : " ✗"}`; }).join(" | ")} |`);
  }
}

main().then(() => process.exit(0)).catch((err) => {
  console.error("[salidas] error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
