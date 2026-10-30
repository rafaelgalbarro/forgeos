/**
 * Intraday indicator combinations (owner's list, 30/10) for stocks and index CFDs — pure module.
 *
 * Bars: 5-minute (15-minute rules aggregate them). Signals on the close of bar i inside the
 * session → entry at the next bar's open. Long only (stock buying). Flat at the session end.
 * Stop 1.5 × ATR(14) unless the rule sets its own; target where the rule gives one, else 2R.
 * Level 2 / order-book rules need depth data we do not have and are not included.
 */

export type IBar = { t: number; o: number; h: number; l: number; c: number; v: number };

type Arr = Array<number | null>;
const ema = (v: readonly number[], n: number): Arr => {
  const o: Arr = new Array(v.length).fill(null); if (v.length < n) return o;
  let e = 0; for (let i = 0; i < n; i += 1) e += v[i]!; e /= n; o[n - 1] = e;
  const k = 2 / (n + 1); for (let i = n; i < v.length; i += 1) { e = v[i]! * k + e * (1 - k); o[i] = e; }
  return o;
};
const sma = (v: readonly number[], n: number): Arr => {
  const o: Arr = new Array(v.length).fill(null); let s = 0;
  for (let i = 0; i < v.length; i += 1) { s += v[i]!; if (i >= n) s -= v[i - n]!; if (i >= n - 1) o[i] = s / n; }
  return o;
};
const rsi = (v: readonly number[], n: number): Arr => {
  const o: Arr = new Array(v.length).fill(null); if (v.length <= n) return o;
  let g = 0; let l = 0; for (let i = 1; i <= n; i += 1) { const d = v[i]! - v[i - 1]!; if (d >= 0) g += d; else l -= d; }
  g /= n; l /= n; o[n] = l === 0 ? 100 : 100 - 100 / (1 + g / l);
  for (let i = n + 1; i < v.length; i += 1) { const d = v[i]! - v[i - 1]!; g = (g * (n - 1) + Math.max(d, 0)) / n; l = (l * (n - 1) + Math.max(-d, 0)) / n; o[i] = l === 0 ? 100 : 100 - 100 / (1 + g / l); }
  return o;
};
const atrA = (b: readonly IBar[], n = 14): Arr => {
  const o: Arr = new Array(b.length).fill(null); if (b.length <= n) return o;
  const tr = b.map((x, i) => (i === 0 ? x.h - x.l : Math.max(x.h - x.l, Math.abs(x.h - b[i - 1]!.c), Math.abs(x.l - b[i - 1]!.c))));
  let a = 0; for (let i = 1; i <= n; i += 1) a += tr[i]!; a /= n; o[n] = a;
  for (let i = n + 1; i < b.length; i += 1) { a = (a * (n - 1) + tr[i]!) / n; o[i] = a; }
  return o;
};

export type Session = { open: number; close: number; minutes: (t: number) => number; day: (t: number) => string };

const fmtCache = new Map<string, Intl.DateTimeFormat>();
export function sessionFor(tz: string, open: number, close: number): Session {
  let f = fmtCache.get(tz);
  if (!f) { f = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }); fmtCache.set(tz, f); }
  const parts = (t: number) => { const p = f!.formatToParts(new Date(t * 1000)); const g = (k: string) => p.find((x) => x.type === k)?.value ?? "0"; return { d: `${g("year")}-${g("month")}-${g("day")}`, m: Number(g("hour")) * 60 + Number(g("minute")) }; };
  return { open, close, minutes: (t) => parts(t).m, day: (t) => parts(t).d };
}
export const NY_SESSION = () => sessionFor("America/New_York", 570, 955);
export const XETRA_SESSION = () => sessionFor("Europe/Berlin", 540, 1045);

/** Regular-session bars only, with the minute-of-day and the day key. */
export function sessionBars(b: readonly IBar[], s: Session): Array<IBar & { m: number; d: string }> {
  return [...b].sort((x, y) => x.t - y.t).map((x) => ({ ...x, m: s.minutes(x.t), d: s.day(x.t) })).filter((x) => x.m >= s.open && x.m < s.close + 5);
}

/** 15-minute bars from 5-minute session bars (aligned on the session open). */
export function to15(b: ReadonlyArray<IBar & { m: number; d: string }>, s: Session): Array<IBar & { m: number; d: string }> {
  const out: Array<IBar & { m: number; d: string }> = [];
  for (const x of b) {
    const slot = s.open + Math.floor((x.m - s.open) / 15) * 15;
    const last = out[out.length - 1];
    if (last && last.d === x.d && last.m === slot) {
      last.h = Math.max(last.h, x.h); last.l = Math.min(last.l, x.l); last.c = x.c; last.v += x.v; last.t = x.t;
    } else out.push({ ...x, m: slot });
  }
  return out;
}

