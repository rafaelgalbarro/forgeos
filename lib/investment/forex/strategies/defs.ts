/**
 * FOREX strategy catalog — scalping (A–C) + intradía (D–F).
 */

export type ForexStrategyId =
  | "EMA_CROSS_SCALP"
  | "BB_BOUNCE_SCALP"
  | "MOMENTUM_BREAKOUT_SCALP"
  | "LONDON_NY_OVERLAP"
  | "SR_BOUNCE"
  | "MACD_DIVERGENCE";

export type ForexStrategyStyle = "SCALPING" | "INTRADAY";

export type ForexStrategyDef = {
  readonly id: ForexStrategyId;
  readonly code: "A" | "B" | "C" | "D" | "E" | "F";
  readonly name: string;
  readonly style: ForexStrategyStyle;
  readonly timeframe: "1m" | "5m" | "15m" | "1h" | "4h";
  readonly stopPips: number;
  readonly tpPips: number;
  readonly maxSpreadPips: number;
  readonly priorityPairs: readonly string[];
  readonly estimatedMinutes: number;
};

export const FOREX_STRATEGIES: readonly ForexStrategyDef[] = [
  {
    id: "EMA_CROSS_SCALP",
    code: "A",
    name: "EMA Crossover Scalping",
    style: "SCALPING",
    timeframe: "5m",
    stopPips: 5,
    tpPips: 10,
    maxSpreadPips: 2,
    priorityPairs: ["EURUSD", "GBPUSD"],
    estimatedMinutes: 15,
  },
  {
    id: "BB_BOUNCE_SCALP",
    code: "B",
    name: "Bollinger Bands Bounce",
    style: "SCALPING",
    timeframe: "5m",
    stopPips: 8,
    tpPips: 15,
    maxSpreadPips: 2,
    priorityPairs: ["EURUSD", "GBPUSD"],
    estimatedMinutes: 20,
  },
  {
    id: "MOMENTUM_BREAKOUT_SCALP",
    code: "C",
    name: "Momentum Breakout",
    style: "SCALPING",
    timeframe: "5m",
    stopPips: 10,
    tpPips: 20,
    maxSpreadPips: 2.5,
    priorityPairs: ["EURUSD", "GBPUSD", "USDJPY"],
    estimatedMinutes: 25,
  },
  {
    id: "LONDON_NY_OVERLAP",
    code: "D",
    name: "London/NY Overlap",
    style: "INTRADAY",
    timeframe: "15m",
    stopPips: 20,
    tpPips: 40,
    maxSpreadPips: 3,
    priorityPairs: ["EURUSD", "GBPUSD", "USDJPY", "EURGBP"],
    estimatedMinutes: 120,
  },
  {
    id: "SR_BOUNCE",
    code: "E",
    name: "Support/Resistance Bounce",
    style: "INTRADAY",
    timeframe: "1h",
    stopPips: 15,
    tpPips: 30,
    maxSpreadPips: 3,
    priorityPairs: ["EURUSD", "GBPUSD", "USDJPY", "EURGBP"],
    estimatedMinutes: 180,
  },
  {
    id: "MACD_DIVERGENCE",
    code: "F",
    name: "MACD Divergence",
    style: "INTRADAY",
    timeframe: "1h",
    stopPips: 20,
    tpPips: 50,
    maxSpreadPips: 3,
    priorityPairs: ["EURUSD", "GBPUSD", "USDJPY", "EURGBP"],
    estimatedMinutes: 240,
  },
] as const;

export function getStrategyDef(id: ForexStrategyId): ForexStrategyDef {
  return FOREX_STRATEGIES.find((s) => s.id === id)!;
}

/** Scalping windows Madrid: 08:00–10:30 & 15:30–18:00. Intraday: 08:00–22:00. */
export function isStrategyWindowActive(
  style: ForexStrategyStyle,
  madridMinutes: number,
  weekend: boolean,
): boolean {
  if (weekend) return false;
  if (style === "SCALPING") {
    return (
      (madridMinutes >= 8 * 60 && madridMinutes < 10 * 60 + 30) ||
      (madridMinutes >= 15 * 60 + 30 && madridMinutes < 18 * 60)
    );
  }
  return madridMinutes >= 8 * 60 && madridMinutes < 22 * 60;
}
