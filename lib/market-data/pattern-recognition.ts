import type {
  CandlestickPattern,
  DivergencePattern,
  OhlcvBar,
  PatternSnapshot,
  PricePattern,
  SpecialSignal,
  TechnicalSnapshot,
} from "@/lib/market-data/types";
import {
  atr,
  closes,
  ema,
  emaSeries,
  last,
  macd,
  relativeVolume,
  rsi,
  rsiSeries,
} from "@/lib/market-data/technical-indicators";

function body(b: OhlcvBar): number {
  return Math.abs(b.close - b.open);
}

function range(b: OhlcvBar): number {
  return b.high - b.low || 0.0001;
}

function isBullish(b: OhlcvBar): boolean {
  return b.close >= b.open;
}

function detectCandlesticks(bars: readonly OhlcvBar[]): CandlestickPattern[] {
  if (bars.length < 3) return [];
  const out: CandlestickPattern[] = [];
  const a = bars.at(-3)!;
  const b = bars.at(-2)!;
  const c = bars.at(-1)!;

  const dojiThreshold = range(c) * 0.1;
  if (body(c) <= dojiThreshold) {
    out.push({ name: "Doji", type: "NEUTRAL", confidence: 72 });
  }

  const lowerWick = Math.min(c.open, c.close) - c.low;
  const upperWick = c.high - Math.max(c.open, c.close);
  if (lowerWick > body(c) * 2 && upperWick < body(c) * 0.5) {
    out.push({
      name: isBullish(c) ? "Hammer" : "Hanging Man",
      type: isBullish(c) ? "BULLISH" : "BEARISH",
      confidence: 78,
    });
  }
  if (upperWick > body(c) * 2 && lowerWick < body(c) * 0.5) {
    out.push({
      name: isBullish(c) ? "Inverted Hammer" : "Shooting Star",
      type: isBullish(c) ? "BULLISH" : "BEARISH",
      confidence: 76,
    });
  }

  if (!isBullish(b) && isBullish(c) && c.open <= b.close && c.close >= b.open) {
    out.push({ name: "Bullish Engulfing", type: "BULLISH", confidence: 82 });
  }
  if (isBullish(b) && !isBullish(c) && c.open >= b.close && c.close <= b.open) {
    out.push({ name: "Bearish Engulfing", type: "BEARISH", confidence: 82 });
  }

  if (!isBullish(a) && body(b) < range(b) * 0.3 && isBullish(c) && c.close > (a.open + a.close) / 2) {
    out.push({ name: "Morning Star", type: "BULLISH", confidence: 85 });
  }
  if (isBullish(a) && body(b) < range(b) * 0.3 && !isBullish(c) && c.close < (a.open + a.close) / 2) {
    out.push({ name: "Evening Star", type: "BEARISH", confidence: 85 });
  }

  const last3 = bars.slice(-3);
  if (last3.every(isBullish) && last3.every((bar, i, arr) => i === 0 || bar.close > arr[i - 1]!.close)) {
    out.push({ name: "Three White Soldiers", type: "BULLISH", confidence: 80 });
  }
  if (last3.every((bar) => !isBullish(bar)) && last3.every((bar, i, arr) => i === 0 || bar.close < arr[i - 1]!.close)) {
    out.push({ name: "Three Black Crows", type: "BEARISH", confidence: 80 });
  }

  if (body(b) > range(b) * 0.8 && body(c) < body(b) * 0.5 && c.high < b.high && c.low > b.low) {
    out.push({
      name: isBullish(b) ? "Bearish Harami" : "Bullish Harami",
      type: isBullish(b) ? "BEARISH" : "BULLISH",
      confidence: 74,
    });
  }

  if (body(c) > range(c) * 0.9) {
    out.push({
      name: "Marubozu",
      type: isBullish(c) ? "BULLISH" : "BEARISH",
      confidence: 70,
    });
  }

  return out;
}

