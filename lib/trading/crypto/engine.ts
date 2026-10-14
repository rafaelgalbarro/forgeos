/**
 * Kraken high-performance trading engine orchestrator.
 */

import "server-only";

import { getKrakenAdapter, isKrakenConfigured } from "@/lib/brokers/kraken";
import { getKrakenPairMeta, quantizeKrakenVolume } from "@/lib/brokers/kraken/asset-pairs";
import { atr } from "@/lib/trading/crypto/indicators";
import {
  shadowExitFeesEur,
  shadowSimQty,
} from "@/lib/trading/crypto/signal-guards";
import { passesCostFilter } from "@/lib/trading/crypto/strategies/index";
import {
  backfillUniverseStandardTfs,
  formatDataAgeLog,
  getBars,
  getBook,
  getMarketDataAges,
  getTicker,
  isFastCandleFresh,
  midPrice,
  restBackfill,
} from "@/lib/brokers/kraken/market-store";
import {
  getKrakenUniversePairs,
  peekKrakenUniverse,
  refreshKrakenUniverse,
} from "@/lib/brokers/kraken/universe";
import {
  checkAndRecoverStaleMarketData,
  getKrakenWsStatus,
  startKrakenMarketData,
  updateKrakenMarketSubscriptions,
} from "@/lib/brokers/kraken/ws-client";
import {
  cryptoLiveMaxNotionalEur,
  cryptoLiveMaxPositions,
  cryptoSellAggressiveDiscountPct,
  isKrakenCryptoBroker,
} from "@/lib/trading/crypto/config";
import {
  appendCryptoJournal,
  closeCryptoJournalOpen,
  computeCryptoStrategyPerf,
  countOpenByStrategy,
  countOpenGridLevels,
  hasSignalKey,
  journalOpenCryptoPairs,
  listOpenCryptoJournal,
  readCryptoJournal,
  strategyReliabilityMap,
} from "@/lib/trading/crypto/journal-crypto";
import {
  canOpenKrakenBuy,
  getKrakenDailyRisk,
  recordKrakenStopHit,
  recordKrakenWinResetStops,
  syncKrakenDailyRisk,
} from "@/lib/trading/crypto/risk-daily";
import {
  getMarketRegime,
  isBuyPausedByRegime,
  sizeMultiplierForRegime,
  startRegimeScheduler,
  updateMarketRegime,
} from "@/lib/trading/crypto/regime";
import {
  beginCryptoCycleReservation,
  getCryptoSlotReservation,
} from "@/lib/trading/crypto/slot-reservation";
import {
  confirmedLiveOpenPairs,
  filterMeaningfulKrakenBalances,
} from "@/lib/trading/crypto/position-filters";
import { isForeignOrphanPair } from "@/lib/trading/crypto/foreign-orphans";
import {
  evaluateAllStrategiesForPair,
  evaluateFastStrategiesForPair,
  rankSignals,
  rsi2TrendShouldExit,
  topGainerPairs1h,
  topRsPairsVsBtc,
  type RankedSignal,
} from "@/lib/trading/crypto/strategies";
import {
  isFastCryptoStrategy,
  NEW_CRYPTO_STRATEGIES,
  type CryptoStrategyId,
} from "@/lib/trading/crypto/strategies/types";
import {
  canOpenFastTrade,
  recordFastStop,
  recordFastTradeOpened,
  recordFastWin,
} from "@/lib/trading/crypto/fast-controls";
import {
  formatFastMetricsTelegramLines,
  recordFastPostOnlyAttempt,
} from "@/lib/trading/crypto/fast-metrics";
import {
  isCryptoStrategyLive,
  isWithinNewStrategyWarmup,
} from "@/lib/trading/crypto/live-strategies";
import { autoDegradePromoteStrategies } from "@/lib/trading/crypto/strategy-status";
import { sendTelegramMessage } from "@/lib/notifications/telegram-bot";
import {
  isCryptoEngineExternal,
  isCryptoEngineStandalone,
  readCryptoEngineHeartbeat,
} from "@/lib/trading/crypto/engine-heartbeat";
import { reconcileKrakenForgeOsPositions, maxHoldMsForStrategy } from "@/lib/trading/crypto/reconcile";
import {
  recordCryptoEngineRestart,
  runCryptoEngineAlarms,
} from "@/lib/trading/crypto/alarms";
import {
  registerCryptoExitPosition,
  reconcileOpenJournalWithExitRegistry,
} from "@/lib/trading/exit-manager";
import {
  getMakerFeePct,
  getTakerFeePct,
  startKrakenFeeScheduleRefresh,
} from "@/lib/trading/crypto/fee-schedule";
import { recordFullClose } from "@/lib/trading/trailing-registry";

export type EngineStatus = {
  started: boolean;
  universe: ReturnType<typeof peekKrakenUniverse>;
  regime: ReturnType<typeof getMarketRegime>;
  ws: ReturnType<typeof getKrakenWsStatus>;
  dailyRisk: ReturnType<typeof getKrakenDailyRisk>;
  lastCycleAt: string | null;
  lastSignals: Array<{
    pair: string;
    strategy: string;
    confidence: number;
    score: number;
    shadow: boolean;
    action: string;
  }>;
  exitLoopRunning: boolean;
  openForgeOs: string[];
};

let started = false;
let lastCycleAt: string | null = null;
let lastSignals: EngineStatus["lastSignals"] = [];
let exitTimer: ReturnType<typeof setInterval> | null = null;
let fastTimer: ReturnType<typeof setInterval> | null = null;
let universeTimer: ReturnType<typeof setInterval> | null = null;
let reportTimer: ReturnType<typeof setInterval> | null = null;
let fastCycleBusy = false;

async function equityEur(): Promise<number> {
  const adapter = getKrakenAdapter();
  const acct = await adapter.getAccount();
  const positions = await adapter.getPositions().catch(() => []);
  const forgeos = journalOpenCryptoPairs();
  let posVal = 0;
  for (const p of positions) {
    if (forgeos.has(p.symbol) || [...forgeos].some((s) => s.includes(p.base))) {
      posVal += p.marketValueEur;
    }
  }
  return acct.cashEur + posVal;
}

