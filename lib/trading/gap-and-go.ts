/**
 * "Gap & Go" — US stocks gapping up on the open (pure, shared by backtest and live).
 *
 * Day D candidate: open_D ≥ (1 + minGap) × close_{D-1}, $1 ≤ open ≤ $50, liquid the day before.
 * Opening-range breakout on 5-minute regular-session bars:
 *   range = the first `orBars` bars (09:30 → 09:30 + 5·orBars ET); its high H and low L;
 *   the first-range dollar volume must be ≥ `minOrDollarVol` (known at entry time);
 *   entry: the first later bar (until `lastEntryMin` ET) that trades above H → filled at
 *   max(H, bar open) + slippage; stop: L; target: entry + rr × (entry − L);
 *   exit at the stop / target / the 15:55 bar close. Same bar stop+target → stop.
 * Costs: IBKR fixed USD commission per side (max($1, $0.005/sh) capped at 1 % of value) on a
 * `notionalUsd` position + `slipPct` per side.
 */

export type Bar5 = { t: number; o: number; h: number; l: number; c: number; v: number };

export type GapVariant = {
  id: string;
  orBars: number;
  rr: number;
  minGap: number;
  /** ET minutes after midnight: last minute an entry may trigger */
  lastEntryMin: number;
  newsOnly: boolean;
};

export type GapTrade = {
  day: string;
  code: string;
  gapPct: number;
  hasNews: boolean;
  entry: number;
  exit: number;
  r: number;
  netPct: number;
  reason: "TP" | "SL" | "EOD";
};

export type GapCost = { notionalUsd: number; slipPct: number; commissionMult: number };

export const DEFAULT_GAP_COST: GapCost = { notionalUsd: 250, slipPct: 0.0015, commissionMult: 1 };

export function usCommission(shares: number, price: number): number {
  const value = shares * price;
  if (!(value > 0)) return 0;
  return Math.min(Math.max(1, 0.005 * shares), 0.01 * value);
}

/** Minutes after midnight New York time for a unix second. */
const nyFmt = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
export function nyMinutes(unixSec: number): number {
  const parts = nyFmt.formatToParts(new Date(unixSec * 1000));
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return h * 60 + m;
}

const OPEN = 9 * 60 + 30;
const LAST_EXIT = 15 * 60 + 55;

/** Regular-session 5m bars (bar start between 09:30 and 15:55 ET), sorted. */
export function regularSession(bars: readonly Bar5[]): Bar5[] {
  return bars
    .filter((b) => {
      const m = nyMinutes(b.t);
      return m >= OPEN && m <= LAST_EXIT;
    })
    .sort((a, b) => a.t - b.t);
}

export function simulateGapDay(args: {
  day: string;
  code: string;
  gapPct: number;
  hasNews: boolean;
  bars: readonly Bar5[];
  v: GapVariant;
  cost?: GapCost;
  minOrDollarVol?: number;
}): GapTrade | null {
  const { v } = args;
  const cost = args.cost ?? DEFAULT_GAP_COST;
  if (args.gapPct < v.minGap) return null;
  if (v.newsOnly && !args.hasNews) return null;
  const s = regularSession(args.bars);
  if (s.length < v.orBars + 2) return null;
  if (nyMinutes(s[0]!.t) !== OPEN) return null; // need the opening bar
  const or = s.slice(0, v.orBars);
  const H = Math.max(...or.map((b) => b.h));
  const L = Math.min(...or.map((b) => b.l));
  const dv = or.reduce((a, b) => a + b.v * b.c, 0);
  if (dv < (args.minOrDollarVol ?? 300_000)) return null;
  if (!(H > L)) return null;
  for (let i = v.orBars; i < s.length; i += 1) {
    const b = s[i]!;
    const m = nyMinutes(b.t);
    if (m > v.lastEntryMin) return null;
    if (!(b.h > H)) continue;
    const raw = Math.max(H, b.o);
    const entry = raw * (1 + cost.slipPct);
    const risk = entry - L;
    if (!(risk > 0) || risk / entry > 0.15 || risk / entry < 0.005) return null;
    const tp = entry + v.rr * risk;
    let exitRaw = 0;
    let reason: GapTrade["reason"] = "EOD";
    // the entry bar itself: if it also traded below L after the break we assume the stop
    for (let j = i; j < s.length; j += 1) {
      const x = s[j]!;
      if (j > i && x.l <= L) { exitRaw = Math.min(L, x.o); reason = "SL"; break; }
      if (j === i && x.l <= L && x.c < H) { exitRaw = L; reason = "SL"; break; }
      if (x.h >= tp) { exitRaw = j > i ? Math.max(tp, x.o) : tp; reason = "TP"; break; }
      if (nyMinutes(x.t) >= LAST_EXIT || j === s.length - 1) { exitRaw = x.c; reason = "EOD"; break; }
    }
    const exit = exitRaw * (1 - cost.slipPct);
    const shares = Math.max(1, Math.floor(cost.notionalUsd / entry));
    const comm = (usCommission(shares, entry) + usCommission(shares, exit)) * cost.commissionMult;
    const pnl = (exit - entry) * shares - comm;
    return {
      day: args.day,
      code: args.code,
      gapPct: args.gapPct,
      hasNews: args.hasNews,
      entry,
      exit,
      r: pnl / (risk * shares),
      netPct: (pnl / (entry * shares)) * 100,
      reason,
    };
  }
  return null;
}

export type GapStats = { trades: number; winRate: number; pf: number; meanPct: number; totalPct: number; meanR: number };

export function gapStats(t: readonly GapTrade[]): GapStats {
  const gp = t.filter((x) => x.netPct > 0).reduce((a, x) => a + x.netPct, 0);
  const gl = -t.filter((x) => x.netPct <= 0).reduce((a, x) => a + x.netPct, 0);
  const tot = gp - gl;
  return {
    trades: t.length,
    winRate: t.length ? t.filter((x) => x.netPct > 0).length / t.length : 0,
    pf: gl > 0 ? gp / gl : gp > 0 ? 99 : 0,
    meanPct: t.length ? tot / t.length : 0,
    totalPct: tot,
    meanR: t.length ? t.reduce((a, x) => a + x.r, 0) / t.length : 0,
  };
}

export const GAP_GATE = { minTrades: 60, minPF: 1.15 } as const;

export function gapVariants(): GapVariant[] {
  const out: GapVariant[] = [];
  for (const minGap of [0.05, 0.1, 0.2]) {
    for (const orBars of [1, 3]) {
      for (const rr of [1, 2]) {
        for (const newsOnly of [false, true]) {
          out.push({
            id: `GAP${Math.round(minGap * 100)}_ORB${orBars * 5}_R${rr}${newsOnly ? "_NEWS" : ""}`,
            orBars, rr, minGap, lastEntryMin: 11 * 60, newsOnly,
          });
        }
      }
    }
  }
  return out;
}
