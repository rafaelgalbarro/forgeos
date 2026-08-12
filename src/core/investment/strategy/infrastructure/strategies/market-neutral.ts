import { RuleBasedInvestmentStrategy } from "../../application/rule-based-strategy";
import { clampScore, mean } from "../../domain";
import { buildMetadata } from "./metadata";

export function createMarketNeutralStrategy(): RuleBasedInvestmentStrategy {
  return new RuleBasedInvestmentStrategy({
    id: "market-neutral",
    defaultSizePct: 3,
    timeframe: "1d",
    metadata: buildMetadata({
      strategyId: "market-neutral",
      name: "Market Neutral",
      assumptions: [
        "Idiosyncratic alpha can be isolated by hedging market beta",
        "Relative strength vs beta explains residual opportunity",
      ],
      limitations: [
        "Residual correlation spikes in crises",
        "Hedging costs and borrow constraints",
      ],
      compatibleRegimes: ["sideways", "transition", "low-volatility", "high-volatility"],
      incompatibleRegimes: [],
      risks: ["basis risk", "crowding", "correlation breakdown"],
      evidences: [
        "Market-neutral / residual momentum frameworks",
        "Beta-hedged relative value heuristics",
      ],
    }),
    hooks: {
      score(context) {
        const mom = mean(context.returns) ?? 0;
        const beta = context.beta ?? 1;
        const residual = mom - beta * 0.001;
        const score = clampScore(residual * 80);
        const bias = score > 0.12 ? "bullish" : score < -0.12 ? "bearish" : "neutral";
        return {
          score,
          bias,
          summary: `Market-neutral residual score ${score.toFixed(3)} (beta=${beta.toFixed(2)}).`,
          evidence: [`residual=${residual.toFixed(5)}`, `beta=${beta.toFixed(3)}`],
          metrics: { residual, beta, score },
        };
      },
      shouldEnter(context, analysis) {
        if (Math.abs(analysis.score) < 0.35) return null;
        const side = analysis.score > 0 ? "long" : "short";
        return {
          side,
          conviction: Math.min(1, Math.abs(analysis.score)),
          rationale: `Market-neutral ${side} residual alpha (pair with hedge outside this intent).`,
          evidence: [...analysis.evidence, "hedgeRequired=true"],
        };
      },
      manage(context, position, analysis) {
        if (Math.abs(analysis.score) < 0.1) {
          return {
            action: "scale-out",
            suggestedSizePct: 50,
            rationale: "Residual alpha decayed; reduce market-neutral sleeve.",
            evidence: analysis.evidence,
          };
        }
        return {
          action: "hold",
          stopLevel: position.stopLevel,
          targetLevel: position.targetLevel,
          rationale: "Maintain hedged residual exposure.",
          evidence: [`score=${analysis.score.toFixed(3)}`, `beta=${context.beta ?? 1}`],
        };
      },
    },
  });
}
