/**
 * Scan all FOREX pairs × strategies — produces live signals + backtest badges.
 */

import "server-only";

import { FOREX_PAIRS, getForexSessionSnapshot } from "@/lib/investment/forex/config";
import { getForexHistory, getForexLiveQuotes } from "@/lib/investment/forex/market-data";
import { FOREX_STRATEGIES, isStrategyWindowActive } from "@/lib/investment/forex/strategies/defs";
import { evaluateStrategy, type ForexStrategySignal } from "@/lib/investment/forex/strategies/engine";
import { getCachedBacktest, type ForexBacktestStats } from "@/lib/investment/forex/backtest";
import { getForexGoalProgress } from "@/lib/investment/forex/goals";
import { getForexMacroSnapshot } from "@/lib/investment/forex/macro-calendar";
import { cacheKey, getCached, setCached } from "@/lib/market-data/cache";

export type ForexLiveSignalCard = ForexStrategySignal & {
  backtest: ForexBacktestStats;
  confidenceAdjusted: number;
  canExecute: boolean;
  blockReason?: string;
};

export type ForexSignalScanResult = {
  generatedAt: string;
  signals: ForexLiveSignalCard[];
  goals: ReturnType<typeof getForexGoalProgress>;
  session: ReturnType<typeof getForexSessionSnapshot>;
  macroBlackout: boolean;
  scannedPairs: number;
  durationMs: number;
};

const PAIR_TIMEOUT_MS = 8_000;

function weekendFromSession(label: string): boolean {
  return label.toLowerCase().includes("fin de semana");
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timeout ${timeoutMs}ms`)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function scanForexStrategySignals(): Promise<ForexSignalScanResult> {
  const started = Date.now();
  const cacheId = cacheKey("fx-signal-scan");
  const hit = getCached<ForexSignalScanResult>(cacheId);
  if (hit) return hit;

  const session = getForexSessionSnapshot();
  const macro = await getForexMacroSnapshot();
  const { quotes } = await getForexLiveQuotes();
  const weekend = weekendFromSession(session.label);
  const pairJobs = FOREX_PAIRS.map(async (pair): Promise<ForexLiveSignalCard[]> => {
    const label = `pair ${pair.pairId}`;
    try {
      return await withTimeout(
        (async () => {
          const quote = quotes.find((q) => q.pairId === pair.pairId);
          const spread = quote?.spreadPips ?? null;
          const defs = FOREX_STRATEGIES.filter((def) => {
            if (!isStrategyWindowActive(def.style, session.madridMinutes, weekend)) return false;
            return !(
              def.style === "SCALPING" &&
              def.priorityPairs.length &&
              !def.priorityPairs.includes(pair.pairId)
            );
          });
          if (defs.length === 0) return [];

          const timeframeSet = new Set(defs.map((d) => d.timeframe));
          const historyEntries = await Promise.all(
            [...timeframeSet].map(async (timeframe) => {
              try {
                const hist = await getForexHistory(pair.pairId, timeframe);
                return [timeframe, hist] as const;
              } catch {
                return [timeframe, null] as const;
              }
            }),
          );
          const historyByTf = new Map(historyEntries);
          const pairSignals: ForexLiveSignalCard[] = [];

          for (const def of defs) {
            const hist = historyByTf.get(def.timeframe);
            if (!hist || hist.bars.length < 25) continue;
            const sig = evaluateStrategy(def.id, pair.pairId, hist.bars, {
              spreadPips: spread,
              madridMinutes: session.madridMinutes,
              weekend,
              primarySession: session.primarySession,
            });
            if (!sig) continue;

            const bt = getCachedBacktest(def.id, pair.pairId, hist.bars);
            const confAdj = Math.min(
              0.95,
              sig.confidence * (0.85 + Math.min(0.2, bt.winRate * 0.25) + (bt.profitFactor > 1.2 ? 0.05 : 0)),
            );

            let canExecute = session.tradingWindowActive && !macro.blackoutActive;
            let blockReason: string | undefined;
            if (!session.tradingWindowActive) blockReason = "Fuera de horario";
            else if (macro.blackoutActive) blockReason = "Blackout macro";
            else if (bt.trades >= 5 && bt.winRate < 0.4) {
              canExecute = false;
              blockReason = "Backtest débil";
            }

            pairSignals.push({
              ...sig,
              confidence: confAdj,
              confidenceAdjusted: confAdj,
              backtest: bt,
              canExecute,
              blockReason,
            });
          }
          return pairSignals;
        })(),
        PAIR_TIMEOUT_MS,
        label,
      );
    } catch {
      return [];
    }
  });
  const settled = await Promise.allSettled(pairJobs);
  const signals = settled.flatMap((item) => (item.status === "fulfilled" ? item.value : []));

  signals.sort((a, b) => b.confidenceAdjusted - a.confidenceAdjusted);

  const result: ForexSignalScanResult = {
    generatedAt: new Date().toISOString(),
    signals: signals.slice(0, 20),
    goals: getForexGoalProgress(),
    session,
    macroBlackout: macro.blackoutActive,
    scannedPairs: FOREX_PAIRS.length,
    durationMs: Date.now() - started,
  };
  setCached(cacheId, result, 55_000);
  return result;
}
