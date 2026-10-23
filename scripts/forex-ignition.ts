/**
 * Backtest: momentum ignition (volume + impulse) for FX/gold/indices (OANDA via MT5) and crypto
 * (Kraken Futures), plus news reaction on high-impact releases (EODHD economic events).
 *   node scripts/forex-bot.cjs ignition
 * Writes .forgeos/forex-bot/ignition-latest.json and ignition-YYYY-MM-DD.md.
 */

import fs from "node:fs";
import path from "node:path";
import { fxBotDir } from "@/lib/forex-bot/journal";
import { mt5Candles, mt5Configured, mt5SymbolInfo } from "@/lib/forex-bot/mt5";
import { evaluateIg, IG_GATE, simulateIgnition, simulateNewsReaction, type IgResult } from "@/lib/forex-bot/ignition";
import type { FxCandle } from "@/lib/forex-bot/types";

const FX: Array<[string, number]> = [
  ["EUR_USD", 0.0001], ["GBP_USD", 0.00014], ["USD_JPY", 0.012], ["AUD_USD", 0.00013], ["USD_CAD", 0.00018],
  ["USD_CHF", 0.00016], ["NZD_USD", 0.00016], ["EUR_GBP", 0.00014], ["EUR_JPY", 0.019], ["GBP_JPY", 0.028],
  ["EUR_CHF", 0.00019], ["EUR_AUD", 0.00025], ["EUR_CAD", 0.00026], ["GBP_CHF", 0.0003], ["GBP_AUD", 0.00035],
  ["AUD_JPY", 0.02], ["AUD_NZD", 0.00026], ["AUD_CAD", 0.00024], ["CAD_JPY", 0.024], ["CHF_JPY", 0.028], ["NZD_JPY", 0.026],
  ["GOLD", 0.5], ["US500", 0.9], ["US100", 1.5], ["DE30", 3.6],
];
const CRYPTO = ["PF_XBTUSD", "PF_ETHUSD", "PF_SOLUSD", "PF_XRPUSD", "PF_ADAUSD", "PF_LINKUSD", "PF_XDGUSD", "PF_AVAXUSD", "PF_LTCUSD", "PF_DOTUSD"];
const CRYPTO_COST = { pct: 0.0014 }; // taker 0.05 % × 2 + ~0.04 % slippage

async function mt5Bars(inst: string, tf: "M5" | "M15", want: number): Promise<{ bars: FxCandle[]; spread: number }> {
  const base = inst.replace("_", "");
  for (const n of [want, Math.floor(want * 0.6), Math.floor(want * 0.3)]) {
    try {
      const bars = await mt5Candles(base, tf, n);
      if (bars.length < 2000) continue;
      const i = await mt5SymbolInfo(base).catch(() => null);
      return { bars, spread: i?.bid && i?.ask ? i.ask - i.bid : 0 };
    } catch { /* retry smaller */ }
  }
  return { bars: [], spread: 0 };
}

async function krakenBars(sym: string, minutes: 5 | 15, days: number): Promise<FxCandle[]> {
  const res = minutes === 5 ? "5m" : "15m";
  const out = new Map<number, FxCandle>();
  const now = Math.floor(Date.now() / 1000);
  const step = 1900 * minutes * 60;
  for (let from = now - days * 86400; from < now; from += step) {
    const url = `https://futures.kraken.com/api/charts/v1/trade/${sym}/${res}?from=${from}&to=${Math.min(now, from + step)}`;
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(20_000) });
      if (!r.ok) continue;
      const j = (await r.json()) as { candles?: Array<{ time: number; open: string; high: string; low: string; close: string; volume: string | number }> };
      for (const c of j.candles ?? []) {
        const t = Math.floor(Number(c.time) / (Number(c.time) > 1e12 ? 1000 : 1));
        out.set(t, { time: t, open: +c.open, high: +c.high, low: +c.low, close: +c.close, volume: +c.volume });
      }
    } catch { /* gap */ }
  }
  return [...out.values()].filter((b) => b.close > 0).sort((a, b) => a.time - b.time).slice(0, -1); // drop forming bar
}

const CCY: Record<string, string> = { US: "USD", USA: "USD", EU: "EUR", EA: "EUR", EMU: "EUR", DE: "EUR", UK: "GBP", GB: "GBP", JP: "JPY", AU: "AUD", CA: "CAD", CH: "CHF", NZ: "NZD" };
const HIGH = /(non.?farm|payroll|cpi|consumer price|interest rate|rate decision|gdp|retail sales|unemployment rate|employment change|pmi)/i;

async function eodhdEvents(days: number): Promise<{ events: Array<{ at: number; ccy: string }>; note: string }> {
  const key = (process.env.EODHD_API_KEY ?? "").trim();
  if (!key) return { events: [], note: "sin EODHD_API_KEY" };
  const out: Array<{ at: number; ccy: string }> = [];
  const end = Date.now();
  let note = "";
  for (let t = end - days * 86400_000; t < end; t += 60 * 86400_000) {
    const from = new Date(t).toISOString().slice(0, 10);
    const to = new Date(Math.min(end, t + 60 * 86400_000)).toISOString().slice(0, 10);
    for (let offset = 0; offset < 5000; offset += 1000) {
      const url = `https://eodhd.com/api/economic-events?api_token=${encodeURIComponent(key)}&from=${from}&to=${to}&limit=1000&offset=${offset}&fmt=json`;
      const r = await fetch(url, { signal: AbortSignal.timeout(30_000) }).catch(() => null);
      if (!r || !r.ok) { note = `EODHD economic-events HTTP ${r?.status ?? "error"}`; break; }
      const rows = (await r.json()) as Array<{ type?: string; country?: string; date?: string }>;
      for (const e of rows) {
        const ccy = CCY[(e.country ?? "").toUpperCase()];
        if (!ccy || !HIGH.test(e.type ?? "") || !e.date) continue;
        const at = Date.parse(e.date.replace(" ", "T") + "Z");
        if (Number.isFinite(at)) out.push({ at: Math.floor(at / 1000), ccy });
      }
      if (rows.length < 1000) break;
    }
    if (note) break;
  }
  return { events: out, note: note || `${out.length} eventos de alto impacto` };
}

