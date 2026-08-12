/**
 * Initial real limits for AUTONOMOUS_LIVE.
 * Limits may only auto-tighten, never widen.
 */

import type { AutonomousLiveLimits } from "./domain";

export const INITIAL_AUTONOMOUS_LIVE_LIMITS: AutonomousLiveLimits = {
  maxOrderNotionalEur: 50,
  maxNewExposureDailyEur: 100,
  maxRiskPerTradePct: 0.1,
  maxDailyLossPct: 0.25,
  maxWeeklyLossPct: 0.75,
  maxOpenPositions: 2,
  maxTradesPerDay: 3,
  maxConsecutiveLosses: 2,
  allowShort: false,
  allowMargin: false,
  allowOptions: false,
  allowFutures: false,
  allowForex: false,
  allowCrypto: false,
  allowOutsideRth: false,
  limitOrdersOnly: true,
  stopLossRequired: true,
  liveDataRequired: true,
  maxQuoteAgeMs: 3_000,
  maxSpreadBps: 25,
  minVolume: 10_000,
  minRewardRisk: 1.5,
  minConsensus: 0.6,
  minConfidence: 0.55,
};

function envNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw == null || raw === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function envBoolFalse(name: string): boolean {
  return process.env[name] === "true";
}

/**
 * Load limits from env, clamping any configured value to never exceed the initial ceiling
 * (auto-tighten only — never widen past INITIAL_AUTONOMOUS_LIVE_LIMITS).
 */
export function loadAutonomousLiveLimits(
  overrides?: Partial<AutonomousLiveLimits>,
): AutonomousLiveLimits {
  const base = INITIAL_AUTONOMOUS_LIVE_LIMITS;
  const fromEnv: AutonomousLiveLimits = {
    maxOrderNotionalEur: envNumber("MAX_ORDER_NOTIONAL_EUR", base.maxOrderNotionalEur),
    maxNewExposureDailyEur: envNumber("MAX_NEW_EXPOSURE_DAILY_EUR", base.maxNewExposureDailyEur),
    maxRiskPerTradePct: envNumber("MAX_RISK_PER_TRADE_PCT", base.maxRiskPerTradePct),
    maxDailyLossPct: envNumber("MAX_DAILY_LOSS_PCT", base.maxDailyLossPct),
    maxWeeklyLossPct: envNumber("MAX_WEEKLY_LOSS_PCT", base.maxWeeklyLossPct),
    maxOpenPositions: envNumber("MAX_OPEN_POSITIONS", base.maxOpenPositions),
    maxTradesPerDay: envNumber("MAX_TRADES_PER_DAY", base.maxTradesPerDay),
    maxConsecutiveLosses: envNumber("MAX_CONSECUTIVE_LOSSES", base.maxConsecutiveLosses),
    allowShort: envBoolFalse("ALLOW_SHORT"),
    allowMargin: envBoolFalse("ALLOW_MARGIN"),
    allowOptions: envBoolFalse("ALLOW_OPTIONS"),
    allowFutures: envBoolFalse("ALLOW_FUTURES"),
    allowForex: envBoolFalse("ALLOW_FOREX"),
    allowCrypto: envBoolFalse("ALLOW_CRYPTO"),
    allowOutsideRth: envBoolFalse("ALLOW_OUTSIDE_RTH"),
    limitOrdersOnly: process.env.LIMIT_ORDERS_ONLY !== "false",
    stopLossRequired: process.env.STOP_LOSS_REQUIRED !== "false",
    liveDataRequired: process.env.LIVE_DATA_REQUIRED !== "false",
    maxQuoteAgeMs: envNumber("MAX_QUOTE_AGE_MS", base.maxQuoteAgeMs),
    maxSpreadBps: envNumber("MAX_SPREAD_BPS", base.maxSpreadBps),
    minVolume: envNumber("MIN_VOLUME", base.minVolume),
    minRewardRisk: envNumber("MIN_REWARD_RISK", base.minRewardRisk),
    minConsensus: envNumber("MIN_ENSEMBLE_CONSENSUS", base.minConsensus),
    minConfidence: envNumber("MIN_ENSEMBLE_CONFIDENCE", base.minConfidence),
  };

  const merged = { ...fromEnv, ...overrides };
  return tightenLimits(base, merged);
}

/** Numeric/boolean ceilings: never allow a wider (riskier) limit than the floor. */
export function tightenLimits(
  floor: AutonomousLiveLimits,
  proposed: AutonomousLiveLimits,
): AutonomousLiveLimits {
  return {
    maxOrderNotionalEur: Math.min(floor.maxOrderNotionalEur, proposed.maxOrderNotionalEur),
    maxNewExposureDailyEur: Math.min(floor.maxNewExposureDailyEur, proposed.maxNewExposureDailyEur),
    maxRiskPerTradePct: Math.min(floor.maxRiskPerTradePct, proposed.maxRiskPerTradePct),
    maxDailyLossPct: Math.min(floor.maxDailyLossPct, proposed.maxDailyLossPct),
    maxWeeklyLossPct: Math.min(floor.maxWeeklyLossPct, proposed.maxWeeklyLossPct),
    maxOpenPositions: Math.min(floor.maxOpenPositions, proposed.maxOpenPositions),
    maxTradesPerDay: Math.min(floor.maxTradesPerDay, proposed.maxTradesPerDay),
    maxConsecutiveLosses: Math.min(floor.maxConsecutiveLosses, proposed.maxConsecutiveLosses),
    allowShort: floor.allowShort && proposed.allowShort,
    allowMargin: floor.allowMargin && proposed.allowMargin,
    allowOptions: floor.allowOptions && proposed.allowOptions,
    allowFutures: floor.allowFutures && proposed.allowFutures,
    allowForex: floor.allowForex && proposed.allowForex,
    allowCrypto: floor.allowCrypto && proposed.allowCrypto,
    allowOutsideRth: floor.allowOutsideRth && proposed.allowOutsideRth,
    limitOrdersOnly: floor.limitOrdersOnly || proposed.limitOrdersOnly,
    stopLossRequired: floor.stopLossRequired || proposed.stopLossRequired,
    liveDataRequired: floor.liveDataRequired || proposed.liveDataRequired,
    maxQuoteAgeMs: Math.min(floor.maxQuoteAgeMs, proposed.maxQuoteAgeMs),
    maxSpreadBps: Math.min(floor.maxSpreadBps, proposed.maxSpreadBps),
    minVolume: Math.max(floor.minVolume, proposed.minVolume),
    minRewardRisk: Math.max(floor.minRewardRisk, proposed.minRewardRisk),
    minConsensus: Math.max(floor.minConsensus, proposed.minConsensus),
    minConfidence: Math.max(floor.minConfidence, proposed.minConfidence),
  };
}

/**
 * Apply a runtime tighten (e.g. after consecutive losses). Rejects any widen attempt.
 */
export function applyAutoTighten(
  current: AutonomousLiveLimits,
  patch: Partial<AutonomousLiveLimits>,
): AutonomousLiveLimits {
  const next = { ...current, ...patch };
  return tightenLimits(current, next);
}

export function assertLimitsNotWidened(
  before: AutonomousLiveLimits,
  after: AutonomousLiveLimits,
): void {
  const tightened = tightenLimits(before, after);
  const keys = Object.keys(before) as (keyof AutonomousLiveLimits)[];
  for (const key of keys) {
    if (tightened[key] !== after[key]) {
      throw new Error(`Limits may only auto-tighten, never widen: ${String(key)}`);
    }
  }
}
