import { getCompositionRoot } from "@/src/core/composition";
import type { PortfolioReadModel, VenturePortfolioCard } from "@/src/core/application/portfolio";
import type { ComparePortfolioVenturesResult } from "@/src/core/application/value-engine/portfolio";
import {
  buildPortfolioAnalyticsDashboardModel,
  computePortfolioAnalytics,
  type PortfolioAnalyticsInput,
  type RiskBreakdownRow,
} from "@/src/core/investment";
import type {
  PortfolioAlert,
  PortfolioCommandCenterReadModel,
  PortfolioExecutionRow,
  PortfolioResourceRow,
  PortfolioValueRow,
  PortfolioVentureCardModel,
} from "./read-model";

export interface PortfolioCommandCenterQuery {
  portfolioId: string;
  page?: number;
  pageSize?: number;
}

function asPortfolioModel(value: unknown): PortfolioReadModel | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (typeof record.portfolioId !== "string") return null;
  if (!Array.isArray(record.ventures)) return null;
  return value as PortfolioReadModel;
}

function mapVenture(
  venture: VenturePortfolioCard,
  previewByVenture: Map<string, string>,
  releaseByVenture: Map<string, string>,
  approvalsCountByVenture: Map<string, number>,
): PortfolioVentureCardModel {
  return {
    ventureId: venture.ventureId,
    name: venture.name,
    lifecycle: venture.lifecycle,
    priority: venture.priority,
    valueStage: venture.lifecycle,
    valueStatus: venture.valueStatus,
    evidenceStatus: venture.valueStatus === "UNKNOWN" ? "INSUFFICIENT_EVIDENCE" : "HAS_SIGNAL",
    creationHealth: venture.health,
    activeExecutions: venture.activeExecutions,
    latestPreview: previewByVenture.get(venture.ventureId) ?? null,
    latestRelease: releaseByVenture.get(venture.ventureId) ?? null,
    blockers: venture.blockers,
    approvals: approvalsCountByVenture.get(venture.ventureId) ?? 0,
    costToNextMilestone: "UNKNOWN",
    recommendedAction:
      venture.blockers.length > 0
        ? "Resolve blockers"
        : venture.activeExecutions > 0
          ? "Monitor execution"
          : venture.paused
            ? "Review pause decision"
            : "Open Mission",
  };
}

function mapExecutions(ventures: PortfolioVentureCardModel[]): PortfolioExecutionRow[] {
  return ventures.map((venture) => ({
    id: `exec-${venture.ventureId}`,
    ventureId: venture.ventureId,
    ventureName: venture.name,
    status:
      venture.creationHealth === "BLOCKED"
        ? "blocked"
        : venture.creationHealth === "FAILED"
          ? "failed"
          : venture.lifecycle === "PAUSED" || venture.lifecycle === "paused"
            ? "paused"
            : venture.activeExecutions > 0
              ? "running"
              : "completed",
    priority: venture.priority,
  }));
}

function mapResources(
  resources: PortfolioReadModel["capacity"],
  allocations: PortfolioReadModel["allocations"],
): PortfolioResourceRow[] {
  const reservedByType = new Map<string, number>();
  const usedByType = new Map<string, number>();
  for (const alloc of allocations) {
    reservedByType.set(
      alloc.resourceType,
      (reservedByType.get(alloc.resourceType) ?? 0) + alloc.reserved,
    );
    usedByType.set(alloc.resourceType, (usedByType.get(alloc.resourceType) ?? 0) + alloc.used);
  }

  return resources.map((resource) => ({
    resourceType: resource.resourceType,
    actual: usedByType.get(resource.resourceType) ?? resource.used,
    estimated: resource.used,
    projected: Math.max(resource.used, (usedByType.get(resource.resourceType) ?? 0) + (reservedByType.get(resource.resourceType) ?? 0)),
    limit: resource.limit,
    reserved: reservedByType.get(resource.resourceType) ?? 0,
  }));
}

