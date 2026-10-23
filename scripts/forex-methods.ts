/**
 * Backtest of the published trader methods (lib/forex-bot/methods.ts) on OANDA history via MT5.
 *   node scripts/forex-bot.cjs methods
 * Writes .forgeos/forex-bot/methods-latest.json and methods-YYYY-MM-DD.md. Locked results are kept.
 */

import fs from "node:fs";
import path from "node:path";
import { fxBotDir } from "@/lib/forex-bot/journal";
import { mt5Candles, mt5Configured, mt5SymbolInfo } from "@/lib/forex-bot/mt5";
import { evaluateMethod, M_GATE, METHODS, type MethodResult, type MethodSpec } from "@/lib/forex-bot/methods";
import type { FxCandle } from "@/lib/forex-bot/types";

const WANT: Record<MethodSpec["tf"], number> = { M5: 90000, M15: 40000, D1: 4000 };

async function history(spec: MethodSpec): Promise<{ bars: FxCandle[]; symbol: string | null; spread: number }> {
  for (const base of spec.symbols) {
    for (const n of [WANT[spec.tf], Math.floor(WANT[spec.tf] * 0.6), Math.floor(WANT[spec.tf] * 0.3)]) {
      try {
        const bars = await mt5Candles(base, spec.tf, n);
        if (bars.length < (spec.tf === "D1" ? 400 : 1000)) continue;
        const info = await mt5SymbolInfo(base).catch(() => null);
        const live = info?.bid && info?.ask ? info.ask - info.bid : 0;
        return { bars, symbol: info?.symbol ?? base, spread: Math.max(spec.spread, live) };
      } catch (err) {
        console.warn(`[Métodos] ${spec.id} ${base} ${n}: ${err instanceof Error ? err.message.slice(0, 90) : err}`);
      }
    }
  }
  return { bars: [], symbol: null, spread: spec.spread };
}

const d = (s: number) => (s ? new Date(s * 1000).toISOString().slice(0, 10) : "—");
const pct = (x: number) => `${(x * 100).toFixed(0)}%`;

async function main(): Promise<void> {
  if (!mt5Configured()) throw new Error("MT5 no configurado");
  const file = path.join(fxBotDir(), "methods-latest.json");
  let prev: MethodResult[] = [];
  try { prev = (JSON.parse(fs.readFileSync(file, "utf8")) as { results: MethodResult[] }).results ?? []; } catch { /* first run */ }
  const results: MethodResult[] = [];
  for (const spec of METHODS) {
    const locked = prev.find((r) => r.id === spec.id && r.locked);
    if (locked) { results.push(locked); continue; }
    const { bars, symbol, spread } = await history(spec);
    if (!bars.length) { console.log(`[Métodos] ${spec.id}: sin historia`); continue; }
    const r = evaluateMethod(spec, bars, spread, symbol);
    results.push(r);
    console.log(`[Métodos] ${spec.id} (${symbol}, ${bars.length} velas): ops=${r.all.trades} PF=${r.all.pf.toFixed(2)} media=${r.all.meanR.toFixed(3)}R salidas=${JSON.stringify(r.exits)} → ${r.liveEligible ? "APTA" : r.reason}`);
  }
  const generatedAt = new Date().toISOString();
  fs.writeFileSync(file, JSON.stringify({ generatedAt, gate: M_GATE, results }, null, 2));
  const lines = [
    `# Métodos publicados (Raschke, Lien, Connors) — backtest ${generatedAt.slice(0, 10)}`,
    ``,
    `Datos OANDA (MT5), reglas publicadas sin optimizar, costes reales cobrados en cada entrada y salida.`,
    `Apta: ≥${M_GATE.minTrades} ops (diario ≥${M_GATE.minTradesDaily}), PF ≥ ${M_GATE.minPF}, media ≥ ${M_GATE.minMeanR} R, positiva en ambas mitades y con costes ×${M_GATE.stress}.`,
    ``,
    `| Método | Periodo | Ops | Acierto | PF | Media R | Total R | DD máx R | 1ª mitad | 2ª mitad | Costes ×1.5 | ¿Apta? |`,
    `|---|---|---|---|---|---|---|---|---|---|---|---|`,
    ...results.map((r) =>
      `| ${r.name}${r.locked ? " 🔒" : ""} | ${d(r.from)}→${d(r.to)} | ${r.all.trades} | ${pct(r.all.winRate)} | ${r.all.pf.toFixed(2)} | ${r.all.meanR.toFixed(3)} | ${r.all.totalR.toFixed(1)} | ${r.all.maxDdR.toFixed(1)} | ${r.firstHalf.meanR.toFixed(3)} | ${r.secondHalf.meanR.toFixed(3)} | ${r.stressed.meanR.toFixed(3)} | ${r.liveEligible ? "sí" : `no (${r.reason})`} |`),
  ];
  fs.writeFileSync(path.join(fxBotDir(), `methods-${generatedAt.slice(0, 10)}.md`), lines.join("\n"));
  console.log(lines.join("\n"));
}

main().then(() => process.exit(0)).catch((err) => {
  console.error("[Métodos] error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