function detectInverseHeadAndShoulders(bars: readonly OhlcvBar[]): PricePattern | null {
  if (bars.length < 25) return null;
  const lows = bars.map((b, i) => ({ i, v: b.low }));
  const troughs: { i: number; v: number }[] = [];
  for (let i = 2; i < lows.length - 2; i += 1) {
    const cur = lows[i]!;
    if (
      cur.v <= lows[i - 1]!.v &&
      cur.v <= lows[i - 2]!.v &&
      cur.v <= lows[i + 1]!.v &&
      cur.v <= lows[i + 2]!.v
    ) {
      troughs.push(cur);
    }
  }
  if (troughs.length < 3) return null;

  for (let t = 0; t <= troughs.length - 3; t += 1) {
    const left = troughs[t]!;
    const head = troughs[t + 1]!;
    const right = troughs[t + 2]!;
    const shoulderAvg = (left.v + right.v) / 2;
    if (head.v >= shoulderAvg * 0.995) continue;
    if (Math.abs(left.v - right.v) / shoulderAvg > 0.04) continue;

    const necklineSlice = bars.slice(left.i, right.i + 1);
    const neckline = Math.max(...necklineSlice.map((b) => b.high));
    const price = bars.at(-1)!.close;
    if (price <= neckline * 1.002) continue;

    const height = neckline - head.v;
    return {
      name: "Inverse Head and Shoulders",
      type: "BULLISH",
      confidence: 80,
      targetPrice: price + height,
    };
  }
  return null;
}

function detectPricePatterns(bars: readonly OhlcvBar[]): PricePattern[] {
  if (bars.length < 30) return [];
  const out: PricePattern[] = [];
  const slice = bars.slice(-40);
  const highs = slice.map((b) => b.high);
  const lows = slice.map((b) => b.low);
  const price = bars.at(-1)!.close;

  const maxH = Math.max(...highs);
  const minL = Math.min(...lows);
  const peaks = highs.filter((h) => h >= maxH * 0.995).length;
  const troughs = lows.filter((l) => l <= minL * 1.005).length;

  if (peaks >= 2) {
    out.push({
      name: "Double Top",
      type: "BEARISH",
      confidence: 76,
      targetPrice: price - (maxH - minL) * 0.5,
    });
  }
  if (troughs >= 2) {
    out.push({
      name: "Double Bottom",
      type: "BULLISH",
      confidence: 76,
      targetPrice: price + (maxH - minL) * 0.5,
    });
  }

  const firstHalf = slice.slice(0, 20);
  const secondHalf = slice.slice(20);
  const fhHigh = Math.max(...firstHalf.map((b) => b.high));
  const fhLow = Math.min(...firstHalf.map((b) => b.low));
  const shHigh = Math.max(...secondHalf.map((b) => b.high));
  const shLow = Math.min(...secondHalf.map((b) => b.low));

  if (shHigh < fhHigh * 0.998 && shLow > fhLow * 1.002) {
    out.push({ name: "Symmetrical Triangle", type: "NEUTRAL", confidence: 68, targetPrice: price });
  }
  if (shLow > fhLow * 1.005 && Math.abs(shHigh - fhHigh) / fhHigh < 0.01) {
    out.push({ name: "Ascending Triangle", type: "BULLISH", confidence: 72, targetPrice: fhHigh });
  }
  if (shHigh < fhHigh * 0.995 && Math.abs(shLow - fhLow) / fhLow < 0.01) {
    out.push({ name: "Descending Triangle", type: "BEARISH", confidence: 72, targetPrice: fhLow });
  }

  const ihs = detectInverseHeadAndShoulders(slice);
  if (ihs) out.push(ihs);

  const mid = slice.slice(10, 30);
  const flagMove = slice[0]!.close - slice[9]!.close;
  const flagRange = Math.max(...mid.map((b) => b.high)) - Math.min(...mid.map((b) => b.low));
  if (Math.abs(flagMove) / slice[0]!.close > 0.03 && flagRange / price < 0.02) {
    out.push({
      name: flagMove > 0 ? "Bull Flag" : "Bear Flag",
      type: flagMove > 0 ? "BULLISH" : "BEARISH",
      confidence: 70,
      targetPrice: price + flagMove,
    });
  }

  return out;
}

