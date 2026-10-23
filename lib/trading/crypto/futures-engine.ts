/**
 * Kraken Futures engine — CRYPTO_VENUE=futures only. Spot engine unchanged.
 */

import "server-only";

import {
  quantizeStopConservative,
  signalPriceToContract,
} from "@/lib/brokers/kraken-futures/order-math";

import {
  getKrakenFuturesAdapter,
  isKrakenFuturesConfigured,
  spotPairToPfSymbol,
} from "@/lib/brokers/kraken-futures";
import { getKrakenUniversePairs } from "@/lib/brokers/kraken/universe";
import {
  cryptoLiveMaxNotionalEur,
  cryptoLiveMaxPositions,
} from "@/lib/trading/crypto/config";
import {
  futuresMaxLeverage,
  futuresShadowMode,
  isFuturesStrategyLive,
} from "@/lib/trading/crypto/futures-config";
import {
  canOpenFuturesPosition,
  syncFuturesDailyRisk,
} from "@/lib/trading/crypto/futures-daily-risk";
import {
  readCryptoJournal,
  appendCryptoJournal,
  closeCryptoJournalOpen,
  formatFuturesCloseTelegram,
  listOpenCryptoJournal,
  strategyReliabilityMap,
  type CryptoJournalTrade,
} from "@/lib/trading/crypto/journal-crypto";
import { accrueFundingEur } from "@/lib/trading/crypto/futures-funding";
import { getMarketRegime } from "@/lib/trading/crypto/regime";
import { rankSignals, type RankedSignal } from "@/lib/trading/crypto/strategies";
import { evaluateFuturesStrategiesForPair } from "@/lib/trading/crypto/futures-strategy-eval";
import { futuresLiveGateForStrategy } from "@/lib/trading/crypto/futures-backtest-gate";
import { recordFuturesCycleMeta } from "@/lib/trading/crypto/futures-diagnostics";
import { shadowSimQty } from "@/lib/trading/crypto/signal-guards";
import { maxHoldMsForStrategy } from "@/lib/trading/crypto/reconcile";
import { sendTelegramMessage } from "@/lib/notifications/telegram-bot";
import {
  backfillFuturesUniverse,
} from "@/lib/brokers/kraken-futures/market-sync";
import {
  getFuturesWsStatus,
  getFuturesWsTicker,
  subscribeFuturesForSpotPairs,
} from "@/lib/brokers/kraken-futures/ws-client";
import {
  formatDataAgeLog,
  getBars,
  getMarketDataAges,
} from "@/lib/brokers/kraken/market-store";
import {
  isFuturesEngineStateLive,
  readFuturesEngineState,
  writeFuturesEngineState,
  type KrakenFuturesEngineStateFile,
} from "@/lib/trading/crypto/futures-engine-state";
import { recordCryptoEngineRestart } from "@/lib/trading/crypto/alarms";
import { isCryptoEngineStandalone } from "@/lib/trading/crypto/engine-heartbeat";
import { isKrakenFuturesAuthError } from "@/lib/brokers/kraken-futures/auth-errors";
import fs from "node:fs";
import path from "node:path";
import { resolveForgeosCacheDir } from "@/lib/trading/crypto/forgeos-cache";

export type FuturesEngineStatus = {
  started: boolean;
  venue: "futures";
  shadowMode: boolean;
  leverageCap: number;
  availableMargin: number;
  lastCycleAt: string | null;
  ws?: { connected: boolean; symbols: string[] };
  pid?: number;
  stateUpdatedAt?: string | null;
};

let futuresStarted = false;
let futuresStartedAt: string | null = null;
let futuresLastCycle: string | null = null;
let lastAvailableMargin = 0;
let lastBalanceValue = 0;
let lastMarginCurrency = "USD";
let lastMarginFetchAt: string | null = null;
let lastMarginAuthErrorAt: string | null = null;
let marginEverFetched = false;
let exitTimer: ReturnType<typeof setInterval> | null = null;
let backfillTimer: ReturnType<typeof setInterval> | null = null;
let marginTimer: ReturnType<typeof setInterval> | null = null;
let cycleBusy = false;

