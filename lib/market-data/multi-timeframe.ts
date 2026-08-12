import "server-only";

import { cacheKey, getCached, setCached } from "@/lib/market-data/cache";
import { computeTechnicalIndicators } from "@/lib/market-data/technical-indicators";
import type { OhlcvBar } from "@/lib/market-data/types";
import { getChartBars, type YahooChartInterval } from "@/lib/market-data/yahoo-finance";

export type TimeframeId = "5m" | "1h" | "1d" | "1wk";
export type TfDirection = "BULLISH" | "BEARISH" | "NEUTRAL" | "NO_DATA";

export type TimeframeAnalysis = {
  readonly timeframe: TimeframeId;
  readonly label: string;
  readonly horizon: string;
  readonly direction: TfDirection;
  readonly trend: "UP" | "DOWN" | "FLAT" | "NO_DATA";
  readonly rsi: number | null;
  readonly rsiZone: string;
  readonly atr: number | null;
  readonly ema20: number | null;
  readonly ema50: number | null;
  readonly barCount: number;
};

export type TimeframeLevels = {
  readonly entry: number;
  readonly stopLoss: number;
  readonly takeProfit: number;
  readonly atrMultSl: number;
  readonly atrMultTp: number;
};

export type MultiTimeframeResult = {
  readonly ticker: string;
  readonly timeframes: Record<TimeframeId, TimeframeAnalysis>;
  readonly availableCount: number;
  readonly agreeingCount: number;
  /** Badge text e.g. "Confluencia 3/4 TF" */
  readonly confluenceLabel: string;
  readonly confluenceRatio: string;
  readonly majorityDirection: TfDirection;
  /** ≥3 TFs agree on BULLISH or BEARISH */
  readonly highConfidence: boolean;
  /** Only one TF has a clear directional bias */
  readonly weakSignal: boolean;
  /** Weak signal → do not open new trades */
  readonly doNotTrade: boolean;
  /** Multiplier applied to opportunity score (1.2 / 1.0 / 0.8) */
  readonly scoreMultiplier: number;
  readonly primaryTimeframe: TimeframeId;
  readonly higherTfConfirmation: boolean;
  readonly levels: TimeframeLevels | null;
  readonly formattedBlock: string;
  readonly computedAt: string;
};

const MTF_CACHE_TTL_MS = 5 * 60 * 1000;
const MIN_BARS = 15;

const TF_META: Record<
  TimeframeId,
  {
    label: string;
    horizon: string;
    yahooInterval: YahooChartInterval;
    yahooRange: string;
    atrSl: number;
    atrTp: number;
  }
> = {
  "5m": {
    label: "intraday (scalping)",
    horizon: "intraday",
    yahooInterval: "5m",
    yahooRange: "5d",
    atrSl: 1.0,
    atrTp: 1.5,
  },
  "1h": {
    label: "short swing (1–3 days)",
    horizon: "1–3 days",
    yahooInterval: "60m",
    yahooRange: "1mo",
    atrSl: 1.2,
    atrTp: 2.5,
  },
  "1d": {
    label: "medium swing (1–2 weeks)",
    horizon: "1–2 weeks",
    yahooInterval: "1d",
    yahooRange: "6mo",
    atrSl: 1.5,
    atrTp: 3.0,
  },
  "1wk": {
    label: "long-term (>1 month)",
    horizon: ">1 month",
    yahooInterval: "1wk",
    yahooRange: "2y",
    atrSl: 2.0,
    atrTp: 4.0,
  },
};

const TF_ORDER: readonly TimeframeId[] = ["5m", "1h", "1d", "1wk"];

function emptyTf(tf: TimeframeId): TimeframeAnalysis {
  return {
    timeframe: tf,
    label: TF_META[tf].label,
    horizon: TF_META[tf].horizon,
    direction: "NO_DATA",
    trend: "NO_DATA",
    rsi: null,
    rsiZone: "NO_DATA",
    atr: null,
    ema20: null,
    ema50: null,
    barCount: 0,
  };
}

function classifyDirection(bars: readonly OhlcvBar[]): TimeframeAnalysis["direction"] {
  if (bars.length < MIN_BARS) return "NO_DATA";
  const tech = computeTechnicalIndicators(bars);
  const { ema20, ema50, macd } = tech.trend;
  const rsiVal = tech.momentum.rsi;

  let score = 0;
  if (ema20 != null && ema50 != null) {
    score += ema20 > ema50 ? 1 : -1;
  }
  if (macd != null) {
    score += macd.histogram > 0 ? 1 : -1;
  }
  if (rsiVal != null) {
    if (rsiVal > 55) score += 1;
    else if (rsiVal < 45) score -= 1;
  }

  if (score >= 2) return "BULLISH";
  if (score <= -2) return "BEARISH";
  return "NEUTRAL";
}

