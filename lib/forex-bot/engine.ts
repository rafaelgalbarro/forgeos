/**
 * Forex bot engine — one cycle per minute (scripts/forex-bot-main.ts).
 *
 * Modes (FOREX_BOT_MODE):
 *   shadow   — signals simulated with real prices (no broker). Default.
 *   practice — real orders on the OANDA demo account (OANDA_ENV=practice).
 *   live     — real money on OANDA; requires OANDA_ENV=live, FOREX_BOT_LIVE_CONFIRM=true and
 *              the strategy passing the backtest gate.
 * Every order carries stop loss + take profit on the broker. Flat before the weekend.
 * Daily loss limit (FOREX_BOT_DAILY_LOSS_PCT) halts new entries until the next London day.
 */

import "server-only";

import { sendTelegramMessage } from "@/lib/notifications/telegram-bot";
import {
  fxBotMode,
  fxDailyLossPct,
  fxLiveConfirmed,
  fxMaxLeverage,
  fxMaxPositions,
  fxPairs,
  fxRiskPct,
  fxStrategies,
  oandaConfigured,
  oandaEnv,
  TYPICAL_SPREAD_PIPS,
} from "./config";
import { fxCandles } from "./data";
import { pipSize } from "./indicators";
import { fxEligibleStrategies, loadFxState, loadFxTrades, saveFxState, saveFxTrades } from "./journal";
import {
  oandaAccount,
  oandaCloseTrade,
  oandaMarketEntry,
  oandaOpenTrades,
  oandaPricing,
  oandaTradeDetails,
  type OandaPrice,
} from "./oanda";
import { fxPnlAccount, sizeFxPosition, type FxRates } from "./risk";
import { isFxEntryWindow, isWeekendFlattenTime, londonDayKey } from "./sessions";
import { evaluateLondonBreakout, evaluateTrendPullback } from "./strategies";
import { isFxSignal, type FxCandle, type FxTrade } from "./types";

const candleCache = new Map<string, { bucket: number; m15: FxCandle[]; h1: FxCandle[]; source: string }>();

async function getCandles(instrument: string): Promise<{ m15: FxCandle[]; h1: FxCandle[]; source: string }> {
  // Refresh only when a new M15 bar has closed (saves EODHD/OANDA calls).
  const bucket = Math.floor(Date.now() / 1000 / 900);
  const hit = candleCache.get(instrument);
  if (hit && hit.bucket === bucket) return hit;
  const fresh = await fxCandles(instrument, 400);
  candleCache.set(instrument, { bucket, ...fresh });
  return fresh;
}

function ccys(instrument: string): [string, string] {
  const [a, b] = instrument.split("_");
  return [a ?? "", b ?? ""];
}

function tg(text: string): void {
  void sendTelegramMessage(text).catch(() => undefined);
}

function modeLabel(mode: string): string {
  return mode === "live" ? "REAL" : mode === "practice" ? "demo" : "sombra";
}

