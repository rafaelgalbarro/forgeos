/**
 * Extra strategy layer of the forex bot: validated non-pair strategies
 *   - RSI2 in trend (meanrev.ts, H1/H4, LIMIT entry) — any instrument (FX, gold, indices)
 *   - Connors Improved R2 (methods.ts, daily US500)
 * Real money only for results that are liveEligible AND locked (owner confirmation); results that
 * are eligible but not locked run simulated (shadow, no Telegram). Exits by rule on closed bars;
 * a protective stop and a safety take-profit always sit on the broker.
 * LIMIT entries are "synthetic": a pending level is kept for the next bar and a market order is
 * sent when the executable price reaches it (no resting orders on the broker).
 */

import "server-only";

import fs from "node:fs";
import path from "node:path";
import { fxMaxPositions, fxMinLotMaxRiskPct, fxRiskPct } from "./config";
import { fxBotDir } from "./journal";
import { mrExit, mrIndicators, mrSignal, mrSpecs, type MrResult, type MrSpec } from "./meanrev";
import { METHODS, type MethodResult } from "./methods";
import { mt5Candles, mt5Close, mt5Closed, mt5Order, mt5Positions, mt5SymbolInfo, type Mt5SymbolInfo } from "./mt5";
import { convert, sizeFxLots, type FxRates } from "./risk";
import { newsBlockReason, type NewsEvent } from "./news";
import { isWeekendFlattenTime } from "./sessions";
import type { FxCandle, FxSide, FxTrade } from "./types";

type Mode = FxTrade["mode"];

export type ExtraCtx = {
  mode: Mode;
  liveMode: boolean;
  brokerBlock: string | null;
  brokerReachable: boolean;
  nav: number;
  shadowNav: number;
  accountCurrency: string;
  rates: FxRates;
  trades: FxTrade[];
  notes: string[];
  news: { events: NewsEvent[]; ageMs: number } | null;
  /** false → only manage open trades (daily brake / outside the entry window) */
  allowEntries: boolean;
  closeLocal: (t: FxTrade, exit: number, reason: FxTrade["exitReason"], brokerPnl?: number | null) => void;
  announce: (text: string, real: boolean) => void;
};

type Active = {
  id: string;
  kind: "MR" | "R2";
  instrument: string;
  tf: "H1" | "H4" | "D1";
  name: string;
  real: boolean;
  mr?: MrSpec;
};

type Pending = { id: string; side: FxSide; level: number; atr: number; until: number; barTime: number };

const TF_SEC = { H1: 3600, H4: 14400, D1: 86400 } as const;
const MAX_BARS = { H1: 24, H4: 10, D1: 30 } as const;

function readJson<T>(name: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(path.join(fxBotDir(), name), "utf8")) as T;
  } catch {
    return null;
  }
}

const pendFile = () => path.join(fxBotDir(), "extra-pending.json");
function loadPending(): Pending[] {
  try { return JSON.parse(fs.readFileSync(pendFile(), "utf8")) as Pending[]; } catch { return []; }
}
function savePending(p: Pending[]): void {
  fs.writeFileSync(pendFile(), JSON.stringify(p, null, 2));
}
const lastBarFile = () => path.join(fxBotDir(), "extra-lastbar.json");
function loadLastBar(): Record<string, number> {
  try { return JSON.parse(fs.readFileSync(lastBarFile(), "utf8")) as Record<string, number>; } catch { return {}; }
}

/** Strategies to run: validated (eligible) ones; real only when also locked. */
export function activeExtraStrategies(liveMode: boolean): Active[] {
  const out: Active[] = [];
  const mr = readJson<{ results: MrResult[] }>("meanrev-latest.json")?.results ?? [];
  const specs = new Map(mrSpecs().map((s) => [s.id, s]));
  for (const r of mr) {
    if (!r.liveEligible || r.entry !== "LMT") continue;
    const spec = specs.get(r.id);
    if (!spec) continue;
    out.push({ id: r.id, kind: "MR", instrument: r.instrument, tf: r.tf, name: r.name, real: liveMode && Boolean(r.locked), mr: spec });
  }
  const m = readJson<{ results: MethodResult[] }>("methods-latest.json")?.results ?? [];
  for (const r of m) {
    const spec = METHODS.find((x) => x.id === r.id);
    if (!r.liveEligible || !spec || spec.kind !== "R2") continue;
    out.push({ id: r.id, kind: "R2", instrument: r.instrument, tf: "D1", name: r.name, real: liveMode && Boolean(r.locked) });
  }
  return out;
}

