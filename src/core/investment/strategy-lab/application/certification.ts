/**
 * Strategy Lab certification — minimum criteria before Live Trading candidacy.
 * Live promotion is ALWAYS blocked while GO_LIVE = NOT_READY_FOR_LIVE.
 */

import type {
  StrategyLabCertificationCriterion,
  StrategyLabCertificationResult,
  StrategyLabMetrics,
} from "../domain/types";

export const STRATEGY_LAB_CERT_THRESHOLDS = {
  minTrades: 30,
  minExpectancy: 0,
  minProfitFactor: 1.1,
  maxDrawdownPct: 25,
  minSharpe: 0.4,
  minWinRate: 0.4,
  minSessionsDisclosure: 10,
} as const;

export function evaluateStrategyLabCertification(input: {
  readonly strategyId: string;
  readonly version: string;
  readonly metrics: StrategyLabMetrics;
  readonly distinctSessions?: number;
  readonly goLiveDecision?: "NOT_READY_FOR_LIVE" | "READY_FOR_LIVE";
}): StrategyLabCertificationResult {
  const goLive = input.goLiveDecision ?? "NOT_READY_FOR_LIVE";
  const m = input.metrics;
  const sessions = input.distinctSessions ?? 0;

  const criteria: StrategyLabCertificationCriterion[] = [
    {
      id: "SL01_SAMPLE",
      label: `Minimum trades (≥${STRATEGY_LAB_CERT_THRESHOLDS.minTrades})`,
      passed: m.tradeCount >= STRATEGY_LAB_CERT_THRESHOLDS.minTrades,
      evidence: `tradeCount=${m.tradeCount}`,
    },
    {
      id: "SL02_EXPECTANCY",
      label: "Positive expectancy",
      passed: m.expectancy > STRATEGY_LAB_CERT_THRESHOLDS.minExpectancy,
      evidence: `expectancy=${m.expectancy}`,
    },
    {
      id: "SL03_PROFIT_FACTOR",
      label: `Profit factor ≥ ${STRATEGY_LAB_CERT_THRESHOLDS.minProfitFactor}`,
      passed:
        m.profitFactor !== null && m.profitFactor >= STRATEGY_LAB_CERT_THRESHOLDS.minProfitFactor,
      evidence: `profitFactor=${m.profitFactor}`,
    },
    {
      id: "SL04_DRAWDOWN",
      label: `Max drawdown ≤ ${STRATEGY_LAB_CERT_THRESHOLDS.maxDrawdownPct}%`,
      passed:
        m.maxDrawdownPct !== null && m.maxDrawdownPct <= STRATEGY_LAB_CERT_THRESHOLDS.maxDrawdownPct,
      evidence: `maxDrawdownPct=${m.maxDrawdownPct}`,
    },
    {
      id: "SL05_SHARPE",
      label: `Sharpe ≥ ${STRATEGY_LAB_CERT_THRESHOLDS.minSharpe}`,
      passed: m.sharpe !== null && m.sharpe >= STRATEGY_LAB_CERT_THRESHOLDS.minSharpe,
      evidence: `sharpe=${m.sharpe}`,
    },
    {
      id: "SL06_WIN_RATE",
      label: `Win rate ≥ ${STRATEGY_LAB_CERT_THRESHOLDS.minWinRate} (supporting only)`,
      passed: m.winRate !== null && m.winRate >= STRATEGY_LAB_CERT_THRESHOLDS.minWinRate,
      evidence: `winRate=${m.winRate}`,
    },
    {
      id: "SL07_SESSIONS",
      label: `Distinct market sessions ≥ ${STRATEGY_LAB_CERT_THRESHOLDS.minSessionsDisclosure}`,
      passed: sessions >= STRATEGY_LAB_CERT_THRESHOLDS.minSessionsDisclosure,
      evidence: `distinctSessions=${sessions}`,
    },
    {
      id: "SL08_GO_LIVE_GATE",
      label: "Platform GO_LIVE decision",
      passed: false,
      evidence: `goLive=${goLive}; livePromotionAllowed=false`,
    },
  ];

  const hardFails = criteria.filter(
    (c) => !c.passed && c.id !== "SL06_WIN_RATE" && c.id !== "SL08_GO_LIVE_GATE",
  );
  let verdict: StrategyLabCertificationResult["verdict"] = "PASS";
  if (m.tradeCount < STRATEGY_LAB_CERT_THRESHOLDS.minTrades) {
    verdict = "INSUFFICIENT_SAMPLE";
  } else if (hardFails.length > 0) {
    verdict = "FAIL";
  } else {
    // Metrics may pass lab gates, but live promotion remains blocked.
    verdict = "BLOCKED_LIVE";
  }

  return {
    strategyId: input.strategyId,
    version: input.version,
    verdict,
    readiness: "NOT_READY",
    criteria,
    livePromotionAllowed: false,
    note:
      "Strategy Lab certification never unlocks Live Trading. GO_LIVE remains NOT_READY_FOR_LIVE until platform decision changes.",
  };
}
