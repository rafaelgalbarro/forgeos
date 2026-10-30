/**
 * Backtest of the intraday indicator combinations (lib/trading/intraday-rules.ts):
 *  - 20 liquid US stocks/ETFs on EODHD 5-minute bars (IBKR commissions at $250 and $2,000 per trade)
 *  - index CFDs US500 / US100 / DE30 on OANDA M5 via MT5 (spread)
 *   node scripts/forex-bot.cjs intraday [days=300]
 * Writes .forgeos/intraday-backtest-latest.json.
 */

import fs from "node:fs";
import path from "node:path";
import { mt5Candles, mt5Configured, mt5SymbolInfo } from "@/lib/forex-bot/mt5";
import {
  backtestIntraday, INTRADAY_RULES, iStats, NY_SESSION, sessionBars, XETRA_SESSION,
  type IBar, type ICost, type ITrade, type Session,
} from "@/lib/trading/intraday-rules";

const KEY = process.env.EODHD_API_KEY?.trim() ?? "";
const ROOT = process.env.FORGEOS_ROOT || process.cwd();
const CACHE = path.join(ROOT, ".forgeos", "cache", "intraday");
fs.mkdirSync(CACHE, { recursive: true });

const STOCKS = ["SPY", "QQQ", "AAPL", "MSFT", "NVDA", "AMD", "TSLA", "META", "AMZN", "GOOGL", "PLTR", "ORCL", "SMCI", "QCOM", "JPM", "BAC", "INTC", "MU", "AVGO", "NFLX"];

async function eodhd5m(code: string, days: number): Promise<IBar[]> {
  const f = path.join(CACHE, `${code}-${days}-${new Date().toISOString().slice(0, 10)}.json`);
  if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, "utf8")) as IBar[];
  const out: IBar[] = [];
  const now = Math.floor(Date.now() / 1000);
  // ≤ 100 days per request keeps responses small
  for (let to = now; to > now - days * 86400; to -= 100 * 86400) {
    const from = Math.max(now - days * 86400, to - 100 * 86400);
    const res = await fetch(`https://eodhd.com/api/intraday/${code}.US?interval=5m&from=${from}&to=${to}&api_token=${KEY}&fmt=json`, { signal: AbortSignal.timeout(60_000) }).catch((e) => { console.warn(`[intradía] ${code}: ${e}`); return null; });
    if (!res || !res.ok) { console.warn(`[intradía] ${code}: HTTP ${res?.status}`); continue; }
    const rows = (await res.json()) as Array<{ timestamp: number; open: number; high: number; low: number; close: number; volume: number }>;
    for (const r of rows ?? []) if (r && r.open > 0) out.push({ t: r.timestamp, o: r.open, h: r.high, l: r.low, c: r.close, v: r.volume ?? 0 });
  }
  const uniq = [...new Map(out.map((b) => [b.t, b])).values()].sort((a, b) => a.t - b.t);
  fs.writeFileSync(f, JSON.stringify(uniq));
  return uniq;
}

type Row = { rule: string; name: string; market: string; trades: number; winRate: number; pf: number; meanR: number; meanPct: number; h1: number; h2: number; stressed: number; ok: boolean; why: string };

function evaluate(label: string, sets: Array<{ bars: ReturnType<typeof sessionBars>; s: Session; cost: ICost }>): Row[] {
  return INTRADAY_RULES.map((r) => {
    const all: ITrade[] = []; const st: ITrade[] = [];
    for (const z of sets) {
      all.push(...backtestIntraday(r, z.bars, z.s, z.cost));
      st.push(...backtestIntraday(r, z.bars, z.s, z.cost, 1.5));
    }
    const days = [...new Set(all.map((q) => q.day))].sort();
    const mid = days[Math.floor(days.length / 2)] ?? "";
    const a = iStats(all); const h1 = iStats(all.filter((q) => q.day < mid)); const h2 = iStats(all.filter((q) => q.day >= mid)); const s2 = iStats(st);
    const why: string[] = [];
    if (a.trades < 100) why.push(`ops=${a.trades}`);
    if (a.pf < 1.15) why.push(`PF=${a.pf.toFixed(2)}`);
    if (!(h1.meanR > 0 && h2.meanR > 0)) why.push("no gana en las dos mitades");
    if (!(s2.meanR > 0)) why.push("pierde con costes ×1,5");
    return { rule: r.id, name: r.name, market: label, trades: a.trades, winRate: a.winRate, pf: a.pf, meanR: a.meanR, meanPct: a.meanPct, h1: h1.meanR, h2: h2.meanR, stressed: s2.meanR, ok: why.length === 0, why: why.join("; ") || "ok" };
  });
}

