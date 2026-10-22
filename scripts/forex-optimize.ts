/**
 * Per-pair strategy selection on real broker history (OANDA via MT5; EODHD fallback).
 *   node scripts/forex-bot.cjs optimize [timeframes=H1:H4]   (M15 ≈1 año, H1 ≈5 años, H4 ≈5 años)
 * Writes .forgeos/forex-bot/pair-strategies.json (used by the engine) and pair-strategies-YYYY-MM-DD.md.
 */

import fs from "node:fs";
import path from "node:path";
import { fxPairs, TYPICAL_SPREAD_PIPS } from "@/lib/forex-bot/config";
import { eodhdIntraday5m } from "@/lib/forex-bot/data";
import { aggregate } from "@/lib/forex-bot/indicators";
import { fxBotDir, loadPairChoices, savePairChoices } from "@/lib/forex-bot/journal";
import { mt5Candles, mt5Configured } from "@/lib/forex-bot/mt5";
import { choosePairStrategy, PAIR_GATE, type FxTf, type PairChoice } from "@/lib/forex-bot/pair-strategies";
import type { FxCandle } from "@/lib/forex-bot/types";

const COUNTS: Record<FxTf, number> = { M15: 25000, H1: 30000, H4: 8000, D1: 2600 };

async function history(pair: string, tf: FxTf): Promise<{ bars: FxCandle[]; source: string }> {
  const count = COUNTS[tf];
  if (mt5Configured()) {
    // The terminal may hold less history than asked for ("Call failed"): retry with fewer bars.
    for (const n of [count, Math.floor(count * 0.66), Math.floor(count * 0.4), Math.floor(count * 0.2)]) {
      try {
        const bars = await mt5Candles(pair, tf, n);
        if (bars.length >= 1000) return { bars, source: "MT5 (OANDA)" };
      } catch (err) {
        console.warn(`[FX optimize] ${pair} ${tf} ${n} velas: ${err instanceof Error ? err.message.slice(0, 90) : err}`);
      }
    }
  }
  if (tf !== "M15") return { bars: [], source: "—" };
  const m5 = await eodhdIntraday5m(pair, Math.ceil(count / 96) + 5);
  const now = Math.floor(Date.now() / 1000);
  return { bars: aggregate(m5, 15).filter((b) => b.time + 900 <= now), source: "EODHD" };
}

const pct = (x: number) => `${(x * 100).toFixed(0)}%`;

async function main(): Promise<void> {
  const args = String(process.argv[2] ?? "H1:H4").toUpperCase().split(/[,:]/);
  const tfs = args.filter((t): t is FxTf => t === "M15" || t === "H1" || t === "H4" || t === "D1");
  if (!tfs.length) tfs.push("H1", "H4");
  // KEEP: pairs that already passed validation keep (and lock) their strategy; only the rest is searched.
  const keep = args.includes("KEEP");
  const prev = loadPairChoices();
  const locked = new Map<string, PairChoice>();
  for (const c of prev?.choices ?? []) {
    if (c.spec && (c.locked || (keep && c.liveEligible))) locked.set(c.instrument, { ...c, locked: true });
  }
  if (locked.size) console.log(`[FX optimize] estrategias confirmadas (se mantienen): ${[...locked.keys()].join(", ")}`);
  const choices: PairChoice[] = [];
  const sources = new Set<string>();
  for (const p of fxPairs()) {
    const lk = locked.get(p);
    if (lk) { choices.push(lk); console.log(`[FX optimize] ${p}: confirmada → ${lk.spec?.id}`); continue; }
    try {
      const data: Partial<Record<FxTf, FxCandle[]>> = {};
      const got: string[] = [];
      for (const tf of tfs) {
        const { bars, source } = await history(p, tf);
        if (bars.length < 1000) { got.push(`${tf}:${bars.length}✗`); continue; }
        sources.add(source);
        data[tf] = bars;
        got.push(`${tf}:${bars.length}`);
      }
      if (!Object.keys(data).length) { console.log(`[FX optimize] ${p}: sin historia (${got.join(" ")})`); continue; }
      const c = choosePairStrategy(p, data, TYPICAL_SPREAD_PIPS[p] ?? 2.5);
      choices.push(c);
      console.log(`[FX optimize] ${p}: ${got.join(" ")} → ${c.spec?.id ?? "ninguna"} ${c.liveEligible ? "APTA" : `(${c.reason})`}`);
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
    `Datos: ${[...sources].join(", ")} · ${tfs.join(" + ")} · ${choices[0]?.candidates ?? 0} reglas candidatas por par · spread típico cobrado.`,
    `Elección con los primeros 2/3 de la historia; validación con el último 1/3 (OOS).`,
    `Apta para real: ≥${PAIR_GATE.minOosTrades} ops OOS, PF ≥ ${PAIR_GATE.minOosPF}, media ≥ ${PAIR_GATE.minOosMeanR} R.`,
    ``,
    `| Par | Estrategia | Periodo | Ops IS | PF IS | Ops OOS | Acierto OOS | PF OOS | Media OOS | ¿Real? |`,
    `|---|---|---|---|---|---|---|---|---|---|`,
    ...choices.map((c) =>
      `| ${c.instrument}${c.locked ? " 🔒" : ""} | ${c.spec ? c.description : "—"} | ${d(c.from)}→${d(c.to)} | ${c.is?.trades ?? 0} | ${(c.is?.pf ?? 0).toFixed(2)} | ${c.oos?.trades ?? 0} | ${pct(c.oos?.winRate ?? 0)} | ${(c.oos?.pf ?? 0).toFixed(2)} | ${(c.oos?.meanR ?? 0).toFixed(3)} R | ${c.liveEligible ? "sí" : `no (${c.reason})`} |`),
  ];
  fs.writeFileSync(path.join(fxBotDir(), `pair-strategies-${generatedAt.slice(0, 10)}.md`), lines.join("\n"));
  console.log(lines.join("\n"));
}

main().then(() => process.exit(0)).catch((err) => {
  console.error("[FX optimize] error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