export async function runForexBotCycle(): Promise<string> {
  const mode = fxBotMode();
  const pairs = fxPairs();
  const strategies = fxStrategies();
  const state = loadFxState();
  const trades = loadFxTrades();
  const now = new Date();
  const day = londonDayKey(now);
  const notes: string[] = [];

  if (mode !== "shadow" && !oandaConfigured()) {
    return `[ForexBot] modo ${mode} sin OANDA_API_TOKEN/OANDA_ACCOUNT_ID — no se opera`;
  }
  if (mode === "live" && (oandaEnv() !== "live" || !fxLiveConfirmed())) {
    return "[ForexBot] modo live requiere OANDA_ENV=live y FOREX_BOT_LIVE_CONFIRM=true — no se opera";
  }

  // ── Candles + rates ───────────────────────────────────────────────────────
  const data = new Map<string, { m15: FxCandle[]; h1: FxCandle[] }>();
  const rates: FxRates = {};
  let source = "";
  for (const p of pairs) {
    try {
      const c = await getCandles(p);
      data.set(p, c);
      source = c.source;
      const last = c.m15[c.m15.length - 1];
      if (last) rates[p] = last.close;
    } catch (err) {
      notes.push(`${p}: ${err instanceof Error ? err.message.slice(0, 80) : err}`);
    }
  }
  // Live quotes / conversion factors from OANDA when available.
  let pricing: Map<string, OandaPrice> = new Map();
  if (oandaConfigured()) {
    pricing = await oandaPricing(pairs).catch(() => pricing);
    for (const [p, q] of pricing) if (q.mid > 0) rates[p] = q.mid;
  }

  // ── Account ───────────────────────────────────────────────────────────────
  let nav = Number(process.env.FOREX_BOT_SHADOW_NAV ?? 500);
  let accountCurrency = (process.env.FOREX_BOT_SHADOW_CCY ?? "EUR").toUpperCase();
  if (mode !== "shadow") {
    const acct = await oandaAccount();
    nav = acct.nav;
    accountCurrency = acct.currency.toUpperCase();
  }

  // ── Manage open trades ───────────────────────────────────────────────────
  const open = trades.filter((t) => !t.closedAt && t.mode === mode);
  if (mode === "shadow") {
    for (const t of open) {
      const bars = (data.get(t.instrument)?.m15 ?? []).filter((b) => b.time * 1000 >= Date.parse(t.openedAt));
      let exit: number | null = null;
      let reason: FxTrade["exitReason"] = null;
      for (const b of bars) {
        const hitSl = t.side === "long" ? b.low <= t.stop : b.high >= t.stop;
        const hitTp = t.side === "long" ? b.high >= t.takeProfit : b.low <= t.takeProfit;
        if (hitSl) { exit = t.stop; reason = "SL"; break; }
        if (hitTp) { exit = t.takeProfit; reason = "TP"; break; }
      }
      if (exit == null && isWeekendFlattenTime(now) && rates[t.instrument]) {
        exit = rates[t.instrument]!;
        reason = "WEEKEND";
      }
      if (exit != null) closeLocal(t, exit, reason, accountCurrency, rates);
    }
  } else {
    const live = await oandaOpenTrades();
    for (const t of open) {
      const still = live.find((x) => x.id === t.brokerTradeId);
      if (still) {
        if (!still.hasStop || !still.hasTakeProfit) {
          notes.push(`⚠ ${t.instrument} trade ${still.id} sin SL/TP en OANDA`);
        }
        if (isWeekendFlattenTime(now)) {
          const r = await oandaCloseTrade(still.id).catch(() => null);
          if (r) closeLocal(t, r.price, "WEEKEND", accountCurrency, rates, r.pl);
        }
        continue;
      }
      // Closed on the server (TP / SL).
      const d = t.brokerTradeId ? await oandaTradeDetails(t.brokerTradeId).catch(() => null) : null;
      const exitPx = d?.averageClosePrice ?? rates[t.instrument] ?? t.entry;
      const reason: FxTrade["exitReason"] =
        Math.abs(exitPx - t.takeProfit) < Math.abs(exitPx - t.stop) ? "TP" : "SL";
      closeLocal(t, exitPx, reason, accountCurrency, rates, d?.realizedPL ?? null);
    }
  }

  // ── Daily loss limit ─────────────────────────────────────────────────────
  const todayPnl = trades
    .filter((t) => t.closedAt && t.mode === mode && londonDayKey(new Date(t.closedAt)) === day)
    .reduce((s, t) => s + (t.pnl ?? 0), 0);
  const lossLimit = -(nav * fxDailyLossPct()) / 100;
  if (todayPnl <= lossLimit && state.haltedDay !== day) {
    state.haltedDay = day;
    tg(`🛑 <b>FX freno diario</b> (${modeLabel(mode)}): pérdida ${todayPnl.toFixed(2)} ${accountCurrency} ≤ ${lossLimit.toFixed(2)} — sin nuevas entradas hasta mañana`);
  }

  // ── Entries ───────────────────────────────────────────────────────────────
  const stillOpen = trades.filter((t) => !t.closedAt && t.mode === mode);
  let entries = 0;
  const eligible = fxEligibleStrategies();
  if (state.haltedDay === day) {
    notes.push("freno diario activo");
  } else if (!isFxEntryWindow(now)) {
    notes.push("fuera de ventana de entradas");
  } else {
    for (const p of pairs) {
      if (stillOpen.length >= fxMaxPositions()) break;
      const d = data.get(p);
      if (!d || d.m15.length < 60) continue;
      const lastBar = d.m15[d.m15.length - 1]!;
      if (state.lastCandleByPair[p] === lastBar.time) continue; // one decision per closed bar
      state.lastCandleByPair[p] = lastBar.time;
      // Never stack exposure on the same currency.
      const [b, q] = ccys(p);
      if (stillOpen.some((t) => { const [tb, tq] = ccys(t.instrument); return [tb, tq].includes(b) || [tb, tq].includes(q); })) continue;
      for (const s of strategies) {
        if (mode === "live" && !eligible.has(s)) continue;
        const ev = s === "FX_TREND_PULLBACK_M15" ? evaluateTrendPullback(p, d.m15, d.h1) : evaluateLondonBreakout(p, d.m15, d.h1, now);
        if (!isFxSignal(ev)) continue;
        // Spread filter (OANDA live quote) — skip when the spread eats >25% of the stop.
        const quote = pricing.get(p);
        const spread = quote ? quote.ask - quote.bid : (TYPICAL_SPREAD_PIPS[p] ?? 1.5) * pipSize(p);
        if (spread > 0.25 * ev.risk) { notes.push(`${p}: spread alto`); continue; }
        const q2a = quote ? (ev.side === "long" ? quote.quoteHomeLong : quote.quoteHomeShort) : null;
        const size = sizeFxPosition({
          instrument: p, accountCurrency, nav, riskPct: fxRiskPct(), stopDistance: ev.risk,
          price: ev.entry, rates, maxLeverage: fxMaxLeverage(), quoteToAccount: q2a,
        });
        if (!size.ok) { notes.push(`${p}: ${size.reason}`); continue; }
        const trade: FxTrade = {
          id: `${p}-${ev.candleTime}-${s}`,
          strategy: s,
          instrument: p,
          side: ev.side,
          units: size.units,
          entry: ev.entry,
          stop: ev.stop,
          takeProfit: ev.takeProfit,
          openedAt: new Date().toISOString(),
          mode,
          brokerTradeId: null,
        };
        if (mode !== "shadow") {
          try {
            // Re-anchor SL/TP distances to the actual executable price.
            const px = quote ? (ev.side === "long" ? quote.ask : quote.bid) : ev.entry;
            const dir = ev.side === "long" ? 1 : -1;
            trade.entry = px;
            trade.stop = px - dir * ev.risk;
            trade.takeProfit = px + dir * Math.abs(ev.takeProfit - ev.entry);
            const fill = await oandaMarketEntry({
              instrument: p, side: ev.side, units: size.units, stop: trade.stop,
              takeProfit: trade.takeProfit, clientTag: trade.id,
            });
            trade.brokerTradeId = fill.tradeId;
            trade.entry = fill.price;
          } catch (err) {
            notes.push(`${p}: orden rechazada ${err instanceof Error ? err.message.slice(0, 100) : err}`);
            continue;
          }
        }
        trades.push(trade);
        stillOpen.push(trade);
        entries += 1;
        tg(
          `💱 <b>FX ${ev.side === "long" ? "compra" : "venta"} ${p}</b> (${modeLabel(mode)})\n` +
            `${size.units} uds @ ${trade.entry} · SL ${trade.stop.toFixed(5)} · TP ${trade.takeProfit.toFixed(5)}\n` +
            `riesgo ≈ ${size.riskAccount.toFixed(2)} ${accountCurrency} (${fxRiskPct()}%) · apal. ${size.leverage.toFixed(1)}x · ${s}\n${ev.reason}`,
        );
        break;
      }
    }
  }

  saveFxTrades(trades);
  state.lastCycleAt = new Date().toISOString();
  state.dataSource = source;
  const openNow = trades.filter((t) => !t.closedAt && t.mode === mode).length;
  state.lastSummary =
    `[ForexBot] modo=${mode} datos=${source || "—"} pares=${pairs.length} nav=${nav.toFixed(2)} ${accountCurrency} ` +
    `abiertas=${openNow} entradas=${entries} pnlHoy=${todayPnl.toFixed(2)}` + (notes.length ? ` | ${notes.slice(0, 6).join(" | ")}` : "");
  saveFxState(state);
  return state.lastSummary;
}

