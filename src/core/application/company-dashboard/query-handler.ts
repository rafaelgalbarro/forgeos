/**
 * PROGRAM 6090 — Aggregate Company Creation Command Center read model
 * from V2 composition store (server-side only).
 */

import { getCompositionRoot } from "@/src/core/composition";
import { getCompanyDashboardLight } from "@/src/core/performance/queries/handlers";
import { recordQueryLatency } from "@/src/core/performance/observability/telemetry";
import { deriveNextActions } from "./actions";
import { buildHealthBuckets } from "./mapper";
import type {
  CompanyDashboardReadModel,
  CompanyDashboardSectionStatus,
  RealityClassification,
  ReadinessStatus,
  ValidationStatus,
} from "./read-model";
import { classifyReality, normalizeReadiness, normalizeValidation } from "./status";

type AnyRecord = Record<string, unknown>;

function asRecord(value: unknown): AnyRecord | null {
  return value && typeof value === "object" ? (value as AnyRecord) : null;
}

function asArray<T = AnyRecord>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function hasUsablePreviewUrl(url: string | undefined | null): boolean {
  return Boolean(url && String(url).trim().length > 0);
}

function resolveDeploymentStatus(deployment: {
  dryRun?: boolean;
  realExecution?: boolean;
} | undefined): "PLAN_READY" | "BLOCKED_BY_CONFIGURATION" | "NOT_CREATED" {
  if (!deployment) return "NOT_CREATED";
  if (deployment.dryRun) return "PLAN_READY";
  // Never claim real deployment without credentials.
  if (!process.env.FORGEOS_DEPLOY_CREDENTIALS) return "BLOCKED_BY_CONFIGURATION";
  // Even with flag, this panel only exposes plan/blocked statuses (no fake DEPLOYED).
  return deployment.realExecution ? "PLAN_READY" : "BLOCKED_BY_CONFIGURATION";
}

function safeCollect<T>(label: string, errors: string[], fn: () => T[], fallback: T[] = []): T[] {
  try {
    return fn();
  } catch (err) {
    errors.push(`${label}: ${err instanceof Error ? err.message : String(err)}`);
    return fallback;
  }
}

