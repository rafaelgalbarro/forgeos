/**
 * PROGRAM 6100 — Segmented query handlers with caching and isolation.
 */

import { getCompositionRoot } from "@/src/core/composition";
import { readModelCacheGet, readModelCacheSet } from "../cache/read-model-cache";
import { assertVentureAccess, type IsolationContext } from "../isolation/venture-isolation";
import { buildMissionCardProjection } from "../projections/mission-card-projection";
import { buildVentureCardProjection } from "../projections/venture-card-projection";
import { buildCompanyHealthProjection } from "../projections/company-health-projection";
import { buildOutputStatusProjection } from "../projections/output-status-projection";
import { clampPageSize, type PaginatedResult } from "../projections/types";
import type { VenturePortfolioCard } from "../portfolio/types";
import type {
  GetMissionCardParams,
  GetMissionSummaryParams,
  GetVentureCardParams,
  GetCompanyDashboardParams,
  GetOutputSummaryParams,
  GetOutputDetailParams,
  GetProjectSummaryParams,
  GetProjectManifestParams,
  GetProjectFileParams,
  ListPortfolioVenturesParams,
} from "./definitions";

const REQUEST_SCOPE = {};

function missionTitle(mission: {
  intent?: { primary?: string; extractedIdea?: string } | null;
  idea?: string;
  id: string;
}): string {
  return mission.intent?.primary || mission.intent?.extractedIdea || mission.idea || `Mission ${mission.id}`;
}

export function getMissionCard(params: GetMissionCardParams): ReturnType<typeof buildMissionCardProjection> | null {
  const cacheKey = { scope: "read_model" as const, namespace: "mission-card", id: params.missionId };
  const cached = readModelCacheGet<ReturnType<typeof buildMissionCardProjection>>(cacheKey);
  if (cached?.freshness === "LIVE") return cached.value;

  const root = getCompositionRoot();
  const mission = root.store.missions.get(params.missionId);
  if (!mission) return null;

  const outputs = [...root.store.outputs.values()].filter((o) => o.missionId === params.missionId);
  const decisions = [...root.store.decisions.values()].filter(
    (d) => d.missionId === params.missionId && d.status === "pending",
  );
  const preview = root.store.previewClassifications.get(params.missionId);
  const card = buildMissionCardProjection({
    missionId: mission.id,
    ventureId: mission.ventureId ?? "",
    workspaceId: mission.workspaceId ?? "",
    title: missionTitle(mission),
    status: mission.status,
    outputCount: outputs.length,
    pendingDecisions: decisions.length,
    previewStatus: preview === "REAL_READY" ? "READY" : preview === "PLAN_ONLY" ? "NONE" : preview ? "FAILED" : "NONE",
  });
  readModelCacheSet(cacheKey, card, { ttlMs: 30_000, invalidationEvents: ["MissionSummaryChanged"] });
  return card;
}

export function getMissionSummary(params: GetMissionSummaryParams) {
  const card = getMissionCard({ missionId: params.missionId });
  if (!card) return null;
  const root = getCompositionRoot();
  const mission = root.store.missions.get(params.missionId);
  if (!mission) return null;

  const summary: Record<string, unknown> = { ...card };
  if (params.includeOutputs) {
    summary.outputs = [...root.store.outputs.values()]
      .filter((o) => o.missionId === params.missionId)
      .map((o) => buildOutputStatusProjection({
        outputId: o.id,
        missionId: o.missionId,
        ventureId: mission.ventureId ?? "",
        title: o.title,
        kind: o.kind,
        status: o.status,
        outputVersion: String(o.version),
      }));
  }
  if (params.includeWorkflow) {
    const plan = root.store.workflowPlans.get(params.missionId);
    summary.workflow = plan ? { status: (plan as { status?: string }).status, stages: (plan as { stages?: unknown[] }).stages?.length ?? 0 } : null;
  }
  return summary;
}

