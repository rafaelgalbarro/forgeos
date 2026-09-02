import "server-only";

import {
  createDefaultInvestmentMemoryRepository,
  createInvestmentMemoryService,
  type DecisionHistoryRecord,
} from "@/src/core/investment/server";
import { getInvestmentDashboardSnapshot } from "@/lib/investment/dashboard-snapshot";

export type CommitteeReplayEntry = {
  readonly id: string;
  readonly occurredAt: string;
  readonly symbol: string;
  readonly source: "MEMORY" | "DASHBOARD_CACHE";
  readonly recommendation: string | null;
  readonly confidence: number | null;
  readonly consensus: string | null;
  readonly approved: boolean | null;
  readonly dissent: number | null;
  readonly buyScore: number | null;
  readonly sellScore: number | null;
  readonly holdScore: number | null;
  readonly reasoning: readonly string[];
  readonly minorityReport: ReadonlyArray<{
    readonly agent: string;
    readonly stance: string;
    readonly reasoning: string;
  }>;
  readonly researchThesis: string | null;
  readonly riskLevel: string | null;
  readonly riskWarnings: readonly string[];
  readonly brainRecommendation: string | null;
  readonly allocationSummary: string | null;
  readonly portfolioAnalyticsSummary: string | null;
  readonly note: string;
};

export type CommitteeReplaySnapshot = {
  readonly generatedAt: string;
  readonly mode: "ANALYSIS_ONLY";
  readonly orderExecution: "disabled";
  readonly liveTradingEnabled: false;
  readonly count: number;
  readonly totalUnfiltered: number;
  readonly entries: readonly CommitteeReplayEntry[];
  readonly availableSymbols: readonly string[];
  readonly availableRiskLevels: readonly string[];
  readonly note: string;
};

