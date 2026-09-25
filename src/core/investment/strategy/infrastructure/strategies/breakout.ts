import { RuleBasedInvestmentStrategy } from "../../application/rule-based-strategy";
import { clampScore } from "../../domain";
import { buildMetadata } from "./metadata";

export function createBreakoutStrategy(): RuleBasedInvestmentStrategy {
  return new RuleBasedInvestmentStrategy({
    id: "breakout",
    defaultSizePct: 5,
    metadata: buildMetadata({
      strategyId: "breakout",
      name: "Breakout",
      assumptions: [
        "Range expansions after compression persist",
        "Volume surge confirms genuine breakouts",
      ],
      limitations: [
        "False breakouts common without volume",
        "Requires timely invalidation discipline",
      ],
      compatibleRegimes: ["transition", "bullish", "bearish", "high-volatility"],
      incompatibleRegimes: ["sideways", "low-volatility"],
      risks: ["fakeout", "slippage on expansion", "post-breakout reversion"],
      evidences: [
        "Volatility compression-expansion patterns",
        "Volume-confirmed range break heuristics",
      ],
    }),
    hooks: {
      score(context) {
        const atr = context.atr ?? context.price * 0.015;
        const slow = context.smaSlow ?? context.price;
        const distance = (context.price - slow) / Math.max(atr, 1e-9);
        const volRatio =
          context.volume !== undefined && context.averageVolume
            ? context.volume / Math.max(context.averageVolume, 1)
            : 1;
        const score = clampScore(distance * 0.35 + (volRatio - 1) * 0.4);
        const bias = score > 0.15 ? "bullish" : score < -0.15 ? "bearish" : "neutral";
        return {
          score,
          bias,
          summary: `Breakout score ${score.toFixed(3)} (ATR distance ${distance.toFixed(2)}).`,
          evidence: [
            `atrDistance=${distance.toFixed(3)}`,
            `volumeRatio=${volRatio.toFixed(3)}`,
          ],
          metrics: { atrDistance: distance, volumeRatio: volRatio, score },
        };
      },
      shouldEnter(context, analysis) {
        const volRatio =
          context.volume !== undefined && context.averageVolume
            ? context.volume / Math.max(context.averageVolume, 1)
            : 0;
        if (volRatio < 1.4 || Math.abs(analysis.score) < 0.4) return null;
        const side = analysis.score > 0 ? "long" : "short";
        return {
          side,
          conviction: Math.min(1, Math.abs(analysis.score)),
          rationale: `Volume-confirmed breakout ${side}.`,
          evidence: analysis.evidence,
        };
      },
    },
  });
}
