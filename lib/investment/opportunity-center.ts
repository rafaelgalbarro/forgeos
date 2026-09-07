/**
 * Opportunity Center view-model — maps scanner + Alpha Engine fields.
 * ANALYSIS_ONLY: never invents prices or analyses; missing → NO_DATA.
 *
 * Quality filter (documented):
 * Surface only Alpha Engine grades A+ or A (same gate as committee escalation:
 * score≥85 & conf≥0.72 → A+; score≥70 & conf≥0.58 → A; hard gates must pass).
 */

import type { AlphaOpportunity } from "@/src/core/investment/alpha-engine/domain/types";
import type { OpportunityCandidate, OpportunityScanResult } from "@/src/core/investment/opportunity/client";
import { researchDossierHref } from "@/lib/investment/research/deep-links";

export const OPPORTUNITY_CENTER_NO_DATA = "NO_DATA" as const;
export type OpportunityCenterNoData = typeof OPPORTUNITY_CENTER_NO_DATA;

export const OPPORTUNITY_QUALITY_FILTER = {
  id: "alpha-grade-A-plus-or-A",
  label: "Alpha Engine A+/A only",
  description:
    "Only opportunities graded A+ or A by Alpha Engine (committee escalation gate). Hard-rejected and B/C/D grades are excluded.",
  grades: ["A+", "A"] as const,
} as const;

export type OpportunityCenterSortId =
  | "mayor_confianza"
  | "mayor_rentabilidad"
  | "menor_riesgo"
  | "mayor_liquidez"
  | "mayor_score";

export const OPPORTUNITY_CENTER_SORT_OPTIONS: readonly {
  readonly id: OpportunityCenterSortId;
  readonly label: string;
}[] = [
  { id: "mayor_confianza", label: "Mayor confianza" },
  { id: "mayor_rentabilidad", label: "Mayor rentabilidad" },
  { id: "menor_riesgo", label: "Menor riesgo" },
  { id: "mayor_liquidez", label: "Mayor liquidez" },
  { id: "mayor_score", label: "Mayor score" },
] as const;

export type OpportunitySide = "BUY" | "SELL" | "HOLD";

export type OpportunityCenterField<T> = T | OpportunityCenterNoData;

export type OpportunityDetailSection = {
  readonly id: string;
  readonly title: string;
  readonly status: "wired" | "NO_DATA";
  readonly summary: string;
  readonly bullets: readonly string[];
};

export type OpportunityCenterItem = {
  readonly id: string;
  readonly activo: string;
  /** Deep link to Research Engine dossier for this symbol (ANALYSIS_ONLY). */
  readonly researchHref: string;
  readonly mercado: string;
  readonly tipo: string;
  readonly side: OpportunitySide;
  readonly confianza: number;
  readonly score: number;
  readonly grade: "A+" | "A";
  readonly rentabilidadEsperada: OpportunityCenterField<number>;
  readonly riesgo: OpportunityCenterField<string>;
  readonly riesgoPct: OpportunityCenterField<number>;
  readonly horizonteTemporal: OpportunityCenterField<string>;
  readonly probabilidad: OpportunityCenterField<number>;
  readonly capitalRecomendado: OpportunityCenterField<number>;
  readonly stopLoss: OpportunityCenterField<number>;
  readonly takeProfit: OpportunityCenterField<number>;
  readonly ratioRiesgoBeneficio: OpportunityCenterField<number>;
  readonly liquidez: OpportunityCenterField<number>;
  readonly volatilidad: OpportunityCenterField<number>;
  readonly detection: OpportunityCenterField<string>;
  readonly dataQuality: OpportunityCenterField<string>;
  readonly escalateToCommittee: boolean;
  readonly escalateToRisk: boolean;
  readonly whyDetected: OpportunityCenterField<string>;
  readonly details: readonly OpportunityDetailSection[];
  readonly analysisOnly: true;
  readonly orderExecution: "disabled";
  /** Sort keys (null = missing → sort last for "mayor", first for "menor") */
  readonly _sort: {
    readonly confianza: number;
    readonly rentabilidad: number | null;
    readonly riesgo: number | null;
    readonly liquidez: number | null;
    readonly score: number;
  };
};

