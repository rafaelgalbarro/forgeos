/**
 * Compose Research / Macro / Fundamental / Technical / Quant / Sentiment / Risk / Overall scores
 * from real engine signals. DEMO only when explicitly using offline demos (not used here).
 */

import type { EngineRunResult, ResearchScore, ResearchScores } from "./types";

function scoreFromEngine(
  kind: ResearchScore["kind"],
  engine: EngineRunResult | undefined,
): ResearchScore {
  if (!engine) {
    return {
      kind,
      value: null,
      confidence: null,
      label: "NO_DATA",
      evidence: ["engine missing"],
    };
  }
  if (engine.status === "STUB") {
    return {
      kind,
      value: null,
      confidence: null,
      label: "NO_DATA",
      evidence: [`${engine.engineId}:STUB`],
    };
  }
  if (engine.status === "CONFIG_REQUIRED" || engine.status === "NO_DATA") {
    return {
      kind,
      value: null,
      confidence: null,
      label: "NO_DATA",
      evidence: [`${engine.engineId}:${engine.status}`],
    };
  }
  if (engine.signal == null) {
    return {
      kind,
      value: null,
      confidence: null,
      label: "NO_DATA",
      evidence: [`${engine.engineId}:no-signal`],
    };
  }
  const confidence =
    engine.status === "LIVE" ? Math.min(1, 0.55 + engine.itemCount * 0.05) : 0.4;
  return {
    kind,
    value: Math.max(0, Math.min(100, engine.signal)),
    confidence,
    label: engine.status === "PARTIAL" ? "PARTIAL" : "LIVE",
    evidence: engine.evidence.slice(0, 4),
  };
}

function riskFromEngines(engines: readonly EngineRunResult[]): ResearchScore {
  const tech = engines.find((e) => e.engineId === "technical");
  const quant = engines.find((e) => e.engineId === "quant");
  const events = engines.find((e) => e.engineId === "events");
  const parts: number[] = [];
  const evidence: string[] = [];

  if (tech?.signal != null && (tech.status === "LIVE" || tech.status === "PARTIAL")) {
    // Invert extreme RSI-driven technical into risk contribution
    parts.push(100 - tech.signal);
    evidence.push(...tech.evidence.slice(0, 2));
  }
  if (quant?.signal != null && (quant.status === "LIVE" || quant.status === "PARTIAL")) {
    parts.push(100 - quant.signal);
    evidence.push(...quant.evidence.slice(0, 2));
  }
  if (events?.itemCount && events.status === "LIVE") {
    parts.push(Math.min(80, 40 + events.itemCount * 5));
    evidence.push(`events:${events.itemCount}`);
  }

  if (!parts.length) {
    return {
      kind: "risk",
      value: null,
      confidence: null,
      label: "NO_DATA",
      evidence: ["insufficient risk inputs"],
    };
  }

  const value = parts.reduce((a, b) => a + b, 0) / parts.length;
  return {
    kind: "risk",
    value: Math.max(0, Math.min(100, value)),
    confidence: Math.min(1, 0.4 + parts.length * 0.15),
    label: parts.length >= 2 ? "LIVE" : "PARTIAL",
    evidence,
  };
}

function overallFrom(scores: readonly ResearchScore[]): ResearchScore {
  const usable = scores.filter(
    (s) => s.kind !== "overall" && s.kind !== "research" && s.value != null && s.confidence != null,
  );
  if (!usable.length) {
    return {
      kind: "overall",
      value: null,
      confidence: null,
      label: "NO_DATA",
      evidence: ["no component scores"],
    };
  }

  let num = 0;
  let den = 0;
  const evidence: string[] = [];
  for (const s of usable) {
    const w = s.confidence ?? 0.3;
    num += (s.value as number) * w;
    den += w;
    evidence.push(`${s.kind}:${s.value}`);
  }
  const value = den > 0 ? num / den : null;
  const anyPartial = usable.some((s) => s.label === "PARTIAL");
  return {
    kind: "overall",
    value: value != null ? Math.max(0, Math.min(100, value)) : null,
    confidence: den > 0 ? Math.min(1, den / usable.length) : null,
    label: anyPartial ? "PARTIAL" : "LIVE",
    evidence,
  };
}

/**
 * Pure scoring composition — safe for unit tests without I/O.
 */
export function composeResearchScores(
  symbol: string,
  engines: readonly EngineRunResult[],
  generatedAt = new Date().toISOString(),
): ResearchScores {
  const byId = new Map(engines.map((e) => [e.engineId, e]));

  const macro = scoreFromEngine("macro", byId.get("macro"));
  const fundamental = scoreFromEngine("fundamental", byId.get("company"));
  const technical = scoreFromEngine("technical", byId.get("technical"));
  const quant = scoreFromEngine("quant", byId.get("quant"));
  const sentiment = scoreFromEngine("sentiment", byId.get("sentiment"));
  const risk = riskFromEngines(engines);

  const researchComponents = [macro, fundamental, technical, quant, sentiment].filter(
    (s) => s.value != null,
  );
  const research: ResearchScore =
    researchComponents.length === 0
      ? {
          kind: "research",
          value: null,
          confidence: null,
          label: "NO_DATA",
          evidence: ["no research components"],
        }
      : {
          kind: "research",
          value:
            researchComponents.reduce((a, s) => a + (s.value as number), 0) /
            researchComponents.length,
          confidence:
            researchComponents.reduce((a, s) => a + (s.confidence ?? 0), 0) /
            researchComponents.length,
          label: researchComponents.some((s) => s.label === "PARTIAL") ? "PARTIAL" : "LIVE",
          evidence: researchComponents.map((s) => `${s.kind}:${s.value}`),
        };

  const scores = [research, macro, fundamental, technical, quant, sentiment, risk];
  const overall = overallFrom(scores);

  return {
    symbol: symbol.toUpperCase(),
    generatedAt,
    scores: [...scores, overall],
    overall,
  };
}
