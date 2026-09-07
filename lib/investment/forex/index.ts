/**
 * Client-safe FOREX barrel (config + indicators only).
 * Never re-export macro-calendar / runtime (server-only).
 */

export {
  FOREX_PAIRS,
  FOREX_PAIR_IDS,
  FOREX_MIN_UNITS,
  FOREX_MAX_UNITS,
  clampForexUnits,
  FOREX_RISK_POLICY,
  FOREX_CORRELATIONS,
  FOREX_INDICATORS,
  FOREX_AI_PROMPT_HINT,
  loadForexEnvConfig,
  getForexPair,
  pipSize,
  priceToPips,
  pipsToPriceOffset,
  pipValueQuoteCurrency,
  buildSlTpFromPips,
  positionUnitsForRisk,
  getForexSessionSnapshot,
  spreadPips,
  isSpreadAcceptable,
} from "./config";

export type {
  ForexPairId,
  ForexIbkrContract,
  ForexEnvConfig,
  ForexSlTpLevels,
  ForexMadridSession,
  ForexSessionSnapshot,
  ForexCorrelationHint,
} from "./config";

export {
  computeForexIndicators,
  computeRsi,
  computeMacd,
  computeBollinger,
  computeAtr,
  inferForexSignal,
} from "./indicators";

export type { ForexBar, ForexIndicators, ForexSignalSide } from "./indicators";

export {
  FOREX_TIMEFRAMES,
  FOREX_TF_SPECS,
  parseForexTimeframe,
} from "./timeframes";
export type { ForexTimeframe, ForexTfSpec } from "./timeframes";

export { FOREX_STRATEGIES, isStrategyWindowActive } from "./strategies/defs";
export type { ForexStrategyId, ForexStrategyDef, ForexStrategyStyle } from "./strategies/defs";
