/**
 * Backtest of the RSI2-in-trend family (lib/forex-bot/meanrev.ts) on OANDA history via MT5.
 *   node scripts/forex-bot.cjs meanrev
 * Writes .forgeos/forex-bot/meanrev-latest.json and meanrev-YYYY-MM-DD.md. Locked results are kept.
 */

import fs from "node:fs";
import path from "node:path";
import { fxBotDir } from "@/lib/forex-bot/journal";
import { mt5Candles, mt5Configured, mt5SymbolInfo } from "@/lib/forex-bot/mt5";
import { evaluateMr, MR_GATE, mrSpecs, type MrResult, type MrSpec } from "@/lib/forex-bot/meanrev";
import type { FxCandle } from "@/lib/forex-bot/types";

const WANT = { H1: 30000, H4: 8000 } as const;
const cache = new Map<string, { bars: FxCandle[]; symbol: string | null; spread: number }>();

async function history(spec: MrSpec): Promise<{ bars: FxCandle[]; symbol: string | null; spread: number }> {
  const key = `${spec.instrument}:${spec.tf}`;
  const hit = cache.get(key);
  if (hit) return hit;
  let res: { bars: FxCandle[]; symbol: string | null; spread: number } = { bars: [], symbol: null, spread: spec.spread };
  outer: for (const base of spec.symbols) {
    for (const n of [WANT[spec.tf], Math.floor(WANT[spec.tf] * 0.6), Math.floor(WANT[spec.tf] * 0.3)]) {
      try {
        const bars = await mt5Candles(base, spec.tf, n);
        if (bars.length < 1000) continue;
        const info = await mt5SymbolInfo(base).catch(() => null);
        const live = info?.bid && info?.ask ? info.ask - info.bid : 0;
        res = { bars, symbol: info?.symbol ?? base, spread: Math.max(spec.spread, live) };
        break outer;
      } catch (err) {
        console.warn(`[RSI2] ${spec.instrument} ${spec.tf} ${base} ${n}: ${err instanceof Error ? err.message.slice(0, 80) : err}`);
      }
    }
  }
  cache.set(key, res);
  return res;
}

const d = (s: number) => (s ? new Date(s * 1000).toISOString().slice(0, 10) : "—");
const pct = (x: number) => `${(x * 100).toFixed(0)}%`;

async function main(): Promise<void> {
  if (!mt5Configured()) throw new Error("MT5 no configurado");
  const file = path.join(fxBotDir(), "meanrev-latest.json");
  let prev: MrResult[] = [];
  try { prev = (JSON.parse(fs.readFileSync(file, "utf8")) as { results: MrResult[] }).results ?? []; } catch { /* first run */ }
  const results: MrResult[] = [];
  for (const spec of mrSpecs()) {
    const locked = prev.find((r) => r.id === spec.id && r.locked);
    if (locked) { results.push(locked); continue; }
    const { bars, symbol, spread } = await history(spec);
    if (!bars.length) { console.log(`[RSI2] ${spec.id}: sin historia`); continue; }
    const r = evaluateMr(spec, bars, spread, symbol);
    results.push(r);
    if (spec.entry === "LMT") console.log(`[RSI2] ${spec.id}: ops=${r.all.trades} acierto=${pct(r.all.winRate)} PF=${r.all.pf.toFixed(2)} media=${r.all.meanR.toFixed(3)}R → ${r.liveEligible ? "APTA" : r.reason}`);
  }
  const generatedAt = new Date().toISOString();
  fs.writeFileSync(file, JSON.stringify({ generatedAt, gate: MR_GATE, results }, null, 2));
  const lmt = results.filter((r) => r.entry === "LMT");
  const mkt = new Map(results.filter((r) => r.entry === "MKT").map((r) => [`${r.instrument}:${r.tf}`, r]));
  const lines = [
    `# RSI2 en tendencia (Connors) — H1/H4 — backtest ${generatedAt.slice(0, 10)}`,
    ``,
    `Datos OANDA (MT5). Entrada limitada 0,25 ATR mejor que el cierre (variante principal); la de mercado se muestra para comparar.`,
    `Apta: ≥${MR_GATE.minTrades} ops, PF ≥ ${MR_GATE.minPF}, media ≥ ${MR_GATE.minMeanR} R, positiva en ambas mitades y con costes ×${MR_GATE.stress}.`,
    ``,
    `| Instrumento | Marco | Ops | Acierto | Gan. media | Pérd. media | PF | Media R | 1ª mitad | 2ª mitad | Costes ×1.5 | Mercado (PF / media) | ¿Apta? |`,
    `|---|---|---|---|---|---|---|---|---|---|---|---|---|`,
    ...lmt.map((r) => {
      const m = mkt.get(`${r.instrument}:${r.tf}`);
      return `| ${r.instrument}${r.locked ? " 🔒" : ""} | ${r.tf} | ${r.all.trades} | ${pct(r.all.winRate)} | ${r.all.avgWinR.toFixed(2)}R | ${r.all.avgLossR.toFixed(2)}R | ${r.all.pf.toFixed(2)} | ${r.all.meanR.toFixed(3)} | ${r.firstHalf.meanR.toFixed(3)} | ${r.secondHalf.meanR.toFixed(3)} | ${r.stressed.meanR.toFixed(3)} | ${m ? `${m.all.pf.toFixed(2)} / ${m.all.meanR.toFixed(3)}` : "—"} | ${r.liveEligible ? "sí" : `no (${r.reason})`} |`;
    }),
  ];
  fs.writeFileSync(path.join(fxBotDir(), `meanrev-${generatedAt.slice(0, 10)}.md`), lines.join("\n"));
  console.log(lines.join("\n"));
}

main().then(() => process.exit(0)).catch((err) => {
  console.error("[RSI2] error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