const barCache = new Map<string, { bucket: number; bars: FxCandle[] }>();
async function closedBars(instrument: string, tf: "H1" | "H4" | "D1"): Promise<FxCandle[]> {
  const bucket = Math.floor(Date.now() / 1000 / Math.min(TF_SEC[tf], 3600));
  const key = `${instrument}:${tf}`;
  const hit = barCache.get(key);
  if (hit && hit.bucket === bucket) return hit.bars;
  const bars = await mt5Candles(instrument, tf, 400);
  barCache.set(key, { bucket, bars });
  return bars;
}

function rsi2(v: readonly number[]): Array<number | null> {
  const o: Array<number | null> = new Array(v.length).fill(null);
  if (v.length < 4) return o;
  let g = 0; let l = 0;
  for (let i = 1; i <= 2; i += 1) { const d = v[i]! - v[i - 1]!; if (d >= 0) g += d; else l -= d; }
  g /= 2; l /= 2;
  o[2] = l === 0 ? 100 : 100 - 100 / (1 + g / l);
  for (let i = 3; i < v.length; i += 1) {
    const d = v[i]! - v[i - 1]!;
    g = (g + Math.max(d, 0)) / 2; l = (l + Math.max(-d, 0)) / 2;
    o[i] = l === 0 ? 100 : 100 - 100 / (1 + g / l);
  }
  return o;
}

function atr14(b: readonly FxCandle[]): number | null {
  if (b.length < 16) return null;
  const tr = b.map((x, i) => (i === 0 ? x.high - x.low : Math.max(x.high - x.low, Math.abs(x.high - b[i - 1]!.close), Math.abs(x.low - b[i - 1]!.close))));
  let a = 0;
  for (let i = 1; i <= 14; i += 1) a += tr[i]!;
  a /= 14;
  for (let i = 15; i < b.length; i += 1) a = (a * 13 + tr[i]!) / 14;
  return a;
}

/** R2 signal on the last closed daily bar (close > SMA200; RSI2 < 65 and falling 3 days). */
function r2Signal(bars: readonly FxCandle[]): boolean {
  const n = bars.length;
  if (n < 205) return false;
  const c = bars.map((b) => b.close);
  const s200 = c.slice(n - 200).reduce((s, x) => s + x, 0) / 200;
  const r = rsi2(c);
  const i = n - 1;
  return c[i]! > s200 && r[i - 2] != null && r[i - 2]! < 65 && r[i - 1]! < r[i - 2]! && r[i]! < r[i - 1]!;
}

function r2Exit(bars: readonly FxCandle[]): boolean {
  const r = rsi2(bars.map((b) => b.close));
  const v = r[r.length - 1];
  return v != null && v > 75;
}