export function getVentureCard(params: GetVentureCardParams) {
  const cacheKey = { scope: "read_model" as const, namespace: "venture-card", ventureId: params.ventureId, id: params.ventureId };
  const cached = readModelCacheGet<ReturnType<typeof buildVentureCardProjection>>(cacheKey);
  if (cached?.freshness === "LIVE") return cached.value;

  const root = getCompositionRoot();
  const venture = root.store.ventures.get(params.ventureId);
  if (!venture) return null;

  const missions = [...root.store.missions.values()].filter((m) => m.ventureId === params.ventureId);
  const active = missions.filter((m) => !["COMPLETED", "CANCELLED", "FAILED"].includes(m.status));
  const card = buildVentureCardProjection({
    ventureId: venture.id,
    workspaceId: venture.workspaceId,
    name: venture.name,
    lifecycle: venture.status,
    missionCount: missions.length,
    activeMissions: active.length,
    health: active.some((m) => m.status === "BLOCKED") ? "BLOCKED" : active.length > 0 ? "HEALTHY" : "UNKNOWN",
  });
  readModelCacheSet(cacheKey, card, { ttlMs: 60_000, invalidationEvents: ["VentureCardChanged"] });
  return card;
}

export function getCompanyDashboardLight(params: GetCompanyDashboardParams) {
  const cacheKey = {
    scope: "read_model" as const,
    namespace: "company-dashboard",
    ventureId: params.ventureId,
    id: params.section || "full",
  };
  const cached = readModelCacheGet<Record<string, unknown>>(cacheKey);
  if (cached?.freshness === "LIVE") return cached.value;

  const root = getCompositionRoot();
  const venture = root.store.ventures.get(params.ventureId);
  if (!venture) return null;

  const missions = [...root.store.missions.values()].filter((m) => m.ventureId === params.ventureId);
  const builds = [...root.store.builds.values()].filter((b) => missions.some((m) => m.id === (b as { missionId: string }).missionId));
  const previews = [...root.store.previews.values()].filter((p) => missions.some((m) => m.id === (p as { missionId: string }).missionId));
  const decisions = [...root.store.decisions.values()].filter((d) => missions.some((m) => m.id === d.missionId && d.status === "pending"));

  const health = buildCompanyHealthProjection({
    ventureId: params.ventureId,
    blockers: missions.filter((m) => m.status === "BLOCKED").map((m) => `Mission ${m.id} blocked`),
    activeBuilds: builds.filter((b) => (b as { status?: string }).status === "running").length,
    livePreviews: previews.filter((p) => (p as { status?: string }).status === "running").length,
    pendingApprovals: decisions.length,
  });

  const result = {
    ventureId: params.ventureId,
    ventureName: venture.name,
    health,
    missionCards: missions.map((m) => getMissionCard({ missionId: m.id })).filter(Boolean),
    section: params.section,
  };
  readModelCacheSet(cacheKey, result, { ttlMs: 30_000, invalidationEvents: ["CompanyHealthChanged"] });
  return result;
}

export function getOutputSummary(params: GetOutputSummaryParams): PaginatedResult<ReturnType<typeof buildOutputStatusProjection>> {
  const root = getCompositionRoot();
  const mission = root.store.missions.get(params.missionId);
  if (!mission) return { items: [], total: 0, hasMore: false };

  const all = [...root.store.outputs.values()]
    .filter((o) => o.missionId === params.missionId)
    .map((o) => buildOutputStatusProjection({
      outputId: o.id,
      missionId: o.missionId,
      ventureId: mission.ventureId ?? "",
      title: o.title,
      kind: o.kind,
      status: o.status,
      outputVersion: String(o.version),
    }));

  const limit = clampPageSize(params.limit);
  const offset = params.cursor ? parseInt(params.cursor, 10) || 0 : 0;
  const items = all.slice(offset, offset + limit);
  const hasMore = offset + limit < all.length;
  return {
    items,
    total: all.length,
    cursor: hasMore ? String(offset + limit) : undefined,
    hasMore,
  };
}

export function getOutputDetail(params: GetOutputDetailParams) {
  const root = getCompositionRoot();
  const output = root.store.outputs.get(params.outputId);
  if (!output) return null;
  const mission = root.store.missions.get(output.missionId);
  if (!mission) return null;
  return {
    ...buildOutputStatusProjection({
      outputId: output.id,
      missionId: output.missionId,
      ventureId: mission.ventureId ?? "",
      title: output.title,
      kind: output.kind,
      status: output.status,
      outputVersion: String(output.version),
    }),
    content: undefined,
    artifacts: undefined,
  };
}