function detectDivergences(bars: readonly OhlcvBar[]): DivergencePattern[] {
  const out: DivergencePattern[] = [];
  const c = closes(bars);
  if (c.length < 30) return out;

  const priceSlice = c.slice(-10);
  const rsiVals = rsiSeries(c, 14).slice(-10);
  if (priceSlice.length >= 5 && rsiVals.length >= 5) {
    const priceDown = last(priceSlice)! < priceSlice[0]!;
    const rsiUp = last(rsiVals)! > rsiVals[0]!;
    const priceUp = last(priceSlice)! > priceSlice[0]!;
    const rsiDown = last(rsiVals)! < rsiVals[0]!;
    if (priceDown && rsiUp) out.push({ indicator: "RSI", type: "BULLISH", confidence: 78 });
    if (priceUp && rsiDown) out.push({ indicator: "RSI", type: "BEARISH", confidence: 78 });
  }

  const macdHist: number[] = [];
  for (let i = 20; i <= c.length; i += 1) {
    const m = macd(c.slice(0, i));
    if (m) macdHist.push(m.histogram);
  }
  if (macdHist.length >= 8) {
    const pSlice = c.slice(-8);
    const mSlice = macdHist.slice(-8);
    if (last(pSlice)! < pSlice[0]! && last(mSlice)! > mSlice[0]!) {
      out.push({ indicator: "MACD", type: "BULLISH", confidence: 75 });
    }
    if (last(pSlice)! > pSlice[0]! && last(mSlice)! < mSlice[0]!) {
      out.push({ indicator: "MACD", type: "BEARISH", confidence: 75 });
    }
  }

  const volSlice = bars.slice(-10);
  if (volSlice.length >= 5) {
    const priceUp = volSlice.at(-1)!.close > volSlice[0]!.close;
    const volDown = volSlice.at(-1)!.volume < volSlice[0]!.volume * 0.8;
    const priceDown = volSlice.at(-1)!.close < volSlice[0]!.close;
    const volUp = volSlice.at(-1)!.volume > volSlice[0]!.volume * 1.2;
    if (priceUp && volDown) out.push({ indicator: "Volume", type: "BEARISH", confidence: 70 });
    if (priceDown && volUp) out.push({ indicator: "Volume", type: "BULLISH", confidence: 70 });
  }

  return out;
}

function detectSpecialSignals(
  bars: readonly OhlcvBar[],
  technicals: TechnicalSnapshot,
): SpecialSignal[] {
  const out: SpecialSignal[] = [];
  if (bars.length < 3) return out;

  const prev = bars.at(-2)!;
  const cur = bars.at(-1)!;
  const gapPct = Math.abs(cur.open - prev.close) / prev.close;
  if (gapPct > 0.02) {
    out.push({
      name: "Opening Gap",
      description: `Gap de apertura ${(gapPct * 100).toFixed(1)}%`,
      strength: Math.min(100, 60 + gapPct * 400),
    });
  }

  if (technicals.volatility.squeeze?.active) {
    out.push({
      name: "Bollinger Squeeze",
      description: "Bollinger dentro de Keltner — explosión de volatilidad posible",
      strength: 82,
    });
  }

  const c = closes(bars);
  const e50 = emaSeries(c, 50);
  const e200 = emaSeries(c, 200);
  if (e50.length >= 3 && e200.length >= 3) {
    const s0 = e50.at(-3)! - e200.at(-3)!;
    const s1 = e50.at(-1)! - e200.at(-1)!;
    if (s0 <= 0 && s1 > 0) {
      out.push({ name: "Golden Cross", description: "EMA50 cruza EMA200 al alza", strength: 88 });
    }
    if (s0 >= 0 && s1 < 0) {
      out.push({ name: "Death Cross", description: "EMA50 cruza EMA200 a la baja", strength: 88 });
    }
  }

  const res = technicals.levels.resistance[0];
  const relVol = technicals.volume.relativeVolume;
  if (res != null && cur.close > res && relVol != null && relVol > 1.5) {
    out.push({
      name: "Breakout",
      description: `Ruptura de resistencia $${res.toFixed(2)} con volumen ${relVol.toFixed(1)}x`,
      strength: 85,
    });
  }

  return out;
}

/** Detects candlestick, price, divergence and special patterns. */
export function recognizePatterns(
  bars: readonly OhlcvBar[],
  technicals: TechnicalSnapshot,
): PatternSnapshot {
  const candlesticks = detectCandlesticks(bars);
  const price = detectPricePatterns(bars);
  const divergences = detectDivergences(bars);
  const signals = detectSpecialSignals(bars, technicals);

  console.log(
    `[PatternRecognition] ${candlesticks.length} candles, ${price.length} price, ${divergences.length} div, ${signals.length} signals`,
  );

  return { candlesticks, price, divergences, signals };
}

/** Convenience: high-confidence patterns only (>75%). */
export function highConfidencePatterns(snapshot: PatternSnapshot) {
  return {
    candlesticks: snapshot.candlesticks.filter((p) => p.confidence > 75),
    price: snapshot.price.filter((p) => p.confidence > 75),
    divergences: snapshot.divergences.filter((p) => p.confidence > 75),
    signals: snapshot.signals.filter((p) => p.strength > 75),
  };
}

export { rsi, atr, relativeVolume, ema };
