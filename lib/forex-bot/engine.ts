/**
 * Forex bot engine — one cycle per minute (scripts/forex-bot-main.ts).
 *
 * Modes (FOREX_BOT_MODE):
 *   shadow   — signals simulated with real prices (no broker). Default.
 *   practice — real orders on a demo account (OANDA_ENV=practice, or an MT5 demo login).
 *   live     — real money only for CONFIRMED pairs (pair-strategies.json: liveEligible + locked);
 *              the other pairs keep running simulated. Requires FOREX_BOT_LIVE_CONFIRM=true and a real account (OANDA_ENV=live, or an MT5 login that is not demo).
 * Broker (FOREX_BOT_BROKER): mt5 (OANDA TMS via services/mt5-bridge) or oanda (v20 REST).
 * Every order carries stop loss + take profit on the broker. Flat before the weekend.
 * Daily loss limit (FOREX_BOT_DAILY_LOSS_PCT) halts new entries until the next London day.
 */

import "server-only";

import { sendTelegramMessage } from "@/lib/notifications/telegram-bot";
import {
  fxBotMode,
  fxBroker,
  fxDailyLossPct,
  fxLiveConfirmed,
  fxMaxLeverage,
  fxMaxPositions,
  fxMinLotMaxRiskPct,
  fxPairs,
  fxRiskPct,
  fxStrategies,
  oandaConfigured,
  oandaEnv,
  TYPICAL_SPREAD_PIPS,
} from "./config";
import { fxCandles } from "./data";
import { pipSize } from "./indicators";
import { fxEligibleStrategies, loadFxState, loadFxTrades, loadPairChoices, saveFxState, saveFxTrades } from "./journal";
import { computeIndicators, signalAt, TF_SEC, type FxTf, type PairChoice } from "./pair-strategies";
import {
  oandaAccount,
  oandaCloseTrade,
  oandaMarketEntry,
  oandaOpenTrades,
  oandaPricing,
  oandaTradeDetails,
  type OandaPrice,
} from "./oanda";
import { mt5Account, mt5Candles, mt5Close, mt5Closed, mt5Configured, mt5Order, mt5Positions, mt5SymbolInfo, mt5TradeCheck, type Mt5SymbolInfo } from "./mt5";
import { convert, fxPnlAccount, sizeFxLots, sizeFxPosition, type FxRates } from "./risk";
import { isFxEntryWindow, isWeekendFlattenTime, londonDayKey } from "./sessions";
import { evaluateLondonBreakout, evaluateTrendPullback } from "./strategies";
import { isFxSignal, type FxCandle, type FxEvaluation, type FxTrade } from "./types";

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

const tfCache = new Map<string, { bucket: number; bars: FxCandle[] }>();

