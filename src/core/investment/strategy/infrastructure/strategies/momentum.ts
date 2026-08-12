import { RuleBasedInvestmentStrategy } from "../../application/rule-based-strategy";
import { clampScore, mean } from "../../domain";
import { buildMetadata } from "./metadata";

export function createMomentumStrategy(): RuleBasedInvestmentStrategy {
  return new RuleBasedInvestmentStrategy({
    id: "momentum",
    defaultSizePct: 5,
    metadata: buildMetadata({
      strategyId: "momentum",
      name: "Momentum",
      assumptions: [
        "Recent relative strength continues near-term",
        "Volume confirmation improves signal quality",
      ],
      limitations: [
        "Crashes and abrupt mean reversion can erase gains",
        "Crowding risk in popular momentum names",
      ],
      compatibleRegimes: ["bullish", "risk-on", "low-volatility"],
      incompatibleRegimes: ["transition", "high-volatility"],
      risks: ["momentum crash", "liquidity evaporation", "earnings surprise reversal"],
      evidences: [
        "Cross-sectional and time-series momentum research",
        "Volume-confirmed continuation patterns",
      ],
    }),
    hooks: {
      score(context) {
        const mom = mean(context.returns) ?? 0;
        const volRatio =
          context.volume !== undefined && context.averageVolume
            ? context.volume / Math.max(context.averageVolume, 1)
            : 1;
        const score = clampScore(mom * 12 + (volRatio - 1) * 0.35);
        const bias = score > 0.12 ? "bullish" : score < -0.12 ? "bearish" : "neutral";
        return {
          score,
          bias,
          summary: `Momentum score ${score.toFixed(3)} with volume ratio ${volRatio.toFixed(2)}.`,
          evidence: [`meanReturn=${mom.toFixed(4)}`, `volumeRatio=${volRatio.toFixed(3)}`],
          metrics: { meanReturn: mom, volumeRatio: volRatio, score },
        };
      },
      shouldEnter(_context, analysis) {
        if (Math.abs(analysis.score) < 0.4) return null;
        const side = analysis.score > 0 ? "long" : "short";
        return {
          side,
          conviction: Math.min(1, Math.abs(analysis.score) * 1.1),
          rationale: `Momentum ${side} continuation signal.`,
          evidence: analysis.evidence,
        };
      },
    },
  });
}
