/**
 * Backtest of "Gap & Go" on US stocks that gap up at the open (EODHD bulk EOD + 5m intraday + news).
 *   node scripts/forex-bot.cjs gap [days=250]
 * Data is cached in .forgeos/cache/gap/ so reruns are cheap. Writes .forgeos/gap-backtest-latest.json.
 */

import fs from "node:fs";
import path from "node:path";
import {
  DEFAULT_GAP_COST,
  GAP_GATE,
  gapStats,
  gapVariants,
  nyMinutes,
  simulateGapDay,
  type Bar5,
  type GapTrade,
} from "@/lib/trading/gap-and-go";

const KEY = process.env.EODHD_API_KEY?.trim() ?? "";
const ROOT = process.env.FORGEOS_ROOT || process.cwd();
const CACHE = path.join(ROOT, ".forgeos", "cache", "gap");
fs.mkdirSync(CACHE, { recursive: true });

async function get<T>(url: string, cacheName: string): Promise<T | null> {
  const f = path.join(CACHE, cacheName);
  if (fs.existsSync(f)) {
    try { return JSON.parse(fs.readFileSync(f, "utf8")) as T; } catch { /* refetch */ }
  }
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const res = await fetch(`https://eodhd.com/api${url}${url.includes("?") ? "&" : "?"}api_token=${KEY}&fmt=json`, { signal: AbortSignal.timeout(30_000) });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = (await res.json()) as T;
      fs.writeFileSync(f, JSON.stringify(j));
      return j;
    } catch (err) {
      if (attempt === 2) { console.warn(`[gap] ${url.split("?")[0]}: ${err instanceof Error ? err.message : err}`); return null; }
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
  return null;
}

type BulkRow = { code: string; open: number; high: number; low: number; close: number; volume: number };

const ymd = (d: Date) => d.toISOString().slice(0, 10);

function tradingDays(n: number): string[] {
  const out: string[] = [];
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  while (out.length < n + 1) {
    const wd = d.getUTCDay();
    if (wd !== 0 && wd !== 6) out.push(ymd(d));
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return out.reverse();
}

// common stock tickers only (5-letter codes ending in W/U/R are warrants, units, rights)
const clean = (code: string) => /^[A-Z]{1,5}$/.test(code) && !(code.length === 5 && /[WUR]$/.test(code));

async function pool<T, R>(items: T[], n: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < items.length) { const k = i++; out[k] = await fn(items[k]!); }
  }));
  return out;
}

