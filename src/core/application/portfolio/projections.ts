/**
 * Portfolio projections — incremental updates — PROGRAM 6110
 */

import type { PortfolioProps } from "../../domain/portfolio/aggregate";
import type { PortfolioDomainEvent } from "./events";
import type {
  ListPortfolioVenturesResult,
  PortfolioActivityEntry,
  PortfolioCapacityView,
  PortfolioReadModel,
  PortfolioRiskView,
  PortfolioSummaryView,
  VenturePortfolioCard,
} from "./read-model";
import type { Venture } from "../compat-domain";
import { isActiveLifecycle } from "../../domain/portfolio/lifecycle";
import type { VentureLifecycle } from "../../domain/portfolio/types";

export type PortfolioProjectionState = Readonly<{
  portfolio: PortfolioProps;
  activity: PortfolioActivityEntry[];
  executionCounts: Record<string, number>;
  queuedCounts: Record<string, number>;
  lastEventAt?: string;
}>;

export function createEmptyProjection(portfolio: PortfolioProps): PortfolioProjectionState {
  return {
    portfolio,
    activity: [],
    executionCounts: {},
    queuedCounts: {},
  };
}

export function applyPortfolioEvent(
  state: PortfolioProjectionState,
  event: PortfolioDomainEvent,
): PortfolioProjectionState {
  const activityEntry: PortfolioActivityEntry = {
    id: event.eventId,
    at: event.occurredAt,
    type: event.type,
    label: event.type.replace(/([A-Z])/g, " $1").trim(),
    ventureId: "ventureId" in event ? (event.ventureId as string) : undefined,
  };
  return {
    ...state,
    lastEventAt: event.occurredAt,
    activity: [activityEntry, ...state.activity].slice(0, 500),
  };
}

const PRIORITY_ORDER: Record<string, number> = {
  CRITICAL: 0,
  HIGH: 1,
  NORMAL: 2,
  LOW: 3,
  PAUSED: 4,
};

function deriveHealth(
  lifecycle: VentureLifecycle,
  paused: boolean,
  closed: boolean,
  blockers: string[],
): VenturePortfolioCard["health"] {
  if (closed) return "FAILED";
  if (blockers.length > 0) return "BLOCKED";
  if (lifecycle === "AT_RISK" || lifecycle === "FAILED") return "AT_RISK";
  if (paused) return "AT_RISK";
  return "HEALTHY";
}

function deriveValueStatus(lifecycle: VentureLifecycle): VenturePortfolioCard["valueStatus"] {
  if (["IDEA", "DISCOVERING"].includes(lifecycle)) return "UNKNOWN";
  if (["VALIDATING", "PLANNING"].includes(lifecycle)) return "POTENTIAL";
  if (["BUILDING", "READY_TO_LAUNCH", "LAUNCHED"].includes(lifecycle)) return "VALIDATED";
  if (
    ["OPERATING", "GENERATING_TRACTION", "GENERATING_REVENUE", "PROFITABLE", "SCALING"].includes(
      lifecycle,
    )
  )
    return "GENERATING";
  return "UNKNOWN";
}

export function buildVentureCard(
  pv: PortfolioProps["ventures"][string],
  venture?: Venture | null,
  executionCounts: Record<string, number> = {},
  blockers: string[] = [],
): VenturePortfolioCard {
  return {
    ventureId: pv.ventureId,
    name: venture?.name ?? pv.ventureId,
    slug: venture?.slug ?? pv.ventureId,
    priority: pv.priority,
    lifecycle: pv.lifecycle,
    paused: pv.paused,
    archived: pv.archived,
    closed: pv.closed,
    health: deriveHealth(pv.lifecycle, pv.paused, pv.closed, blockers),
    valueStatus: deriveValueStatus(pv.lifecycle),
    blockers,
    activeExecutions: executionCounts[pv.ventureId] ?? 0,
    latestActivity: pv.lifecycleHistory.at(-1)?.timestamp,
    updatedAt: pv.updatedAt,
  };
}

