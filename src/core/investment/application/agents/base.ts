import type {
  InvestmentAgentResult,
  InvestmentScore,
  InvestmentStance,
} from "../../domain/types";

export function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return Number(value.toFixed(4));
}

export function scoreFromSignal(signal: number): InvestmentScore {
  const normalized = clamp01((signal + 1) / 2);
  const buy = normalized;
  const sell = clamp01(1 - normalized);
  const hold = clamp01(1 - Math.abs(signal));
  const total = buy + sell + hold;

  return {
    buy: clamp01(buy / total),
    sell: clamp01(sell / total),
    hold: clamp01(hold / total),
  };
}

export function confidenceFromSignal(signal: number, baseline = 0.55): number {
  return clamp01(baseline + Math.abs(signal) * 0.4);
}

export function stanceFromScore(score: InvestmentScore): InvestmentStance {
  if (score.buy >= score.sell && score.buy >= score.hold) return "BUY";
  if (score.sell >= score.buy && score.sell >= score.hold) return "SELL";
  return "HOLD";
}

export function createResult(
  agent: string,
  signal: number,
  reasoning: string,
  sources: string[],
): InvestmentAgentResult {
  return {
    agent,
    score: scoreFromSignal(signal),
    confidence: confidenceFromSignal(signal),
    reasoning,
    sources,
  };
}