function liquidationDistancePct(
  side: "long" | "short",
  mark: number,
  liq: number | null,
): number | null {
  if (liq == null || !(mark > 0) || !(liq > 0)) return null;
  if (side === "long") return (mark - liq) / mark;
  return (liq - mark) / mark;
}

export async function startKrakenFuturesEngine(): Promise<void> {
  if (!isKrakenFuturesConfigured()) {
    console.warn("[Kraken/Futures] sin credenciales — solo diagnóstico");
    return;
  }
  if (futuresStarted) return;
  futuresStarted = true;
  futuresStartedAt = new Date().toISOString();
  if (isCryptoEngineStandalone()) {
    recordCryptoEngineRestart();
  }

  const pairs = await getKrakenUniversePairs().catch(() => ["XBTEUR", "ETHEUR"]);
  subscribeFuturesForSpotPairs(pairs);
  void backfillFuturesUniverse(pairs, { delayMs: 160 }).catch(() => undefined);
  await refreshFuturesFlexMargin().catch((err) => {
    const message = err instanceof Error ? err.message : String(err);
    if (isKrakenFuturesAuthError(message)) {
      console.warn("[Kraken/Futures] auth error on start — flex margin unavailable");
    }
  });
  publishFuturesEngineState({ lastCycle: null });

  if (!backfillTimer) {
    backfillTimer = setInterval(() => {
      void getKrakenUniversePairs()
        .then((p) => backfillFuturesUniverse(p, { delayMs: 120 }))
        .catch(() => undefined);
    }, 15 * 60_000);
    backfillTimer.unref?.();
  }

  if (!marginTimer) {
    marginTimer = setInterval(() => {
      void refreshFuturesFlexMargin()
        .then(() => publishFuturesEngineState({ lastCycle: readFuturesEngineState()?.lastCycle ?? null }))
        .catch((err) => {
          const message = err instanceof Error ? err.message : String(err);
          if (isKrakenFuturesAuthError(message)) {
            console.warn("[Kraken/Futures] auth error — periodic margin refresh failed:", message);
          }
        });
    }, 60_000);
    marginTimer.unref?.();
  }

  if (!exitTimer) {
    exitTimer = setInterval(() => {
      void runFuturesExitLoop().catch((err) =>
        console.warn("[Kraken/Futures/Exit]", err instanceof Error ? err.message : err),
      );
    }, 5_000);
    exitTimer.unref?.();
  }
  console.log(
    `[Kraken/Futures] started shadow=${futuresShadowMode()} levCap=${futuresMaxLeverage()}`,
  );
}

const FUTURES_AUTH_ALARM_FILE = path.join(
  resolveForgeosCacheDir(),
  "kraken-futures-auth-alarm.json",
);

function loadFuturesAuthAlarmAt(): string | undefined {
  try {
    if (!fs.existsSync(FUTURES_AUTH_ALARM_FILE)) return undefined;
    const raw = JSON.parse(fs.readFileSync(FUTURES_AUTH_ALARM_FILE, "utf8")) as {
      lastAt?: string;
    };
    return raw.lastAt;
  } catch {
    return undefined;
  }
}

function saveFuturesAuthAlarmAt(iso: string): void {
  try {
    fs.mkdirSync(path.dirname(FUTURES_AUTH_ALARM_FILE), { recursive: true });
    fs.writeFileSync(FUTURES_AUTH_ALARM_FILE, JSON.stringify({ lastAt: iso }, null, 2), "utf8");
  } catch {
    /* ignore */
  }
}

function maybeTelegramFuturesAuthError(message: string): void {
  const now = new Date().toISOString();
  const prev = loadFuturesAuthAlarmAt();
  const prevMs = prev ? Date.parse(prev) : NaN;
  if (Number.isFinite(prevMs) && Date.now() - prevMs < 15 * 60_000) return;
  saveFuturesAuthAlarmAt(now);
  void sendTelegramMessage(
    `🚨 <b>Kraken Futures</b>: auth error en cuenta privada — ${message.slice(0, 120)}`,
  ).catch(() => undefined);
}

