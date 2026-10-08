/**
 * Kraken high-performance trading engine orchestrator.
 */

import "server-only";

import { getKrakenAdapter, isKrakenConfigured } from "@/lib/brokers/kraken";
import { getKrakenPairMeta, quantizeKrakenVolume } from "@/lib/brokers/kraken/asset-pairs";
import { atr } from "@/lib/trading/crypto/indicators";
import {
  getBars,
  getBook,
  getTicker,
  midPrice,
  restBackfill,
} from "@/lib/brokers/kraken/market-store";
import {
  getKrakenUniversePairs,
  peekKrakenUniverse,
  refreshKrakenUniverse,
} from "@/lib/brokers/kraken/universe";
import {
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
  autoTuneCryptoStrategies,
  computeCryptoStrategyPerf,
  isCryptoStrategyLiveDisabled,
  journalOpenCryptoPairs,
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
  evaluateAllStrategiesForPair,
  rankSignals,
  type RankedSignal,
} from "@/lib/trading/crypto/strategies";
import { SHADOW_BOOTSTRAP_STRATEGIES } from "@/lib/trading/crypto/strategies/types";
import { sendTelegramMessage } from "@/lib/notifications/telegram-bot";
import { registerExecutedPosition } from "@/src/core/trading/position-monitor";
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
let universeTimer: ReturnType<typeof setInterval> | null = null;
let reportTimer: ReturnType<typeof setInterval> | null = null;

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

  try {
    await reconcileKrakenForgeOsPositions();
  } catch (err) {
    console.warn(
      "[Kraken/Reconcile]",
      err instanceof Error ? err.message : err,
    );
  }

  if (!universeTimer) {
    universeTimer = setInterval(() => {
      void refreshKrakenUniverse(true)
        .then((u) => {
          updateKrakenMarketSubscriptions(u.selected.map((p) => p.wsname));
        })
        .catch((err) =>
          console.warn("[Kraken/Universe]", err instanceof Error ? err.message : err),
        );
    }, 60 * 60_000);
    universeTimer.unref?.();
  }

  startKrakenExitLoop();
  startDailyReportScheduler();
  console.log(
    `[Kraken/Engine] started role=${isCryptoEngineStandalone() ? "standalone" : "next"}`,
  );
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