export function buildCompanyDashboardReadModel(ventureId: string): CompanyDashboardReadModel | null {
  const lightStart = performance.now();
  getCompanyDashboardLight({ ventureId });
  recordQueryLatency(ventureId, performance.now() - lightStart, true);

  let root;
  try {
    root = getCompositionRoot();
  } catch (err) {
    return null;
  }

  const venture = root.store.ventures.get(ventureId);
  if (!venture) return null;

  const now = new Date().toISOString();
  const errors: string[] = [];

  const missions = safeCollect("missions", errors, () =>
    [...root.store.missions.values()].filter((m) => m.ventureId === ventureId),
  );
  const missionIds = new Set(missions.map((m) => m.id));

  const decisions = safeCollect("decisions", errors, () =>
    [...root.store.decisions.values()].filter((d) => missionIds.has(d.missionId)),
  );
  const outputs = safeCollect("outputs", errors, () =>
    [...root.store.outputs.values()].filter((o) => missionIds.has(o.missionId)),
  );
  const codebases = safeCollect("codebases", errors, () =>
    [...root.store.codebases.values()].filter((c) => missionIds.has((c as { missionId: string }).missionId)),
  );
  const builds = safeCollect("builds", errors, () =>
    [...root.store.builds.values()].filter((b) => missionIds.has((b as { missionId: string }).missionId)),
  );
  const previews = safeCollect("previews", errors, () =>
    [...root.store.previews.values()].filter((p) => missionIds.has((p as { missionId: string }).missionId)),
  );
  const releases = safeCollect("releases", errors, () =>
    [...root.store.releases.values()].filter((r) => missionIds.has((r as { missionId: string }).missionId)),
  );
  const deployments = safeCollect("deployments", errors, () =>
    [...root.store.deployments.values()].filter((d) => missionIds.has((d as { missionId: string }).missionId)),
  );

  const snapshotBuilds: AnyRecord[] = [];
  const snapshotReleases: AnyRecord[] = [];
  const snapshotDeployments: AnyRecord[] = [];
  const snapshotPreviews: AnyRecord[] = [];
  const snapshotCodebases: AnyRecord[] = [];

  for (const mission of missions) {
    const snap = asRecord(root.store.deliverySnapshots.get(mission.id));
    if (!snap) continue;
    snapshotBuilds.push(...asArray(snap.builds));
    snapshotReleases.push(...asArray(snap.releases));
    snapshotDeployments.push(...asArray(snap.deployments));
    snapshotPreviews.push(...asArray(snap.previews));
    snapshotCodebases.push(...asArray(snap.codebases));
  }

  const mergeById = <T extends AnyRecord>(primary: T[], secondary: T[], idKey: string): T[] => {
    const seen = new Set(primary.map((item) => String(item[idKey] || item.id || "")));
    const merged = [...primary];
    for (const item of secondary) {
      const id = String(item[idKey] || item.id || "");
      if (!id || seen.has(id)) continue;
      seen.add(id);
      merged.push(item);
    }
    return merged;
  };

  const mergedBuilds = mergeById(builds as unknown as AnyRecord[], snapshotBuilds, "buildId");
  const mergedReleases = mergeById(releases as unknown as AnyRecord[], snapshotReleases, "releaseId");
  const mergedDeployments = mergeById(deployments as unknown as AnyRecord[], snapshotDeployments, "deploymentId");
  const mergedPreviews = mergeById(previews as unknown as AnyRecord[], snapshotPreviews, "previewId");
  const mergedCodebases = mergeById(codebases as unknown as AnyRecord[], snapshotCodebases, "codebaseId");
  const deliveryBuilds = mergedBuilds;
  const deliveryReleases = mergedReleases;
  const deliveryDeployments = mergedDeployments;
  const deliveryPreviews = mergedPreviews;
  const deliveryCodebases = mergedCodebases;

  // Merge delivery snapshot outputs when present (canonical delivery SoT).
  const snapshotOutputs: Array<{
    id: string;
    missionId: string;
    kind: string;
    title: string;
    status: string;
    version: string;
  }> = [];
  for (const mission of missions) {
    try {
      const snap = asRecord(root.store.deliverySnapshots.get(mission.id));
      for (const o of asArray(snap?.outputs)) {
        const rec = asRecord(o);
        if (!rec) continue;
        snapshotOutputs.push({
          id: String(rec.outputId || rec.id || `${mission.id}-out`),
          missionId: mission.id,
          kind: String(rec.kind || "output"),
          title: String(rec.title || rec.label || "Output"),
          status: String(rec.status || "unknown"),
          version: String(rec.version || "1"),
        });
      }
    } catch (err) {
      errors.push(`deliverySnapshots:${mission.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const mergedOutputs =
    snapshotOutputs.length > 0
      ? [
          ...outputs.map((o) => ({
            id: o.id,
            missionId: o.missionId,
            kind: o.kind,
            title: o.title,
            status: o.status,
            version: String(o.version),
          })),
          ...snapshotOutputs.filter((s) => !outputs.some((o) => o.id === s.id)),
        ]
      : outputs.map((o) => ({
          id: o.id,
          missionId: o.missionId,
          kind: o.kind,
          title: o.title,
          status: o.status,
          version: String(o.version),
        }));

  const previewClassification = (missionId: string) =>
    String(root.store.previewClassifications.get(missionId) || "");

  const visualOutputs = mergedOutputs
    .filter((o) => /website|web_app|webapp|web application|mobile|brand|design/i.test(o.kind) || /website|web application|brand|mobile/i.test(o.title))
    .map((o) => {
      const missionPreview = deliveryPreviews.find((p) => (p as { missionId: string }).missionId === o.missionId);
      const previewUrl = (missionPreview as { previewUrl?: string } | undefined)?.previewUrl;
      const classification = previewClassification(o.missionId);
      let reality: RealityClassification = "GENERATED_NOT_EXECUTED";
      if (classification === "PLAN_ONLY" || !hasUsablePreviewUrl(previewUrl)) {
        reality = hasUsablePreviewUrl(previewUrl) ? "REAL_PREVIEW" : "PLAN_ONLY";
      } else if (classification === "REAL_READY" && hasUsablePreviewUrl(previewUrl)) {
        reality = "REAL_PREVIEW";
      } else if (classification === "BUILD_FAILED" || classification === "RUNTIME_FAILED") {
        reality = "FAILED";
      }
      return {
        id: o.id,
        missionId: o.missionId,
        title: o.title,
        kind: o.kind,
        status: o.status,
        version: o.version,
        previewUrl: hasUsablePreviewUrl(previewUrl) ? previewUrl : undefined,
        reality,
      };
    });

  const products = missions.map((mission) => {
    const missionOutputs = mergedOutputs.filter((o) => o.missionId === mission.id);
    const missionBuilds = deliveryBuilds.filter((b) => (b as { missionId: string }).missionId === mission.id);
    const missionPreviews = deliveryPreviews.filter((p) => (p as { missionId: string }).missionId === mission.id);
    const previewUrl = (missionPreviews[0] as { previewUrl?: string } | undefined)?.previewUrl;
    const blocked =
      mission.status === "BLOCKED" ||
      missionBuilds.some((b) => {
        const result = (b as { result?: string; status?: string }).result || (b as { status?: string }).status;
        return String(result).toUpperCase() === "FAILED";
      });
    const failed = mission.status === "FAILED" || blocked;
    const readiness = normalizeReadiness(mission.status);
    return {
      id: `prod-${mission.id}`,
      missionId: mission.id,
      name: mission.intent?.extractedIdea || mission.intent?.primary || `Mission ${mission.id}`,
      type: "Digital Product",
      status: mission.status,
      version: "v2",
      outputCount: missionOutputs.length,
      previewUrl: hasUsablePreviewUrl(previewUrl) ? previewUrl : undefined,
      readiness,
      blockers: blocked ? ["Mission blocked or build failed"] : [],
      reality: classifyReality({
        hasRealPreview: hasUsablePreviewUrl(previewUrl),
        hasFunctionalDeployment: false,
        hasApprovedRelease: deliveryReleases.some((r) => (r as { missionId: string }).missionId === mission.id),
        hasGeneratedOutput: missionOutputs.length > 0,
        hasValidation: missionBuilds.some((b) => (b as { validation?: unknown }).validation),
        hasPlanOnly: !hasUsablePreviewUrl(previewUrl) && missionOutputs.length === 0,
        hasDryRun: deliveryDeployments.some((d) => (d as { missionId?: string; dryRun?: boolean }).missionId === mission.id && (d as { dryRun?: boolean }).dryRun),
        blocked,
        failed,
      }),
    };
  });

  const release = deliveryReleases[0] as { id?: string; releaseId?: string; version?: string; status?: string } | undefined;
  const deployment = deliveryDeployments[0] as
    | { id?: string; deploymentId?: string; status?: string; environment?: string; dryRun?: boolean; realExecution?: boolean }
    | undefined;

  const deploymentStatus = resolveDeploymentStatus(deployment);

  const blocks = [
    ...missions.filter((m) => m.status === "BLOCKED").map((m) => `Mission ${m.id} is blocked`),
    ...deliveryBuilds
      .filter((b) => {
        const result = (b as { result?: string; status?: string }).result || (b as { status?: string }).status;
        return String(result).toUpperCase() === "FAILED";
      })
      .map((b) => `Build ${(b as { id?: string; buildId?: string }).id || (b as { buildId?: string }).buildId || "unknown"} failed`),
    ...decisions.filter((d) => d.status === "pending").map((d) => `Decision pending: ${d.title}`),
    ...(deploymentStatus === "BLOCKED_BY_CONFIGURATION" ? ["Deployment blocked by configuration (credentials missing)"] : []),
  ];

  const hasMobile = mergedOutputs.some((o) => /mobile/i.test(o.kind) || /mobile/i.test(o.title));
  const hasBrand = mergedOutputs.some((o) => /brand|design/i.test(o.kind) || /brand/i.test(o.title));
  const hasWebsite = mergedOutputs.some((o) => /website/i.test(o.kind) || /website/i.test(o.title));
  const hasWebApp = mergedOutputs.some((o) => /web_app|webapp|web_application|web application/i.test(o.kind) || /web application/i.test(o.title));
  const hasBackend = mergedOutputs.some((o) => /backend/i.test(o.kind) || /backend/i.test(o.title)) || deliveryCodebases.length > 0;
  const hasDb = mergedOutputs.some((o) => /database|db/i.test(o.kind) || /database/i.test(o.title));
  const hasApi = mergedOutputs.some((o) => /api/i.test(o.kind) || /api/i.test(o.title));
  const hasCode = deliveryCodebases.length > 0;
  const hasQa = deliveryBuilds.length > 0;
  const hasPreview = deliveryPreviews.some((p) => hasUsablePreviewUrl((p as { previewUrl?: string }).previewUrl));
  const previewPlanOnly = missions.some((m) => previewClassification(m.id) === "PLAN_ONLY");

  const mapNode = (
    id: string,
    label: string,
    status: ReadinessStatus,
    reality: RealityClassification,
    extras?: { version?: string; blocker?: string; action?: string },
  ) => ({ id, label, status, reality, ...extras });

  const sections: CompanyDashboardSectionStatus[] = [
    { id: "header", label: "A. Company Header", reality: "GENERATED_AND_VALIDATED", readiness: normalizeReadiness(venture.status), blockers: [] },
    { id: "health", label: "B. Creation Health", reality: "GENERATED_AND_VALIDATED", readiness: blocks.length ? "PARTIAL" : "READY", blockers: blocks },
    { id: "summary", label: "C. Executive Summary", reality: "GENERATED_AND_VALIDATED", readiness: "READY", blockers: [] },
    {
      id: "products",
      label: "D. Products",
      reality: products.length ? "GENERATED_AND_VALIDATED" : "NOT_CREATED",
      readiness: products.length ? (blocks.length ? "PARTIAL" : "READY") : "NOT_STARTED",
      blockers: blocks,
    },
    {
      id: "map",
      label: "E. Creation Map",
      reality: "GENERATED_AND_VALIDATED",
      readiness: products.length ? "PARTIAL" : "NOT_STARTED",
      blockers: blocks,
    },
    {
      id: "visual",
      label: "F. Visual Outputs",
      reality: visualOutputs.some((v) => v.reality === "REAL_PREVIEW") ? "REAL_PREVIEW" : previewPlanOnly ? "PLAN_ONLY" : visualOutputs.length ? "GENERATED_NOT_EXECUTED" : "NOT_CREATED",
      readiness: visualOutputs.length ? "PARTIAL" : "NOT_STARTED",
      blockers: [],
    },
    {
      id: "technical",
      label: "G. Technical Foundation",
      reality: hasCode ? "GENERATED_NOT_EXECUTED" : "SPECIFICATION_ONLY",
      readiness: hasCode ? "IN_PROGRESS" : "PLANNED",
      blockers: [],
    },
    {
      id: "business",
      label: "H. Business Assets",
      reality: hasBrand || hasWebsite ? "GENERATED_AND_VALIDATED" : "SPECIFICATION_ONLY",
      readiness: hasBrand || hasWebsite ? "PARTIAL" : "PLANNED",
      blockers: [],
    },
    {
      id: "qa",
      label: "I. QA/Validation",
      reality: hasQa ? "GENERATED_AND_VALIDATED" : "NOT_CREATED",
      readiness: hasQa ? "PARTIAL" : "NOT_STARTED",
      blockers: blocks.filter((b) => /build/i.test(b)),
    },
    {
      id: "release",
      label: "J. Release/Deployment",
      reality: release ? "GENERATED_AND_VALIDATED" : "NOT_CREATED",
      readiness: normalizeReadiness(release?.status),
      blockers: deploymentStatus === "BLOCKED_BY_CONFIGURATION" ? ["Deployment blocked by configuration"] : [],
    },
    {
      id: "activity",
      label: "K. Activity/Blockers/Actions",
      reality: "GENERATED_AND_VALIDATED",
      readiness: "PARTIAL",
      blockers: blocks,
    },
  ];

  const qaItems: Array<{ id: string; label: string; status: ValidationStatus; detail?: string }> = hasQa
    ? deliveryBuilds.map((build, index) => {
        const validation = asRecord((build as AnyRecord).validation);
        const checks = asArray<AnyRecord>(validation?.checks);
        const first = checks[0];
        const result = String((build as AnyRecord).result || (build as AnyRecord).status || "NOT_RUN");
        return {
          id: String((build as AnyRecord).buildId || (build as AnyRecord).id || index),
          label: `Build ${index + 1}`,
          status: normalizeValidation(String((first?.status as string) || result)),
          detail: result,
        };
      })
    : [{ id: "qa-none", label: "No validation run", status: "NOT_RUN", detail: "No builds found" }];

  const model: CompanyDashboardReadModel = {
    generatedAt: now,
    freshness: errors.length > 0 ? "PARTIAL" : "LIVE",
    errors,
    header: {
      ventureId,
      ventureName: venture.name,
      tagline: venture.idea || "No tagline provided yet.",
      sector: /sport|deport|orbita|atlas/i.test(`${venture.name} ${venture.idea || ""}`) ? "Sports SaaS" : "SaaS",
      lifecycle: venture.status,
      missionStatus: missions[0]?.status || "NOT_STARTED",
      version: "v2",
    },
    executiveSummary:
      root.store.meta.executiveSummary && typeof root.store.meta.executiveSummary === "string"
        ? String(root.store.meta.executiveSummary)
        : `Venture ${venture.name} has ${missions.length} mission(s), ${mergedOutputs.length} outputs and ${deliveryReleases.length} release candidate(s).`,
    health: [],
    sections,
    products,
    visualOutputs,
    technicalFoundation: [
      `${deliveryCodebases.length} codebase(s) tracked`,
      `${deliveryBuilds.length} build(s) tracked`,
      `${deliveryPreviews.length} preview(s) tracked`,
      hasApi ? "API artifacts present" : "API: NOT_CREATED",
      hasBackend ? "Backend artifacts present" : "Backend: SPECIFICATION_ONLY",
      hasDb ? "Database artifacts present" : "Database: SPECIFICATION_ONLY",
    ],
    businessAssets: [
      `${mergedOutputs.filter((o) => /brand|website|content|document|venture|design/i.test(o.kind) || /brand|website/i.test(o.title)).length} business/design outputs`,
      `${decisions.filter((d) => d.status === "resolved").length} resolved strategic decisions`,
      `${decisions.filter((d) => d.status === "pending").length} pending approvals`,
    ],
    qa: qaItems,
    release: {
      releaseId: release?.id || release?.releaseId,
      version: release?.version,
      status: release?.status || "NOT_CREATED",
      reality: release ? "GENERATED_AND_VALIDATED" : "NOT_CREATED",
    },
    deployment: {
      deploymentId: deployment?.id || deployment?.deploymentId,
      status: deploymentStatus,
      environment: deployment?.environment,
      reality:
        deploymentStatus === "PLAN_READY"
          ? "DRY_RUN"
          : deploymentStatus === "NOT_CREATED"
            ? "NOT_CREATED"
            : "BLOCKED",
    },
    timeline: missions.flatMap((m) =>
      (m.timeline || []).slice(-8).map((t) => ({ id: t.id, at: t.at, label: t.label, kind: t.type })),
    ),
    blockers: blocks,
    approvals: decisions.map((d) => ({ id: d.id, label: d.title, status: d.status })),
    nextActions: [],
    mapNodes: [
      mapNode("company", "Company", normalizeReadiness(venture.status), "GENERATED_AND_VALIDATED", { version: "v2" }),
      mapNode("brand", "Brand", hasBrand ? "READY" : "PLANNED", hasBrand ? "GENERATED_AND_VALIDATED" : "SPECIFICATION_ONLY"),
      mapNode("website", "Website", hasWebsite ? "PARTIAL" : "PLANNED", hasPreview && hasWebsite ? "REAL_PREVIEW" : hasWebsite ? "GENERATED_NOT_EXECUTED" : "PLAN_ONLY"),
      mapNode("webapp", "WebApp", hasWebApp ? "PARTIAL" : "PLANNED", hasWebApp ? "GENERATED_NOT_EXECUTED" : "PLAN_ONLY"),
      mapNode("mobile", "Mobile", hasMobile ? "PARTIAL" : "NOT_APPLICABLE", hasMobile ? "PLAN_ONLY" : "NOT_APPLICABLE"),
      mapNode("backend", "Backend", hasBackend ? "IN_PROGRESS" : "PLANNED", hasBackend ? "GENERATED_NOT_EXECUTED" : "SPECIFICATION_ONLY"),
      mapNode("db", "Database", hasDb ? "PARTIAL" : "PLANNED", hasDb ? "GENERATED_NOT_EXECUTED" : "SPECIFICATION_ONLY"),
      mapNode("api", "API", hasApi ? "PARTIAL" : "PLANNED", hasApi ? "GENERATED_NOT_EXECUTED" : "SPECIFICATION_ONLY"),
      mapNode("code", "Code", hasCode ? "IN_PROGRESS" : "NOT_STARTED", hasCode ? "GENERATED_NOT_EXECUTED" : "NOT_CREATED"),
      mapNode("qa", "QA", hasQa ? "PARTIAL" : "NOT_STARTED", hasQa ? "GENERATED_AND_VALIDATED" : "NOT_CREATED"),
      mapNode("preview", "Preview", hasPreview ? "PARTIAL" : previewPlanOnly ? "PLANNED" : "NOT_STARTED", hasPreview ? "REAL_PREVIEW" : previewPlanOnly ? "PLAN_ONLY" : "NOT_CREATED"),
      mapNode("release", "Release", normalizeReadiness(release?.status), release ? "GENERATED_AND_VALIDATED" : "NOT_CREATED", { version: release?.version }),
      mapNode(
        "deploy",
        "Deploy",
        deploymentStatus === "PLAN_READY" ? "PARTIAL" : deploymentStatus === "BLOCKED_BY_CONFIGURATION" ? "BLOCKED" : "NOT_STARTED",
        deploymentStatus === "PLAN_READY" ? "DRY_RUN" : deploymentStatus === "BLOCKED_BY_CONFIGURATION" ? "BLOCKED" : "NOT_CREATED",
        { blocker: deploymentStatus === "BLOCKED_BY_CONFIGURATION" ? "Missing deploy credentials" : undefined },
      ),
      mapNode("gtm", "GTM", "PLANNED", "SPECIFICATION_ONLY"),
      mapNode("finance", "Finance", "PLANNED", "SPECIFICATION_ONLY"),
      mapNode("ops", "Ops", blocks.length ? "BLOCKED" : "PARTIAL", blocks.length ? "BLOCKED" : "GENERATED_AND_VALIDATED"),
    ],
  };

  model.nextActions = deriveNextActions({
    ventureId,
    products: model.products,
    blockers: model.blockers,
    pendingApprovals: model.approvals.filter((a) => a.status === "pending"),
  });
  model.health = buildHealthBuckets(model);
  return model;
}