export function formatFuturesCycleMarginLog(): string {
  if (lastMarginAuthErrorAt && !marginEverFetched) {
    return "margin=UNAVAILABLE(auth error)";
  }
  if (lastMarginAuthErrorAt) {
    return `margin=${lastAvailableMargin.toFixed(4)}(stale-auth)`;
  }
  return `margin=${lastAvailableMargin.toFixed(4)}`;
}

async function refreshFuturesFlexMargin(): Promise<void> {
  const adapter = getKrakenFuturesAdapter();
  try {
    const acct = await adapter.getAccount();
    lastAvailableMargin = acct.availableMargin;
    lastBalanceValue = acct.balanceValue;
    lastMarginCurrency = acct.currency;
    lastMarginFetchAt = new Date().toISOString();
    lastMarginAuthErrorAt = null;
    marginEverFetched = true;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (isKrakenFuturesAuthError(message)) {
      lastMarginAuthErrorAt = new Date().toISOString();
      maybeTelegramFuturesAuthError(message);
      console.warn("[Kraken/Futures] auth error — flex margin fetch failed:", message);
    }
    throw err;
  }
}

function publishFuturesEngineState(opts: {
  lastCycle: KrakenFuturesEngineStateFile["lastCycle"];
}): void {
  const ws = getFuturesWsStatus();
  writeFuturesEngineState({
    started: futuresStarted,
    startedAt: futuresStartedAt ?? undefined,
    shadowMode: futuresShadowMode(),
    leverageCap: futuresMaxLeverage(),
    availableMargin: lastAvailableMargin,
    balanceValue: lastBalanceValue,
    currency: lastMarginCurrency,
    lastCycleAt: futuresLastCycle,
    lastMarginFetchAt,
    ws: { connected: ws.connected, symbols: ws.symbols },
    lastCycle: opts.lastCycle,
  });
}

async function markPx(pf: string, adapter: ReturnType<typeof getKrakenFuturesAdapter>): Promise<number | null> {
  const ws = getFuturesWsTicker(pf);
  if (ws && ws.mark > 0) return ws.mark;
  const q = await adapter.getQuote(pf).catch(() => null);
  return q?.mid ?? null;
}

let fillsCache: { at: number; fills: Awaited<ReturnType<ReturnType<typeof getKrakenFuturesAdapter>["getRecentFills"]>> } | null = null;

/** Weighted exit price + reason from Kraken fills that closed this leg (opposite side, after entry). */
async function closingFillsFor(
  adapter: ReturnType<typeof getKrakenFuturesAdapter>,
  pf: string,
  open: CryptoJournalTrade,
): Promise<{ price: number; reason: string; feesEur: number } | null> {
  if (!fillsCache || Date.now() - fillsCache.at > 10_000) fillsCache = { at: Date.now(), fills: await adapter.getRecentFills() };
  const side = open.positionSide ?? "long";
  const closeSide = side === "short" ? "buy" : "sell";
  const since = Date.parse(open.at) - 5_000;
  const fills = fillsCache.fills.filter((f) => f.symbol === pf.toUpperCase() && f.side === closeSide && f.time >= since);
  if (!fills.length) return null;
  const qty = fills.reduce((a, f) => a + f.size, 0);
  if (!(qty > 0)) return null;
  const price = fills.reduce((a, f) => a + f.price * f.size, 0) / qty;
  const types = fills.map((f) => f.fillType.toLowerCase()).join(",");
  const reason = types.includes("liquidation") ? "LIQUIDATION"
    : types.includes("take") ? "TAKE_PROFIT"
      : types.includes("stop") ? "STOP_LOSS"
        : "EXCHANGE_CLOSE";
  return { price, reason, feesEur: price * qty * 0.0005 };
}

/** Closes already announced on Telegram (one message per open leg, whatever happens). */
const announcedCloses = new Set<string>();

