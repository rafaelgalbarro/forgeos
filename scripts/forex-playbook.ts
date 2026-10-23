/**
 * Backtest of the guide's 11 instrument sheets (lib/forex-bot/playbook.ts) on OANDA history via MT5.
 *   node scripts/forex-bot.cjs playbook
 * Fixed rules (nothing fitted): the whole history counts as out-of-sample; robustness via halves
 * and spread ×1.5. Writes .forgeos/forex-bot/playbook-latest.json and playbook-YYYY-MM-DD.md.
 * Confirmed (locked) results are kept as-is.
 */

import fs from "node:fs";
import path from "node:path";
import { fxBotDir } from "@/lib/forex-bot/journal";
import { mt5Candles, mt5Configured, mt5SymbolInfo } from "@/lib/forex-bot/mt5";
import { evaluatePlaybook, PB_GATE, PLAYBOOK, type PlaybookResult, type PlaybookSpec } from "@/lib/forex-bot/playbook";
import type { FxCandle } from "@/lib/forex-bot/types";

async function history(spec: PlaybookSpec): Promise<{ bars: FxCandle[]; symbol: string | null; spread: number }> {
  const want = spec.tfMin === 5 ? 90000 : 40000;
  for (const base of spec.symbols) {
    for (const n of [want, Math.floor(want * 0.6), Math.floor(want * 0.3)]) {
      try {
        const bars = await mt5Candles(base, spec.tfMin === 5 ? "M5" : "M15", n);
        if (bars.length < 1000) continue;
        const info = await mt5SymbolInfo(base).catch(() => null);
        const live = info?.bid && info?.ask ? info.ask - info.bid : 0;
        return { bars, symbol: info?.symbol ?? base, spread: Math.max(spec.spread, live) };
      } catch (err) {
        console.warn(`[Playbook] ${spec.id} ${base} ${n}: ${err instanceof Error ? err.message.slice(0, 90) : err}`);
      }
    }
  }
  return { bars: [], symbol: null, spread: spec.spread };
}

const d = (s: number) => (s ? new Date(s * 1000).toISOString().slice(0, 10) : "—");
const pct = (x: number) => `${(x * 100).toFixed(0)}%`;

async function main(): Promise<void> {
  if (!mt5Configured()) throw new Error("MT5 no configurado");
  const file = path.join(fxBotDir(), "playbook-latest.json");
  let prev: PlaybookResult[] = [];
  try { prev = (JSON.parse(fs.readFileSync(file, "utf8")) as { results: PlaybookResult[] }).results ?? []; } catch { /* first run */ }
  const results: PlaybookResult[] = [];
  for (const spec of PLAYBOOK) {
    const locked = prev.find((r) => r.id === spec.id && r.locked);
    if (locked) { results.push(locked); console.log(`[Playbook] ${spec.id}: confirmada, se mantiene`); continue; }
    const { bars, symbol, spread } = await history(spec);
    if (!bars.length) { console.log(`[Playbook] ${spec.id}: sin historia`); continue; }
    const r = evaluatePlaybook(spec, bars, spread, symbol);
    results.push(r);
    console.log(`[Playbook] ${spec.id} (${symbol}, ${bars.length} velas, spread ${spread}): ops=${r.all.trades} PF=${r.all.pf.toFixed(2)} media=${r.all.meanR.toFixed(3)}R → ${r.liveEligible ? "APTA" : r.reason}`);
  }
  const generatedAt = new Date().toISOString();
  fs.writeFileSync(file, JSON.stringify({ generatedAt, gate: PB_GATE, results }, null, 2));
  const lines = [
    `# Fichas por instrumento — backtest ${generatedAt.slice(0, 10)}`,
    ``,
    `Datos OANDA (MT5). Reglas fijas de la guía, sin optimizar: toda la historia es prueba.`,
    `Apta: ≥${PB_GATE.minTrades} ops, PF ≥ ${PB_GATE.minPF}, media ≥ ${PB_GATE.minMeanR} R, positiva en ambas mitades y con spread ×${PB_GATE.stressSpread}.`,
    ``,
    `| Ficha | Periodo | Ops | Acierto | PF | Media R | Total R | DD máx R | 1ª mitad | 2ª mitad | Spread ×1.5 | ¿Apta? |`,
    `|---|---|---|---|---|---|---|---|---|---|---|---|`,
    ...results.map((r) =>
      `| ${r.name}${r.locked ? " 🔒" : ""} | ${d(r.from)}→${d(r.to)} | ${r.all.trades} | ${pct(r.all.winRate)} | ${r.all.pf.toFixed(2)} | ${r.all.meanR.toFixed(3)} | ${r.all.totalR.toFixed(1)} | ${r.all.maxDdR.toFixed(1)} | ${r.firstHalf.meanR.toFixed(3)} | ${r.secondHalf.meanR.toFixed(3)} | ${r.stressed.meanR.toFixed(3)} | ${r.liveEligible ? "sí" : `no (${r.reason})`} |`),
  ];
  fs.writeFileSync(path.join(fxBotDir(), `playbook-${generatedAt.slice(0, 10)}.md`), lines.join("\n"));
  console.log(lines.join("\n"));
}

main().then(() => process.exit(0)).catch((err) => {
  console.error("[Playbook] error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