function buildAlerts(
  model: PortfolioReadModel,
  ventures: PortfolioVentureCardModel[],
  risksCount: number,
): PortfolioAlert[] {
  const alerts: PortfolioAlert[] = [];
  for (const venture of ventures) {
    if (venture.blockers.length > 0) {
      alerts.push({
        id: `blocked-${venture.ventureId}`,
        type: "venture_no_progress",
        severity: "warning",
        label: `${venture.name} has blockers`,
        ventureId: venture.ventureId,
      });
    }
    if (!venture.latestPreview) {
      alerts.push({
        id: `preview-${venture.ventureId}`,
        type: "inactive_preview",
        severity: "info",
        label: `${venture.name} has no active preview`,
        ventureId: venture.ventureId,
      });
    }
  }
  if (model.allocations.some((a) => a.status === "EXHAUSTED")) {
    alerts.push({
      id: "budget-exhausted",
      type: "budget_exhausted",
      severity: "critical",
      label: "One or more allocations exhausted",
    });
  }
  if (risksCount > 0) {
    alerts.push({
      id: "critical-risks",
      type: "critical_risk",
      severity: "warning",
      label: `${risksCount} portfolio risks detected`,
    });
  }
  if (model.decisions.some((d) => d.outcome.toLowerCase().includes("pending"))) {
    alerts.push({
      id: "pending-approval",
      type: "pending_approval",
      severity: "warning",
      label: "Pending approvals require attention",
    });
  }
  return alerts;
}

function mapValueRows(
  ventures: PortfolioVentureCardModel[],
  comparison: ComparePortfolioVenturesResult | null,
): PortfolioValueRow[] {
  if (comparison) {
    return comparison.rows.map((row) => ({
      ventureId: row.ventureId,
      ventureName: row.ventureName,
      stage: row.stage,
      evidence: String(row.evidenceCount),
      milestone: row.expectedTimeToMilestone ?? "UNKNOWN",
      economics: row.economicsSummary,
      risk: row.riskState,
      confidence: row.confidence,
      recommendation: row.uncertaintyFlags.length > 0 ? "Reduce uncertainty" : "Scale validation",
      uncertaintyFlags: [...row.uncertaintyFlags],
    }));
  }
  return ventures.map((venture) => ({
    ventureId: venture.ventureId,
    ventureName: venture.name,
    stage: venture.valueStage,
    evidence: venture.evidenceStatus,
    milestone: "UNKNOWN",
    economics: "UNKNOWN",
    risk: venture.creationHealth,
    confidence: 0,
    recommendation: venture.recommendedAction,
    uncertaintyFlags: ["VALUE_COMPARISON_UNAVAILABLE"],
  }));
}

function metricOrStatus(row: { value: number | null; status: string }, suffix = ""): string {
  if (row.value === null) return row.status;
  return `${row.value.toFixed(2)}${suffix}`;
}

function mapBreakdownRows(rows: readonly RiskBreakdownRow[]) {
  return rows.map((row) => ({
    key: row.key,
    label: row.label,
    weight: metricOrStatus({ value: row.weightPct.value, status: row.weightPct.status }, "%"),
    risk: metricOrStatus({ value: row.riskPct.value, status: row.riskPct.status }, "%"),
    exposure: metricOrStatus({ value: row.exposure.value, status: row.exposure.status }),
  }));
}

function asAnalyticsInput(value: unknown): PortfolioAnalyticsInput | null {
  if (!value || typeof value !== "object") return null;
  const model = value as PortfolioAnalyticsInput;
  return Array.isArray(model.positions) ? model : null;
}