type Ctx = {
  b: ReadonlyArray<IBar & { m: number; d: string }>;
  c: number[]; v: number[];
  ema: (n: number) => Arr; sma: (n: number) => Arr; rsi: (n: number) => Arr; atr: Arr;
  macd: { m: Arr; s: Arr }; bbMid: Arr; bbSd: Arr; volAvg: Arr;
  s: Session;
};

function ctxOf(b: ReadonlyArray<IBar & { m: number; d: string }>, s: Session): Ctx {
  const c = b.map((x) => x.c); const v = b.map((x) => x.v);
  const ec = new Map<number, Arr>(); const sc = new Map<number, Arr>(); const rc = new Map<number, Arr>();
  const e12 = ema(c, 12); const e26 = ema(c, 26);
  const m: Arr = c.map((_, i) => (e12[i] == null || e26[i] == null ? null : e12[i]! - e26[i]!));
  const f = m.findIndex((x) => x != null); const sg: Arr = new Array(c.length).fill(null);
  if (f >= 0) ema(m.slice(f) as number[], 9).forEach((x, j) => { sg[f + j] = x; });
  const mid = sma(c, 20); const sd: Arr = c.map((_, i) => { if (mid[i] == null) return null; let q = 0; for (let j = i - 19; j <= i; j += 1) q += (c[j]! - mid[i]!) ** 2; return Math.sqrt(q / 20); });
  return {
    b, c, v, s,
    ema: (n) => { let e = ec.get(n); if (!e) { e = ema(c, n); ec.set(n, e); } return e; },
    sma: (n) => { let e = sc.get(n); if (!e) { e = sma(c, n); sc.set(n, e); } return e; },
    rsi: (n) => { let e = rc.get(n); if (!e) { e = rsi(c, n); rc.set(n, e); } return e; },
    atr: atrA(b), macd: { m, s: sg }, bbMid: mid, bbSd: sd, volAvg: sma(v, 20),
  };
}

type Plan = { stop?: number; target?: number; exitRule?: (x: Ctx, j: number) => boolean } | null;
type IRule = { id: string; name: string; tf: 5 | 15; entry: (x: Ctx, i: number) => Plan };

const cu = (a: Arr, b: Arr | number, i: number) => {
  const b0 = typeof b === "number" ? b : b[i - 1]; const b1 = typeof b === "number" ? b : b[i];
  return a[i - 1] != null && a[i] != null && b0 != null && b1 != null && a[i - 1]! <= b0 && a[i]! > b1;
};
const cd = (a: Arr, b: Arr | number, i: number) => {
  const b0 = typeof b === "number" ? b : b[i - 1]; const b1 = typeof b === "number" ? b : b[i];
  return a[i - 1] != null && a[i] != null && b0 != null && b1 != null && a[i - 1]! >= b0 && a[i]! < b1;
};