async function main(): Promise<void> {
  const days = Math.max(30, Math.min(600, Number(process.argv[2] ?? 300) || 300));
  const ny = NY_SESSION();
  const rows: Row[] = [];

  if (KEY) {
    const sets: Array<{ code: string; bars: ReturnType<typeof sessionBars> }> = [];
    for (const code of STOCKS) {
      const b = await eodhd5m(code, days);
      const sb = sessionBars(b, ny);
      console.log(`[intradía] ${code}: ${sb.length} velas de 5 min en sesión (${sb[0]?.d ?? "—"} → ${sb[sb.length - 1]?.d ?? "—"})`);
      if (sb.length > 2000) sets.push({ code, bars: sb });
    }
    if (sets.length) {
      for (const notional of [250, 2000]) {
        rows.push(...evaluate(`acciones $${notional}`, sets.map((z) => ({ bars: z.bars, s: ny, cost: { kind: "stock", notionalUsd: notional, slipPct: 0.0003 } as ICost }))));
      }
    }
  }

  if (mt5Configured()) {
    for (const [inst, sess] of [["US500", ny], ["US100", ny], ["DE30", XETRA_SESSION()]] as const) {
      try {
        const raw = await mt5Candles(inst, "M5", 60000);
        if (!raw.length) continue;
        // MT5 bar times are broker-server time: estimate the offset from the last bar vs now.
        const last = raw[raw.length - 1]!;
        const offH = Math.round((last.time + 300 - Date.now() / 1000) / 3600);
        const bars: IBar[] = raw.map((b) => ({ t: b.time - offH * 3600, o: b.open, h: b.high, l: b.low, c: b.close, v: b.volume ?? 0 }));
        const info = await mt5SymbolInfo(inst).catch(() => null);
        const spread = info?.bid && info?.ask ? Math.max(info.ask - info.bid, 0) : 1;
        const sb = sessionBars(bars, sess);
        console.log(`[intradía] ${inst}: ${sb.length} velas M5 en sesión · desfase servidor ${offH} h · spread ${spread}`);
        rows.push(...evaluate(`CFD ${inst}`, [{ bars: sb, s: sess, cost: { kind: "cfd", spread } }]));
      } catch (err) {
        console.warn(`[intradía] ${inst}: ${err instanceof Error ? err.message : err}`);
      }
    }
  }

  fs.writeFileSync(path.join(ROOT, ".forgeos", "intraday-backtest-latest.json"), JSON.stringify({ generatedAt: new Date().toISOString(), rows }, null, 2));
  const p = (x: number) => x.toFixed(3);
  console.log(`\n| Mercado | Regla | Ops | Acierto | PF | Media R | Media % | 1ª mitad R | 2ª mitad R | Costes ×1,5 R | ¿Apta? |`);
  console.log(`|---|---|---|---|---|---|---|---|---|---|---|`);
  for (const r of rows) console.log(`| ${r.market} | ${r.rule} | ${r.trades} | ${(r.winRate * 100).toFixed(0)}% | ${r.pf.toFixed(2)} | ${p(r.meanR)} | ${r.meanPct.toFixed(2)} | ${p(r.h1)} | ${p(r.h2)} | ${p(r.stressed)} | ${r.ok ? "APTA" : `no (${r.why})`} |`);
}

main().then(() => process.exit(0)).catch((err) => {
  console.error("[intradía] error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