export function buildPortfolioSummary(
  portfolio: PortfolioProps,
  executionCounts: Record<string, number>,
  queuedCounts: Record<string, number>,
): PortfolioSummaryView {
  const ventures = Object.values(portfolio.ventures);
  return {
    portfolioId: portfolio.id,
    workspaceId: portfolio.workspaceId,
    name: portfolio.name,
    totalVentures: ventures.length,
    activeVentures: ventures.filter(
      (v) => !v.closed && !v.archived && !v.paused && isActiveLifecycle(v.lifecycle),
    ).length,
    pausedVentures: ventures.filter((v) => v.paused).length,
    closedVentures: ventures.filter((v) => v.closed).length,
    criticalPriority: ventures.filter((v) => v.priority === "CRITICAL").length,
    atRiskVentures: ventures.filter((v) => v.lifecycle === "AT_RISK").length,
    activeExecutions: Object.values(executionCounts).reduce((a, b) => a + b, 0),
    queuedExecutions: Object.values(queuedCounts).reduce((a, b) => a + b, 0),
  };
}

export function buildCapacityViews(portfolio: PortfolioProps): PortfolioCapacityView[] {
  const byType = new Map<string, { limit: number; used: number }>();
  for (const alloc of Object.values(portfolio.allocations)) {
    if (alloc.status === "RELEASED") continue;
    const cur = byType.get(alloc.resourceType) ?? { limit: 0, used: 0 };
    byType.set(alloc.resourceType, {
      limit: cur.limit + alloc.limit,
      used: cur.used + alloc.used + alloc.reserved,
    });
  }
  for (const [type, wsLimit] of Object.entries(portfolio.workspaceLimits)) {
    const cur = byType.get(type) ?? { limit: 0, used: 0 };
    if (wsLimit > cur.limit) cur.limit = wsLimit;
    byType.set(type, cur);
  }
  return [...byType.entries()].map(([resourceType, { limit, used }]) => ({
    resourceType: resourceType as PortfolioCapacityView["resourceType"],
    limit,
    used,
    available: Math.max(0, limit - used),
    utilizationPercent: limit > 0 ? Math.round((used / limit) * 100) : 0,
  }));
}

export function buildRiskViews(portfolio: PortfolioProps): PortfolioRiskView[] {
  const risks: PortfolioRiskView[] = [];
  for (const v of Object.values(portfolio.ventures)) {
    if (v.lifecycle === "AT_RISK") {
      risks.push({
        id: `risk-lifecycle-${v.ventureId}`,
        ventureId: v.ventureId,
        severity: "HIGH",
        category: "LIFECYCLE",
        message: `Venture at risk: ${v.ventureId}`,
      });
    }
    if (v.closed) {
      risks.push({
        id: `risk-closed-${v.ventureId}`,
        ventureId: v.ventureId,
        severity: "MEDIUM",
        category: "CLOSURE",
        message: `Venture closed: ${v.ventureId}`,
      });
    }
  }
  for (const dep of Object.values(portfolio.dependencies)) {
    if (!dep.approved) {
      risks.push({
        id: `risk-dep-${dep.id}`,
        ventureId: dep.sourceVentureId,
        severity: "MEDIUM",
        category: "DEPENDENCY",
        message: `Unapproved dependency on ${dep.targetVentureId}`,
      });
    }
    const target = portfolio.ventures[dep.targetVentureId];
    if (target?.closed) {
      risks.push({
        id: `risk-provider-closure-${dep.id}`,
        ventureId: dep.sourceVentureId,
        severity: "CRITICAL",
        category: "DEPENDENCY",
        message: `Provider venture ${dep.targetVentureId} is closed`,
      });
    }
  }
  for (const alloc of Object.values(portfolio.allocations)) {
    if (alloc.status === "EXHAUSTED" || alloc.status === "BLOCKED") {
      risks.push({
        id: `risk-alloc-${alloc.id}`,
        ventureId: alloc.ventureId,
        severity: "HIGH",
        category: "RESOURCE",
        message: `Resource ${alloc.resourceType} ${alloc.status.toLowerCase()}`,
      });
    }
  }
  return risks;
}