async function main(): Promise<void> {
  if (!KEY) throw new Error("EODHD_API_KEY no configurada");
  const nDays = Math.max(20, Math.min(500, Number(process.argv[2] ?? 250) || 250));
  const days = tradingDays(nDays);
  const perDay = 12;
  console.log(`[gap] ${days.length - 1} sesiones ${days[1]} → ${days[days.length - 1]}`);
  let prev: Map<string, BulkRow> | null = null;
  type Cand = { day: string; code: string; gapPct: number };
  const cands: Cand[] = [];
  for (const day of days) {
    const rows = await get<BulkRow[]>(`/eod-bulk-last-day/US?date=${day}`, `bulk-${day}.json`);
    if (!rows || !Array.isArray(rows) || rows.length < 1000) { continue; } // holiday / no data
    const cur = new Map(rows.map((r) => [String(r.code).toUpperCase(), r]));
    if (prev) {
      const list: Cand[] = [];
      for (const [code, r] of cur) {
        const p = prev.get(code);
        if (!p || !clean(code)) continue;
        if (!(p.close > 0) || !(r.open >= 1) || r.open > 50) continue;
        if (p.close * p.volume < 200_000) continue; // liquid the day before (known pre-open)
        const g = r.open / p.close - 1;
        if (g >= 0.05) list.push({ day, code, gapPct: g });
      }
      list.sort((a, b) => b.gapPct - a.gapPct);
      cands.push(...list.slice(0, perDay));
    }
    prev = cur;
  }
  console.log(`[gap] candidatos (gap ≥5 %, top ${perDay}/día): ${cands.length}`);

  const trades = new Map<string, GapTrade[]>();
  const stressed = new Map<string, GapTrade[]>();
  const variants = gapVariants();
  let withNews = 0;
  let withBars = 0;
  await pool(cands, 4, async (c) => {
    const d0 = Date.parse(`${c.day}T00:00:00Z`) / 1000;
    const raw = await get<Array<{ timestamp: number; open: number; high: number; low: number; close: number; volume: number }>>(
      `/intraday/${c.code}.US?interval=5m&from=${d0 + 12 * 3600}&to=${d0 + 22 * 3600}`,
      `i5-${c.code}-${c.day}.json`,
    );
    const bars: Bar5[] = (raw ?? [])
      .filter((b) => b && b.open > 0)
      .map((b) => ({ t: b.timestamp, o: b.open, h: b.high, l: b.low, c: b.close, v: b.volume ?? 0 }));
    if (bars.length < 10) return;
    withBars += 1;
    const prevDay = new Date(Date.parse(`${c.day}T00:00:00Z`) - 4 * 86400_000).toISOString().slice(0, 10);
    const news = await get<Array<{ date: string }>>(`/news?s=${c.code}.US&from=${prevDay}&to=${c.day}&limit=10`, `n-${c.code}-${c.day}.json`);
    // news published between the previous close and the open (ET), as known before entry
    const openSec = bars.find((b) => nyMinutes(b.t) === 9 * 60 + 30)?.t ?? d0 + 13.5 * 3600;
    const hasNews = (news ?? []).some((n) => {
      const t = Date.parse(n.date) / 1000;
      return Number.isFinite(t) && t <= openSec && t >= openSec - 18 * 3600;
    });
    if (hasNews) withNews += 1;
    for (const v of variants) {
      const t = simulateGapDay({ day: c.day, code: c.code, gapPct: c.gapPct, hasNews, bars, v });
      if (t) { const a = trades.get(v.id) ?? []; a.push(t); trades.set(v.id, a); }
      const ts = simulateGapDay({ day: c.day, code: c.code, gapPct: c.gapPct, hasNews, bars, v, cost: { ...DEFAULT_GAP_COST, slipPct: DEFAULT_GAP_COST.slipPct * 2, commissionMult: 1.5 } });
      if (ts) { const a = stressed.get(v.id) ?? []; a.push(ts); stressed.set(v.id, a); }
    }
  });
  console.log(`[gap] con velas 5m: ${withBars} · con noticia antes de la apertura: ${withNews}`);

  const mid = days[Math.floor(days.length / 2)]!;
  const rows = variants.map((v) => {
    const t = (trades.get(v.id) ?? []).sort((a, b) => a.day.localeCompare(b.day));
    const all = gapStats(t);
    const h1 = gapStats(t.filter((x) => x.day < mid));
    const h2 = gapStats(t.filter((x) => x.day >= mid));
    const st = gapStats(stressed.get(v.id) ?? []);
    const why: string[] = [];
    if (all.trades < GAP_GATE.minTrades) why.push(`ops=${all.trades}<${GAP_GATE.minTrades}`);
    if (all.pf < GAP_GATE.minPF) why.push(`PF=${all.pf.toFixed(2)}`);
    if (!(h1.meanPct > 0 && h2.meanPct > 0)) why.push("no gana en las dos mitades");
    if (!(st.meanPct > 0)) why.push("pierde con costes altos");
    return { id: v.id, v, all, h1, h2, st, liveEligible: why.length === 0, reason: why.join("; ") || "ok" };
  });
  fs.writeFileSync(path.join(ROOT, ".forgeos", "gap-backtest-latest.json"), JSON.stringify({ generatedAt: new Date().toISOString(), days: days.length - 1, from: days[1], to: days[days.length - 1], rows }, null, 2));
  const p = (x: number) => x.toFixed(2);
  console.log(`\n| Variante | Ops | Acierto | PF | Media neta % | Total % | 1ª mitad % | 2ª mitad % | Costes altos % | ¿Apta? |`);
  console.log(`|---|---|---|---|---|---|---|---|---|---|`);
  for (const r of rows) {
    console.log(`| ${r.id} | ${r.all.trades} | ${(r.all.winRate * 100).toFixed(0)}% | ${p(r.all.pf)} | ${p(r.all.meanPct)} | ${p(r.all.totalPct)} | ${p(r.h1.meanPct)} | ${p(r.h2.meanPct)} | ${p(r.st.meanPct)} | ${r.liveEligible ? "APTA" : `no (${r.reason})`} |`);
  }
}

main().then(() => process.exit(0)).catch((err) => {
  console.error("[gap] error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
