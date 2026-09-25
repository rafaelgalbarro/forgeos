import "server-only";

import {
  createDefaultInvestmentMemoryRepository,
  createInvestmentMemoryService,
  type DecisionHistoryRecord,
  type MemoryRecordKind,
} from "@/src/core/investment/server";

export type AuditTimelineItem = {
  readonly id: string;
  readonly kind: string;
  readonly occurredAt: string;
  readonly symbol: string;
  readonly summary: string;
  readonly provenance: string;
};

export type AuditTimelineFilters = {
  readonly kind?: string;
  readonly symbol?: string;
  readonly q?: string;
  readonly analytics?: "present" | "absent" | "ALL" | string;
  readonly limit?: number;
};

export type AuditTimelineSnapshot = {
  readonly generatedAt: string;
  readonly mode: "ANALYSIS_ONLY";
  readonly orderExecution: "disabled";
  readonly count: number;
  readonly totalUnfiltered: number;
  readonly items: readonly AuditTimelineItem[];
  readonly availableKinds: readonly string[];
  readonly availableSymbols: readonly string[];
  readonly note: string;
};

const KINDS: readonly MemoryRecordKind[] = [
  "decision",
  "analysis",
  "error",
  "simulated_operation",
  "result",
  "market",
];

function summarize(record: DecisionHistoryRecord): string {
  const payload = record.payload;
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const obj = payload as Record<string, unknown>;
    const analytics =
      obj.portfolioAnalytics && typeof obj.portfolioAnalytics === "object"
        ? (obj.portfolioAnalytics as Record<string, unknown>)
        : null;
    const analyticsBit =
      analytics &&
      (typeof analytics.concentrationPct === "number" ||
        typeof analytics.volatilityPct === "number" ||
        typeof analytics.sharpe === "number")
        ? ` · analytics conc=${analytics.concentrationPct ?? "NO_DATA"} vol=${analytics.volatilityPct ?? "NO_DATA"} sharpe=${analytics.sharpe ?? "NO_DATA"}`
        : "";
    if (typeof obj.summary === "string") return `${obj.summary}${analyticsBit}`;
    if (typeof obj.recommendation === "string") return `${obj.recommendation}${analyticsBit}`;
    if (typeof obj.mode === "string") return `mode=${obj.mode}${analyticsBit}`;
    if (typeof obj.status === "string") return `status=${obj.status}${analyticsBit}`;
    if (analyticsBit) return `${record.kind}${analyticsBit}`;
  }
  return record.kind;
}

function hasPortfolioAnalytics(record: DecisionHistoryRecord): boolean {
  const payload = record.payload;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return false;
  const obj = payload as Record<string, unknown>;
  const analytics = obj.portfolioAnalytics ?? obj.PortfolioAnalytics;
  return Boolean(analytics && typeof analytics === "object");
}

function toItem(record: DecisionHistoryRecord): AuditTimelineItem {
  return {
    id: record.id,
    kind: record.kind,
    occurredAt: record.occurredAt,
    symbol: record.indexes.symbol ?? "NO_DATA",
    summary: summarize(record),
    provenance: record.provenance.source ?? "memory",
  };
}

/**
 * Read-only audit timeline from Investment Memory.
 * Supports kind/symbol/q filters without mutating memory.
 */
export async function getAuditTimeline(
  filters: AuditTimelineFilters = {},
): Promise<AuditTimelineSnapshot> {
  const limit = Math.min(Math.max(filters.limit ?? 100, 1), 200);
  const memory = createInvestmentMemoryService({
    repository: createDefaultInvestmentMemoryRepository(),
  });

  const kindFilter =
    filters.kind && KINDS.includes(filters.kind as MemoryRecordKind)
      ? (filters.kind as MemoryRecordKind)
      : undefined;

  const records = await memory.queryDecisionHistory({
    kind: kindFilter,
    symbol: filters.symbol && filters.symbol !== "ALL" ? filters.symbol : undefined,
    limit: 200,
  });

  const allItems = records.map(toItem);
  const q = (filters.q ?? "").trim().toLowerCase();
  const analyticsFilter =
    filters.analytics === "present" || filters.analytics === "absent" ? filters.analytics : null;
  const items = records
    .filter((record, index) => {
      if (analyticsFilter === "present" && !hasPortfolioAnalytics(record)) return false;
      if (analyticsFilter === "absent" && hasPortfolioAnalytics(record)) return false;
      const item = allItems[index]!;
      if (q) {
        const hay = `${item.summary} ${item.symbol} ${item.kind} ${item.provenance}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    })
    .map(toItem)
    .slice(0, limit);

  const availableKinds = Array.from(new Set(allItems.map((i) => i.kind))).sort();
  const availableSymbols = Array.from(
    new Set(allItems.map((i) => i.symbol).filter((s) => s !== "NO_DATA")),
  ).sort();

  return {
    generatedAt: new Date().toISOString(),
    mode: "ANALYSIS_ONLY",
    orderExecution: "disabled",
    count: items.length,
    totalUnfiltered: allItems.length,
    items,
    availableKinds,
    availableSymbols,
    note:
      allItems.length === 0
        ? "No decision history records yet — NO_DATA (not fabricated)."
        : `Showing ${items.length} of ${allItems.length} (read-only Investment Memory).`,
  };
}
