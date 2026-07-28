/** RC10 — Market signal engine (demo, anonymized). */

import type { MarketSignal, NetworkContext } from "./types";
import { DEMO_DISCLAIMER } from "./types";

export function buildMarketSignals(ctx: NetworkContext): MarketSignal[] {
  const sector = ctx.sector;

  return [
    {
      id: "sig-saas-growth",
      title: "Aceleración SaaS B2B en España",
      description: `Las startups ${sector} similares reportan un crecimiento medio del 21% en los últimos 6 meses.`,
      strength: "strong",
      sector,
      direction: "up",
      confidence: 0.82,
      disclaimer: DEMO_DISCLAIMER,
    },
    {
      id: "sig-pricing-pressure",
      title: "Presión competitiva en pricing",
      description:
        "El 34% de ventures del sector están ajustando precios al alza en Q2.",
      strength: "moderate",
      sector,
      direction: "up",
      confidence: 0.71,
      disclaimer: DEMO_DISCLAIMER,
    },
    {
      id: "sig-churn-alert",
      title: "Churn elevado en tier entry",
      description:
        "Señal de churn por encima de la media en planes por debajo de 40 €/mes.",
      strength: "moderate",
      sector,
      direction: "down",
      confidence: 0.68,
      disclaimer: DEMO_DISCLAIMER,
    },
    {
      id: "sig-ai-adoption",
      title: "Adopción de IA en producto",
      description:
        "El 58% de startups SaaS similares integran capacidades IA en su roadmap.",
      strength: "strong",
      sector,
      direction: "up",
      confidence: 0.75,
      disclaimer: DEMO_DISCLAIMER,
    },
  ];
}

export function getStrongestSignal(signals: MarketSignal[]): MarketSignal | null {
  const strong = signals.filter((s) => s.strength === "strong");
  if (strong.length === 0) return signals[0] ?? null;
  return strong.sort((a, b) => b.confidence - a.confidence)[0];
}