function classifyTrend(bars: readonly OhlcvBar[]): TimeframeAnalysis["trend"] {
  if (bars.length < MIN_BARS) return "NO_DATA";
  const tech = computeTechnicalIndicators(bars);
  const { ema20, ema50 } = tech.trend;
  if (ema20 == null || ema50 == null) return "FLAT";
  const diff = (ema20 - ema50) / ema50;
  if (diff > 0.002) return "UP";
  if (diff < -0.002) return "DOWN";
  return "FLAT";
}

function analyzeBars(tf: TimeframeId, bars: readonly OhlcvBar[]): TimeframeAnalysis {
  if (bars.length < MIN_BARS) return emptyTf(tf);
  const tech = computeTechnicalIndicators(bars);
  return {
    timeframe: tf,
    label: TF_META[tf].label,
    horizon: TF_META[tf].horizon,
    direction: classifyDirection(bars),
    trend: classifyTrend(bars),
    rsi: tech.momentum.rsi,
    rsiZone: tech.momentum.rsiZone,
    atr: tech.volatility.atr,
    ema20: tech.trend.ema20,
    ema50: tech.trend.ema50,
    barCount: bars.length,
  };
}

function majorityDirection(analyses: readonly TimeframeAnalysis[]): TfDirection {
  let bull = 0;
  let bear = 0;
  for (const a of analyses) {
    if (a.direction === "BULLISH") bull += 1;
    else if (a.direction === "BEARISH") bear += 1;
  }
  if (bull === 0 && bear === 0) return "NEUTRAL";
  if (bull === bear) return "NEUTRAL";
  return bull > bear ? "BULLISH" : "BEARISH";
}

function pickPrimary(
  analyses: Record<TimeframeId, TimeframeAnalysis>,
  majority: TfDirection,
): TimeframeId {
  if (majority === "BULLISH" || majority === "BEARISH") {
    for (const tf of TF_ORDER) {
      if (analyses[tf].direction === majority) return tf;
    }
  }
  if (analyses["1d"].direction !== "NO_DATA") return "1d";
  for (const tf of [...TF_ORDER].reverse()) {
    if (analyses[tf].direction !== "NO_DATA") return tf;
  }
  return "1d";
}

function higherTfConfirmed(
  primary: TimeframeId,
  analyses: Record<TimeframeId, TimeframeAnalysis>,
  majority: TfDirection,
): boolean {
  if (majority !== "BULLISH" && majority !== "BEARISH") return false;
  const idx = TF_ORDER.indexOf(primary);
  const higher = TF_ORDER.slice(idx + 1);
  if (higher.length === 0) return true;
  return higher.some((tf) => analyses[tf].direction === majority);
}

function buildLevels(
  price: number,
  primary: TimeframeId,
  analyses: Record<TimeframeId, TimeframeAnalysis>,
  majority: TfDirection,
): TimeframeLevels | null {
  if (!(price > 0)) return null;
  const meta = TF_META[primary];
  const atr =
    analyses[primary].atr && analyses[primary].atr! > 0
      ? analyses[primary].atr!
      : analyses["1d"].atr && analyses["1d"].atr! > 0
        ? analyses["1d"].atr!
        : price * 0.02;

  const bullish = majority !== "BEARISH";
  const sl = bullish ? price - atr * meta.atrSl : price + atr * meta.atrSl;
  const tp = bullish ? price + atr * meta.atrTp : price - atr * meta.atrTp;

  return {
    entry: Number(price.toFixed(2)),
    stopLoss: Number(sl.toFixed(2)),
    takeProfit: Number(tp.toFixed(2)),
    atrMultSl: meta.atrSl,
    atrMultTp: meta.atrTp,
  };
}

function formatBlock(result: Omit<MultiTimeframeResult, "formattedBlock">): string {
  const lines = TF_ORDER.map((tf) => {
    const a = result.timeframes[tf];
    if (a.direction === "NO_DATA") return `- ${tf} (${a.label}): NO_DATA`;
    return `- ${tf} (${a.label}): ${a.direction} trend=${a.trend} RSI=${a.rsi?.toFixed(1) ?? "N/A"} (${a.rsiZone})`;
  });
  const levels = result.levels
    ? `Entry $${result.levels.entry} · SL $${result.levels.stopLoss} · TP $${result.levels.takeProfit} (ATR×${result.levels.atrMultSl}/${result.levels.atrMultTp} @ ${result.primaryTimeframe})`
    : "niveles N/A";
  return `MULTI-TIMEFRAME (${result.confluenceLabel}):
${lines.join("\n")}
- Mayoría: ${result.majorityDirection} | Primario: ${result.primaryTimeframe} | Confirmación TF superiores: ${result.higherTfConfirmation ? "SÍ" : "NO"}
- Señal débil (1 TF): ${result.weakSignal ? "SÍ — NO OPERAR" : "no"} | Alta confianza (3+/4): ${result.highConfidence ? "SÍ (+20% score)" : "no"}
- Niveles adaptados: ${levels}`;
}

/**
 * Analyze ticker on 5m / 1h / 1d / 1wk. Cached ~5 minutes.
 * Degrades gracefully when intraday bars are unavailable (marks NO_DATA).
 */