async function finalizeFuturesClose(
  open: CryptoJournalTrade,
  exit: number,
  exitReason: string,
  tradingFeesEur = 0,
): Promise<void> {
  const adapter = getKrakenFuturesAdapter();
  const pf = open.pfSymbol ?? spotPairToPfSymbol(open.pair) ?? open.pair;
  const q = await adapter.getQuote(pf).catch(() => null);
  const qty =
    open.qty && open.qty > 0 ? open.qty : shadowSimQty(open.entry);
  const side = open.positionSide ?? "long";
  const openedAt = Date.parse(open.at);
  const holdMs = Number.isFinite(openedAt) ? Date.now() - openedAt : 0;
  const fundingPaid = accrueFundingEur({
    notionalEur: open.entry * qty,
    fundingRate8h: q?.fundingRate ?? 0,
    holdMs,
    side,
  });
  closeCryptoJournalOpen({
    open,
    exit,
    exitReason,
    feesEur: tradingFeesEur,
    fundingPaidEur: fundingPaid,
  });
  const gross =
    side === "short"
      ? (open.entry - exit) * qty
      : (exit - open.entry) * qty;
  const net = gross - tradingFeesEur - Math.max(0, fundingPaid);
  const line = formatFuturesCloseTelegram(open, exit, exitReason, {
    fundingPaidEur: fundingPaid,
    netPnlEur: net,
  });
  // Only real (non-shadow) closes reach Telegram.
  const closeKey = `${open.strategy}|${open.pair}|${open.signalKey ?? open.at}`;
  if (!open.shadow && !announcedCloses.has(closeKey)) {
    announcedCloses.add(closeKey);
    void sendTelegramMessage(`[KRAKEN] ${line}`, undefined, { kind: "trade", platform: "KRAKEN" }).catch(() => undefined);
  }
}

async function runFuturesShadowExits(): Promise<void> {
  const opens = listOpenCryptoJournal({ shadow: true }).filter(
    (t) => t.venue === "futures",
  );
  if (!opens.length) return;
  const adapter = getKrakenFuturesAdapter();
  for (const open of opens) {
    const pf = open.pfSymbol ?? spotPairToPfSymbol(open.pair) ?? open.pair;
    const mid = await markPx(pf, adapter);
    if (mid == null || !(mid > 0)) continue;
    const side = open.positionSide ?? "long";
    const stop =
      open.stopLoss != null && open.stopLoss > 0
        ? open.stopLoss
        : side === "short"
          ? open.entry * 1.03
          : open.entry * 0.97;
    const tp =
      open.takeProfit != null && open.takeProfit > 0
        ? open.takeProfit
        : side === "short"
          ? open.entry * 0.96
          : open.entry * 1.04;
    const openedAt = Date.parse(open.at);
    const holdMs = Number.isFinite(openedAt) ? Date.now() - openedAt : 0;
    const maxHold = maxHoldMsForStrategy(String(open.strategy));
    let reason: string | null = null;
    if (holdMs >= maxHold) reason = "MAX_HOLD";
    if (!reason && side === "long") {
      if (mid <= stop) reason = "STOP_LOSS";
      else if (mid >= tp) reason = "TAKE_PROFIT";
    }
    if (!reason && side === "short") {
      if (mid >= stop) reason = "STOP_LOSS";
      else if (mid <= tp) reason = "TAKE_PROFIT";
    }
    if (!reason) continue;
    const fees =
      open.entry *
      (open.qty && open.qty > 0 ? open.qty : shadowSimQty(open.entry)) *
      0.0007;
    await finalizeFuturesClose(open, mid, reason, fees);
  }
}

