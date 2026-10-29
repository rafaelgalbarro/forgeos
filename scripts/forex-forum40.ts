/**
 * Backtest of the owner's "40 estrategias" list (lib/forex-bot/forum40.ts) on OANDA history via MT5.
 *   node scripts/forex-bot.cjs forum40
 * Writes .forgeos/forex-bot/forum40-latest.json and forum40-YYYY-MM-DD.md. Locked results are kept.
 */

import fs from "node:fs";
import path from "node:path";
import { fxBotDir } from "@/lib/forex-bot/journal";
import { mrSpecs } from "@/lib/forex-bot/meanrev";
import { mt5Candles, mt5Configured, mt5SymbolInfo } from "@/lib/forex-bot/mt5";
import { evaluateF40, f40Ctx, F40_GATE, F40_RULES, type F40Result, type F40Tf } from "@/lib/forex-bot/forum40";
import type { FxCandle } from "@/lib/forex-bot/types";

const WANT: Record<F40Tf, number> = { H1: 30000, H4: 8000, D1: 2600 };

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

const pct = (x: number) => `${(x * 100).toFixed(0)}%`;

async function main(): Promise<void> {
  if (!mt5Configured()) throw new Error("MT5 no configurado");
  const file = path.join(fxBotDir(), "forum40-latest.json");
  let prev: F40Result[] = [];
  try { prev = (JSON.parse(fs.readFileSync(file, "utf8")) as { results: F40Result[] }).results ?? []; } catch { /* first run */ }
  const instruments = new Map<string, { symbols: string[]; spread: number }>();
  for (const s of mrSpecs()) instruments.set(s.instrument, { symbols: s.symbols, spread: s.spread });
  const results: F40Result[] = [];
  for (const [inst, meta] of instruments) {
    for (const tf of ["H1", "H4", "D1"] as const) {
      const { bars, spread } = await history(meta.symbols, tf, meta.spread);
      if (!bars.length) { console.log(`[F40] ${inst} ${tf}: sin historia`); continue; }
      const ctx = f40Ctx(bars);
      for (const rule of F40_RULES) {
        const id = `${rule.id}_${inst.replace("_", "")}_${tf}`;
        const locked = prev.find((r) => r.id === id && r.locked);
        if (locked) { results.push(locked); continue; }
        results.push(evaluateF40(rule, inst, tf, bars, spread, ctx));
      }
      const ok = results.filter((r) => r.instrument === inst && r.tf === tf && r.liveEligible).map((r) => r.rule);
      console.log(`[F40] ${inst} ${tf}: ${bars.length} velas → aptas: ${ok.join(", ") || "ninguna"}`);
    }
  }
  const generatedAt = new Date().toISOString();
  fs.writeFileSync(file, JSON.stringify({ generatedAt, gate: F40_GATE, results }, null, 2));

  const byRule = F40_RULES.map((r) => {
    const rs = results.filter((q) => q.rule === r.id);
    const pass = rs.filter((q) => q.liveEligible);
    const meanR = rs.length ? rs.reduce((a, q) => a + q.all.meanR, 0) / rs.length : 0;
    const pos = rs.filter((q) => q.all.trades >= 30 && q.all.meanR > 0).length;
    return { r, n: rs.length, pass, meanR, pos };
  });
  const lines = [
    `# 40 estrategias (lista del propietario) — backtest ${generatedAt.slice(0, 10)}`,
    ``,
    `Datos OANDA (MT5), ${instruments.size} instrumentos × H1/H4/D1. Stop 2×ATR, salida por la regla de cada estrategia.`,
    `Apta: ≥${F40_GATE.minTrades} ops, PF ≥ ${F40_GATE.minPF}, media ≥ ${F40_GATE.minMeanR} R, positiva en ambas mitades y con spread ×${F40_GATE.stress}.`,
    ``,
    `## Resumen por estrategia`,
    `| Estrategia | Pruebas | Con media > 0 (≥30 ops) | Media R global | Aptas |`,
    `|---|---|---|---|---|`,
    ...byRule.map((b) => `| ${b.r.id} — ${b.r.name} | ${b.n} | ${b.pos} | ${b.meanR.toFixed(3)} | ${b.pass.length ? b.pass.map((q) => `${q.instrument} ${q.tf}`).join(", ") : "—"} |`),
    ``,
    `## Combinaciones aptas`,
    `| Id | Ops | Acierto | PF | Media R | 1ª mitad | 2ª mitad | Spread ×1.5 |`,
    `|---|---|---|---|---|---|---|---|`,
    ...results.filter((q) => q.liveEligible).sort((a, b) => b.all.meanR - a.all.meanR)
      .map((q) => `| ${q.id}${q.locked ? " 🔒" : ""} | ${q.all.trades} | ${pct(q.all.winRate)} | ${q.all.pf.toFixed(2)} | ${q.all.meanR.toFixed(3)} | ${q.firstHalf.meanR.toFixed(3)} | ${q.secondHalf.meanR.toFixed(3)} | ${q.stressed.meanR.toFixed(3)} |`),
  ];
  fs.writeFileSync(path.join(fxBotDir(), `forum40-${generatedAt.slice(0, 10)}.md`), lines.join("\n"));
  console.log(lines.join("\n"));
}

main().then(() => process.exit(0)).catch((err) => {
  console.error("[F40] error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