const d = (s: number) => (s ? new Date(s * 1000).toISOString().slice(0, 10) : "—");
const pct = (x: number) => `${(x * 100).toFixed(0)}%`;

async function main(): Promise<void> {
  const results: IgResult[] = [];
  const news = await eodhdEvents(540);
  console.log(`[Ignición] noticias: ${news.note}`);
  if (mt5Configured()) {
    for (const [inst, typical] of FX) {
      for (const [tf, want] of [["M5", 90000], ["M15", 40000]] as const) {
        const { bars, spread } = await mt5Bars(inst, tf, want);
        if (!bars.length) { console.log(`[Ignición] ${inst} ${tf}: sin historia`); continue; }
        const cost = { abs: Math.max(typical, spread) };
        const r = evaluateIg({ id: `IG_${inst.replace("_", "")}_${tf}`, market: "fx", kind: "IGNITION", instrument: inst, tf, bars, cost, run: (c) => simulateIgnition(bars, c, tf === "M5" ? 12 : 8) });
        results.push(r);
        console.log(`[Ignición] ${r.id}: ops=${r.all.trades} acierto=${pct(r.all.winRate)} PF=${r.all.pf.toFixed(2)} media=${r.all.meanR.toFixed(3)} → ${r.liveEligible ? "APTA" : r.reason}`);
        if (tf === "M5" && news.events.length) {
          const ccys = inst.includes("_") ? inst.split("_") : inst === "DE30" ? ["EUR"] : ["USD"];
          const ev = news.events.filter((e) => ccys.includes(e.ccy)).map((e) => e.at);
          const rn = evaluateIg({ id: `NEWS_${inst.replace("_", "")}_M5`, market: "fx", kind: "NEWS", instrument: inst, tf, bars, cost, run: (c) => simulateNewsReaction(bars, ev, c, 300) });
          results.push(rn);
          console.log(`[Noticias] ${rn.id}: ops=${rn.all.trades} acierto=${pct(rn.all.winRate)} PF=${rn.all.pf.toFixed(2)} media=${rn.all.meanR.toFixed(3)} → ${rn.liveEligible ? "APTA" : rn.reason}`);
        }
      }
    }
  }
  for (const sym of CRYPTO) {
    for (const m of [5, 15] as const) {
      const bars = await krakenBars(sym, m, m === 5 ? 200 : 540);
      if (bars.length < 2000) { console.log(`[Ignición] ${sym} ${m}m: sin historia (${bars.length})`); continue; }
      const r = evaluateIg({ id: `IG_${sym}_${m}m`, market: "crypto", kind: "IGNITION", instrument: sym, tf: `${m}m`, bars, cost: CRYPTO_COST, run: (c) => simulateIgnition(bars, c, m === 5 ? 12 : 8) });
      results.push(r);
      console.log(`[Ignición] ${r.id}: ops=${r.all.trades} acierto=${pct(r.all.winRate)} PF=${r.all.pf.toFixed(2)} media=${r.all.meanR.toFixed(3)} → ${r.liveEligible ? "APTA" : r.reason}`);
    }
  }
  const generatedAt = new Date().toISOString();
  fs.writeFileSync(path.join(fxBotDir(), "ignition-latest.json"), JSON.stringify({ generatedAt, gate: IG_GATE, news: news.note, results }, null, 2));
  const lines = [
    `# Ignición de momento (volumen + impulso) y reacción a noticias — ${generatedAt.slice(0, 10)}`,
    ``,
    `FX/oro/índices: OANDA (MT5, volumen de ticks). Cripto: Kraken Futures (volumen negociado, comisiones 0,14 % ida y vuelta). Noticias: ${news.note}.`,
    `Apta: ≥${IG_GATE.minTrades} ops (noticias ≥30), PF ≥ ${IG_GATE.minPF}, media ≥ ${IG_GATE.minMeanR} R, positiva en ambas mitades y con costes ×${IG_GATE.stress}.`,
    ``,
    `| Estrategia | Periodo | Ops | Acierto | PF | Media R | 1ª mitad | 2ª mitad | Costes ×1.5 | ¿Apta? |`,
    `|---|---|---|---|---|---|---|---|---|---|`,
    ...results.map((r) => `| ${r.id} | ${d(r.from)}→${d(r.to)} | ${r.all.trades} | ${pct(r.all.winRate)} | ${r.all.pf.toFixed(2)} | ${r.all.meanR.toFixed(3)} | ${r.firstHalf.meanR.toFixed(3)} | ${r.secondHalf.meanR.toFixed(3)} | ${r.stressed.meanR.toFixed(3)} | ${r.liveEligible ? "sí" : "no"} |`),
  ];
  fs.writeFileSync(path.join(fxBotDir(), `ignition-${generatedAt.slice(0, 10)}.md`), lines.join("\n"));
  console.log(lines.join("\n"));
}

main().then(() => process.exit(0)).catch((err) => {
  console.error("[Ignición] error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