/** H1/H4 closed candles from MT5 (refreshed once per bar). */
async function getTfCandles(instrument: string, tf: FxTf): Promise<FxCandle[]> {
  const bucket = Math.floor(Date.now() / 1000 / TF_SEC[tf]);
  const key = `${instrument}:${tf}`;
  const hit = tfCache.get(key);
  if (hit && hit.bucket === bucket && hit.bars.length) return hit.bars;
  const bars = await mt5Candles(instrument, tf, 400);
  tfCache.set(key, { bucket, bars });
  return bars;
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

  const broker = fxBroker();
  const useMt5 = broker === "mt5";
  if (mode !== "shadow") {
    if (useMt5 && !mt5Configured()) return `[ForexBot] modo ${mode} sin MT5_BRIDGE_KEY — no se opera`;
    if (!useMt5 && !oandaConfigured()) return `[ForexBot] modo ${mode} sin OANDA_API_TOKEN/OANDA_ACCOUNT_ID — no se opera`;
  }
  if (mode === "live" && !fxLiveConfirmed()) {
    return "[ForexBot] modo live requiere FOREX_BOT_LIVE_CONFIRM=true — no se opera";
  }
  if (mode === "live" && !useMt5 && oandaEnv() !== "live") {
    return "[ForexBot] modo live requiere OANDA_ENV=live — no se opera";
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
  // Live quotes / conversion factors from the broker when available.
  let pricing: Map<string, OandaPrice> = new Map();
  const mt5Info = new Map<string, Mt5SymbolInfo>();
  if (useMt5 && mt5Configured()) {
    for (const p of pairs) {
      try {
        const info = await mt5SymbolInfo(p);
        mt5Info.set(p, info);
        if (info.bid && info.ask) rates[p] = (info.bid + info.ask) / 2;
      } catch (err) {
        notes.push(`${p} MT5: ${err instanceof Error ? err.message.slice(0, 80) : err}`);
      }
    }
  } else if (oandaConfigured()) {
    pricing = await oandaPricing(pairs).catch(() => pricing);
    for (const [p, q] of pricing) if (q.mid > 0) rates[p] = q.mid;
  }

  // ── Account ───────────────────────────────────────────────────────────────
  let nav = Number(process.env.FOREX_BOT_SHADOW_NAV ?? 500);
  let accountCurrency = (process.env.FOREX_BOT_SHADOW_CCY ?? "EUR").toUpperCase();
  const liveMode = mode !== "shadow";
  /** Why real orders are not possible this cycle (shadow simulation keeps running). */
  let brokerBlock: string | null = null;
  let brokerReachable = false;
  if (liveMode) {
    try {
      if (useMt5) {
        const acct = await mt5Account();
        brokerReachable = true;
        nav = acct.equity;
        accountCurrency = acct.currency.toUpperCase();
        if (mode === "live" && acct.demo) brokerBlock = "modo live pero la cuenta MT5 es demo";
        else if (mode === "practice" && !acct.demo) brokerBlock = "modo practice pero la cuenta MT5 es REAL";
        else if (!acct.trade_allowed) {
          // The flag can lag behind the server: confirm with a dry-run order check.
          const chk = await mt5TradeCheck().catch(() => null);
          if (!chk?.ok) brokerBlock = `cuenta MT5 sin permiso de trading (OANDA)${chk ? ` [${chk.retcode} ${chk.comment}]` : ""}`;
        }
        else if (acct.terminal_trade_allowed === false) brokerBlock = "MT5: 'Algo Trading' desactivado";
      } else {
        const acct = await oandaAccount();
        brokerReachable = true;
        nav = acct.nav;
        accountCurrency = acct.currency.toUpperCase();
      }
    } catch (err) {
      brokerBlock = `broker no disponible: ${err instanceof Error ? err.message.slice(0, 80) : err}`;
    }
    if (brokerBlock) notes.push(`sin órdenes reales: ${brokerBlock}`);
  }
  const shadowNav = Number(process.env.FOREX_BOT_SHADOW_NAV ?? (liveMode && nav > 0 ? nav : 500));
  /** Shadow trades only message Telegram when the whole bot is in shadow mode. */
  const shadowQuiet = liveMode;

  // ── Manage open trades ───────────────────────────────────────────────────
  const openShadow = trades.filter((t) => !t.closedAt && t.mode === "shadow");
  const open = liveMode ? trades.filter((t) => !t.closedAt && t.mode === mode) : [];
  {
    for (const t of openShadow) {
      const bars = (data.get(t.instrument)?.m15 ?? []).filter((b) => b.time * 1000 >= Date.parse(t.openedAt));
      let exit: number | null = null;
      let reason: FxTrade["exitReason"] = null;
      for (const b of bars) {
        const hitSl = t.side === "long" ? b.low <= t.stop : b.high >= t.stop;
        const hitTp = t.side === "long" ? b.high >= t.takeProfit : b.low <= t.takeProfit;
        if (hitSl) { exit = t.stop; reason = "SL"; break; }
        if (hitTp) { exit = t.takeProfit; reason = "TP"; break; }
      }
      if (exit == null && !t.holdWeekend && isWeekendFlattenTime(now) && rates[t.instrument]) {
        exit = rates[t.instrument]!;
        reason = "WEEKEND";
      }
      if (exit == null && timeUp(t, now) && rates[t.instrument]) {
        exit = rates[t.instrument]!;
        reason = "TIME";
      }
      if (exit != null) closeLocal(t, exit, reason, accountCurrency, rates, null, shadowQuiet);
    }
  }
  if (!liveMode || !brokerReachable || open.length === 0) {
    /* nothing real to manage */
  } else if (useMt5) {
    const live = await mt5Positions();
    for (const t of open) {
      const still = live.find((x) => String(x.ticket) === t.brokerTradeId);
      if (still) {
        if (!(still.sl > 0) || !(still.tp > 0)) notes.push(`⚠ ${t.instrument} posición ${still.ticket} sin SL/TP en MT5`);
        const wk = !t.holdWeekend && isWeekendFlattenTime(now);
        if (wk || timeUp(t, now)) {
          const r = await mt5Close(String(still.ticket)).catch(() => null);
          if (r) {
            const c = await mt5Closed(String(still.ticket)).catch(() => null);
            // OANDA fills asynchronously (close/order replies may carry price 0): prefer the deal price.
            const px = c?.exitPrice || r.price || rates[t.instrument] || t.entry;
            closeLocal(t, px, wk ? "WEEKEND" : "TIME", accountCurrency, rates, c?.pnl ?? null);
          }
        }
        continue;
      }
      const c = t.brokerTradeId ? await mt5Closed(t.brokerTradeId).catch(() => null) : null;
      if (c && !c.closed) continue; // not visible yet — retry next cycle
      const exitPx = c?.exitPrice ?? rates[t.instrument] ?? t.entry;
      const reason: FxTrade["exitReason"] =
        c?.reason === 5 ? "TP" : c?.reason === 4 ? "SL" : c?.reason != null ? "BROKER"
          : Math.abs(exitPx - t.takeProfit) < Math.abs(exitPx - t.stop) ? "TP" : "SL";
      closeLocal(t, exitPx, reason, accountCurrency, rates, c?.pnl ?? null);
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
  const stillOpen = trades.filter((t) => !t.closedAt && (t.mode === mode || t.mode === "shadow"));
  const SHADOW_MAX = 8;
  let entries = 0;
  const eligible = fxEligibleStrategies();
  const pairChoices = new Map<string, PairChoice>(
    (loadPairChoices()?.choices ?? []).filter((c) => c.spec).map((c) => [c.instrument, c]),
  );
  if (state.haltedDay === day) {
    notes.push("freno diario activo");
  } else if (!isFxEntryWindow(now)) {
    notes.push("fuera de ventana de entradas");
  } else {
    for (const p of pairs) {
      const d = data.get(p);
      if (!d || d.m15.length < 60) continue;
      const lastBar = d.m15[d.m15.length - 1]!;
      if (state.lastCandleByPair[p] === lastBar.time) continue; // one decision per closed bar
      state.lastCandleByPair[p] = lastBar.time;
      // Per-pair strategy (forex-optimize) when available; otherwise the generic strategies.
      const evals: Array<{ s: string; ev: FxEvaluation; maxHoldMin: number | null; holdWeekend: boolean }> = [];
      const choice = pairChoices.get(p);
      // Real money only for validated pairs; everything else is simulated (shadow).
      const tradeMode: FxTrade["mode"] =
        liveMode && !brokerBlock && (mode !== "live" || (choice?.liveEligible && choice.locked)) ? mode : "shadow";
      const sameMode = stillOpen.filter((t) => t.mode === tradeMode);
      if (sameMode.length >= (tradeMode === "shadow" ? SHADOW_MAX : fxMaxPositions())) continue;
      // Never stack exposure on the same currency (within real or within shadow).
      const [b, q] = ccys(p);
      if (sameMode.some((t) => { const [tb, tq] = ccys(t.instrument); return [tb, tq].includes(b) || [tb, tq].includes(q); })) continue;
      if (choice?.spec) {
        const tf: FxTf = choice.spec.tf ?? "M15";
        let bars: FxCandle[] = d.m15;
        if (tf !== "M15") {
          if (!mt5Configured()) { notes.push(`${p}: ${tf} requiere MT5`); continue; }
          bars = await getTfCandles(p, tf).catch(() => []);
          const lastTf = bars[bars.length - 1];
          if (!lastTf || bars.length < 210) continue;
          const key = `${p}:${tf}`;
          if (state.lastCandleByPair[key] === lastTf.time) continue; // one decision per closed bar
          state.lastCandleByPair[key] = lastTf.time;
        }
        const ind = computeIndicators(bars, TF_SEC[tf]);
        const i = bars.length - 1;
        const side = signalAt(choice.spec, ind, i);
        const a = ind.atr14[i];
        if (side && a && a > 0) {
          const risk = choice.spec.atrMult * a;
          const dir = side === "long" ? 1 : -1;
          evals.push({
            s: choice.spec.id,
            holdWeekend: tf === "D1",
            maxHoldMin: (choice.spec.maxBars * TF_SEC[tf]) / 60,
            ev: {
              strategy: choice.spec.id, instrument: p, side, entry: lastBar.close,
              stop: lastBar.close - dir * risk, takeProfit: lastBar.close + dir * choice.spec.rr * risk,
              risk, reason: choice.description, candleTime: lastBar.time,
            },
          });
        }
      } else {
        for (const s of strategies) {
          if (mode === "live" && !eligible.has(s)) continue;
          const ev = s === "FX_TREND_PULLBACK_M15" ? evaluateTrendPullback(p, d.m15, d.h1) : evaluateLondonBreakout(p, d.m15, d.h1, now);
          evals.push({ s, ev, maxHoldMin: null, holdWeekend: false });
        }
      }
      for (const { s, ev, maxHoldMin, holdWeekend } of evals) {
        if (!isFxSignal(ev)) continue;
        // Spread filter (OANDA live quote) — skip when the spread eats >25% of the stop.
        const quote = pricing.get(p);
        const info = mt5Info.get(p);
        if (useMt5 && tradeMode !== "shadow" && !(info?.bid && info?.ask)) { notes.push(`${p}: sin cotización MT5`); continue; }
        const spread = info?.bid && info?.ask ? info.ask - info.bid
          : quote ? quote.ask - quote.bid : (TYPICAL_SPREAD_PIPS[p] ?? 2.5) * pipSize(p);
        if (spread > 0.25 * ev.risk) { notes.push(`${p}: spread alto`); continue; }
        let size: { ok: true; units: number; lots: number | null; riskAccount: number; leverage: number } | { ok: false; reason: string };
        if (info && useMt5 && tradeMode !== "shadow") {
          if (info.stops_level > 0 && ev.risk < info.stops_level * info.point * 1.2) { notes.push(`${p}: stop < nivel mínimo del broker`); continue; }
          const r = sizeFxLots({
            nav, riskPct: fxRiskPct(), stopDistance: ev.risk, tickSize: info.tick_size,
            tickValueLoss: info.tick_value_loss || info.tick_value, contractSize: info.contract_size,
            volumeMin: info.volume_min, volumeStep: info.volume_step, volumeMax: info.volume_max,
            baseToAccount: convert(info.currency_base || ccys(p)[0], accountCurrency, rates), maxLeverage: fxMaxLeverage(),
            minLotMaxRiskPct: fxMinLotMaxRiskPct(),
          });
          size = r.ok ? { ok: true, units: Math.round(r.lots * info.contract_size), lots: r.lots, riskAccount: r.riskAccount, leverage: r.leverage } : r;
        } else {
          const q2a = quote ? (ev.side === "long" ? quote.quoteHomeLong : quote.quoteHomeShort) : null;
          const r = sizeFxPosition({
            instrument: p, accountCurrency, nav: tradeMode === "shadow" ? shadowNav : nav, riskPct: fxRiskPct(), stopDistance: ev.risk,
            price: ev.entry, rates, maxLeverage: fxMaxLeverage(), quoteToAccount: q2a,
          });
          size = r.ok ? { ...r, lots: null } : r;
        }
        if (!size.ok) { notes.push(`${p}: ${size.reason}`); continue; }
        const trade: FxTrade = {
          id: `${p}-${ev.candleTime}-${s}`,
          strategy: s,
          instrument: p,
          side: ev.side,
          units: size.units,
          lots: size.lots,
          maxHoldMin,
          holdWeekend,
          broker: tradeMode === "shadow" ? "shadow" : broker,
          entry: ev.entry,
          stop: ev.stop,
          takeProfit: ev.takeProfit,
          openedAt: new Date().toISOString(),
          mode: tradeMode,
          brokerTradeId: null,
        };
        if (tradeMode !== "shadow") {
          try {
            // Re-anchor SL/TP distances to the actual executable price.
            const bidAsk = info?.bid && info?.ask ? { bid: info.bid, ask: info.ask } : quote;
            const px = bidAsk ? (ev.side === "long" ? bidAsk.ask : bidAsk.bid) : ev.entry;
            const dir = ev.side === "long" ? 1 : -1;
            const digits = info?.digits ?? (p.includes("JPY") ? 3 : 5);
            trade.entry = px;
            trade.stop = Number((px - dir * ev.risk).toFixed(digits));
            trade.takeProfit = Number((px + dir * Math.abs(ev.takeProfit - ev.entry)).toFixed(digits));
            if (useMt5) {
              const fill = await mt5Order({
                instrument: p, side: ev.side, lots: size.lots ?? 0, stop: trade.stop,
                takeProfit: trade.takeProfit, comment: `forgeos ${s}`.slice(0, 31),
              });
              trade.brokerTradeId = fill.ticket;
              trade.entry = fill.price || px;
            } else {
              const fill = await oandaMarketEntry({
                instrument: p, side: ev.side, units: size.units, stop: trade.stop,
                takeProfit: trade.takeProfit, clientTag: trade.id,
              });
              trade.brokerTradeId = fill.tradeId;
              trade.entry = fill.price;
            }
          } catch (err) {
            notes.push(`${p}: orden rechazada ${err instanceof Error ? err.message.slice(0, 100) : err}`);
            continue;
          }
        }
        trades.push(trade);
        stillOpen.push(trade);
        entries += 1;
        if (tradeMode !== "shadow" || !shadowQuiet) tg(
          `💱 <b>FX ${ev.side === "long" ? "compra" : "venta"} ${p}</b> (${modeLabel(tradeMode)})\n` +
            `${size.lots != null ? `${size.lots} lotes (${size.units} uds)` : `${size.units} uds`} @ ${trade.entry} · SL ${trade.stop.toFixed(5)} · TP ${trade.takeProfit.toFixed(5)}\n` +
            `riesgo ≈ ${size.riskAccount.toFixed(2)} ${accountCurrency} (${((size.riskAccount / (tradeMode === "shadow" ? shadowNav : nav)) * 100).toFixed(1)}%) · apal. ${size.leverage.toFixed(1)}x · ${s}\n${ev.reason}`,
        );
        break;
      }
    }
  }

  saveFxTrades(trades);
  state.lastCycleAt = new Date().toISOString();
  state.dataSource = source;
  const openNow = trades.filter((t) => !t.closedAt && t.mode === mode).length;
  const openSim = liveMode ? trades.filter((t) => !t.closedAt && t.mode === "shadow").length : 0;
  state.lastSummary =
    `[ForexBot] modo=${mode} broker=${mode === "shadow" ? "—" : broker} datos=${source || "—"} pares=${pairs.length} nav=${nav.toFixed(2)} ${accountCurrency} ` +
    `abiertas=${openNow}${liveMode ? ` simuladas=${openSim}` : ""} entradas=${entries} pnlHoy=${todayPnl.toFixed(2)}` + (notes.length ? ` | ${notes.slice(0, 6).join(" | ")}` : "");
  saveFxState(state);
  return state.lastSummary;
}

function timeUp(t: FxTrade, now: Date): boolean {
  return Boolean(t.maxHoldMin && now.getTime() - Date.parse(t.openedAt) >= t.maxHoldMin * 60_000);
}

function closeLocal(
  t: FxTrade,
  exit: number,
  reason: FxTrade["exitReason"],
  accountCurrency: string,
  rates: FxRates,
  brokerPnl?: number | null,
  quiet = false,
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
  if (quiet) return;
  tg(
    `${icon} <b>FX cerrada ${t.instrument}</b> (${modeLabel(t.mode)}) ${reason}\n` +
      `${t.side === "long" ? "compra" : "venta"} ${t.units} uds ${t.entry} → ${exit} · ` +
      `P&L ${(t.pnl ?? 0).toFixed(2)} ${accountCurrency} (${(t.rMultiple ?? 0).toFixed(2)}R)`,
  );
}