export async function analyzeTimeframes(ticker: string): Promise<MultiTimeframeResult> {
  const symbol = ticker.trim().toUpperCase();
  const cacheId = cacheKey("mtf", symbol);
  const cached = getCached<MultiTimeframeResult>(cacheId);
  if (cached) return cached;

  const barResults = await Promise.all(
    TF_ORDER.map(async (tf) => {
      const meta = TF_META[tf];
      try {
        const bars = await getChartBars(symbol, meta.yahooInterval, meta.yahooRange);
        return { tf, bars };
      } catch {
        return { tf, bars: [] as OhlcvBar[] };
      }
    }),
  );

  const timeframes = {} as Record<TimeframeId, TimeframeAnalysis>;
  for (const { tf, bars } of barResults) {
    timeframes[tf] = analyzeBars(tf, bars);
  }

  const available = TF_ORDER.map((tf) => timeframes[tf]).filter((a) => a.direction !== "NO_DATA");
  const availableCount = available.length;
  const majority = majorityDirection(available);
  const agreeingCount =
    majority === "BULLISH" || majority === "BEARISH"
      ? available.filter((a) => a.direction === majority).length
      : 0;

  const directionalCount = available.filter(
    (a) => a.direction === "BULLISH" || a.direction === "BEARISH",
  ).length;
  const highConfidence = agreeingCount >= 3;
  const weakSignal = directionalCount <= 1;
  const doNotTrade = weakSignal;
  const scoreMultiplier = highConfidence ? 1.2 : weakSignal ? 0.8 : 1.0;

  const primaryTimeframe = pickPrimary(timeframes, majority);
  const higherTfConfirmation = higherTfConfirmed(primaryTimeframe, timeframes, majority);

  const lastClose =
    barResults.find((b) => b.tf === primaryTimeframe)?.bars.at(-1)?.close ??
    barResults.find((b) => b.tf === "1d")?.bars.at(-1)?.close ??
    barResults.flatMap((b) => b.bars).at(-1)?.close ??
    0;

  const levels = buildLevels(lastClose, primaryTimeframe, timeframes, majority);
  const confluenceRatio = `${agreeingCount}/4`;
  const confluenceLabel = `Confluencia ${confluenceRatio} TF`;

  const partial = {
    ticker: symbol,
    timeframes,
    availableCount,
    agreeingCount,
    confluenceLabel,
    confluenceRatio,
    majorityDirection: majority,
    highConfidence,
    weakSignal,
    doNotTrade,
    scoreMultiplier,
    primaryTimeframe,
    higherTfConfirmation,
    levels,
    computedAt: new Date().toISOString(),
  };

  const result: MultiTimeframeResult = {
    ...partial,
    formattedBlock: formatBlock(partial),
  };

  setCached(cacheId, result, MTF_CACHE_TTL_MS);
  return result;
}

/** Apply confluence multiplier; clamp 0–100. Weak MTF does not invent trades. */
export function applyConfluenceToScore(score: number, mtf: MultiTimeframeResult | null | undefined): number {
  if (!mtf) return Math.max(0, Math.min(100, Math.round(score)));
  return Math.max(0, Math.min(100, Math.round(score * mtf.scoreMultiplier)));
}

export type AnalysisMultiTimeframeContext = {
  confluenceLabel: string;
  confluenceRatio: string;
  agreeingCount: number;
  availableCount: number;
  majorityDirection: TfDirection;
  highConfidence: boolean;
  weakSignal: boolean;
  doNotTrade: boolean;
  scoreMultiplier: number;
  primaryTimeframe: TimeframeId;
  higherTfConfirmation: boolean;
  levels: TimeframeLevels | null;
  timeframes: Record<
    TimeframeId,
    {
      direction: TfDirection;
      trend: TimeframeAnalysis["trend"];
      rsi: number | null;
      rsiZone: string;
      label: string;
    }
  >;
  formattedBlock: string;
};

/** Agent-facing slim context for MarketContext.multiTimeframe */
export function mtfToAgentContext(mtf: MultiTimeframeResult): AnalysisMultiTimeframeContext {
  const timeframes = {} as AnalysisMultiTimeframeContext["timeframes"];
  for (const tf of TF_ORDER) {
    const a = mtf.timeframes[tf];
    timeframes[tf] = {
      direction: a.direction,
      trend: a.trend,
      rsi: a.rsi,
      rsiZone: a.rsiZone,
      label: a.label,
    };
  }
  return {
    confluenceLabel: mtf.confluenceLabel,
    confluenceRatio: mtf.confluenceRatio,
    agreeingCount: mtf.agreeingCount,
    availableCount: mtf.availableCount,
    majorityDirection: mtf.majorityDirection,
    highConfidence: mtf.highConfidence,
    weakSignal: mtf.weakSignal,
    doNotTrade: mtf.doNotTrade,
    scoreMultiplier: mtf.scoreMultiplier,
    primaryTimeframe: mtf.primaryTimeframe,
    higherTfConfirmation: mtf.higherTfConfirmation,
    levels: mtf.levels,
    timeframes,
    formattedBlock: mtf.formattedBlock,
  };
}