/** Pearson correlation of 1h returns over ~7 days. */
function corr1h(a: string, b: string): number | null {
  const ba = getBars(a, "60").slice(-168);
  const bb = getBars(b, "60").slice(-168);
  const n = Math.min(ba.length, bb.length);
  if (n < 40) return null;
  const ra: number[] = [];
  const rb: number[] = [];
  for (let i = 1; i < n; i++) {
    const ca = ba[ba.length - n + i]!.close;
    const pa = ba[ba.length - n + i - 1]!.close;
    const cb = bb[bb.length - n + i]!.close;
    const pb = bb[bb.length - n + i - 1]!.close;
    if (pa > 0 && pb > 0) {
      ra.push((ca - pa) / pa);
      rb.push((cb - pb) / pb);
    }
  }
  if (ra.length < 30) return null;
  const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
  const ma = mean(ra);
  const mb = mean(rb);
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < ra.length; i++) {
    const xa = ra[i]! - ma;
    const xb = rb[i]! - mb;
    num += xa * xb;
    da += xa * xa;
    db += xb * xb;
  }
  if (!(da > 0) || !(db > 0)) return null;
  return num / Math.sqrt(da * db);
}

/** Max 2 open ForgeOS positions with pairwise corr > 0.8 vs candidate. */
function passesCorrelationFilter(candidate: string, openPairs: string[]): boolean {
  const highCorr: string[] = [];
  for (const o of openPairs) {
    if (o === candidate) continue;
    const c = corr1h(candidate, o);
    if (c != null && c > 0.8) highCorr.push(o);
  }
  if (highCorr.length === 0) return true;
  // Count how many already-open pairs are highly correlated with each other + candidate
  let cluster = 1; // candidate
  for (let i = 0; i < highCorr.length; i++) {
    cluster++;
    for (let j = i + 1; j < highCorr.length; j++) {
      const c = corr1h(highCorr[i]!, highCorr[j]!);
      if (c != null && c > 0.8) {
        /* same cluster */
      }
    }
  }
  // Also count existing high-corr pairs among open set that include any of highCorr
  const openHigh = new Set(highCorr);
  for (let i = 0; i < openPairs.length; i++) {
    for (let j = i + 1; j < openPairs.length; j++) {
      const c = corr1h(openPairs[i]!, openPairs[j]!);
      if (c != null && c > 0.8) {
        openHigh.add(openPairs[i]!);
        openHigh.add(openPairs[j]!);
      }
    }
  }
  // If adding candidate would push high-corr cluster beyond 2, reject
  return openHigh.size < 2;
}

export async function startKrakenEngine(): Promise<void> {
  if (!isKrakenCryptoBroker() || !isKrakenConfigured()) return;

  // Next.js must not own WS/exits when PM2 forgeos-crypto-engine is the owner
  if (isCryptoEngineExternal() && !isCryptoEngineStandalone()) {
    console.log(
      "[Kraken/Engine] loops omitidos — CRYPTO_ENGINE_EXTERNAL (PM2 forgeos-crypto-engine)",
    );
    return;
  }

  if (started) return;
  started = true;

  if (isCryptoEngineStandalone()) {
    recordCryptoEngineRestart();
  }

  const uni = await refreshKrakenUniverse(true);
  const wsNames = uni.selected.map((p) => p.wsname);
  await startKrakenMarketData(wsNames);
  startRegimeScheduler();
  await updateMarketRegime().catch(() => undefined);

  startKrakenFeeScheduleRefresh();

  try {
    await reconcileKrakenForgeOsPositions();
  } catch (err) {
    console.warn(
      "[Kraken/Reconcile]",
      err instanceof Error ? err.message : err,
    );
  }

  try {
    await reconcileOpenJournalWithExitRegistry();
  } catch (err) {
    console.warn(
      "[ExitRegistry/Reconcile]",
      err instanceof Error ? err.message : err,
    );
  }

  if (!universeTimer) {
    universeTimer = setInterval(() => {
      void refreshKrakenUniverse(true)
        .then((u) => {
          updateKrakenMarketSubscriptions(u.selected.map((p) => p.wsname));
          const alts = u.selected.map((p) => p.altname);
          return backfillUniverseStandardTfs(alts, {
            label: "hourly-gap",
            delayMs: 200,
          });
        })
        .catch((err) =>
          console.warn("[Kraken/Universe]", err instanceof Error ? err.message : err),
        );
    }, 60 * 60_000);
    universeTimer.unref?.();
  }

  startKrakenExitLoop();
  startKrakenFastLoop();
  startDailyReportScheduler();
  console.log(
    `[Kraken/Engine] started role=${isCryptoEngineStandalone() ? "standalone" : "next"} fast=5s`,
  );
}

function startKrakenFastLoop(): void {
  if (fastTimer) return;
  const tick = () => {
    void runKrakenFastAnalysisCycle().catch((err) =>
      console.warn("[Kraken/Fast]", err instanceof Error ? err.message : err),
    );
  };
  tick();
  fastTimer = setInterval(tick, 5_000);
  fastTimer.unref?.();
}

/**
 * 5s loop for fast 1–5m strategies. Stale 1m candles (>90s) skip that pair.
 * Post-only entry at best bid (cancel 10s); TP post-only on fill; stop/time at market.
 */