/** Professional exit management using WS prices. */
async function runKrakenExits(): Promise<void> {
  if (!isKrakenConfigured()) return;
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

    const pnlPct = (mid - entry) / entry;
    const riskPct = Math.min(0.03, Math.abs(entry - (openBuy as { stopHint?: number }).stopHint!) || 0.02);
    // Use 2% default R if unknown
    const rDist = entry * Math.max(0.01, Math.min(0.03, openBuy.entry > 0 ? 0.02 : 0.02));
    const rMultiple = (mid - entry) / rDist;

    let reason: string | null = null;
    if (holdMs >= maxHold) reason = "MAX_HOLD";
    else if (pnlPct <= -0.03) reason = "STOP_LOSS";
    else if (rMultiple >= 2) {
      // partial handled simply as full exit for v1 when half already sold — trail rest
      reason = null;
    }

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
    const aggressive = reason === "STOP_LOSS" || reason === "MAX_HOLD";
    const limit = aggressive ? mid * (1 - discount) : mid; // post-only attempt at mid for TP
    const qty = reason === "PARTIAL_TP" ? pos.qty / 2 : pos.qty;

    try {
      const order = await adapter.placeOrder({
        symbol: pos.symbol,
        side: "sell",
        volume: qty,
        price: limit,
        oflags: aggressive ? undefined : "post",
      });
      const fees = 0; // filled from trades history async later
      const pnl = (order.price - entry) * order.volume;
      appendCryptoJournal({
        at: new Date().toISOString(),
        strategy,
        pair: pos.symbol,
        regime: regime.regime,
        side: "SELL",
        entry,
        exit: order.price,
        exitReason: reason,
        grossPnlEur: pnl,
        feesEur: fees,
        netPnlEur: pnl - fees,
        durationMs: holdMs,
        mfePct: (peak - entry) / entry,
        maePct: null,
        shadow: false,
        rMultiple,
      });
      if (reason === "STOP_LOSS") recordKrakenStopHit();
      else recordKrakenWinResetStops();

      const line =
        `🔴 SELL ₿ KRAKEN ${pos.symbol} ${order.volume} @ €${order.price.toFixed(4)} | ` +
        `${reason} ${strategy} P&L €${pnl.toFixed(2)}`;
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
  const pairs = await getKrakenUniversePairs();
  // Ensure bars for top pairs
  for (const p of pairs.slice(0, 15)) {
    if (getBars(p, "15").length < 40) {
      await restBackfill(p, 15).catch(() => undefined);
      await restBackfill(p, 60).catch(() => undefined);
      await restBackfill(p, 5).catch(() => undefined);
    }
  }

  const eq = await equityEur();
  syncKrakenDailyRisk(eq);
  const daily = canOpenKrakenBuy();
  const regimePause = isBuyPausedByRegime();
  const reliability = strategyReliabilityMap();

  const collected: Array<RankedSignal> = [];
  for (const pair of pairs) {
    const sigs = evaluateAllStrategiesForPair(pair).map((s) => ({ ...s, pair }));
    collected.push(...rankSignals(sigs, reliability));
  }
  // Deduplicate by pair — keep best score
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
    shadow:
      s.shadow ||
      SHADOW_BOOTSTRAP_STRATEGIES.has(s.strategyId) ||
      isCryptoStrategyLiveDisabled(s.strategyId),
    action: "SIGNAL",
  }));
  lastCycleAt = new Date().toISOString();

  const executed: string[] = [];
  const shadow: string[] = [];
  const held: string[] = [];

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
  beginCryptoCycleReservation(acct.cashEur);
  const maxPos = cryptoLiveMaxPositions();
  const sizeRegime = sizeMultiplierForRegime() * daily.sizeMult;

  for (const sig of ranked) {
    const isShadow =
      sig.shadow ||
      SHADOW_BOOTSTRAP_STRATEGIES.has(sig.strategyId) ||
      isCryptoStrategyLiveDisabled(sig.strategyId);

    if (isShadow) {
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
      });
      shadow.push(`${sig.pair}:${sig.strategyId}`);
      console.log(
        `[Kraken/Shadow] ${sig.pair} ${sig.strategyId} conf=${(sig.confidence * 100).toFixed(0)}% score=${sig.score.toFixed(4)}`,
      );
      continue;
    }

    const openForge = [...journalOpenCryptoPairs()];
    if (!passesCorrelationFilter(sig.pair, openForge)) {
      held.push(`${sig.pair}:corr`);
      console.log(`[Kraken/Cycle] HOLD ${sig.pair} correlación >0.8 (máx 2)`);
      continue;
    }

    // Risk-based size: 1% equity / stop distance
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

    try {
      // Post-only at bid; wait 20s; cancel+retry once; else discard
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
          return { order: { ...order, volume: st!.volExec || order.volume, price: order.price }, fee: st!.fee };
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
        console.log(`[Kraken/Cycle] HOLD ${sig.pair} post-only no fill tras 2 intentos`);
        continue;
      }

      const order = filled.order;
      await reservation.commit(sig.pair);

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
      });
      await registerExecutedPosition({
        ticker: sig.pair,
        shares: order.volume,
        entryPrice: order.price,
        stopLoss: sig.stopLoss,
        takeProfit: sig.takeProfit,
        orderId: order.orderId,
      }).catch(() => undefined);

      const line =
        `🟢 BUY ₿ KRAKEN ${sig.pair} ${order.volume} @ €${order.price.toFixed(4)} | ` +
        `${sig.strategyId} SL €${sig.stopLoss.toFixed(4)} TP €${sig.takeProfit.toFixed(4)}`;
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

  const tuneMsgs = autoTuneCryptoStrategies();
  for (const m of tuneMsgs) void sendTelegramMessage(m).catch(() => undefined);

  return { signals: ranked, executed, shadow, held };
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
    if (h === 23 && m >= 55 && m <= 59) {
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
  const lines = [
    "📊 <b>Kraken diario</b>",
    `P&L día: €${risk.dayPnlEur.toFixed(2)} | sem: €${risk.weekPnlEur.toFixed(2)}`,
    `Régimen: ${getMarketRegime().regime}`,
    ...perfs.slice(0, 8).map(
      (p) =>
        `${p.strategy}: n=${p.trades} WR=${(p.winRate * 100).toFixed(0)}% net=€${p.netPnlEur.toFixed(2)} live=${p.live}`,
    ),
  ];
  await sendTelegramMessage(lines.join("\n"));
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
  return {
    started: Number.isFinite(ageMs) && ageMs < 5 * 60_000,
    universe: peekKrakenUniverse(),
    regime: getMarketRegime(),
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