function closeLocal(
  t: FxTrade,
  exit: number,
  reason: FxTrade["exitReason"],
  accountCurrency: string,
  rates: FxRates,
  brokerPnl?: number | null,
): void {
  t.closedAt = new Date().toISOString();
  t.exit = exit;
  t.exitReason = reason;
  const spreadCost = t.mode === "shadow" ? (TYPICAL_SPREAD_PIPS[t.instrument] ?? 1.5) * pipSize(t.instrument) : 0;
  const gross = fxPnlAccount({
    instrument: t.instrument, side: t.side, units: t.units, entry: t.entry,
    exit: t.side === "long" ? exit - spreadCost : exit + spreadCost, accountCurrency, rates,
  });
  t.pnl = brokerPnl != null && Number.isFinite(brokerPnl) ? brokerPnl : gross;
  const risk = Math.abs(t.entry - t.stop);
  t.rMultiple = risk > 0 ? ((t.side === "long" ? exit - t.entry : t.entry - exit) / risk) : null;
  const icon = (t.pnl ?? 0) >= 0 ? "🟢" : "🔴";
  tg(
    `${icon} <b>FX cerrada ${t.instrument}</b> (${modeLabel(t.mode)}) ${reason}\n` +
      `${t.side === "long" ? "compra" : "venta"} ${t.units} uds ${t.entry} → ${exit} · ` +
      `P&L ${(t.pnl ?? 0).toFixed(2)} ${accountCurrency} (${(t.rMultiple ?? 0).toFixed(2)}R)`,
  );
}