export async function runFuturesExitLoop(): Promise<void> {
  if (!isKrakenFuturesConfigured()) return;
  await runFuturesShadowExits().catch(() => undefined);
  const adapter = getKrakenFuturesAdapter();
  const positions = await adapter.getOpenPositions().catch(() => []);
  let opens = listOpenCryptoJournal({ shadow: false }).filter(
    (t) => t.venue === "futures" && t.open,
  );
  // Exchange positions with no open journal leg (e.g. marked flat before the fill was visible):
  // re-open the latest real leg for that contract so stop/TP management resumes.
  const journalPfs = new Set(opens.map((o) => (o.pfSymbol ?? spotPairToPfSymbol(o.pair) ?? o.pair).toUpperCase()));
  const orphans = positions.filter((p) => !journalPfs.has(p.symbol.toUpperCase()));
  if (orphans.length) {
    const recent = readCryptoJournal(5000).filter((t) => !t.shadow && t.venue === "futures");
    for (const p of orphans) {
      const pf = p.symbol.toUpperCase();
      const leg = [...recent].reverse().find((t) => {
        const tpf = (t.pfSymbol ?? spotPairToPfSymbol(t.pair) ?? t.pair).toUpperCase();
        const isOpenLeg = !t.exitReason && (t.side === "BUY" || (t.positionSide === "short" && t.side === "SELL"));
        return tpf === pf && isOpenLeg && (t.positionSide ?? "long") === p.side;
      });
      if (!leg) {
        console.warn(`[Kraken/Futures] posición ${pf} sin entrada en el journal — revisar a mano`);
        continue;
      }
      appendCryptoJournal({ ...leg, open: true, exit: null, exitReason: null, signalKey: `${leg.signalKey ?? leg.at}#reopen` });
      console.warn(`[Kraken/Futures] ${pf}: posición viva sin journal abierto → reabierta (${leg.strategy})`);
    }
    opens = listOpenCryptoJournal({ shadow: false }).filter((t) => t.venue === "futures" && t.open);
  }
  const openOrders = opens.length ? await adapter.getOpenOrders().catch(() => null) : [];
  const tpHandled = new Set<string>();
  for (const open of [...opens].reverse()) {
    const pf = (open.pfSymbol ?? spotPairToPfSymbol(open.pair) ?? open.pair).toUpperCase();
    const pos = positions.find((p) => p.symbol === pf);
    if (!pos) {
      // A fresh entry may not be visible as a position yet: give it 3 minutes before calling it flat.
      const age = Date.now() - Date.parse(open.at);
      if (Number.isFinite(age) && age < 3 * 60_000) continue;
      // Real exit: the closing fills on Kraken after the entry (stop / take-profit / manual).
      const exitInfo = await closingFillsFor(adapter, pf, open).catch(() => null);
      if (exitInfo) {
        await finalizeFuturesClose(open, exitInfo.price, exitInfo.reason, exitInfo.feesEur);
      } else {
        const q = await adapter.getQuote(pf).catch(() => null);
        const mid = q && q.bid > 0 && q.ask > 0 ? (q.bid + q.ask) / 2 : null;
        await finalizeFuturesClose(open, mid ?? open.entry, "EXCHANGE_FLAT", 0);
      }
      continue;
    }
    // Every live position must have a reduce-only stop AND take-profit on the exchange.
    if (openOrders && !tpHandled.has(pf)) {
      tpHandled.add(pf);
      const mine = openOrders.filter((o) => o.symbol === pf && o.reduceOnly);
      // TP must cover the whole position (several entries can stack on one contract).
      const tpCovered = mine
        .filter((o) => o.orderType.includes("take_profit"))
        .reduce((a, o) => a + (o.size > 0 ? o.size : 0), 0);
      const tpMissing = Number(Math.max(0, pos.size - tpCovered).toFixed(8));
      const hasTp = tpMissing <= 0;
      const tp = Number(open.takeProfit ?? 0);
      // /openpositions has no mark price → take it from the ticker.
      const mark =
        pos.markPrice > 0 ? pos.markPrice : await adapter.getQuote(pf).then((q) => q.mark || q.mid).catch(() => 0);
      const tpWrongSide =
        tp > 0 && mark > 0 && (pos.side === "short" ? tp >= mark : tp <= mark);
      if (tpWrongSide) {
        console.warn(`[Kraken/Futures] TP ${pf} ${tp} ya superado (mark=${mark}) — no se coloca`);
      }
      if (!hasTp && tp > 0 && !tpWrongSide) {
        const meta = await adapter.getInstrument(pf).catch(() => null);
        const trigger = quantizeStopConservative(tp, meta?.tickSize ?? 0, pos.side === "long" ? "short" : "long");
        await adapter
          .placeTakeProfit({ symbol: pf, positionSide: pos.side, size: tpMissing, triggerPrice: trigger })
          .then((r) => console.log(`[Kraken/Futures] TP en exchange ${pf} ${pos.side} trigger=${trigger} id=${r.orderId}`))
          .catch((err) =>
            console.warn(`[Kraken/Futures] TP en exchange ${pf} trigger=${trigger} mark=${mark} falló: ${err instanceof Error ? err.message : err}`),
          );
      }
      const hasStop = mine.some((o) => o.orderType === "stp" || o.orderType === "stop");
      if (!hasStop) {
        console.warn(`[Kraken/Futures] ⚠ ${pf} sin stop reduce-only en el exchange`);
      }
    }
    const dist = liquidationDistancePct(pos.side, pos.markPrice, pos.liquidationPrice);
    if (dist != null && dist < 0.5) {
      await adapter
        .sendOrder({
          symbol: pf,
          side: pos.side === "long" ? "sell" : "buy",
          size: pos.size,
          orderType: "mkt",
          reduceOnly: true,
        })
        .catch(() => undefined);
      await finalizeFuturesClose(open, pos.markPrice, "LIQ_PROXIMITY_50", 0);
    }
    const maxHold = maxHoldMsForStrategy(String(open.strategy));
    if (maxHold > 0 && Date.now() - Date.parse(open.at) > maxHold) {
      await adapter
        .sendOrder({
          symbol: pf,
          side: pos.side === "long" ? "sell" : "buy",
          size: pos.size,
          orderType: "mkt",
          reduceOnly: true,
        })
        .catch(() => undefined);
      await finalizeFuturesClose(open, pos.markPrice, "TIME_EXIT", 0);
    }
  }
}