export function buildPortfolioCommandCenterReadModel(
  query: PortfolioCommandCenterQuery,
): PortfolioCommandCenterReadModel | null {
  const root = getCompositionRoot();
  const source = asPortfolioModel((root.store.meta as Record<string, unknown>).portfolio6150
    ? (root.store.meta as Record<string, { readModel?: unknown }>).portfolio6150?.readModel
    : null);

  if (!source || source.portfolioId !== query.portfolioId) return null;

  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.max(1, Math.min(100, query.pageSize ?? 20));
  const start = (page - 1) * pageSize;
  const pagedVentures = source.ventures.slice(start, start + pageSize);

  const previewByVenture = new Map<string, string>();
  const releaseByVenture = new Map<string, string>();
  for (const preview of root.store.previews.values()) {
    const ventureId = root.store.missions.get((preview as { missionId: string }).missionId)?.ventureId;
    if (ventureId && (preview as unknown as { previewUrl?: string }).previewUrl) {
      previewByVenture.set(ventureId, (preview as unknown as { previewUrl: string }).previewUrl);
    }
  }
  for (const release of root.store.releases.values()) {
    const ventureId = root.store.missions.get((release as { missionId: string }).missionId)?.ventureId;
    if (ventureId) {
      releaseByVenture.set(ventureId, String((release as { version?: string }).version ?? "unknown"));
    }
  }

  const approvals = source.decisions.map((decision) => ({
    id: decision.id,
    title: decision.title,
    status: decision.outcome,
    ventureId: decision.ventureId,
  }));
  const approvalsCountByVenture = new Map<string, number>();
  for (const approval of approvals) {
    if (!approval.ventureId) continue;
    approvalsCountByVenture.set(
      approval.ventureId,
      (approvalsCountByVenture.get(approval.ventureId) ?? 0) + 1,
    );
  }

  const ventureCards = pagedVentures.map((venture) =>
    mapVenture(venture, previewByVenture, releaseByVenture, approvalsCountByVenture),
  );
  const executionRows = mapExecutions(ventureCards);

  const compare = (root.store.meta as Record<string, unknown>).valueComparison as
    | ComparePortfolioVenturesResult
    | undefined;
  const valueRows = mapValueRows(ventureCards, compare ?? null);

  const resources = mapResources(source.capacity, source.allocations);
  const alerts = buildAlerts(source, ventureCards, source.risks.length);

  const analyticsInput = asAnalyticsInput(
    (root.store.meta as Record<string, unknown>).portfolioAnalyticsInput,
  ) ?? {
    asOf: source.activity[0]?.at ?? new Date().toISOString(),
    baseCurrency: "UNKNOWN",
    positions: [],
    cash: null,
    benchmarkReturns: [],
    portfolioReturns: [],
    riskFreeRate: null,
  };
  const dashboard = buildPortfolioAnalyticsDashboardModel(
    computePortfolioAnalytics(analyticsInput),
  );

  const analytics = {
    generatedAt: dashboard.generatedAt,
    asOf: dashboard.asOf,
    baseCurrency: dashboard.baseCurrency,
    metrics: dashboard.metricCards.map((card) => ({
      key: card.key,
      label: card.label,
      value: card.value,
      status: card.status,
      note: card.note,
    })),
    risks: dashboard.riskCards.map((card) => ({
      key: card.key,
      label: card.label,
      value: card.value,
      status: card.status,
      note: card.note,
    })),
    byPosition: mapBreakdownRows(dashboard.byPosition),
    bySector: mapBreakdownRows(dashboard.bySector),
    byIndustry: mapBreakdownRows(dashboard.byIndustry),
    byCountry: mapBreakdownRows(dashboard.byCountry),
    byCurrency: mapBreakdownRows(dashboard.byCurrency),
  };

  return {
    generatedAt: new Date().toISOString(),
    freshness: source.freshness,
    workspaceId: source.workspaceId,
    portfolioId: source.portfolioId,
    portfolioName: source.name,
    quickView: {
      portfolioName: source.name,
      totalVentures: source.summary.totalVentures,
      activeVentures: source.summary.activeVentures,
      pausedVentures: source.summary.pausedVentures,
      atRiskVentures: source.summary.atRiskVentures,
      activeExecutions: source.summary.activeExecutions,
      blockers: source.ventures.filter((v) => v.blockers.length > 0).length,
      approvals: approvals.length,
      actualSpend: source.allocations.reduce((sum, item) => sum + item.used, 0),
      estimatedSpend: source.allocations.reduce((sum, item) => sum + item.reserved, 0),
      knownCurrentValue: null,
      nextMilestone: source.activity[0]?.label ?? "No milestone available",
    },
    tabs: [
      "OVERVIEW",
      "VENTURES",
      "VALUE",
      "ANALYTICS",
      "EXECUTIONS",
      "RESOURCES",
      "RISKS",
      "APPROVALS",
      "SHARED_ASSETS",
      "ACTIVITY",
    ],
    pagination: {
      page,
      pageSize,
      total: source.ventures.length,
      totalPages: Math.max(1, Math.ceil(source.ventures.length / pageSize)),
    },
    ventures: ventureCards,
    executions: executionRows,
    value: valueRows,
    analytics,
    resources,
    alerts,
    approvals,
    sharedAssets: source.sharedAssets.map((asset) => ({
      id: asset.id,
      name: asset.name,
      type: asset.assetType,
      ownerVentureId: asset.ownerVentureId,
      approvalStatus: asset.approvalStatus,
    })),
    risks: source.risks,
    activity: source.activity,
    errors: [],
  };
}
