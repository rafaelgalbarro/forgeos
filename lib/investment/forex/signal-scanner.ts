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

function weekendFromSession(label: string): boolean {
  return label.toLowerCase().includes("fin de semana");
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
  const signals: ForexLiveSignalCard[] = [];

  for (const pair of FOREX_PAIRS) {
    const quote = quotes.find((q) => q.pairId === pair.pairId);
    const spread = quote?.spreadPips ?? null;

    for (const def of FOREX_STRATEGIES) {
      if (!isStrategyWindowActive(def.style, session.madridMinutes, weekend)) continue;
      // Prefer priority pairs for scalping noise control
      if (
        def.style === "SCALPING" &&
        def.priorityPairs.length &&
        !def.priorityPairs.includes(pair.pairId)
      ) {
        continue;
      }

      const hist = await getForexHistory(pair.pairId, def.timeframe);
      if (hist.bars.length < 25) continue;

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

      signals.push({
        ...sig,
        confidence: confAdj,
        confidenceAdjusted: confAdj,
        backtest: bt,
        canExecute,
        blockReason,
      });
    }
  }

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