export type OpportunityCenterSnapshot = {
  readonly scannedAt: string;
  readonly generatedAt: string;
  readonly mode: "ANALYSIS_ONLY";
  readonly orderExecution: "disabled";
  readonly liveTradingEnabled: false;
  readonly ibkrReadOnly: true;
  readonly opportunities: readonly OpportunityCenterItem[];
  readonly count: number;
  /** Raw scanner candidates (pre–quality filter) for compatibility. */
  readonly candidates: readonly OpportunityCandidate[];
  readonly skippedAssetClasses: readonly string[];
  readonly scanDurationMs: number;
  readonly qualityFilter: typeof OPPORTUNITY_QUALITY_FILTER;
  readonly sortOptions: typeof OPPORTUNITY_CENTER_SORT_OPTIONS;
  readonly fieldWiring: Readonly<Record<string, "wired" | "NO_DATA">>;
  readonly badges: readonly string[];
  readonly note: string;
};

function numOrNoData(n: number | null | undefined): OpportunityCenterField<number> {
  if (n == null || !Number.isFinite(n)) return OPPORTUNITY_CENTER_NO_DATA;
  return n;
}

function strOrNoData(s: string | null | undefined): OpportunityCenterField<string> {
  if (s == null || s.trim() === "") return OPPORTUNITY_CENTER_NO_DATA;
  return s;
}

export function directionToSide(direction: string): OpportunitySide {
  const d = direction.toLowerCase();
  if (d === "long" || d === "buy" || d === "bullish") return "BUY";
  if (d === "short" || d === "sell" || d === "bearish") return "SELL";
  return "HOLD";
}

function riskReward(
  expectedReturnPct: number | null | undefined,
  expectedRiskPct: number | null | undefined,
): OpportunityCenterField<number> {
  if (
    expectedReturnPct == null ||
    expectedRiskPct == null ||
    !Number.isFinite(expectedReturnPct) ||
    !Number.isFinite(expectedRiskPct) ||
    expectedRiskPct === 0
  ) {
    return OPPORTUNITY_CENTER_NO_DATA;
  }
  return Math.round((Math.abs(expectedReturnPct) / Math.abs(expectedRiskPct)) * 100) / 100;
}

function section(
  id: string,
  title: string,
  bullets: readonly string[],
  summary?: string,
): OpportunityDetailSection {
  const cleaned = bullets.filter((b) => b.trim().length > 0);
  if (cleaned.length === 0) {
    return {
      id,
      title,
      status: "NO_DATA",
      summary: OPPORTUNITY_CENTER_NO_DATA,
      bullets: [],
    };
  }
  return {
    id,
    title,
    status: "wired",
    summary: summary ?? cleaned[0]!,
    bullets: cleaned,
  };
}

function evidenceByPrefix(evidence: readonly string[], prefixes: readonly string[]): string[] {
  return evidence.filter((e) => {
    const lower = e.toLowerCase();
    return prefixes.some((p) => lower.startsWith(p.toLowerCase()) || lower.includes(`:${p}`) || lower.includes(`${p}:`));
  });
}

