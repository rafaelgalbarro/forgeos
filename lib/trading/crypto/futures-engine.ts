/**
 * Kraken Futures engine — CRYPTO_VENUE=futures only. Spot engine unchanged.
 */

import "server-only";

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
  appendCryptoJournal,
  closeCryptoJournalOpen,
  formatFuturesCloseTelegram,
  listOpenCryptoJournal,
  strategyReliabilityMap,
  type CryptoJournalTrade,
} from "@/lib/trading/crypto/journal-crypto";
import { accrueFundingEur } from "@/lib/trading/crypto/futures-funding";
import { getMarketRegime } from "@/lib/trading/crypto/regime";
import {
  evaluateAllStrategiesForPair,
  rankSignals,
  type RankedSignal,
} from "@/lib/trading/crypto/strategies";
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
let lastMarginCurrency = "EUR";
let lastMarginFetchAt: string | null = null;
let exitTimer: ReturnType<typeof setInterval> | null = null;
let backfillTimer: ReturnType<typeof setInterval> | null = null;
let marginTimer: ReturnType<typeof setInterval> | null = null;
let cycleBusy = false;

function mirrorShortFromLong(sig: RankedSignal): RankedSignal | null {
  if (!(sig.entry > 0) || !(sig.stopLoss > 0) || !(sig.takeProfit > 0)) return null;
  const riskUp = sig.stopLoss - sig.entry;
  const rewardDown = sig.entry - sig.takeProfit;
  if (!(riskUp > 0) || !(rewardDown > 0)) return null;
  const entry = sig.entry;
  const stopLoss = entry + riskUp;
  const takeProfit = entry - rewardDown;
  return {
    ...sig,
    direction: "SELL",
    entry,
    stopLoss,
    takeProfit,
    strategyId: sig.strategyId,
    signalKey: `${sig.signalKey ?? sig.pair}|SHORT`,
    reasoning: `mirror short: ${sig.reasoning}`,
  };
}

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
  await refreshFuturesFlexMargin().catch(() => undefined);
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
        .catch(() => undefined);
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

async function refreshFuturesFlexMargin(): Promise<void> {
  const adapter = getKrakenFuturesAdapter();
  const acct = await adapter.getAccount();
  lastAvailableMargin = acct.availableMargin;
  lastBalanceValue = acct.balanceValue;
  lastMarginCurrency = acct.currency;
  lastMarginFetchAt = new Date().toISOString();
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
  void sendTelegramMessage(line).catch(() => undefined);
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
  const opens = listOpenCryptoJournal({ shadow: false }).filter(
    (t) => t.venue === "futures" && t.open,
  );
  for (const open of opens) {
    const pf = spotPairToPfSymbol(open.pair) ?? open.pair;
    const pos = positions.find((p) => p.symbol === pf);
    if (!pos) {
      await finalizeFuturesClose(open, open.entry, "EXCHANGE_FLAT", 0);
      continue;
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
  await refreshFuturesFlexMargin().catch(() => undefined);
  const acct = {
    availableMargin: lastAvailableMargin,
    balanceValue: lastBalanceValue,
    currency: lastMarginCurrency,
  };
  syncFuturesDailyRisk(acct.balanceValue || acct.availableMargin);

  const pairs = await getKrakenUniversePairs().catch(() => ["XBTEUR", "ETHEUR"]);
  const needBars = pairs.filter(
    (p) => getBars(p, "5").length < 20 || getBars(p, "60").length < 30,
  );
  if (needBars.length) {
    await backfillFuturesUniverse(needBars, { delayMs: 120 }).catch(() => undefined);
  }
  const collected: RankedSignal[] = [];
  for (const pair of pairs) {
    const raw = evaluateAllStrategiesForPair(pair, {
      openGridLevels: 0,
      isTop3Rs: false,
    }).map((s) => ({ ...s, pair }));
    const sigs = rankSignals(raw, strategyReliabilityMap());
    collected.push(...sigs);
    for (const s of sigs) {
      if (s.direction === "BUY") {
        const m = mirrorShortFromLong(s);
        if (m) collected.push(m);
      }
    }
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
  const fees = await adapter.getFees().catch(() => ({
    makerPct: 0.0002,
    takerPct: 0.0005,
    source: "default" as const,
  }));
  const shadowOn = futuresShadowMode() || acct.availableMargin <= 0;

  for (const sig of ranked.slice(0, 8)) {
    const pf = spotPairToPfSymbol(sig.pair);
    if (!pf) {
      held.push(`${sig.pair}:no_pf`);
      continue;
    }
    const live =
      !shadowOn &&
      isFuturesStrategyLive(sig.strategyId) &&
      risk.ok &&
      openCount + executed.length < maxPos;

    const notional = cryptoLiveMaxNotionalEur();
    const sizing = await adapter.sizeForNotionalEur(pf, notional, sig.entry);
    if (!sizing) {
      held.push(`${sig.pair}:min_contract`);
      continue;
    }

    const side = sig.direction === "SELL" ? "short" : "long";
    const orderSide = side === "long" ? "buy" : "sell";
    const quote = await adapter.getQuote(pf).catch(() => null);
    const px = quote?.mid ?? sizing.price;

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
        feesEur: notional * (fees.makerPct + fees.takerPct),
        netPnlEur: null,
        durationMs: null,
        mfePct: null,
        maePct: null,
        shadow: true,
        open: true,
        signalKey: sig.signalKey,
        stopLoss: sig.stopLoss,
        takeProfit: sig.takeProfit,
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
      await adapter.setLeverage(pf, futuresMaxLeverage());
      const limitPx = orderSide === "buy" ? quote?.bid ?? px : quote?.ask ?? px;
      const result = await adapter.enterWithExchangeStop({
        symbol: pf,
        side: orderSide,
        size: sizing.size,
        limitPrice: limitPx,
        stopPrice: sig.stopLoss,
        postOnly: true,
      });
      if (!result.stopOrderId) {
        held.push(`${sig.pair}:no_exchange_stop`);
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
        feesEur: notional * fees.makerPct,
        netPnlEur: null,
        durationMs: null,
        mfePct: null,
        maePct: null,
        shadow: false,
        open: true,
        signalKey: sig.signalKey,
        stopLoss: sig.stopLoss,
        takeProfit: sig.takeProfit,
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
        `${sig.strategyId} lev=${futuresMaxLeverage()} stop=$${sig.stopLoss.toFixed(2)}`;
      void sendTelegramMessage(line).catch(() => undefined);
      executed.push(`${pf}:${sig.strategyId}`);
    } catch (err) {
      held.push(`${sig.pair}:ERR`);
      console.warn("[Kraken/Futures]", err instanceof Error ? err.message : err);
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
  };
  publishFuturesEngineState({ lastCycle: lastCycleMeta });
  console.log(
    `[Kraken/Futures] cycle margin=${lastAvailableMargin.toFixed(4)} symbols=${pairs.length} ${dataAgeLog} signals=${ranked.length} orders=${executed.length} shadow=${shadow.length}`,
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