export function listVentureCards(
  portfolio: PortfolioProps,
  ventures: Map<string, Venture>,
  executionCounts: Record<string, number>,
  opts: {
    page?: number;
    pageSize?: number;
    search?: string;
    sortBy?: "name" | "priority" | "lifecycle" | "updatedAt";
    sortDir?: "asc" | "desc";
    lifecycle?: VentureLifecycle;
    priority?: string;
    health?: string;
    hasBlockers?: boolean;
    activeExecutions?: boolean;
  } = {},
): ListPortfolioVenturesResult {
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? 20;
  let items = Object.values(portfolio.ventures).map((pv) =>
    buildVentureCard(pv, ventures.get(pv.ventureId), executionCounts),
  );
  if (opts.search) {
    const q = opts.search.toLowerCase();
    items = items.filter(
      (c) => c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q),
    );
  }
  if (opts.lifecycle) items = items.filter((c) => c.lifecycle === opts.lifecycle);
  if (opts.priority) items = items.filter((c) => c.priority === opts.priority);
  if (opts.health) items = items.filter((c) => c.health === opts.health);
  if (opts.hasBlockers) items = items.filter((c) => c.blockers.length > 0);
  if (opts.activeExecutions) items = items.filter((c) => c.activeExecutions > 0);

  const sortBy = opts.sortBy ?? "priority";
  const dir = opts.sortDir === "desc" ? -1 : 1;
  items.sort((a, b) => {
    if (sortBy === "priority") {
      return (PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]) * dir;
    }
    if (sortBy === "name") return a.name.localeCompare(b.name) * dir;
    if (sortBy === "lifecycle") return a.lifecycle.localeCompare(b.lifecycle) * dir;
    return a.updatedAt.localeCompare(b.updatedAt) * dir;
  });

  const total = items.length;
  const start = (page - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), total, page, pageSize };
}

export function buildPortfolioReadModel(
  state: PortfolioProjectionState,
  ventures: Map<string, Venture>,
  freshness: "LIVE" | "STALE" | "PARTIAL" = "LIVE",
): PortfolioReadModel {
  const { portfolio } = state;
  const summary = buildPortfolioSummary(
    portfolio,
    state.executionCounts,
    state.queuedCounts,
  );
  const cards = Object.values(portfolio.ventures).map((pv) =>
    buildVentureCard(pv, ventures.get(pv.ventureId), state.executionCounts),
  );
  return {
    generatedAt: new Date().toISOString(),
    freshness,
    portfolioId: portfolio.id,
    workspaceId: portfolio.workspaceId,
    name: portfolio.name,
    slug: portfolio.slug,
    status: portfolio.status,
    summary,
    metrics: summary,
    capacity: buildCapacityViews(portfolio),
    ventures: cards,
    risks: buildRiskViews(portfolio),
    activity: state.activity,
    allocations: Object.values(portfolio.allocations).map((a) => ({
      id: a.id,
      ventureId: a.ventureId,
      resourceType: a.resourceType,
      limit: a.limit,
      used: a.used,
      reserved: a.reserved,
      available: a.available,
      status: a.status,
      period: a.period,
    })),
    dependencies: Object.values(portfolio.dependencies).map((d) => ({
      id: d.id,
      sourceVentureId: d.sourceVentureId,
      targetVentureId: d.targetVentureId,
      dependencyType: d.dependencyType,
      approved: d.approved,
      risk: d.approved ? "LOW" : ("MEDIUM" as const),
    })),
    sharedAssets: Object.values(portfolio.sharedAssets).map((a) => ({
      id: a.id,
      name: a.name,
      assetType: a.assetType,
      ownerVentureId: a.ownerVentureId,
      approvalStatus: a.approvalStatus,
      version: a.version,
    })),
    policies: Object.values(portfolio.policies).map((p) => ({
      id: p.id,
      kind: p.kind,
      enabled: p.enabled,
      config: p.config,
    })),
    decisions: Object.values(portfolio.decisions).map((d) => ({
      id: d.id,
      title: d.title,
      outcome: d.outcome,
      recordedAt: d.recordedAt,
      ventureId: d.ventureId,
    })),
  };
}