export function getProjectSummary(params: GetProjectSummaryParams) {
  const root = getCompositionRoot();
  const codebases = [...root.store.codebases.values()].filter(
    (c) => (c as { missionId: string }).missionId === params.missionId,
  );
  return {
    missionId: params.missionId,
    codebaseCount: codebases.length,
    fileCount: codebases.reduce((sum, c) => sum + ((c as { files?: unknown[] }).files?.length ?? 0), 0),
    manifestLoaded: false,
  };
}

export function getProjectManifest(params: GetProjectManifestParams) {
  const root = getCompositionRoot();
  const codebase = [...root.store.codebases.values()].find(
    (c) => (c as { missionId: string }).missionId === params.missionId,
  );
  if (!codebase) return { missionId: params.missionId, files: [] as Array<{ path: string; size: number }> };
  const files = ((codebase as { files?: Array<{ path: string; size?: number }> }).files || []).map((f) => ({
    path: f.path,
    size: f.size ?? 0,
  }));
  return { missionId: params.missionId, files };
}

export function getProjectFile(params: GetProjectFileParams) {
  const manifest = getProjectManifest({ missionId: params.missionId });
  const meta = manifest.files.find((f) => f.path === params.filePath);
  if (!meta) return null;
  if (meta.size > 512_000) {
    return { path: params.filePath, size: meta.size, content: null, truncated: true, reason: "FILE_TOO_LARGE" };
  }
  const root = getCompositionRoot();
  const codebase = [...root.store.codebases.values()].find(
    (c) => (c as { missionId: string }).missionId === params.missionId,
  );
  const file = ((codebase as { files?: Array<{ path: string; content?: string }> }).files || []).find(
    (f) => f.path === params.filePath,
  );
  return { path: params.filePath, size: meta.size, content: file?.content ?? null, truncated: false };
}

export function listPortfolioVentures(params: ListPortfolioVenturesParams): PaginatedResult<VenturePortfolioCard> {
  const root = getCompositionRoot();
  let ventures = [...root.store.ventures.values()].filter((v) => v.workspaceId === params.workspaceId);

  if (params.search) {
    const q = params.search.toLowerCase();
    ventures = ventures.filter((v) => v.name.toLowerCase().includes(q) || v.id.toLowerCase().includes(q));
  }
  if (params.lifecycle) {
    ventures = ventures.filter((v) => v.status === params.lifecycle);
  }

  const cards: VenturePortfolioCard[] = ventures.map((v) => {
    const card = getVentureCard({ ventureId: v.id });
    return {
      ventureId: v.id,
      workspaceId: v.workspaceId,
      name: v.name,
      lifecycle: v.status,
      health: card?.health ?? "UNKNOWN",
      missionCount: card?.missionCount ?? 0,
      activeMissions: card?.activeMissions ?? 0,
      lastActivityAt: card?.lastActivityAt ?? new Date().toISOString(),
      opportunityScore: "NOT_MEASURED" as const,
      validationStatus: "INSUFFICIENT_EVIDENCE" as const,
      expectedValue: "UNKNOWN" as const,
      riskLevel: "NOT_MEASURED" as const,
      activityStatus: card?.activeMissions ? "ACTIVE" : "IDLE",
      valueStatus: "UNKNOWN" as const,
    };
  });

  if (params.health) {
    const filtered = cards.filter((c) => c.health === params.health);
    return paginateCards(filtered, params);
  }

  const sortBy = params.sortBy || "name";
  const dir = params.sortDir === "desc" ? -1 : 1;
  cards.sort((a, b) => {
    const av = a[sortBy as keyof VenturePortfolioCard];
    const bv = b[sortBy as keyof VenturePortfolioCard];
    if (typeof av === "string" && typeof bv === "string") return av.localeCompare(bv) * dir;
    return 0;
  });

  return paginateCards(cards, params);
}

function paginateCards(cards: VenturePortfolioCard[], params: ListPortfolioVenturesParams): PaginatedResult<VenturePortfolioCard> {
  const limit = clampPageSize(params.limit);
  const offset = params.cursor ? parseInt(params.cursor, 10) || 0 : 0;
  const items = cards.slice(offset, offset + limit);
  return {
    items,
    total: cards.length,
    cursor: offset + limit < cards.length ? String(offset + limit) : undefined,
    hasMore: offset + limit < cards.length,
  };
}

export function assertResourceIsolation(
  resource: { ventureId: string; missionId?: string; workspaceId: string },
  context: IsolationContext,
): void {
  assertVentureAccess(resource.ventureId, context);
  void REQUEST_SCOPE;
}