/** Map Alpha A+/A opportunity (+ optional scanner candidate) into center card. */
export function mapAlphaToOpportunityCenterItem(
  alpha: AlphaOpportunity,
  candidate?: OpportunityCandidate | null,
): OpportunityCenterItem | null {
  if (alpha.grade !== "A+" && alpha.grade !== "A") return null;

  const sb = alpha.scoreBreakdown;
  const evidence = alpha.evidence ?? [];
  const technical = evidenceByPrefix(evidence, ["breakout", "momentum", "reversal", "volatility", "gap", "volume", "rsi", "sma", "trend", "technical"]);
  const fundamental = evidenceByPrefix(evidence, ["fundamental", "valuation", "earnings", "pe", "pb", "roe"]);
  const macro = evidenceByPrefix(evidence, ["macro", "regime", "geographic", "sector_rotation"]);
  const news = evidenceByPrefix(evidence, ["news", "headline"]);
  const sentiment = evidenceByPrefix(evidence, ["sentiment"]);

  const quantBullets = [
    `signalQuality=${sb.signalQuality}`,
    `strategyConsensus=${sb.strategyConsensus}`,
    `agentConsensus=${sb.agentConsensus}`,
    `trend=${sb.trend}`,
    `liquidity=${sb.liquidity}`,
    `dataFreshness=${sb.dataFreshness}`,
    `total=${sb.total}`,
  ];

  const committeeBullets = [
    alpha.escalateToCommittee
      ? `Escalated to Committee (grade ${alpha.grade}) — analysis queue only`
      : OPPORTUNITY_CENTER_NO_DATA,
    ...(alpha.agentsAgreeing.length > 0
      ? [`Agents: ${alpha.agentsAgreeing.join(", ")}`]
      : []),
  ].filter((b) => b !== OPPORTUNITY_CENTER_NO_DATA);

  const consensusBullets = [
    ...(alpha.strategiesAgreeing.length > 0
      ? [`Strategies agreeing: ${alpha.strategiesAgreeing.join(", ")}`]
      : []),
    `strategyConsensus score=${sb.strategyConsensus}`,
    `agentConsensus score=${sb.agentConsensus}`,
  ];

  // Minority report has no dedicated backend field — never invent dissent.
  const minority = section("minority", "Minority report", []);

  const details: OpportunityDetailSection[] = [
    section(
      "resumen",
      "Resumen ejecutivo",
      [
        alpha.whyDetected,
        alpha.acceptOrRejectReason,
        alpha.portfolioImpact,
        ...evidence.slice(0, 3),
      ].filter(Boolean),
    ),
    section(
      "tecnico",
      "Análisis técnico",
      technical.length > 0
        ? technical
        : sb.trend > 0
          ? [`trend factor=${sb.trend}`, `signalQuality=${sb.signalQuality}`]
          : [],
    ),
    section(
      "fundamental",
      "Análisis fundamental",
      fundamental.length > 0
        ? fundamental
        : sb.fundamentals > 0
          ? [`fundamentals factor=${sb.fundamentals}`, `valuation=${sb.valuation}`]
          : [],
    ),
    section(
      "macro",
      "Análisis macro",
      macro.length > 0 ? macro : sb.macro > 0 ? [`macro factor=${sb.macro}`, `marketContext=${sb.marketContext}`] : [],
    ),
    section("cuantitativo", "Análisis cuantitativo", quantBullets),
    section("noticias", "Noticias", news.length > 0 ? news : sb.news > 0 ? [`news factor=${sb.news}`] : []),
    section(
      "sentimiento",
      "Sentimiento",
      sentiment.length > 0 ? sentiment : sb.sentiment > 0 ? [`sentiment factor=${sb.sentiment}`] : [],
    ),
    section("comite", "Comité IA", committeeBullets),
    section("consenso", "Consenso", consensusBullets),
    minority,
  ];

  const riesgoLabel =
    candidate?.risk.level ??
    (alpha.expectedRiskPct != null
      ? alpha.expectedRiskPct >= 8
        ? "high"
        : alpha.expectedRiskPct >= 4
          ? "medium"
          : "low"
      : null);

  return {
    id: alpha.id,
    activo: alpha.asset,
    researchHref: researchDossierHref(alpha.asset),
    mercado: candidate?.instrument.market ?? alpha.market,
    tipo: candidate?.instrument.assetClass ?? alpha.market,
    side: directionToSide(alpha.direction),
    confianza: alpha.confidence,
    score: alpha.score,
    grade: alpha.grade,
    rentabilidadEsperada: numOrNoData(alpha.expectedReturnPct),
    riesgo: strOrNoData(riesgoLabel),
    riesgoPct: numOrNoData(alpha.expectedRiskPct),
    horizonteTemporal: strOrNoData(alpha.timeHorizon || candidate?.timeframe),
    probabilidad: OPPORTUNITY_CENTER_NO_DATA,
    capitalRecomendado: OPPORTUNITY_CENTER_NO_DATA,
    stopLoss: numOrNoData(alpha.stop ?? candidate?.stop),
    takeProfit: numOrNoData(alpha.target ?? candidate?.target),
    ratioRiesgoBeneficio: riskReward(alpha.expectedReturnPct, alpha.expectedRiskPct),
    liquidez: numOrNoData(alpha.liquidity),
    volatilidad: OPPORTUNITY_CENTER_NO_DATA,
    detection: strOrNoData(candidate?.detection ?? alpha.strategy),
    dataQuality: strOrNoData(alpha.dataQuality),
    escalateToCommittee: alpha.escalateToCommittee,
    escalateToRisk: alpha.escalateToRisk,
    whyDetected: strOrNoData(alpha.whyDetected),
    details,
    analysisOnly: true,
    orderExecution: "disabled",
    _sort: {
      confianza: alpha.confidence,
      rentabilidad:
        alpha.expectedReturnPct != null && Number.isFinite(alpha.expectedReturnPct)
          ? alpha.expectedReturnPct
          : null,
      riesgo:
        alpha.expectedRiskPct != null && Number.isFinite(alpha.expectedRiskPct)
          ? alpha.expectedRiskPct
          : null,
      liquidez: alpha.liquidity != null && Number.isFinite(alpha.liquidity) ? alpha.liquidity : null,
      score: alpha.score,
    },
  };
}

