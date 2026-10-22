/**
 * Backtest of the intraday FX strategies on EODHD 5m data (aggregated to M15).
 *   node scripts/forex-bot.cjs backtest [days=180]
 * Writes .forgeos/forex-bot/backtest-latest.json (live gate) and backtest-YYYY-MM-DD.md.
 */

import fs from "node:fs";
import path from "node:path";
import { ALL_FX_STRATEGIES, fxPairs, TYPICAL_SPREAD_PIPS } from "@/lib/forex-bot/config";
import { eodhdIntraday5m } from "@/lib/forex-bot/data";
import { aggregate } from "@/lib/forex-bot/indicators";
import { backtestInstrument, FX_GATE, gateRows, statsFor, type FxBacktestTrade } from "@/lib/forex-bot/backtest";
import { fxBotDir } from "@/lib/forex-bot/journal";

async function main(): Promise<void> {
  const days = Math.max(30, Number(process.argv[2] ?? 180) || 180);
  const pairs = fxPairs();
  const all: FxBacktestTrade[] = [];
  let tMin = Infinity;
  let tMax = 0;
  const perPair: string[] = [];
  for (const p of pairs) {
    try {
      const m5 = await eodhdIntraday5m(p, days);
      const m15 = aggregate(m5, 15);
      if (m15.length < 500) { perPair.push(`| ${p} | sin datos suficientes (${m15.length} velas) |`); continue; }
      tMin = Math.min(tMin, m15[0]!.time);
      tMax = Math.max(tMax, m15[m15.length - 1]!.time);
      const trades = backtestInstrument(p, m15, ALL_FX_STRATEGIES, TYPICAL_SPREAD_PIPS[p] ?? 1.5);
      all.push(...trades);
      const sum = trades.reduce((s, t) => s + t.r, 0);
      perPair.push(`| ${p} | ${m15.length} velas M15 · ${trades.length} operaciones · ${sum.toFixed(1)} R |`);
      console.log(`[FX backtest] ${p}: velas=${m15.length} ops=${trades.length} totalR=${sum.toFixed(2)}`);
    } catch (err) {
      perPair.push(`| ${p} | error: ${err instanceof Error ? err.message : err} |`);
    }
  }
  const split = tMin + ((tMax - tMin) * 2) / 3;
  const rows = gateRows(ALL_FX_STRATEGIES, all, split);
  const dir = fxBotDir();
  const out = { generatedAt: new Date().toISOString(), days, pairs, gate: FX_GATE, rows };
  fs.writeFileSync(path.join(dir, "backtest-latest.json"), JSON.stringify(out, null, 2));
  const lines = [
    `# Backtest forex intradía — ${new Date().toISOString().slice(0, 10)}`,
    ``,
    `Datos EODHD 5m → M15, ${days} días, spread típico cobrado en cada operación. Muestra fuera (OOS) = último tercio.`,
    `Puerta para operar en real: ≥${FX_GATE.minOosTrades} operaciones OOS, PF ≥ ${FX_GATE.minOosPF}, media ≥ ${FX_GATE.minOosMeanR} R.`,
    ``,
    `| Estrategia | Ops | % acierto | Media R | PF | Total R | DD máx R | OOS ops | OOS PF | OOS media R | ¿Real? |`,
    `|---|---|---|---|---|---|---|---|---|---|---|`,
    ...rows.map((r) => `| ${r.strategy} | ${r.trades} | ${(r.winRate * 100).toFixed(0)}% | ${r.meanR.toFixed(3)} | ${r.profitFactor.toFixed(2)} | ${r.totalR.toFixed(1)} | ${r.maxDrawdownR.toFixed(1)} | ${r.oosTrades} | ${r.oosPF.toFixed(2)} | ${r.oosMeanR.toFixed(3)} | ${r.liveEligible ? "sí" : `no (${r.reason})`} |`),
    ``,
    `## Por par`,
    ``,
    `| Par | Resultado |`,
    `|---|---|`,
    ...perPair,
  ];
  const md = path.join(dir, `backtest-${new Date().toISOString().slice(0, 10)}.md`);
  fs.writeFileSync(md, lines.join("\n"));
  console.log(lines.join("\n"));
  for (const s of ALL_FX_STRATEGIES) void statsFor(s, all);
}

main().then(() => process.exit(0)).catch((err) => {
  console.error("[FX backtest] error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