export const INTRADAY_RULES: IRule[] = [
  {
    id: "EMA9_20_TREND", name: "Cruce EMA 9/20 a favor de la tendencia mayor (EMA 200)", tf: 5,
    entry: (x, i) => (cu(x.ema(9), x.ema(20), i) && x.ema(200)[i] != null && x.c[i]! > x.ema(200)[i]! ? { exitRule: (y, j) => cd(y.ema(9), y.ema(20), j) } : null),
  },
  {
    id: "RIBBON_5_8_13", name: "Cinta EMA 5-8-13 se abre en orden con el precio por encima", tf: 5,
    entry: (x, i) => {
      const a = x.ema(5); const b = x.ema(8); const c = x.ema(13);
      const ord = (k: number) => a[k] != null && c[k] != null && a[k]! > b[k]! && b[k]! > c[k]! && a[k]! - c[k]! > (a[k - 1] ?? 0) - (c[k - 1] ?? 0);
      return ord(i) && !ord(i - 1) && x.c[i]! > a[i]! ? { exitRule: (y, j) => y.ema(5)[j]! < y.ema(8)[j]! } : null;
    },
  },
  {
    id: "BB_SQUEEZE_BREAK", name: "Compresión de Bollinger y cierre por encima de la banda con expansión", tf: 5,
    entry: (x, i) => {
      if (i < 120 || x.bbMid[i] == null) return null;
      const w = (k: number) => (x.bbSd[k] != null && x.bbMid[k]! > 0 ? (4 * x.bbSd[k]!) / x.bbMid[k]! : Infinity);
      const hist = Array.from({ length: 100 }, (_, k) => w(i - 1 - k)).filter(Number.isFinite).sort((p, q) => p - q);
      const squeeze = w(i - 1) <= hist[Math.floor(hist.length * 0.2)]!;
      return squeeze && w(i) > w(i - 1) && x.c[i]! > x.bbMid[i]! + 2 * x.bbSd[i]! ? { stop: x.bbMid[i]! } : null;
    },
  },
  ...[15, 30].map((orMin): IRule => ({
    id: `ORB_${orMin}`, name: `Ruptura del rango de apertura de ${orMin} min (cierre fuera)`, tf: 5,
    entry: (x, i) => {
      const b = x.b[i]!;
      if (b.m < x.s.open + orMin || b.m > x.s.open + 120) return null;
      let k0 = i;
      while (k0 > 0 && x.b[k0 - 1]!.d === b.d) k0 -= 1;
      let hi = -Infinity; let lo = Infinity;
      for (let k = k0; k < i; k += 1) {
        const q = x.b[k]!;
        if (q.m < x.s.open + orMin) { hi = Math.max(hi, q.h); lo = Math.min(lo, q.l); }
      }
      if (!Number.isFinite(hi) || x.b[k0]!.m !== x.s.open) return null;
      for (let k = k0; k < i; k += 1) if (x.b[k]!.m >= x.s.open + orMin && x.b[k]!.c > hi) return null;
      return b.c > hi ? { stop: lo } : null;
    },
  })),
  {
    id: "GOLDEN_POCKET", name: "Golden Pocket de Fibonacci (61,8–65 %) con vela de rechazo en tendencia", tf: 5,
    entry: (x, i) => {
      if (i < 60) return null;
      const e50 = x.ema(50)[i]; const e200 = x.ema(200)[i];
      if (e50 == null || e200 == null || e50 <= e200) return null;
      let hiI = i - 1;
      for (let k = i - 40; k < i; k += 1) if (x.b[k]!.h > x.b[hiI]!.h) hiI = k;
      let loI = hiI;
      for (let k = hiI - 40; k < hiI; k += 1) if (k >= 0 && x.b[k]!.l < x.b[loI]!.l) loI = k;
      const H = x.b[hiI]!.h; const L = x.b[loI]!.l;
      if (!(H > L) || hiI >= i - 2) return null;
      const z1 = H - 0.618 * (H - L); const z2 = H - 0.65 * (H - L);
      const b = x.b[i]!; const body = Math.abs(b.c - b.o); const wick = Math.min(b.o, b.c) - b.l;
      const inZone = b.l <= z1 && b.l >= z2 - 0.05 * (H - L);
      return inZone && b.c > b.o && wick >= body ? { stop: H - 0.786 * (H - L), target: H } : null;
    },
  },
  {
    id: "MACD_RSI", name: "MACD cruza su señal confirmado por RSI cruzando 50", tf: 5,
    entry: (x, i) => {
      const r = x.rsi(14);
      const rsiUp = [0, 1, 2].some((k) => cu(r, 50, i - k));
      return cu(x.macd.m, x.macd.s, i) && rsiUp ? { exitRule: (y, j) => cd(y.macd.m, y.macd.s, j) } : null;
    },
  },
  {
    id: "BB_VOLUME", name: "Vuelta dentro de la banda inferior de Bollinger con volumen ≥ 1,5× la media", tf: 5,
    entry: (x, i) => {
      if (x.bbMid[i - 1] == null || x.volAvg[i] == null) return null;
      const lo0 = x.bbMid[i - 1]! - 2 * x.bbSd[i - 1]!; const lo1 = x.bbMid[i]! - 2 * x.bbSd[i]!;
      return x.c[i - 1]! < lo0 && x.c[i]! > lo1 && x.v[i]! >= 1.5 * x.volAvg[i]! ? { target: x.bbMid[i]! } : null;
    },
  },
  {
    id: "MA_PRICE_ACTION", name: "Envolvente alcista en la EMA 20 con EMA 20 > EMA 50 (15 min)", tf: 15,
    entry: (x, i) => {
      const e20 = x.ema(20)[i]; const e50 = x.ema(50)[i];
      if (e20 == null || e50 == null || e20 <= e50) return null;
      const p = x.b[i - 1]!; const b = x.b[i]!;
      const engulf = p.c < p.o && b.c > b.o && b.c >= p.o && b.o <= p.c;
      return engulf && b.l <= e20 * 1.001 && b.c > e20 ? { stop: Math.min(p.l, b.l) } : null;
    },
  },
  {
    id: "MACD_BB", name: "MACD cruza al alza tras tocar la banda inferior de Bollinger", tf: 5,
    entry: (x, i) => {
      if (x.bbMid[i] == null) return null;
      const touched = [0, 1, 2].some((k) => x.b[i - k]!.l <= x.bbMid[i - k]! - 2 * x.bbSd[i - k]!);
      return touched && cu(x.macd.m, x.macd.s, i) ? { target: x.bbMid[i]! + 2 * x.bbSd[i]! } : null;
    },
  },
  {
    id: "MULTI_MA_RSI", name: "EMA 9 > 21 > 50 y RSI recupera 40 tras retroceso (15 min)", tf: 15,
    entry: (x, i) => {
      const a = x.ema(9)[i]; const b = x.ema(21)[i]; const c = x.ema(50)[i];
      return a != null && b != null && c != null && a > b && b > c && cu(x.rsi(14), 40, i) ? { exitRule: (y, j) => y.rsi(14)[j]! > 70 || y.ema(9)[j]! < y.ema(21)[j]! } : null;
    },
  },
  {
    id: "RSI_VOLUME", name: "RSI(7) < 25 con volumen ≥ 2× la media (rebote)", tf: 5,
    entry: (x, i) => {
      const r = x.rsi(7);
      return r[i] != null && r[i]! < 25 && x.volAvg[i] != null && x.v[i]! >= 2 * x.volAvg[i]! && x.c[i]! > x.b[i]!.o ? { exitRule: (y, j) => y.rsi(7)[j]! > 55 } : null;
    },
  },
];