export function isHighQualityAlpha(opp: AlphaOpportunity): boolean {
  return opp.grade === "A+" || opp.grade === "A";
}

export function sortOpportunityCenterItems(
  items: readonly OpportunityCenterItem[],
  sortId: OpportunityCenterSortId,
): OpportunityCenterItem[] {
  const copy = [...items];
  const nullLast = (a: number | null, b: number | null, desc: boolean) => {
    if (a == null && b == null) return 0;
    if (a == null) return 1;
    if (b == null) return -1;
    return desc ? b - a : a - b;
  };

  switch (sortId) {
    case "mayor_confianza":
      return copy.sort((a, b) => b._sort.confianza - a._sort.confianza || b._sort.score - a._sort.score);
    case "mayor_rentabilidad":
      return copy.sort((a, b) => nullLast(a._sort.rentabilidad, b._sort.rentabilidad, true) || b._sort.score - a._sort.score);
    case "menor_riesgo":
      return copy.sort((a, b) => nullLast(a._sort.riesgo, b._sort.riesgo, false) || b._sort.score - a._sort.score);
    case "mayor_liquidez":
      return copy.sort((a, b) => nullLast(a._sort.liquidez, b._sort.liquidez, true) || b._sort.score - a._sort.score);
    case "mayor_score":
    default:
      return copy.sort((a, b) => b._sort.score - a._sort.score || b._sort.confianza - a._sort.confianza);
  }
}

export const OPPORTUNITY_CENTER_FIELD_WIRING = {
  activo: "wired",
  mercado: "wired",
  tipo: "wired",
  side: "wired",
  confianza: "wired",
  score: "wired",
  rentabilidadEsperada: "wired",
  riesgo: "wired",
  horizonteTemporal: "wired",
  probabilidad: "NO_DATA",
  capitalRecomendado: "NO_DATA",
  stopLoss: "wired",
  takeProfit: "wired",
  ratioRiesgoBeneficio: "wired",
  liquidez: "wired",
  volatilidad: "NO_DATA",
} as const;

export function buildOpportunityCenterFromAlpha(
  alphaTop: readonly AlphaOpportunity[],
  scan: OpportunityScanResult | null,
): OpportunityCenterItem[] {
  const bySymbol = new Map<string, OpportunityCandidate>();
  for (const c of scan?.candidates ?? []) {
    const key = c.instrument.symbol.toUpperCase();
    const prev = bySymbol.get(key);
    if (!prev || c.score > prev.score) bySymbol.set(key, c);
  }

  const items: OpportunityCenterItem[] = [];
  for (const opp of alphaTop) {
    if (!isHighQualityAlpha(opp)) continue;
    const mapped = mapAlphaToOpportunityCenterItem(opp, bySymbol.get(opp.asset.toUpperCase()) ?? null);
    if (mapped) items.push(mapped);
  }
  return sortOpportunityCenterItems(items, "mayor_score");
}
