import type { ResearchEngine, ResearchEngineContext } from "./contract";
import { baseResult } from "./contract";

function closesFrom(ctx: ResearchEngineContext): number[] {
  const snap = ctx.mi?.marketSnapshots.find(
    (s) => s.symbol.toUpperCase() === ctx.symbol.toUpperCase(),
  );
  const points = snap?.timeSeries?.points ?? [];
  return points.map((p) => p.close).filter((c) => Number.isFinite(c));
}

function simpleRsi(closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null;
  let gains = 0;
  let losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const d = closes[i]! - closes[i - 1]!;
    if (d >= 0) gains += d;
    else losses -= d;
  }
  if (losses === 0) return 100;
  const rs = gains / losses;
  return 100 - 100 / (1 + rs);
}

/** Technical indicators from MI time series; NO_DATA when no bars. */
export const technicalEngine: ResearchEngine = {
  id: "technical",
  title: "Technical Engine",
  description: "Indicators derived from configured market history — NO_DATA when no bars.",
  resolveWiring(ctx) {
    if (ctx.marketProviders.length === 0) return "CONFIG_REQUIRED";
    return "LIVE";
  },
  run(ctx: ResearchEngineContext) {
    if (ctx.marketProviders.length === 0) {
      return baseResult(
        "technical",
        "Technical Engine",
        {
          status: "CONFIG_REQUIRED",
          summary: "No market providers for history bars.",
          lines: ["CONFIG_REQUIRED"],
          itemCount: 0,
          providers: [],
          evidence: [],
          signal: null,
        },
        ctx.generatedAt,
      );
    }

    const closes = closesFrom(ctx);
    if (closes.length < 2) {
      return baseResult(
        "technical",
        "Technical Engine",
        {
          status: "NO_DATA",
          summary: `No time-series bars for ${ctx.symbol}.`,
          lines: ["NO_DATA — no bars", "RSI / SMA: unavailable"],
          itemCount: 0,
          providers: ctx.marketProviders,
          evidence: [],
          signal: null,
        },
        ctx.generatedAt,
      );
    }

    const last = closes[closes.length - 1]!;
    const sma =
      closes.slice(-Math.min(20, closes.length)).reduce((a, b) => a + b, 0) /
      Math.min(20, closes.length);
    const rsi = simpleRsi(closes);
    const ret =
      closes.length >= 2
        ? ((last - closes[closes.length - 2]!) / closes[closes.length - 2]!) * 100
        : null;

    const lines = [
      `Bars: ${closes.length}`,
      `Last close: ${last.toFixed(4)}`,
      `SMA(${Math.min(20, closes.length)}): ${sma.toFixed(4)}`,
      rsi != null ? `RSI(14): ${rsi.toFixed(1)}` : "RSI(14): NO_DATA (need ≥15 bars)",
      ret != null ? `1-bar return: ${ret.toFixed(3)}%` : "1-bar return: NO_DATA",
    ];

    let signal: number | null = 50;
    if (rsi != null) {
      if (rsi < 30) signal = 70;
      else if (rsi > 70) signal = 35;
      else signal = 50 + (50 - Math.abs(rsi - 50)) * 0.4;
    }

    return baseResult(
      "technical",
      "Technical Engine",
      {
        status: "LIVE",
        summary: `Technical snapshot from ${closes.length} bar(s).`,
        lines,
        itemCount: closes.length,
        providers: ctx.marketProviders,
        evidence: [`bars:${closes.length}`, rsi != null ? `rsi:${rsi.toFixed(1)}` : "rsi:NO_DATA"],
        signal,
      },
      ctx.generatedAt,
    );
  },
};