export async function runKrakenFuturesAnalysisCycle(): Promise<{
  signals: RankedSignal[];
  executed: string[];
  shadow: string[];
  held: string[];
}> {
  if (cycleBusy) {
    return { signals: [], executed: [], shadow: [], held: ["cycle_busy"] };
  }
  cycleBusy = true;
  const executed: string[] = [];
  const shadow: string[] = [];
  const held: string[] = [];
  try {
  await startKrakenFuturesEngine();

  const adapter = getKrakenFuturesAdapter();
  try {
    await refreshFuturesFlexMargin();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (isKrakenFuturesAuthError(message)) {
      held.push("margin_auth_error");
      console.warn("[Kraken/Futures] auth error — cycle margin unavailable:", message);
    }
  }
  const acct = {
    availableMargin: lastAvailableMargin,
    balanceValue: lastBalanceValue,
    currency: lastMarginCurrency,
  };
  syncFuturesDailyRisk(acct.balanceValue || acct.availableMargin);

  const pairs = await getKrakenUniversePairs().catch(() => ["XBTEUR", "ETHEUR"]);
  const needBars = pairs.filter(
    (p) => getBars(p, "5").length < 30 || getBars(p, "15").length < 120 || getBars(p, "60").length < 60,
  );
  if (needBars.length) {
    await backfillFuturesUniverse(needBars, { delayMs: 120 }).catch(() => undefined);
  }
  const feeRow = await adapter.getFees().catch(() => ({
    makerPct: 0.0002,
    takerPct: 0.0005,
    source: "default" as const,
  }));
  const collected: RankedSignal[] = [];
  for (const pair of pairs) {
    const raw = evaluateFuturesStrategiesForPair(pair, {
      openGridLevels: 0,
      allPairs: pairs,
      fees: { makerPct: feeRow.makerPct, takerPct: feeRow.takerPct },
    }).map((s) => ({ ...s, pair }));
    collected.push(...rankSignals(raw, strategyReliabilityMap()));
  }

  const bestByKey = new Map<string, RankedSignal>();
  for (const s of collected) {
    if (s.direction !== "BUY" && s.direction !== "SELL") continue;
    const key = `${s.pair}:${s.direction}`;
    const prev = bestByKey.get(key);
    if (!prev || s.score > prev.score) bestByKey.set(key, s);
  }
  const ranked = [...bestByKey.values()].sort((a, b) => b.score - a.score);

  const maxPos = cryptoLiveMaxPositions();
  const openCount = listOpenCryptoJournal({ shadow: false }).filter(
    (t) => t.venue === "futures" && t.open,
  ).length;
  const risk = canOpenFuturesPosition();
  const shadowOn = futuresShadowMode() || acct.availableMargin <= 0;

  // One live position per contract: journal + exchange (in case the journal missed one).
  const openPfSymbols = new Set<string>(
    listOpenCryptoJournal({ shadow: false })
      .filter((t) => t.venue === "futures" && t.open)
      .map((t) => String(t.pfSymbol ?? spotPairToPfSymbol(t.pair) ?? t.pair).toUpperCase()),
  );
  for (const p of await adapter.getOpenPositions().catch(() => [])) openPfSymbols.add(p.symbol.toUpperCase());
  for (const sig of ranked.slice(0, 8)) {
    const pf = spotPairToPfSymbol(sig.pair);
    if (!pf) {
      held.push(`${sig.pair}:no_pf`);
      continue;
    }
    if (openPfSymbols.has(pf)) {
      held.push(`${pf}:${sig.strategyId}:ya_hay_posicion`);
      continue;
    }
    const legDir = sig.direction === "SELL" ? "short" : "long";
    const gate = futuresLiveGateForStrategy(sig.strategyId, legDir);
    const live =
      !shadowOn &&
      isFuturesStrategyLive(sig.strategyId) &&
      gate.ok &&
      risk.ok &&
      openCount + executed.length < maxPos;
    if (!shadowOn && isFuturesStrategyLive(sig.strategyId) && !gate.ok) {
      held.push(`${sig.pair}:${sig.strategyId}:gate:${gate.reason ?? "blocked"}`);
    }

    const notional = cryptoLiveMaxNotionalEur();
    const side = sig.direction === "SELL" ? "short" : "long";
    const orderSide = side === "long" ? "buy" : "sell";
    // Signals come from spot EUR bars; size and price in the PF contract's USD space.
    const quote = await adapter.getQuote(pf).catch(() => null);
    const sizing = await adapter.sizeForNotionalEurDetailed(pf, notional, quote?.mid);
    if (!sizing.ok) {
      held.push(`${pf}:${sig.strategyId}:${sizing.reason}`);
      continue;
    }
    const px = quote?.mid ?? sizing.price;
    const meta = await adapter.getInstrument(pf).catch(() => null);
    const stopUsd = quantizeStopConservative(
      signalPriceToContract(sig.stopLoss, sig.entry, px),
      meta?.tickSize ?? 0,
      side,
    );
    const tpUsd = signalPriceToContract(sig.takeProfit, sig.entry, px);
    if (side === "short" ? !(stopUsd > px) : !(stopUsd < px)) {
      held.push(`${pf}:${sig.strategyId}:stop_wrong_side(stop=${stopUsd} mark=${px})`);
      continue;
    }

    if (!live) {
      const shQty = shadowSimQty(px);
      appendCryptoJournal({
        at: new Date().toISOString(),
        strategy: sig.strategyId,
        pair: sig.pair,
        regime: getMarketRegime().regime,
        side: sig.direction === "SELL" ? "SELL" : "BUY",
        entry: px,
        exit: null,
        exitReason: null,
        grossPnlEur: null,
        feesEur: notional * (feeRow.makerPct + feeRow.takerPct),
        netPnlEur: null,
        durationMs: null,
        mfePct: null,
        maePct: null,
        shadow: true,
        open: true,
        signalKey: sig.signalKey,
        stopLoss: stopUsd,
        takeProfit: tpUsd,
        qty: shQty,
        venue: "futures",
        positionSide: side,
        leverage: futuresMaxLeverage(),
        fundingPaidEur: 0,
        pfSymbol: pf,
      });
      shadow.push(`${pf}:${sig.strategyId}`);
      continue;
    }

    try {
      // Effective leverage stays ≤1x: notional (cap) is far below the flex margin.
      const notionalUsd = sizing.size * px;
      if (notionalUsd > acct.availableMargin * futuresMaxLeverage()) {
        held.push(`${pf}:${sig.strategyId}:notional_${notionalUsd.toFixed(2)}>margin_x${futuresMaxLeverage()}`);
        continue;
      }
      await adapter.setLeverage(pf, futuresMaxLeverage());
      const limitPx = orderSide === "buy" ? quote?.bid ?? px : quote?.ask ?? px;
      const result = await adapter.enterWithExchangeStop({
        symbol: pf,
        side: orderSide,
        size: sizing.size,
        limitPrice: limitPx,
        stopPrice: stopUsd,
        postOnly: true,
      });
      if (!result.stopOrderId) {
        held.push(`${pf}:${sig.strategyId}:no_exchange_stop`);
        if (result.orderId) await adapter.cancelOrder(result.orderId).catch(() => undefined);
        continue;
      }
      appendCryptoJournal({
        at: new Date().toISOString(),
        strategy: sig.strategyId,
        pair: sig.pair,
        regime: getMarketRegime().regime,
        side: sig.direction === "SELL" ? "SELL" : "BUY",
        entry: limitPx,
        exit: null,
        exitReason: null,
        grossPnlEur: null,
        feesEur: notional * feeRow.makerPct,
        netPnlEur: null,
        durationMs: null,
        mfePct: null,
        maePct: null,
        shadow: false,
        open: true,
        signalKey: sig.signalKey,
        stopLoss: stopUsd,
        takeProfit: tpUsd,
        qty: sizing.size,
        orderId: result.orderId,
        venue: "futures",
        positionSide: side,
        leverage: futuresMaxLeverage(),
        fundingPaidEur: 0,
        pfSymbol: pf,
        exchangeStopOrderId: result.stopOrderId,
      });
      const line =
        `🟢 ${side.toUpperCase()} Futures ${pf} ${sizing.size} @ $${limitPx.toFixed(2)} | ` +
        `${sig.strategyId} lev=${futuresMaxLeverage()} stop=$${stopUsd}`;
      void sendTelegramMessage(`[KRAKEN] ${line}`, undefined, { kind: "trade", platform: "KRAKEN" }).catch(() => undefined);
      executed.push(`${pf}:${sig.strategyId}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      held.push(`${pf}:${sig.strategyId}:ERR(${msg.slice(0, 160)})`);
      console.warn(`[Kraken/Futures] order error ${pf} ${sig.strategyId}: ${msg}`);
    }
  }

  futuresLastCycle = new Date().toISOString();
  const ages = getMarketDataAges(pairs.slice(0, 3));
  const sampleAge = ages.find((a) => a.priceAgeMs >= 0)?.priceAgeMs ?? ages[0]?.bar5AgeMs ?? null;
  const dataAgeLog = formatDataAgeLog(ages.length ? ages : getMarketDataAges(["XBTEUR", "ETHEUR"]));
  const lastCycleMeta: KrakenFuturesEngineStateFile["lastCycle"] = {
    symbols: pairs.length,
    dataAgeMs: sampleAge != null && sampleAge >= 0 ? sampleAge : null,
    signals: ranked.length,
    orders: executed.length,
    shadow: shadow.length,
    held: held.slice(0, 20),
  };
  publishFuturesEngineState({ lastCycle: lastCycleMeta });
  recordFuturesCycleMeta({ signals: ranked.length });
  const authNote = lastMarginAuthErrorAt ? " auth error" : "";
  console.log(
    `[Kraken/Futures] cycle ${formatFuturesCycleMarginLog()} symbols=${pairs.length} ${dataAgeLog} signals=${ranked.length} orders=${executed.length} shadow=${shadow.length}${authNote}` +
      (held.length ? ` held=[${held.slice(0, 6).join(" | ")}]` : ""),
  );
  return { signals: ranked, executed, shadow, held };
  } finally {
    cycleBusy = false;
  }
}

export function getKrakenFuturesEngineStatus(): FuturesEngineStatus {
  const file = readFuturesEngineState();
  if (file) {
    const live = isFuturesEngineStateLive();
    return {
      started: live || file.started,
      venue: "futures",
      shadowMode: file.shadowMode,
      leverageCap: file.leverageCap,
      availableMargin: file.availableMargin,
      lastCycleAt: file.lastCycleAt,
      ws: { connected: file.ws.connected, symbols: file.ws.symbols ?? [] },
      pid: file.pid,
      stateUpdatedAt: file.updatedAt,
    };
  }
  const ws = getFuturesWsStatus();
  return {
    started: futuresStarted,
    venue: "futures",
    shadowMode: futuresShadowMode(),
    leverageCap: futuresMaxLeverage(),
    availableMargin: lastAvailableMargin,
    lastCycleAt: futuresLastCycle,
    ws: { connected: ws.connected, symbols: ws.symbols ?? [] },
    pid: process.pid,
    stateUpdatedAt: null,
  };
}
