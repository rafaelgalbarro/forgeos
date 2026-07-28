import { afterEach, describe, expect, it } from "vitest";
import { setCompositionRoot } from "@/src/core/composition";
import { deriveNextActions } from "../actions";
import { buildHealthBuckets } from "../mapper";
import { buildCompanyDashboardReadModel } from "../query-handler";
import { classifyReality, normalizeReadiness, normalizeValidation } from "../status";

function withStore(data: {
  ventures?: Array<Record<string, unknown>>;
  missions?: Array<Record<string, unknown>>;
  decisions?: Array<Record<string, unknown>>;
  outputs?: Array<Record<string, unknown>>;
  codebases?: Array<Record<string, unknown>>;
  builds?: Array<Record<string, unknown>>;
  previews?: Array<Record<string, unknown>>;
  releases?: Array<Record<string, unknown>>;
  deployments?: Array<Record<string, unknown>>;
  deliverySnapshots?: Record<string, unknown>;
  previewClassifications?: Record<string, string>;
  meta?: Record<string, unknown>;
}) {
  setCompositionRoot({
    store: {
      ventures: new Map((data.ventures || []).map((v) => [String(v.id), v])),
      missions: new Map((data.missions || []).map((m) => [String(m.id), m])),
      decisions: new Map((data.decisions || []).map((d) => [String(d.id), d])),
      outputs: new Map((data.outputs || []).map((o) => [String(o.id), o])),
      codebases: new Map((data.codebases || []).map((c) => [String(c.id), c])),
      builds: new Map((data.builds || []).map((b) => [String(b.id), b])),
      previews: new Map((data.previews || []).map((p) => [String(p.id), p])),
      releases: new Map((data.releases || []).map((r) => [String(r.id), r])),
      deployments: new Map((data.deployments || []).map((d) => [String(d.id), d])),
      workflowPlans: new Map(),
      deliverySnapshots: new Map(Object.entries(data.deliverySnapshots || {})),
      lineage: new Map(),
      previewClassifications: new Map(Object.entries(data.previewClassifications || {})),
      meta: data.meta || {},
    },
  } as never);
}

describe("company dashboard query handler", () => {
  afterEach(() => setCompositionRoot(null));

  it("returns null for missing venture", () => {
    withStore({});
    expect(buildCompanyDashboardReadModel("v-missing")).toBeNull();
  });

  it("aggregates products, release candidate and dry-run deployment", () => {
    withStore({
      ventures: [{ id: "v-1", name: "ORBITA SPORTS", status: "active", idea: "sports saas" }],
      missions: [
        {
          id: "m-1",
          ventureId: "v-1",
          status: "BUILDING",
          intent: { primary: "Sports", extractedIdea: "ORBITA SPORTS" },
          timeline: [{ id: "t1", at: "2026-07-27", label: "Created", type: "system" }],
        },
      ],
      outputs: [{ id: "o-1", missionId: "m-1", kind: "website", title: "Website", status: "ready", version: 1 }],
      builds: [{ id: "b-1", missionId: "m-1", result: "SUCCESS", validation: { checks: [{ status: "pass" }] } }],
      previews: [{ id: "p-1", missionId: "m-1", previewUrl: "https://preview.local" }],
      releases: [{ id: "r-1", missionId: "m-1", status: "PUBLISHED", version: "1.0.0-rc.1" }],
      deployments: [
        { id: "d-1", missionId: "m-1", status: "PLANNED", dryRun: true, environment: "PREVIEW", realExecution: false },
      ],
      previewClassifications: { "m-1": "PLAN_ONLY" },
    });
    const model = buildCompanyDashboardReadModel("v-1");
    expect(model).not.toBeNull();
    expect(model?.products.length).toBe(1);
    expect(model?.deployment.status).toBe("PLAN_READY");
    expect(model?.release.status).toBe("PUBLISHED");
    expect(model?.mapNodes.some((n) => n.id === "api")).toBe(true);
    expect(model?.sections.length).toBeGreaterThanOrEqual(10);
  });

  it("handles no mobile, no preview, failed build and blockers", () => {
    withStore({
      ventures: [{ id: "v-2", name: "NoPreview Co", status: "active" }],
      missions: [{ id: "m-2", ventureId: "v-2", status: "BLOCKED", timeline: [] }],
      builds: [{ id: "b-2", missionId: "m-2", result: "FAILED" }],
      decisions: [{ id: "d-2", missionId: "m-2", title: "Approve regen", status: "pending" }],
    });
    const model = buildCompanyDashboardReadModel("v-2");
    expect(model?.blockers.length).toBeGreaterThan(0);
    expect(model?.visualOutputs.length).toBe(0);
    expect(model?.mapNodes.find((n) => n.id === "mobile")?.reality).toBe("NOT_APPLICABLE");
    expect(model?.nextActions.some((a) => a.id === "resolve-approvals")).toBe(true);
  });

  it("marks non-dry deployment without credentials as BLOCKED_BY_CONFIGURATION", () => {
    const prev = process.env.FORGEOS_DEPLOY_CREDENTIALS;
    delete process.env.FORGEOS_DEPLOY_CREDENTIALS;
    withStore({
      ventures: [{ id: "v-3", name: "Blocked Deploy", status: "active" }],
      missions: [{ id: "m-3", ventureId: "v-3", status: "READY_FOR_DEPLOY", timeline: [] }],
      deployments: [
        { id: "d-3", missionId: "m-3", status: "IN_PROGRESS", dryRun: false, environment: "PREVIEW", realExecution: false },
      ],
    });
    const model = buildCompanyDashboardReadModel("v-3");
    expect(model?.deployment.status).toBe("BLOCKED_BY_CONFIGURATION");
    expect(model?.deployment.reality).toBe("BLOCKED");
    if (prev === undefined) delete process.env.FORGEOS_DEPLOY_CREDENTIALS;
    else process.env.FORGEOS_DEPLOY_CREDENTIALS = prev;
  });

  it("merges delivery snapshot outputs and supports partial freshness", () => {
    withStore({
      ventures: [{ id: "v-4", name: "Snap Co", status: "active" }],
      missions: [{ id: "m-4", ventureId: "v-4", status: "VALIDATING", timeline: [] }],
      deliverySnapshots: {
        "m-4": {
          outputs: [{ outputId: "snap-1", title: "Brand kit", kind: "DESIGN", status: "APPROVED", version: "1.0.0" }],
        },
      },
    });
    const model = buildCompanyDashboardReadModel("v-4");
    expect(model?.visualOutputs.some((v) => v.title === "Brand kit")).toBe(true);
  });

  it("merges delivery snapshot releases and deployments", () => {
    withStore({
      ventures: [{ id: "v-5", name: "Deploy Snap", status: "active" }],
      missions: [{ id: "m-5", ventureId: "v-5", status: "READY_FOR_DEPLOY", timeline: [] }],
      deliverySnapshots: {
        "m-5": {
          outputs: [{ outputId: "o-5", title: "Website", kind: "WEBSITE_OUTPUT", status: "APPROVED", version: "1.0.0" }],
          releases: [{ releaseId: "rel-5", missionId: "m-5", version: "1.0.0-rc.1", status: "PUBLISHED" }],
          deployments: [
            { deploymentId: "dep-5", missionId: "m-5", dryRun: true, environment: "PREVIEW", realExecution: false },
          ],
        },
      },
    });
    const model = buildCompanyDashboardReadModel("v-5");
    expect(model?.release.status).toBe("PUBLISHED");
    expect(model?.deployment.status).toBe("PLAN_READY");
  });
});