export async function runKrakenFastAnalysisCycle(): Promise<{
  executed: string[];
  held: string[];
}> {
  const executed: string[] = [];
  const held: string[] = [];
  if (fastCycleBusy) return { executed, held };
  if (!isKrakenConfigured() || !isKrakenCryptoBroker()) return { executed, held };
  if (isCryptoEngineExternal() && !isCryptoEngineStandalone()) {
    return { executed, held };
  }

  fastCycleBusy = true;
  try {
    await checkAndRecoverStaleMarketData().catch(() => undefined);
    const gate = canOpenFastTrade();
    if (!gate.ok) {
      held.push(`fast:${gate.reason}`);
      return { executed, held };
    }
    const daily = canOpenKrakenBuy();
    const regimePause = isBuyPausedByRegime();
    if (!daily.ok || regimePause.paused) {
      held.push(`fast:${daily.reason ?? regimePause.reason}`);
      return { executed, held };
    }

    const pairs = await getKrakenUniversePairs();
    const top5 = new Set(
      topGainerPairs1h(pairs, (p) => getBars(p, "60"), 5),
    );
    const reliability = strategyReliabilityMap();
    const collected: RankedSignal[] = [];
    for (const pair of pairs) {
      if (!isFastCandleFresh(pair)) {
        held.push(`${pair}:stale_1m`);
        continue;
      }
      const sigs = evaluateFastStrategiesForPair(pair, {
        isTop5Gainer1h: top5.has(pair),
      }).map((s) => ({ ...s, pair }));
      collected.push(...rankSignals(sigs, reliability));
    }
    const ranked = collected.sort((a, b) => b.score - a.score);
    if (!ranked.length) return { executed, held };

    const adapter = getKrakenAdapter();
    const acct = await adapter.getAccount();
    const krakenPositions = await adapter.getPositions().catch(() => []);
    const confirmedLive = confirmedLiveOpenPairs(
      filterMeaningfulKrakenBalances(
        krakenPositions.filter((p) => !isForeignOrphanPair(p.symbol)),
      ),
      journalOpenCryptoPairs(),
    );
    beginCryptoCycleReservation(acct.cashEur, confirmedLive);

    const eq =
      acct.cashEur +
      krakenPositions.reduce(
        (s, p) => s + (Number.isFinite(p.marketValueEur) ? p.marketValueEur : 0),
        0,
      );
    const sizeRegime = sizeMultiplierForRegime() * daily.sizeMult;

    for (const sig of ranked.slice(0, 3)) {
      if (!canOpenFastTrade().ok) break;
      if (!isCryptoStrategyLive(sig.strategyId) || sig.shadow) {
        if (!passesCostFilter(sig, sig.spreadPct)) {
          held.push(`${sig.pair}:shadow_cost`);
          continue;
        }
        const shQty = shadowSimQty(sig.entry);
        appendCryptoJournal({
          at: new Date().toISOString(),
          strategy: sig.strategyId,
          pair: sig.pair,
          regime: getMarketRegime().regime,
          side: "BUY",
          entry: sig.entry,
          exit: null,
          exitReason: null,
          grossPnlEur: null,
          feesEur: 0,
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
        });
        held.push(`${sig.pair}:shadow`);
        continue;
      }
      if (hasSignalKey(sig.signalKey)) {
        held.push(`${sig.pair}:dup`);
        continue;
      }
      if ([...confirmedLive].some((s) => s === sig.pair.toUpperCase())) {
        held.push(`${sig.pair}:busy`);
        continue;
      }

      const stopDist = Math.abs(sig.entry - sig.stopLoss);
      if (!(stopDist > 0)) continue;
      let qty = (eq * 0.01 * sizeRegime) / stopDist;
      const notionalCap = cryptoLiveMaxNotionalEur();
      if (qty * sig.entry > notionalCap) qty = notionalCap / sig.entry;
      const meta = await getKrakenPairMeta(sig.pair);
      if (meta) {
        qty = quantizeKrakenVolume(qty, meta);
        if (!(qty > 0)) continue;
      }
      const bid =
        getBook(sig.pair)?.bids[0]?.price ??
        getTicker(sig.pair)?.bid ??
        sig.entry;
      const notionalEur = qty * bid;
      const reservation = getCryptoSlotReservation();
      const reserved = await reservation.tryReserve({
        symbol: sig.pair,
        notionalEur,
        maxPositions: cryptoLiveMaxPositions(),
      });
      if (!reserved.ok) {
        held.push(`${sig.pair}:${reserved.reason}`);
        continue;
      }

      // Fresh CRYPTO_LIVE_STRATEGIES check immediately before sending the order
      if (!isCryptoStrategyLive(sig.strategyId)) {
        await reservation.release(sig.pair);
        held.push(`${sig.pair}:strategy_not_live`);
        console.log(
          `[Kraken/Fast] HOLD ${sig.pair} ${sig.strategyId} — removed from CRYPTO_LIVE_STRATEGIES before send`,
        );
        continue;
      }

      try {
        const order = await adapter.placeOrder({
          symbol: sig.pair,
          side: "buy",
          volume: qty,
          price: bid,
          oflags: "post",
        });
        await new Promise((r) => setTimeout(r, 10_000));
        const st = order.orderId
          ? await adapter.getOrderStatus(order.orderId).catch(() => null)
          : null;
        const filled =
          st != null &&
          (st.status === "closed" || st.volExec >= st.vol * 0.99) &&
          st.volExec > 0;
        recordFastPostOnlyAttempt(sig.strategyId, Boolean(filled));
        if (!filled) {
          if (order.orderId) {
            await adapter.cancelOrder(order.orderId).catch(() => undefined);
          }
          await reservation.release(sig.pair);
          held.push(`${sig.pair}:unfilled`);
          continue;
        }

        await reservation.commit(sig.pair);
        recordFastTradeOpened();
        const fillQty = st!.volExec || order.volume;
        const fillFee =
          st!.fee > 0
            ? st!.fee
            : fillQty * order.price * getMakerFeePct(sig.pair);
        appendCryptoJournal({
          at: new Date().toISOString(),
          strategy: sig.strategyId,
          pair: sig.pair,
          regime: getMarketRegime().regime,
          side: "BUY",
          entry: order.price,
          exit: null,
          exitReason: null,
          grossPnlEur: null,
          feesEur: fillFee,
          netPnlEur: null,
          durationMs: null,
          mfePct: null,
          maePct: null,
          shadow: false,
          open: true,
          signalKey: sig.signalKey,
          stopLoss: sig.stopLoss,
          takeProfit: sig.takeProfit,
          qty: fillQty,
          orderId: order.orderId,
        });

        // Same-step exit-manager registration (never IBKR PositionMonitor)
        registerCryptoExitPosition({
          symbol: sig.pair,
          entryPrice: order.price,
          stopLoss: sig.stopLoss,
          takeProfit: sig.takeProfit,
          qty: fillQty,
          strategy: sig.strategyId,
          orderId: order.orderId,
        });

        // Post-only limit TP immediately on fill (never chase / never taker).
        await adapter
          .placeOrder({
            symbol: sig.pair,
            side: "sell",
            volume: fillQty,
            price: sig.takeProfit,
            oflags: "post",
          })
          .catch((err) =>
            console.warn(
              "[Kraken/Fast] TP post-only:",
              err instanceof Error ? err.message : err,
            ),
          );

        executed.push(`${sig.pair}:${sig.strategyId}`);
        const buyLine =
          `⚡ BUY FAST ₿ KRAKEN ${sig.pair} ${fillQty} @ €${order.price.toFixed(4)} | ` +
          `${sig.strategyId} fee €${fillFee.toFixed(4)} SL €${sig.stopLoss.toFixed(4)} TP €${sig.takeProfit.toFixed(4)}`;
        console.log(`[Kraken/Fast] ${buyLine}`);
        void sendTelegramMessage(buyLine).catch(() => undefined);
        break; // max 1 fast position
      } catch (err) {
        await reservation.release(sig.pair);
        held.push(
          `${sig.pair}:err:${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
    try {
      const { recordCycleMeta } = await import(
        "@/lib/trading/crypto/diagnostics"
      );
      recordCycleMeta({
        universePairs: pairs,
        signals: collected.length,
        tradesLast24h: 0,
      });
    } catch {
      /* optional */
    }
    return { executed, held };
  } finally {
    fastCycleBusy = false;
  }
}

function startKrakenExitLoop(): void {
  if (exitTimer) return;
  const tick = () => {
    void runKrakenExits().catch((err) =>
      console.warn("[Kraken/Exit]", err instanceof Error ? err.message : err),
    );
    void runCryptoEngineAlarms().catch(() => undefined);
  };
  tick();
  exitTimer = setInterval(tick, 5_000);
  exitTimer.unref?.();
}

/** Close shadow journal opens with the same SL/TP/maxHold rules (no broker). */
async function runShadowExits(): Promise<void> {
  const opens = listOpenCryptoJournal({ shadow: true });
  for (const open of opens) {
    const entry = open.entry;
    const openedAt = Date.parse(open.at);
    const holdMs = Number.isFinite(openedAt) ? Date.now() - openedAt : 0;
    const strategy = String(open.strategy);
    const maxHold = maxHoldMsForStrategy(strategy);
    const stop =
      open.stopLoss != null && open.stopLoss > 0 ? open.stopLoss : entry * 0.97;
    const tp =
      open.takeProfit != null && open.takeProfit > 0
        ? open.takeProfit
        : entry * 1.04;
    const midRaw = midPrice(open.pair);
    const mid = midRaw != null && midRaw > 0 ? midRaw : null;
    let reason: string | null = null;
    if (strategy === "RSI2_TREND_5M" && mid != null) {
      reason = rsi2TrendShouldExit(getBars(open.pair, "5"), entry, openedAt);
    }
    if (!reason && holdMs >= maxHold) reason = "MAX_HOLD";
    if (!reason && mid != null && mid <= stop) reason = "STOP_LOSS";
    if (!reason && mid != null && mid >= tp) reason = "TAKE_PROFIT";
    // Never leave shadow opens forever — force close if no price after maxHold.
    if (!reason && mid == null && holdMs >= Math.min(maxHold, 60 * 60_000)) {
      reason = "MAX_HOLD";
    }
    if (!reason) continue;
    const exitPx = mid ?? entry;
    const peak = Math.max(exitPx, entry);
    const qty =
      open.qty && open.qty > 0 ? open.qty : shadowSimQty(entry);
    closeCryptoJournalOpen({
      open: { ...open, qty },
      exit: exitPx,
      exitReason: reason,
      feesEur: shadowExitFeesEur({
        entry,
        exit: exitPx,
        qty,
        pair: open.pair,
        exitReason: reason,
      }),
      mfePct: (peak - entry) / entry,
      maePct: null,
    });
  }
}

/** Professional exit management using WS prices. */
async function runKrakenExits(): Promise<void> {
  if (!isKrakenConfigured()) return;
  // Shadow positions: same exit logic, journal-only (no broker order)
  await runShadowExits().catch(() => undefined);

  const adapter = getKrakenAdapter();
  const openPairs = journalOpenCryptoPairs();
  if (!openPairs.size) return;

  const positions = await adapter.getPositions().catch(() => []);
  const regime = getMarketRegime();
  const trailMult = regime.regime === "BAJISTA" ? 0.5 : 1;

  for (const pos of positions) {
    if (![...openPairs].some((s) => s === pos.symbol || s.startsWith(pos.base))) {
      continue;
    }
    const mid = midPrice(pos.symbol) ?? pos.currentPrice;
    if (!(mid > 0)) continue;

    const journal = readCryptoJournal()
      .filter((t) => t.pair === pos.symbol && !t.shadow)
      .reverse();
    const openBuy = journal.find((t) => t.side === "BUY" && (t.open || t.exit == null));
    if (!openBuy) continue;

    const entry = openBuy.entry > 0 ? openBuy.entry : pos.avgEntryPrice;
    const openedAt = Date.parse(openBuy.at);
    const holdMs = Number.isFinite(openedAt) ? Date.now() - openedAt : 0;
    const strategy = String(openBuy.strategy);
    const maxHold = maxHoldMsForStrategy(strategy);
    const stop =
      openBuy.stopLoss != null && openBuy.stopLoss > 0
        ? openBuy.stopLoss
        : entry * 0.97;
    const tp =
      openBuy.takeProfit != null && openBuy.takeProfit > 0
        ? openBuy.takeProfit
        : entry * 1.04;

    const pnlPct = (mid - entry) / entry;
    const rDist = Math.max(entry * 0.005, entry - stop);
    const rMultiple = (mid - entry) / rDist;

    let reason: string | null = null;
    if (strategy === "RSI2_TREND_5M") {
      const bars5 = getBars(pos.symbol, "5");
      reason = rsi2TrendShouldExit(bars5, entry, openedAt);
    }
    if (!reason && holdMs >= maxHold) reason = "MAX_HOLD";
    else if (!reason && mid <= stop) reason = "STOP_LOSS";
    else if (!reason && mid >= tp) reason = "TAKE_PROFIT";
    else if (!reason && pnlPct <= -0.03) reason = "STOP_LOSS";

    // Trailing from peak via ATR
    const bars = getBars(pos.symbol, "15");
    const atrVal = bars.length > 20 ? atr(bars, 14) ?? mid * 0.01 : mid * 0.01;

    // Peak tracking in journal mfe
    const peak = Math.max(mid, entry * (1 + (openBuy.mfePct ?? 0)));
    const trailStop = peak - atrVal * trailMult;
    if (!reason && rMultiple >= 1 && mid <= entry * 1.002) {
      // BE after +1R — if price revisits entry+fees zone, exit
      if (mid <= entry * 1.004) reason = "BREAKEVEN";
    }
    if (!reason && rMultiple >= 1 && mid <= trailStop) reason = "TRAILING_STOP";
    if (!reason && rMultiple >= 2 && !(openBuy as { partial?: boolean }).partial) {
      reason = "PARTIAL_TP";
    }

    if (!reason) continue;

    const discount = cryptoSellAggressiveDiscountPct();
    // TP / trailing / partial → ALWAYS maker (post-only). ONLY stop + time → taker (aggressive).
    const takerExit =
      reason === "STOP_LOSS" ||
      reason === "MAX_HOLD" ||
      reason === "BREAKEVEN";
    const limit = takerExit ? mid * (1 - discount) : Math.max(mid, tp);
    const qty = reason === "PARTIAL_TP" ? pos.qty / 2 : pos.qty;

    try {
      const order = await adapter.placeOrder({
        symbol: pos.symbol,
        side: "sell",
        volume: qty,
        price: limit,
        oflags: takerExit ? undefined : "post",
      });
      const entryFeeRate = getMakerFeePct(pos.symbol);
      const exitFeeRate = takerExit
        ? getTakerFeePct(pos.symbol)
        : getMakerFeePct(pos.symbol);
      const buyFeeEst = entry * order.volume * entryFeeRate;
      const sellFeeEst = order.price * order.volume * exitFeeRate;
      const fees = buyFeeEst + sellFeeEst;
      const gross = (order.price - entry) * order.volume;
      const net = gross - fees;
      appendCryptoJournal({
        at: new Date().toISOString(),
        strategy,
        pair: pos.symbol,
        regime: regime.regime,
        side: "SELL",
        entry,
        exit: order.price,
        exitReason: reason,
        grossPnlEur: gross,
        feesEur: fees,
        netPnlEur: net,
        durationMs: holdMs,
        mfePct: (peak - entry) / entry,
        maePct: null,
        shadow: false,
        rMultiple,
      });
      if (reason !== "PARTIAL_TP") {
        recordFullClose(pos.symbol);
      }
      if (reason === "STOP_LOSS") {
        recordKrakenStopHit();
        if (isFastCryptoStrategy(strategy)) recordFastStop();
      } else {
        recordKrakenWinResetStops();
        if (isFastCryptoStrategy(strategy)) recordFastWin();
      }

      const line =
        `🔴 SELL ₿ KRAKEN ${pos.symbol} ${order.volume} @ €${order.price.toFixed(4)} | ` +
        `${reason} ${strategy} neto €${net.toFixed(2)} fee €${fees.toFixed(4)} ` +
        `(entry €${entry.toFixed(4)} SL €${stop.toFixed(4)} TP €${tp.toFixed(4)})`;
      console.log(`[Kraken/Exit] ${line}`);
      void sendTelegramMessage(line).catch(() => undefined);
    } catch (err) {
      console.warn(
        `[Kraken/Exit] sell ${pos.symbol}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }
}

export async function runKrakenAnalysisCycle(): Promise<{
  signals: RankedSignal[];
  executed: string[];
  shadow: string[];
  held: string[];
}> {
  // Under external ownership, Next.js HTTP must not place orders / start loops
  if (isCryptoEngineExternal() && !isCryptoEngineStandalone()) {
    console.log(
      "[Kraken/Cycle] omitido en Next.js — owned by forgeos-crypto-engine",
    );
    return { signals: [], executed: [], shadow: [], held: ["external_engine"] };
  }

  await startKrakenEngine();
  await checkAndRecoverStaleMarketData().catch(() => undefined);
  const pairs = await getKrakenUniversePairs();
  const needBars = pairs.filter(
    (p) =>
      getBars(p, "5").length < 30 ||
      getBars(p, "15").length < 40 ||
      getBars(p, "60").length < 60,
  );
  if (needBars.length) {
    await backfillUniverseStandardTfs(needBars, {
      label: "cycle-gap",
      delayMs: 180,
    }).catch(() => undefined);
  }

  const eq = await equityEur();
  syncKrakenDailyRisk(eq);
  const daily = canOpenKrakenBuy();
  const regimePause = isBuyPausedByRegime();
  const reliability = strategyReliabilityMap();

  const topRs = new Set(
    topRsPairsVsBtc(pairs, (p) => getBars(p, "60"), getBars("XBTEUR", "60"), 3),
  );

  const collected: Array<RankedSignal> = [];
  for (const pair of pairs) {
    const sigs = evaluateAllStrategiesForPair(pair, {
      openGridLevels: countOpenGridLevels(pair),
      isTop3Rs: topRs.has(pair),
    }).map((s) => ({ ...s, pair }));
    collected.push(...rankSignals(sigs, reliability));
  }
  try {
    const { recordCycleMeta } = await import("@/lib/trading/crypto/diagnostics");
    const dayAgo = Date.now() - 24 * 3600_000;
    const trades24 = readCryptoJournal().filter(
      (t) =>
        !t.shadow &&
        t.side === "SELL" &&
        Number.isFinite(Date.parse(t.at)) &&
        Date.parse(t.at) >= dayAgo,
    ).length;
    recordCycleMeta({
      universePairs: pairs,
      signals: collected.length,
      tradesLast24h: trades24,
    });
  } catch {
    /* diagnostics optional */
  }
  // One live position per pair — keep best score; still allow distinct signalKeys for shadow log
  const bestByPair = new Map<string, RankedSignal>();
  for (const s of collected.sort((a, b) => b.score - a.score)) {
    if (!bestByPair.has(s.pair)) bestByPair.set(s.pair, s);
  }
  const ranked = [...bestByPair.values()].sort((a, b) => b.score - a.score);

  lastSignals = ranked.slice(0, 20).map((s) => ({
    pair: s.pair,
    strategy: s.strategyId,
    confidence: s.confidence,
    score: s.score,
    shadow: s.shadow || !isCryptoStrategyLive(s.strategyId),
    action: "SIGNAL",
  }));
  lastCycleAt = new Date().toISOString();

  const executed: string[] = [];
  const shadow: string[] = [];
  const held: string[] = [];

  // RANGE_GRID: leave LATERAL → cancel open orders + close positions
  await handleRangeGridRegimeExit().catch((err) =>
    console.warn(
      "[Kraken/GridExit]",
      err instanceof Error ? err.message : err,
    ),
  );

  if (!daily.ok || regimePause.paused) {
    console.log(
      `[Kraken/Cycle] sin compras: ${daily.reason ?? regimePause.reason ?? "ok"}`,
    );
    for (const s of ranked) {
      held.push(`${s.pair}:${s.strategyId}`);
      lastSignals = lastSignals.map((x) =>
        x.pair === s.pair ? { ...x, action: "HOLD_RISK" } : x,
      );
    }
    return { signals: ranked, executed, shadow, held };
  }

  const adapter = getKrakenAdapter();
  const acct = await adapter.getAccount();
  const krakenPositions = await adapter.getPositions().catch(() => []);
  const krakenOpenOrders = await adapter.getOpenOrders().catch(
    () => ({} as Record<string, { pair: string }>),
  );
  // Only meaningful (non-dust, non-foreign) balances block a pair — never shadow journal.
  const meaningfulBalances = filterMeaningfulKrakenBalances(
    krakenPositions.filter((p) => !isForeignOrphanPair(p.symbol)),
  );
  const confirmedLive = confirmedLiveOpenPairs(
    meaningfulBalances,
    journalOpenCryptoPairs(),
  );
  const krakenBusyPairs = new Set<string>([...confirmedLive]);
  for (const o of Object.values(krakenOpenOrders)) {
    const sym = String(o.pair ?? "").toUpperCase().replace("/", "");
    if (sym) krakenBusyPairs.add(sym);
  }

  beginCryptoCycleReservation(acct.cashEur, confirmedLive);
  const maxPos = cryptoLiveMaxPositions();
  console.log(
    `[Kraken/Cycle] analysis ${formatDataAgeLog(getMarketDataAges(["XBTEUR", ...pairs.slice(0, 5)]))} ` +
      `confirmedLive=${confirmedLive.size}/${maxPos} shadowOpen=${listOpenCryptoJournal({ shadow: true }).length}`,
  );
  const sizeRegime = sizeMultiplierForRegime() * daily.sizeMult;
  const warmup = isWithinNewStrategyWarmup();

  for (const sig of ranked) {
    const isShadow = sig.shadow || !isCryptoStrategyLive(sig.strategyId);

    // Idempotency: one order per strategy+pair+candle
    if (hasSignalKey(sig.signalKey)) {
      held.push(`${sig.pair}:dup_signal`);
      continue;
    }

    if (isShadow) {
      if (!passesCostFilter(sig, sig.spreadPct)) {
        held.push(`${sig.pair}:shadow_cost`);
        continue;
      }
      const shQty = shadowSimQty(sig.entry);
      appendCryptoJournal({
        at: new Date().toISOString(),
        strategy: sig.strategyId,
        pair: sig.pair,
        regime: getMarketRegime().regime,
        side: "BUY",
        entry: sig.entry,
        exit: null,
        exitReason: null,
        grossPnlEur: null,
        feesEur: 0,
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
      });
      shadow.push(`${sig.pair}:${sig.strategyId}`);
      console.log(
        `[Kraken/Shadow] ${sig.pair} ${sig.strategyId} conf=${(sig.confidence * 100).toFixed(0)}% score=${sig.score.toFixed(4)}`,
      );
      continue;
    }

    // One live position per pair (all strategies)
    const openForge = [...journalOpenCryptoPairs()];
    if (
      openForge.includes(sig.pair.toUpperCase()) ||
      krakenBusyPairs.has(sig.pair.toUpperCase())
    ) {
      held.push(`${sig.pair}:pair_busy`);
      console.log(
        `[Kraken/Cycle] HOLD ${sig.pair} ya hay posición/orden abierta (journal o Kraken)`,
      );
      continue;
    }

    if (
      warmup &&
      NEW_CRYPTO_STRATEGIES.has(sig.strategyId as CryptoStrategyId) &&
      countOpenByStrategy(sig.strategyId) >= 1
    ) {
      held.push(`${sig.pair}:warmup_cap`);
      console.log(
        `[Kraken/Cycle] HOLD ${sig.strategyId} — máx 1 pos en primeras 48h`,
      );
      continue;
    }

    if (!passesCorrelationFilter(sig.pair, openForge)) {
      held.push(`${sig.pair}:corr`);
      console.log(`[Kraken/Cycle] HOLD ${sig.pair} correlación >0.8 (máx 2)`);
      continue;
    }

    const stopDist = Math.abs(sig.entry - sig.stopLoss);
    if (!(stopDist > 0)) {
      held.push(`${sig.pair}:bad_stop`);
      continue;
    }
    const riskEur = eq * 0.01 * sizeRegime;
    let qty = riskEur / stopDist;
    const notionalCap = cryptoLiveMaxNotionalEur();
    if (qty * sig.entry > notionalCap) qty = notionalCap / sig.entry;
    const meta = await getKrakenPairMeta(sig.pair);
    if (meta) {
      qty = quantizeKrakenVolume(qty, meta);
      if (!(qty > 0)) {
        held.push(`${sig.pair}:below_min`);
        continue;
      }
    }
    const book = getBook(sig.pair);
    const ticker = getTicker(sig.pair);
    const bid = book?.bids[0]?.price ?? ticker?.bid ?? sig.entry;
    const notionalEur = qty * bid;

    const reservation = getCryptoSlotReservation();
    const reserved = await reservation.tryReserve({
      symbol: sig.pair,
      notionalEur,
      maxPositions: maxPos,
    });
    if (!reserved.ok) {
      held.push(`${sig.pair}:${reserved.reason}`);
      console.log(`[Kraken/Cycle] HOLD ${sig.pair} ${reserved.message}`);
      continue;
    }

    // Fresh CRYPTO_LIVE_STRATEGIES check immediately before sending the order
    if (!isCryptoStrategyLive(sig.strategyId)) {
      await reservation.release(sig.pair);
      held.push(`${sig.pair}:strategy_not_live`);
      console.log(
        `[Kraken/Cycle] HOLD ${sig.pair} ${sig.strategyId} — removed from CRYPTO_LIVE_STRATEGIES before send`,
      );
      continue;
    }

    try {
      const attemptBuy = async (limitPx: number) => {
        const order = await adapter.placeOrder({
          symbol: sig.pair,
          side: "buy",
          volume: qty,
          price: limitPx,
          oflags: "post",
        });
        await new Promise((r) => setTimeout(r, 20_000));
        const st = order.orderId
          ? await adapter.getOrderStatus(order.orderId).catch(() => null)
          : null;
        const filled =
          st != null &&
          (st.status === "closed" || st.volExec >= st.vol * 0.99) &&
          st.volExec > 0;
        if (filled) {
          const vol = st!.volExec || order.volume;
          const fee =
            st!.fee > 0
              ? st!.fee
              : vol * order.price * getMakerFeePct(sig.pair);
          return {
            order: {
              ...order,
              volume: vol,
              price: order.price,
            },
            fee,
          };
        }
        if (order.orderId) {
          await adapter.cancelOrder(order.orderId).catch(() => undefined);
        }
        return null;
      };

      let filled = await attemptBuy(bid);
      if (!filled) {
        const book2 = getBook(sig.pair);
        const ticker2 = getTicker(sig.pair);
        const bid2 = book2?.bids[0]?.price ?? ticker2?.bid ?? bid;
        filled = await attemptBuy(bid2);
      }
      if (!filled) {
        await reservation.release(sig.pair);
        held.push(`${sig.pair}:unfilled`);
        console.log(
          `[Kraken/Cycle] HOLD ${sig.pair} post-only no fill tras 2 intentos`,
        );
        continue;
      }

      const order = filled.order;
      await reservation.commit(sig.pair);
      krakenBusyPairs.add(sig.pair.toUpperCase());

      appendCryptoJournal({
        at: new Date().toISOString(),
        strategy: sig.strategyId,
        pair: sig.pair,
        regime: getMarketRegime().regime,
        side: "BUY",
        entry: order.price,
        exit: null,
        exitReason: null,
        grossPnlEur: null,
        feesEur: filled.fee,
        netPnlEur: null,
        durationMs: null,
        mfePct: null,
        maePct: null,
        shadow: false,
        open: true,
        signalKey: sig.signalKey,
        stopLoss: sig.stopLoss,
        takeProfit: sig.takeProfit,
        qty: order.volume,
        orderId: order.orderId,
      });
      // Same-step exit-manager registration (never IBKR PositionMonitor)
      registerCryptoExitPosition({
        symbol: sig.pair,
        entryPrice: order.price,
        stopLoss: sig.stopLoss,
        takeProfit: sig.takeProfit,
        qty: order.volume,
        strategy: sig.strategyId,
        orderId: order.orderId,
      });

      const line =
        `🟢 BUY ₿ KRAKEN ${sig.pair} ${order.volume} @ €${order.price.toFixed(4)} | ` +
        `${sig.strategyId} SL €${sig.stopLoss.toFixed(4)} TP €${sig.takeProfit.toFixed(4)} ` +
        `fee €${filled.fee.toFixed(4)} notional≈€${(order.volume * order.price).toFixed(2)}`;
      console.log(`[Kraken/Cycle] ${line}`);
      void sendTelegramMessage(line).catch(() => undefined);
      executed.push(`${sig.pair}:${sig.strategyId}`);
    } catch (err) {
      await reservation.release(sig.pair);
      const msg = err instanceof Error ? err.message : String(err);
      if (/insufficient|nonce|minimum|EOrder/i.test(msg)) {
        held.push(`${sig.pair}:HOLD`);
        console.log(`[Kraken/Cycle] HOLD ${sig.pair} ${msg}`);
      } else {
        held.push(`${sig.pair}:ERR`);
        console.warn(`[Kraken/Cycle] ${sig.pair}:`, msg);
      }
    }
  }

  const tuneMsgs = await autoDegradePromoteStrategies({
    trades: readCryptoJournal(),
    capitalEur: eq,
  });
  for (const m of tuneMsgs) void sendTelegramMessage(m).catch(() => undefined);

  return { signals: ranked, executed, shadow, held };
}

async function handleRangeGridRegimeExit(): Promise<void> {
  if (getMarketRegime().regime === "LATERAL") return;
  const adapter = getKrakenAdapter();
  const opens = listOpenCryptoJournal({
    shadow: false,
    strategy: "RANGE_GRID_15M",
  });
  if (!opens.length) return;

  const orders = await adapter.getOpenOrders().catch(
    () => ({} as Record<string, { pair: string }>),
  );
  for (const [txid, o] of Object.entries(orders)) {
    const pair = String(o.pair ?? "").toUpperCase().replace("/", "");
    if (
      opens.some((x) => x.pair.toUpperCase() === pair || pair.includes(x.pair.replace("EUR", "")))
    ) {
      await adapter.cancelOrder(txid).catch(() => undefined);
    }
  }

  const positions = await adapter.getPositions().catch(() => []);
  for (const open of opens) {
    const pos = positions.find(
      (p) => p.symbol.toUpperCase() === open.pair.toUpperCase(),
    );
    if (!pos) {
      closeCryptoJournalOpen({
        open,
        exit: open.entry,
        exitReason: "REGIME_EXIT_LATERAL",
      });
      continue;
    }
    const mid = midPrice(pos.symbol) ?? pos.currentPrice;
    const order = await adapter.placeOrder({
      symbol: pos.symbol,
      side: "sell",
      volume: pos.qty,
      price: mid * (1 - cryptoSellAggressiveDiscountPct()),
    });
    const pnl = (order.price - open.entry) * order.volume;
    appendCryptoJournal({
      at: new Date().toISOString(),
      strategy: "RANGE_GRID_15M",
      pair: pos.symbol,
      regime: getMarketRegime().regime,
      side: "SELL",
      entry: open.entry,
      exit: order.price,
      exitReason: "REGIME_EXIT_LATERAL",
      grossPnlEur: pnl,
      feesEur: 0,
      netPnlEur: pnl,
      netPct: open.entry > 0 ? (pnl / (open.entry * order.volume)) * 100 : null,
      durationMs: Date.now() - Date.parse(open.at),
      mfePct: null,
      maePct: null,
      shadow: false,
      signalKey: open.signalKey,
    });
    void sendTelegramMessage(
      `🔴 SELL ₿ KRAKEN ${pos.symbol} GRID | REGIME_EXIT_LATERAL P&L €${pnl.toFixed(2)}`,
    ).catch(() => undefined);
  }
}

function startDailyReportScheduler(): void {
  if (reportTimer) return;
  reportTimer = setInterval(() => {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Madrid",
      hour: "2-digit",
      minute: "2-digit",
      weekday: "short",
      hour12: false,
    }).formatToParts(new Date());
    const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
    const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
    const wd = parts.find((p) => p.type === "weekday")?.value ?? "";
    // Daily summary 22:15 Europe/Madrid
    if (h === 22 && m >= 15 && m < 20) {
      void sendDailyCryptoReport().catch(() => undefined);
    }
    if (wd === "Sun" && h === 20 && m < 5) {
      void sendWeeklyCryptoReport().catch(() => undefined);
    }
  }, 60_000);
  reportTimer.unref?.();
}

async function sendDailyCryptoReport(): Promise<void> {
  const risk = getKrakenDailyRisk();
  const perfs = computeCryptoStrategyPerf();
  const dayAgo = Date.now() - 24 * 3600_000;
  const trades24 = readCryptoJournal().filter(
    (t) =>
      !t.shadow &&
      (t.side === "BUY" || t.side === "SELL") &&
      Number.isFinite(Date.parse(t.at)) &&
      Date.parse(t.at) >= dayAgo,
  ).length;
  const shadowClosed = readCryptoJournal().filter(
    (t) =>
      t.shadow &&
      t.side === "SELL" &&
      t.netPct != null &&
      Number.isFinite(Date.parse(t.at)) &&
      Date.parse(t.at) >= dayAgo,
  );
  const lines = [
    "📊 <b>Kraken diario 22:15 Madrid</b>",
    `P&L día: €${risk.dayPnlEur.toFixed(2)} | sem: €${risk.weekPnlEur.toFixed(2)}`,
    `Régimen: ${getMarketRegime().regime} | ops live 24h: ${trades24}`,
    ...perfs.slice(0, 16).map(
      (p) =>
        `${p.strategy}: live n=${p.trades} WR=${(p.winRate * 100).toFixed(0)}% net=€${p.netPnlEur.toFixed(2)} | shadow n=${p.shadowTrades} net=€${p.shadowNetPnlEur.toFixed(2)} | <b>${p.mode}</b>`,
    ),
    ...formatFastMetricsTelegramLines(),
  ];
  if (shadowClosed.length) {
    lines.push(
      `Shadow cerradas 24h (${shadowClosed.length}): ` +
        shadowClosed
          .slice(-8)
          .map(
            (t) =>
              `${t.strategy}/${t.pair} ${t.netPct!.toFixed(2)}% (${t.exitReason ?? "?"})`,
          )
          .join(" | "),
    );
  }
  await sendTelegramMessage(lines.join("\n"));
  try {
    const { formatDiagnosticsTelegram } = await import(
      "@/lib/trading/crypto/diagnostics"
    );
    await sendTelegramMessage(formatDiagnosticsTelegram());
  } catch (err) {
    console.warn(
      "[Kraken/Diag] telegram:",
      err instanceof Error ? err.message : err,
    );
  }
}

async function sendWeeklyCryptoReport(): Promise<void> {
  const risk = getKrakenDailyRisk();
  await sendTelegramMessage(
    `📅 <b>Kraken semanal</b>\nP&L sem: €${risk.weekPnlEur.toFixed(2)}\nComparativa BTC: ver dashboard /api/trading/crypto/performance`,
  );
}

export function getKrakenEngineStatus(): EngineStatus {
  const local: EngineStatus = {
    started,
    universe: peekKrakenUniverse(),
    regime: getMarketRegime(),
    ws: getKrakenWsStatus(),
    dailyRisk: getKrakenDailyRisk(),
    lastCycleAt,
    lastSignals,
    exitLoopRunning: Boolean(exitTimer),
    openForgeOs: [...journalOpenCryptoPairs()],
  };

  if (started || isCryptoEngineStandalone()) {
    return local;
  }

  const hb = readCryptoEngineHeartbeat();
  if (!hb) return local;

  const ageMs = Date.now() - Date.parse(hb.updatedAt);
  const localRegime = getMarketRegime();
  // Prefer heartbeat regime so Next.js status/diagnostics match engine logs
  const regime =
    hb.regime && Number.isFinite(ageMs) && ageMs < 5 * 60_000
      ? {
          ...localRegime,
          regime: hb.regime as ReturnType<typeof getMarketRegime>["regime"],
          updatedAt: hb.updatedAt,
        }
      : localRegime;
  return {
    started: Number.isFinite(ageMs) && ageMs < 5 * 60_000,
    universe: peekKrakenUniverse(),
    regime,
    ws: {
      connected: hb.wsConnected,
      symbols: hb.wsSymbols,
      lastMsgAgeMs: Number.isFinite(ageMs) ? ageMs : -1,
    },
    dailyRisk: getKrakenDailyRisk(),
    lastCycleAt: hb.lastCycleAt,
    lastSignals: hb.lastSignals,
    exitLoopRunning: hb.exitLoopRunning,
    openForgeOs: hb.openForgeOs.length
      ? hb.openForgeOs
      : [...journalOpenCryptoPairs()],
  };
}