export type CommitteeReplayFilters = {
  readonly symbol?: string;
  readonly risk?: string;
  readonly analytics?: "present" | "absent" | "ALL" | string;
  readonly q?: string;
  readonly limit?: number;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

function parseMinority(value: unknown): CommitteeReplayEntry["minorityReport"] {
  if (!Array.isArray(value)) return [];
  return value
    .map((row) => {
      const obj = asRecord(row);
      if (!obj) return null;
      return {
        agent: typeof obj.agent === "string" ? obj.agent : "NO_DATA",
        stance: typeof obj.stance === "string" ? obj.stance : "NO_DATA",
        reasoning: typeof obj.reasoning === "string" ? obj.reasoning : "NO_DATA",
      };
    })
    .filter((r): r is NonNullable<typeof r> => r != null);
}

function fromMemoryRecord(record: DecisionHistoryRecord): CommitteeReplayEntry {
  const payload = asRecord(record.payload) ?? {};
  const committee = asRecord(payload.committee) ?? asRecord(payload.Committee) ?? {};
  const decision = asRecord(payload.decision) ?? asRecord(payload.InvestmentDecision) ?? {};
  const research = asRecord(payload.research) ?? asRecord(payload.Research) ?? {};
  const risk = asRecord(payload.risk) ?? asRecord(payload.RiskEngine) ?? {};
  const brain = asRecord(payload.brain) ?? asRecord(payload.InvestmentBrain) ?? {};
  const allocation = asRecord(payload.allocation) ?? asRecord(payload.AllocationEngine) ?? {};
  const portfolioAnalytics =
    asRecord(payload.portfolioAnalytics) ?? asRecord(payload.PortfolioAnalytics) ?? {};

  const recommendation =
    (typeof payload.recommendation === "string" && payload.recommendation) ||
    (typeof decision.recommendation === "string" && decision.recommendation) ||
    (typeof brain.recommendation === "string" && brain.recommendation) ||
    (typeof committee.consensus === "string" && committee.consensus) ||
    null;

  const confidenceRaw =
    payload.confidence ?? decision.confidence ?? committee.confidence ?? brain.confidence;
  const confidence = typeof confidenceRaw === "number" && Number.isFinite(confidenceRaw) ? confidenceRaw : null;

  const hasArtifact =
    recommendation != null ||
    Object.keys(committee).length > 0 ||
    Object.keys(decision).length > 0 ||
    Object.keys(research).length > 0 ||
    Object.keys(risk).length > 0 ||
    Object.keys(brain).length > 0 ||
    Object.keys(allocation).length > 0 ||
    Object.keys(portfolioAnalytics).length > 0;

  const cash = typeof allocation.targetCashPct === "number" ? allocation.targetCashPct : null;
  const equity = typeof allocation.targetEquityPct === "number" ? allocation.targetEquityPct : null;
  const defensive =
    typeof allocation.targetDefensivePct === "number" ? allocation.targetDefensivePct : null;
  const allocationSummary =
    cash != null || equity != null || defensive != null
      ? `cash=${cash ?? "NO_DATA"}% equity=${equity ?? "NO_DATA"}% defensive=${defensive ?? "NO_DATA"}%`
      : null;

  const concentration =
    typeof portfolioAnalytics.concentrationPct === "number"
      ? portfolioAnalytics.concentrationPct
      : null;
  const volatility =
    typeof portfolioAnalytics.volatilityPct === "number" ? portfolioAnalytics.volatilityPct : null;
  const sharpe =
    typeof portfolioAnalytics.sharpe === "number" ? portfolioAnalytics.sharpe : null;
  const portfolioAnalyticsSummary =
    concentration != null || volatility != null || sharpe != null
      ? `conc=${concentration ?? "NO_DATA"}% vol=${volatility ?? "NO_DATA"}% sharpe=${sharpe ?? "NO_DATA"}`
      : null;

  return {
    id: record.id,
    occurredAt: record.occurredAt,
    symbol: record.indexes.symbol ?? "NO_DATA",
    source: "MEMORY",
    recommendation,
    confidence,
    consensus: typeof committee.consensus === "string" ? committee.consensus : null,
    approved: typeof committee.approved === "boolean" ? committee.approved : null,
    dissent: typeof committee.dissent === "number" ? committee.dissent : null,
    buyScore: typeof committee.buyScore === "number" ? committee.buyScore : null,
    sellScore: typeof committee.sellScore === "number" ? committee.sellScore : null,
    holdScore: typeof committee.holdScore === "number" ? committee.holdScore : null,
    reasoning: asStringArray(payload.reasoning ?? decision.reasoning ?? brain.reasoning),
    minorityReport: parseMinority(committee.minorityReport ?? committee.minority_report),
    researchThesis: typeof research.thesis === "string" ? research.thesis : null,
    riskLevel: typeof risk.level === "string" ? risk.level : null,
    riskWarnings: asStringArray(risk.warnings),
    brainRecommendation: typeof brain.recommendation === "string" ? brain.recommendation : null,
    allocationSummary,
    portfolioAnalyticsSummary,
    note: hasArtifact
      ? "Read-only memory decision record (brain/committee/research/risk/allocation/portfolioAnalytics when present)"
      : "NO_DATA — decision record lacks artifact bodies (pipeline id only)",
  };
}

/**
 * Read-only committee decision replay from Investment Memory + dashboard cache fallback.
 * Supports symbol / risk / portfolio-analytics / q filters. Does not invent scores.
 */
export async function getCommitteeReplaySnapshot(
  limitOrFilters: number | CommitteeReplayFilters = 40,
): Promise<CommitteeReplaySnapshot> {
  const filters: CommitteeReplayFilters =
    typeof limitOrFilters === "number" ? { limit: limitOrFilters } : limitOrFilters;
  const limit = Math.min(Math.max(filters.limit ?? 40, 1), 100);
  const entries: CommitteeReplayEntry[] = [];

  try {
    const memory = createInvestmentMemoryService({
      repository: createDefaultInvestmentMemoryRepository(),
    });
    const records = await memory.queryDecisionHistory({
      kind: "decision",
      symbol: filters.symbol && filters.symbol !== "ALL" ? filters.symbol : undefined,
      limit: 100,
    });
    for (const record of records) {
      entries.push(fromMemoryRecord(record));
    }
  } catch {
    /* fall through to cache */
  }

  if (entries.length === 0) {
    try {
      const dash = getInvestmentDashboardSnapshot();
      const summary = dash.committeeSummary?.data;
      if (summary && (summary.recommendation || summary.reasoning?.length)) {
        entries.push({
          id: "dashboard-cache-latest",
          occurredAt: dash.committeeSummary?.updatedAt ?? dash.generatedAt,
          symbol: "NO_DATA",
          source: "DASHBOARD_CACHE",
          recommendation: summary.recommendation ?? null,
          confidence: typeof summary.confidence === "number" ? summary.confidence : null,
          consensus: summary.recommendation ?? null,
          approved: null,
          dissent: null,
          buyScore: null,
          sellScore: null,
          holdScore: null,
          reasoning: summary.reasoning ?? [],
          minorityReport: [],
          researchThesis: null,
          riskLevel: null,
          riskWarnings: [],
          brainRecommendation: null,
          allocationSummary: null,
          portfolioAnalyticsSummary: null,
          note: "Fallback from dashboard cache — full committee scores NO_DATA until memory stores artifacts",
        });
      }
    } catch {
      /* empty */
    }
  }

  const availableSymbols = Array.from(
    new Set(entries.map((e) => e.symbol).filter((s) => s !== "NO_DATA")),
  ).sort();
  const availableRiskLevels = Array.from(
    new Set(entries.map((e) => e.riskLevel).filter((r): r is string => Boolean(r))),
  ).sort();

  const q = (filters.q ?? "").trim().toLowerCase();
  const riskFilter = filters.risk && filters.risk !== "ALL" ? filters.risk : null;
  const analyticsFilter =
    filters.analytics === "present" || filters.analytics === "absent" ? filters.analytics : null;

  const filtered = entries.filter((entry) => {
    if (riskFilter && entry.riskLevel !== riskFilter) return false;
    if (analyticsFilter === "present" && !entry.portfolioAnalyticsSummary) return false;
    if (analyticsFilter === "absent" && entry.portfolioAnalyticsSummary) return false;
    if (q) {
      const hay = [
        entry.recommendation,
        entry.consensus,
        entry.note,
        entry.allocationSummary,
        entry.portfolioAnalyticsSummary,
        entry.brainRecommendation,
        entry.researchThesis,
        ...entry.reasoning,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const shown = filtered.slice(0, limit);

  return {
    generatedAt: new Date().toISOString(),
    mode: "ANALYSIS_ONLY",
    orderExecution: "disabled",
    liveTradingEnabled: false,
    count: shown.length,
    totalUnfiltered: entries.length,
    entries: shown,
    availableSymbols,
    availableRiskLevels,
    note: entries.length
      ? `Read-only replay · showing ${shown.length}/${entries.length} · advisory only · never unlocks live execution`
      : "NO_DATA — no committee decisions in memory or dashboard cache",
  };
}