describe("readiness and reality classification", () => {
  it("normalizes readiness variants", () => {
    expect(normalizeReadiness("READY_FOR_DEPLOY")).toBe("READY");
    expect(normalizeReadiness("BLOCKED")).toBe("BLOCKED");
    expect(normalizeReadiness("FAILED")).toBe("FAILED");
    expect(normalizeReadiness("PLANNING")).toBe("PLANNED");
    expect(normalizeReadiness("BUILDING")).toBe("IN_PROGRESS");
  });

  it("normalizes validation statuses", () => {
    expect(normalizeValidation("PASS")).toBe("PASS");
    expect(normalizeValidation("warn")).toBe("WARNING");
    expect(normalizeValidation("FAILED")).toBe("FAIL");
    expect(normalizeValidation("")).toBe("NOT_RUN");
  });

  it("classifies reality consistently", () => {
    expect(
      classifyReality({
        hasRealPreview: false,
        hasFunctionalDeployment: false,
        hasApprovedRelease: false,
        hasGeneratedOutput: false,
        hasValidation: false,
        hasPlanOnly: true,
        hasDryRun: false,
        blocked: false,
        failed: false,
      }),
    ).toBe("PLAN_ONLY");
    expect(
      classifyReality({
        hasRealPreview: true,
        hasFunctionalDeployment: false,
        hasApprovedRelease: false,
        hasGeneratedOutput: true,
        hasValidation: true,
        hasPlanOnly: false,
        hasDryRun: false,
        blocked: false,
        failed: false,
      }),
    ).toBe("REAL_PREVIEW");
  });
});

describe("next actions and health aggregation", () => {
  it("derives prioritized next actions", () => {
    const actions = deriveNextActions({
      ventureId: "v-1",
      products: [
        {
          id: "p1",
          missionId: "m1",
          name: "App",
          type: "Digital Product",
          status: "BUILDING",
          version: "1",
          outputCount: 1,
          readiness: "READY",
          blockers: [],
          reality: "GENERATED_AND_VALIDATED",
        },
      ],
      blockers: ["x"],
      pendingApprovals: [{ id: "a1", label: "Approve" }],
    });
    expect(actions[0]?.id).toBe("resolve-approvals");
    expect(actions.some((a) => a.id === "request-change")).toBe(true);
  });

  it("builds health buckets from section aggregation", () => {
    withStore({
      ventures: [{ id: "v-h", name: "Health Co", status: "active" }],
      missions: [{ id: "m-h", ventureId: "v-h", status: "READY_FOR_DEPLOY", timeline: [] }],
    });
    const model = buildCompanyDashboardReadModel("v-h");
    expect(model).not.toBeNull();
    const health = buildHealthBuckets(model!);
    expect(health.map((h) => h.id)).toEqual(["company", "product", "technical", "gtm", "operational", "release"]);
  });
});
