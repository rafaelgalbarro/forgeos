/**
 * The 40-list rules (lib/forex-bot/forum40.ts) on Kraken Futures perpetuals, 1H and 4H, long + short.
 *   node scripts/forex-bot.cjs crypto40 [days=720]
 * Costs: 0.15 % round trip (2 × 0.05 % taker + slippage), ×1.5 in the stress test; 24/7 (no weekend exit).
 * Writes .forgeos/crypto-forum40-latest.json (locked rows are kept).
 */

import fs from "node:fs";
import path from "node:path";
import { parseChartsCandles } from "@/lib/brokers/kraken-futures/charts";
import { evaluateF40, f40Ctx, F40_RULES, type F40Result, type F40Tf } from "@/lib/forex-bot/forum40";
import type { FxCandle } from "@/lib/forex-bot/types";

const ROOT = process.env.FORGEOS_ROOT || process.cwd();
const OUT = path.join(ROOT, ".forgeos", "crypto-forum40-latest.json");
const SYMBOLS = ["PF_XBTUSD", "PF_ETHUSD", "PF_SOLUSD", "PF_XRPUSD", "PF_ADAUSD", "PF_LINKUSD", "PF_DOGEUSD", "PF_AVAXUSD", "PF_LTCUSD", "PF_DOTUSD", "PF_SUIUSD", "PF_NEARUSD"];
export const CRYPTO_COST_PCT = 0.0015;

async function candles(symbol: string, days: number, res: "1h" | "15m"): Promise<FxCandle[]> {
  const step = res === "1h" ? 3600 : 900;
  const out = new Map<number, FxCandle>();
  const now = Math.floor(Date.now() / 1000);
  let from = now - days * 86400;
  for (let guard = 0; guard < 80 && from < now - step; guard += 1) {
    const url = `https://futures.kraken.com/api/charts/v1/trade/${symbol}/${res}?from=${from}&to=${Math.min(now, from + 2000 * step)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(30_000) }).catch(() => null);
    if (!res || !res.ok) { console.warn(`[C40] ${symbol}: HTTP ${res?.status}`); break; }
    const rows = parseChartsCandles(await res.json());
    if (!rows.length) { from += 2000 * step; continue; }
    for (const r of rows) {
      const t = Math.floor(Date.parse(r.time) / 1000);
      out.set(t, { time: t, open: r.open, high: r.high, low: r.low, close: r.close, volume: r.volume });
    }
    const last = Math.floor(Date.parse(rows[rows.length - 1]!.time) / 1000);
    from = Math.max(from + step, last + step);
    await new Promise((r) => setTimeout(r, 250));
  }
  return [...out.values()].sort((a, b) => a.time - b.time);
}

function to4h(b: readonly FxCandle[]): FxCandle[] {
  const out: FxCandle[] = [];
  for (const x of b) {
    const slot = Math.floor(x.time / 14400) * 14400;
    const last = out[out.length - 1];
    if (last && last.time === slot) { last.high = Math.max(last.high, x.high); last.low = Math.min(last.low, x.low); last.close = x.close; last.volume += x.volume; }
    else out.push({ ...x, time: slot });
  }
  return out;
}

async function main(): Promise<void> {
  const days = Math.max(120, Math.min(1500, Number(process.argv[2] ?? 720) || 720));
  let prev: F40Result[] = [];
  try { prev = (JSON.parse(fs.readFileSync(OUT, "utf8")) as { results: F40Result[] }).results ?? []; } catch { /* first run */ }
  // argv[3]: timeframes to (re)run, e.g. "M15" or "H1:H4" (default); other timeframes keep their rows
  const TFS = String(process.argv[3] ?? "H1:H4").toUpperCase().split(/[,:]/).filter((t): t is F40Tf => ["M15", "H1", "H4"].includes(t));
  const results: F40Result[] = prev.filter((r) => !TFS.includes(r.tf));
  for (const sym of SYMBOLS) {
    const sets: Array<[F40Tf, FxCandle[]]> = [];
    if (TFS.includes("H1") || TFS.includes("H4")) {
      const h1 = await candles(sym, days, "1h");
      if (h1.length < 1500) { console.log(`[C40] ${sym}: solo ${h1.length} velas 1h — omitido`); }
      else {
        if (TFS.includes("H1")) sets.push(["H1", h1]);
        if (TFS.includes("H4")) sets.push(["H4", to4h(h1)]);
      }
    }
    if (TFS.includes("M15")) {
      const m15 = await candles(sym, Math.min(days, 365), "15m");
      if (m15.length >= 5000) sets.push(["M15", m15]);
      else console.log(`[C40] ${sym}: solo ${m15.length} velas 15m — omitido`);
    }
    for (const [tf, bars] of sets) {
      const ctx = f40Ctx(bars);
      for (const rule of F40_RULES) {
        const id = `${rule.id}_${sym}_${tf}`;
        const locked = prev.find((r) => r.id === id && r.locked);
        if (locked) { results.push(locked); continue; }
        const r = evaluateF40(rule, sym, tf, bars, 1, ctx, { costPct: CRYPTO_COST_PCT, noWeekend: true });
        results.push({ ...r, id });
      }
      const ok = results.filter((r) => r.instrument === sym && r.tf === tf && r.liveEligible).map((r) => r.rule);
      console.log(`[C40] ${sym} ${tf}: ${bars.length} velas (${new Date(bars[0]!.time * 1000).toISOString().slice(0, 10)} →) → aptas: ${ok.join(", ") || "ninguna"}`);
    }
  }
  fs.writeFileSync(OUT, JSON.stringify({ generatedAt: new Date().toISOString(), costPct: CRYPTO_COST_PCT, results }, null, 2));
  const tested = results.filter((r) => r.all.trades >= 60);
  const pass = results.filter((r) => r.liveEligible);
  console.log(`\npruebas: ${results.length} · con ≥60 ops: ${tested.length} · media > 0: ${tested.filter((r) => r.all.meanR > 0).length} · aptas: ${pass.length}`);
  console.log(`| Id | Ops | Acierto | PF | Media R | 1ª mitad | 2ª mitad | Costes ×1,5 |`);
  console.log(`|---|---|---|---|---|---|---|---|`);
  for (const r of pass.sort((a, b) => b.all.meanR - a.all.meanR).slice(0, 40)) {
    console.log(`| ${r.id} | ${r.all.trades} | ${(r.all.winRate * 100).toFixed(0)}% | ${r.all.pf.toFixed(2)} | ${r.all.meanR.toFixed(3)} | ${r.firstHalf.meanR.toFixed(3)} | ${r.secondHalf.meanR.toFixed(3)} | ${r.stressed.meanR.toFixed(3)} |`);
  }
}

main().then(() => process.exit(0)).catch((err) => {
  console.error("[C40] error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