export async function runExtraStrategies(ctx: ExtraCtx): Promise<number> {
  const active = activeExtraStrategies(ctx.liveMode);
  if (!active.length) return 0;
  let entries = 0;
  let pending = loadPending().filter((p) => p.until * 1000 > Date.now());
  const lastBar = loadLastBar();
  const infos = new Map<string, Mt5SymbolInfo>();
  const info = async (inst: string) => {
    if (!infos.has(inst)) { const i = await mt5SymbolInfo(inst).catch(() => null); if (i) infos.set(inst, i); }
    return infos.get(inst) ?? null;
  };
  const livePos = ctx.liveMode && ctx.brokerReachable ? await mt5Positions().catch(() => null) : null;

  for (const a of active) {
    let bars: FxCandle[];
    try { bars = await closedBars(a.instrument, a.tf); } catch (err) {
      ctx.notes.push(`${a.id}: ${err instanceof Error ? err.message.slice(0, 60) : err}`);
      continue;
    }
    if (bars.length < 210) continue;
    const last = bars[bars.length - 1]!;
    const newBar = lastBar[a.id] !== last.time;
    lastBar[a.id] = last.time;
    const open = ctx.trades.find((t) => !t.closedAt && t.strategy === a.id);

    // ── manage the open trade ────────────────────────────────────────────────
    if (open) {
      const isReal = open.mode !== "shadow";
      if (isReal) {
        const still = livePos?.find((p) => String(p.ticket) === open.brokerTradeId);
        if (livePos && !still) {
          const c = open.brokerTradeId ? await mt5Closed(open.brokerTradeId).catch(() => null) : null;
          if (!c || c.closed) {
            const px = c?.exitPrice || ctx.rates[a.instrument] || open.entry;
            ctx.closeLocal(open, px, c?.reason === 4 ? "SL" : c?.reason === 5 ? "TP" : "BROKER", c?.pnl ?? null);
          }
          continue;
        }
      } else {
        // shadow: stop / safety TP on the bars after the entry
        for (const b of bars.filter((x) => x.time * 1000 >= Date.parse(open.openedAt))) {
          const sl = open.side === "long" ? b.low <= open.stop : b.high >= open.stop;
          const tp = open.side === "long" ? b.high >= open.takeProfit : b.low <= open.takeProfit;
          if (sl) { ctx.closeLocal(open, open.stop, "SL"); break; }
          if (tp) { ctx.closeLocal(open, open.takeProfit, "TP"); break; }
        }
        if (open.closedAt) continue;
      }
      if (!newBar) continue;
      const held = (Date.now() - Date.parse(open.openedAt)) / 1000 / TF_SEC[a.tf];
      const ruleOut = a.kind === "MR" ? mrExit(bars, mrIndicators(bars, a.tf as "H1" | "H4"), bars.length - 1, open.side) : r2Exit(bars);
      const weekend = a.kind === "MR" && isWeekendFlattenTime(new Date());
      if (ruleOut || weekend || held >= MAX_BARS[a.tf]) {
        const why: FxTrade["exitReason"] = ruleOut ? "TP" : weekend ? "WEEKEND" : "TIME";
        if (isReal && open.brokerTradeId) {
          const r = await mt5Close(open.brokerTradeId).catch(() => null);
          if (r) {
            const c = await mt5Closed(open.brokerTradeId).catch(() => null);
            ctx.closeLocal(open, c?.exitPrice || r.price || last.close, why, c?.pnl ?? null);
          }
        } else {
          ctx.closeLocal(open, last.close, why);
        }
      }
      continue;
    }

    // ── new signal on a freshly closed bar ───────────────────────────────────
    if (!ctx.allowEntries) continue;
    const nb = newsBlockReason(a.instrument, ctx.news?.events ?? null, ctx.news?.ageMs ?? Infinity);
    if (newBar && !nb) {
      pending = pending.filter((x) => x.id !== a.id); // a new bar replaces an unfilled level
      const a14 = atr14(bars);
      if (a.kind === "MR" && a14) {
        const side = mrSignal(bars, mrIndicators(bars, a.tf as "H1" | "H4"), bars.length - 1);
        if (side) {
          const dir = side === "long" ? 1 : -1;
          pending.push({ id: a.id, side, level: last.close - dir * 0.25 * a14, atr: a14, until: last.time + 2 * TF_SEC[a.tf], barTime: last.time });
        }
      } else if (a.kind === "R2" && a14 && r2Signal(bars)) {
        pending.push({ id: a.id, side: "long", level: Infinity, atr: a14, until: last.time + 2 * TF_SEC.D1, barTime: last.time });
      }
    }

    // ── synthetic limit / market entry ──────────────────────────────────────
    const p = pending.find((x) => x.id === a.id);
    if (!p || nb) continue;
    const i = await info(a.instrument);
    const bid = i?.bid ?? null; const ask = i?.ask ?? null;
    const real = a.real && !ctx.brokerBlock;
    let px: number | null = null;
    if (real || (bid && ask)) {
      if (!bid || !ask) continue;
      const exec = p.side === "long" ? ask : bid;
      if (p.level === Infinity || (p.side === "long" ? exec <= p.level : exec >= p.level)) px = exec;
    } else {
      const after = bars.filter((b) => b.time > p.barTime);
      const spr = (i?.ask && i?.bid ? i.ask - i.bid : 0);
      if (after.some((b) => (p.side === "long" ? b.low <= p.level - spr / 2 : b.high >= p.level + spr / 2))) px = p.level;
    }
    if (px == null) continue;
    pending.splice(pending.indexOf(p), 1);
    const dir = p.side === "long" ? 1 : -1;
    const stopMult = a.kind === "R2" ? 3 : 2;
    const digits = i?.digits ?? 5;
    const stop = Number((px - dir * stopMult * p.atr).toFixed(digits));
    const tp = Number((px + dir * (a.kind === "R2" ? 6 : 3) * p.atr).toFixed(digits));
    const realOpen = ctx.trades.filter((t) => !t.closedAt && t.mode !== "shadow").length;
    const mode: Mode = real && realOpen < fxMaxPositions() ? ctx.mode : "shadow";
    let lots: number | null = null;
    let units = 0;
    let riskAcc = 0;
    if (i) {
      const nav = mode === "shadow" ? ctx.shadowNav : ctx.nav;
      const s = sizeFxLots({
        nav, riskPct: fxRiskPct(), stopDistance: Math.abs(px - stop), tickSize: i.tick_size,
        tickValueLoss: i.tick_value_loss || i.tick_value, contractSize: i.contract_size,
        volumeMin: i.volume_min, volumeStep: i.volume_step, volumeMax: i.volume_max,
        baseToAccount: convert(i.currency_base || "", ctx.accountCurrency, ctx.rates), maxLeverage: 30,
        minLotMaxRiskPct: fxMinLotMaxRiskPct(),
      });
      if (!s.ok) {
        if (mode !== "shadow") { ctx.notes.push(`${a.id}: ${s.reason}`); continue; }
      } else { lots = s.lots; units = Math.round(s.lots * i.contract_size); riskAcc = s.riskAccount; }
    }
    const trade: FxTrade = {
      id: `${a.id}-${p.barTime}`, strategy: a.id, instrument: a.instrument, side: p.side, units, lots,
      maxHoldMin: (MAX_BARS[a.tf] * TF_SEC[a.tf]) / 60, holdWeekend: a.kind === "R2",
      broker: mode === "shadow" ? "shadow" : "mt5", entry: px, stop, takeProfit: tp,
      openedAt: new Date().toISOString(), mode, brokerTradeId: null,
    };
    if (mode !== "shadow") {
      try {
        const fill = await mt5Order({ instrument: a.instrument, side: p.side, lots: lots ?? 0, stop, takeProfit: tp, comment: a.id.slice(0, 28) });
        trade.brokerTradeId = fill.ticket;
        trade.entry = fill.price || px;
      } catch (err) {
        ctx.notes.push(`${a.id}: orden rechazada ${err instanceof Error ? err.message.slice(0, 80) : err}`);
        continue;
      }
    }
    ctx.trades.push(trade);
    entries += 1;
    ctx.announce(
      `💱 <b>${p.side === "long" ? "compra" : "venta"} ${a.instrument}</b> (${mode === "shadow" ? "sombra" : "REAL"})\n` +
        `${lots ?? "—"} lotes @ ${trade.entry} · SL ${stop} · TP seguridad ${tp}${riskAcc ? ` · riesgo ≈ ${riskAcc.toFixed(2)} ${ctx.accountCurrency}` : ""}\n${a.name}`,
      mode !== "shadow",
    );
  }
  savePending(pending);
  fs.writeFileSync(lastBarFile(), JSON.stringify(lastBar));
  return entries;
}