export type ICost = { kind: "stock"; notionalUsd: number; slipPct: number } | { kind: "cfd"; spread: number };
export type ITrade = { day: string; r: number; netPct: number; win: boolean };

function stockComm(shares: number, price: number): number {
  const v = shares * price; return v > 0 ? Math.min(Math.max(1, 0.005 * shares), 0.01 * v) : 0;
}

export function backtestIntraday(rule: IRule, bars5: ReadonlyArray<IBar & { m: number; d: string }>, s: Session, cost: ICost, mult = 1): ITrade[] {
  const b = rule.tf === 15 ? to15(bars5, s) : bars5;
  const x = ctxOf(b, s);
  const out: ITrade[] = [];
  for (let i = 50; i < b.length - 1; i += 1) {
    const bar = b[i]!;
    const nx = b[i + 1]!;
    if (nx.d !== bar.d || bar.m >= s.close - 15) continue;
    let plan: Plan = null;
    try { plan = rule.entry(x, i); } catch { plan = null; }
    if (!plan) continue;
    const a = x.atr[i];
    if (a == null || !(a > 0)) continue;
    const slip = cost.kind === "stock" ? cost.slipPct * mult : 0;
    const half = cost.kind === "cfd" ? (cost.spread * mult) / 2 : 0;
    const entry = nx.o * (1 + slip) + half;
    const stop = plan.stop != null && plan.stop < entry ? plan.stop : entry - 1.5 * a;
    const risk = entry - stop;
    if (!(risk > 0) || risk / entry > 0.05) continue;
    const target = plan.target != null && plan.target > entry ? plan.target : entry + 2 * risk;
    let exitRaw = nx.c; let j = i + 1;
    for (; j < b.length; j += 1) {
      const q = b[j]!;
      if (q.d !== bar.d) { exitRaw = b[j - 1]!.c; j -= 1; break; }
      if (q.l <= stop) { exitRaw = j > i + 1 ? Math.min(stop, q.o) : stop; break; }
      if (q.h >= target) { exitRaw = j > i + 1 ? Math.max(target, q.o) : target; break; }
      let ex = false; try { ex = plan.exitRule ? plan.exitRule(x, j) : false; } catch { ex = false; }
      if (ex || q.m >= s.close - 5) { exitRaw = q.c; break; }
    }
    if (j >= b.length) break;
    const exit = exitRaw * (1 - slip) - half;
    let pnlPerShare = exit - entry;
    if (cost.kind === "stock") {
      const shares = Math.max(1, Math.floor(cost.notionalUsd / entry));
      pnlPerShare -= ((stockComm(shares, entry) + stockComm(shares, exit)) * mult) / shares;
    }
    out.push({ day: bar.d, r: pnlPerShare / risk, netPct: (pnlPerShare / entry) * 100, win: pnlPerShare > 0 });
    i = j;
  }
  return out;
}

export type IStats = { trades: number; winRate: number; pf: number; meanR: number; meanPct: number };
export function iStats(t: readonly ITrade[]): IStats {
  const gp = t.filter((q) => q.r > 0).reduce((a, q) => a + q.r, 0); const gl = -t.filter((q) => q.r <= 0).reduce((a, q) => a + q.r, 0);
  return { trades: t.length, winRate: t.length ? t.filter((q) => q.win).length / t.length : 0, pf: gl > 0 ? gp / gl : gp > 0 ? 99 : 0, meanR: t.length ? (gp - gl) / t.length : 0, meanPct: t.length ? t.reduce((a, q) => a + q.netPct, 0) / t.length : 0 };
}
