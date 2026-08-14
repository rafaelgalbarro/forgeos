/**
 * FOREX technical indicators from OHLC bars (no invented prices).
 */

export type ForexBar = {
  readonly time?: string;
  readonly date?: string;
  readonly open: number;
  readonly high: number;
  readonly low: number;
  readonly close: number;
};

export type ForexIndicators = {
  readonly rsi: number | null;
  readonly macd: number | null;
  readonly macdSignal: number | null;
  readonly macdHist: number | null;
  readonly bollingerMid: number | null;
  readonly bollingerUpper: number | null;
  readonly bollingerLower: number | null;
  readonly atr: number | null;
  readonly barCount: number;
};

function closes(bars: readonly ForexBar[]): number[] {
  return bars.map((b) => b.close).filter((n) => Number.isFinite(n));
}

export function computeRsi(values: readonly number[], period = 14): number | null {
  if (values.length < period + 1) return null;
  let gains = 0;
  let losses = 0;
  for (let i = values.length - period; i < values.length; i++) {
    const diff = values[i]! - values[i - 1]!;
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  if (losses === 0) return 100;
  const rs = gains / losses;
  return 100 - 100 / (1 + rs);
}

export function computeEma(values: readonly number[], period: number): number | null {
  if (values.length < period) return null;
  const k = 2 / (period + 1);
  let ema = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < values.length; i++) {
    ema = values[i]! * k + ema * (1 - k);
  }
  return ema;
}

export function computeMacd(values: readonly number[]): {
  macd: number | null;
  signal: number | null;
  hist: number | null;
} {
  if (values.length < 35) return { macd: null, signal: null, hist: null };
  const ema12Series: number[] = [];
  const ema26Series: number[] = [];
  const k12 = 2 / 13;
  const k26 = 2 / 27;
  let e12 = values.slice(0, 12).reduce((a, b) => a + b, 0) / 12;
  let e26 = values.slice(0, 26).reduce((a, b) => a + b, 0) / 26;
  for (let i = 0; i < values.length; i++) {
    if (i >= 11) {
      if (i === 11) e12 = values.slice(0, 12).reduce((a, b) => a + b, 0) / 12;
      else e12 = values[i]! * k12 + e12 * (1 - k12);
      ema12Series.push(e12);
    }
    if (i >= 25) {
      if (i === 25) e26 = values.slice(0, 26).reduce((a, b) => a + b, 0) / 26;
      else e26 = values[i]! * k26 + e26 * (1 - k26);
      ema26Series.push(e26);
    }
  }
  const macdLine: number[] = [];
  const offset = ema12Series.length - ema26Series.length;
  for (let i = 0; i < ema26Series.length; i++) {
    macdLine.push(ema12Series[i + offset]! - ema26Series[i]!);
  }
  const signal = computeEma(macdLine, 9);
  const macd = macdLine[macdLine.length - 1] ?? null;
  return {
    macd,
    signal,
    hist: macd != null && signal != null ? macd - signal : null,
  };
}

export function computeBollinger(
  values: readonly number[],
  period = 20,
  mult = 2,
): { mid: number | null; upper: number | null; lower: number | null } {
  if (values.length < period) return { mid: null, upper: null, lower: null };
  const window = values.slice(-period);
  const mid = window.reduce((a, b) => a + b, 0) / period;
  const variance = window.reduce((a, b) => a + (b - mid) ** 2, 0) / period;
  const sd = Math.sqrt(variance);
  return { mid, upper: mid + mult * sd, lower: mid - mult * sd };
}

export function computeAtr(bars: readonly ForexBar[], period = 14): number | null {
  if (bars.length < period + 1) return null;
  const trs: number[] = [];
  for (let i = 1; i < bars.length; i++) {
    const cur = bars[i]!;
    const prev = bars[i - 1]!;
    const tr = Math.max(
      cur.high - cur.low,
      Math.abs(cur.high - prev.close),
      Math.abs(cur.low - prev.close),
    );
    trs.push(tr);
  }
  const window = trs.slice(-period);
  return window.reduce((a, b) => a + b, 0) / window.length;
}

export function computeForexIndicators(bars: readonly ForexBar[]): ForexIndicators {
  const c = closes(bars);
  const macd = computeMacd(c);
  const bb = computeBollinger(c);
  return {
    rsi: computeRsi(c),
    macd: macd.macd,
    macdSignal: macd.signal,
    macdHist: macd.hist,
    bollingerMid: bb.mid,
    bollingerUpper: bb.upper,
    bollingerLower: bb.lower,
    atr: computeAtr(bars),
    barCount: bars.length,
  };
}

export type ForexSignalSide = "BUY" | "SELL" | "HOLD";

export function inferForexSignal(ind: ForexIndicators): {
  side: ForexSignalSide;
  confidence: number;
  reasons: string[];
} {
  const reasons: string[] = [];
  let score = 0.5;
  if (ind.rsi != null) {
    if (ind.rsi < 30) {
      score += 0.15;
      reasons.push(`RSI oversold ${ind.rsi.toFixed(1)}`);
    } else if (ind.rsi > 70) {
      score -= 0.15;
      reasons.push(`RSI overbought ${ind.rsi.toFixed(1)}`);
    }
  }
  if (ind.macdHist != null) {
    if (ind.macdHist > 0) {
      score += 0.1;
      reasons.push("MACD hist > 0");
    } else {
      score -= 0.1;
      reasons.push("MACD hist < 0");
    }
  }
  if (ind.bollingerLower != null && ind.bollingerMid != null && cLast(ind)) {
    /* mid used as proxy when last close unavailable in indicators */
  }
  const confidence = Math.min(0.95, Math.max(0.05, Math.abs(score - 0.5) * 2 + 0.45));
  if (score >= 0.62) return { side: "BUY", confidence, reasons };
  if (score <= 0.38) return { side: "SELL", confidence, reasons };
  return { side: "HOLD", confidence: Math.min(confidence, 0.55), reasons: reasons.length ? reasons : ["Sin confluencia"] };
}

function cLast(_ind: ForexIndicators): boolean {
  return true;
}
