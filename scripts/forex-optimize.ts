/**
 * Per-pair strategy selection on real broker history (OANDA via MT5; EODHD fallback).
 *   node scripts/forex-bot.cjs optimize [m15Bars=25000]
 * Writes .forgeos/forex-bot/pair-strategies.json (used by the engine) and pair-strategies-YYYY-MM-DD.md.
 */

import fs from "node:fs";
import path from "node:path";
import { fxPairs, TYPICAL_SPREAD_PIPS } from "@/lib/forex-bot/config";
import { eodhdIntraday5m } from "@/lib/forex-bot/data";
import { aggregate } from "@/lib/forex-bot/indicators";
import { fxBotDir, savePairChoices } from "@/lib/forex-bot/journal";
import { mt5Candles, mt5Configured } from "@/lib/forex-bot/mt5";
import { choosePairStrategy, PAIR_GATE, specGrid, type PairChoice } from "@/lib/forex-bot/pair-strategies";
import type { FxCandle } from "@/lib/forex-bot/types";

async function history(pair: string, count: number): Promise<{ bars: FxCandle[]; source: string }> {
  if (mt5Configured()) {
    try {
      const bars = await mt5Candles(pair, "M15", count);
      if (bars.length >= 2000) return { bars, source: "MT5 (OANDA)" };
    } catch (err) {
      console.warn(`[FX optimize] ${pair} MT5: ${err instanceof Error ? err.message : err}`);
    }
  }
  const m5 = await eodhdIntraday5m(pair, Math.ceil(count / 96) + 5);
  const now = Math.floor(Date.now() / 1000);
  return { bars: aggregate(m5, 15).filter((b) => b.time + 900 <= now), source: "EODHD" };
}

const pct = (x: number) => `${(x * 100).toFixed(0)}%`;

async function main(): Promise<void> {
  const count = Math.max(3000, Number(process.argv[2] ?? 25000) || 25000);
  const grid = specGrid();
  const choices: PairChoice[] = [];
  const sources = new Set<string>();
  for (const p of fxPairs()) {
    try {
      const { bars, source } = await history(p, count);
      sources.add(source);
      if (bars.length < 2000) { console.log(`[FX optimize] ${p}: solo ${bars.length} velas`); continue; }
      const c = choosePairStrategy(p, bars, TYPICAL_SPREAD_PIPS[p] ?? 2.5, grid);
      choices.push(c);
      console.log(`[FX optimize] ${p}: ${bars.length} velas (${source}) → ${c.spec?.id ?? "ninguna"} ${c.liveEligible ? "APTA" : `(${c.reason})`}`);
    } catch (err) {
      console.log(`[FX optimize] ${p}: error ${err instanceof Error ? err.message : err}`);
    }
  }
  const generatedAt = new Date().toISOString();
  savePairChoices({ generatedAt, source: [...sources].join(", "), choices });
  const d = (s: number) => new Date(s * 1000).toISOString().slice(0, 10);
  const lines = [
    `# Estrategias por par — ${generatedAt.slice(0, 10)}`,
    ``,
    `Datos: ${[...sources].join(", ")} · M15 · ${grid.length} reglas candidatas por par · spread típico cobrado.`,
    `Elección con los primeros 2/3 de la historia; validación con el último 1/3 (OOS).`,
    `Apta para real: ≥${PAIR_GATE.minOosTrades} ops OOS, PF ≥ ${PAIR_GATE.minOosPF}, media ≥ ${PAIR_GATE.minOosMeanR} R.`,
    ``,
    `| Par | Estrategia | Periodo | Ops IS | PF IS | Ops OOS | Acierto OOS | PF OOS | Media OOS | ¿Real? |`,
    `|---|---|---|---|---|---|---|---|---|---|`,
    ...choices.map((c) =>
      `| ${c.instrument} | ${c.spec ? c.description : "—"} | ${d(c.from)}→${d(c.to)} | ${c.is?.trades ?? 0} | ${(c.is?.pf ?? 0).toFixed(2)} | ${c.oos?.trades ?? 0} | ${pct(c.oos?.winRate ?? 0)} | ${(c.oos?.pf ?? 0).toFixed(2)} | ${(c.oos?.meanR ?? 0).toFixed(3)} R | ${c.liveEligible ? "sí" : `no (${c.reason})`} |`),
  ];
  fs.writeFileSync(path.join(fxBotDir(), `pair-strategies-${generatedAt.slice(0, 10)}.md`), lines.join("\n"));
  console.log(lines.join("\n"));
}

main().then(() => process.exit(0)).catch((err) => {
  console.error("[FX optimize] error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
