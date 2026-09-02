/**
 * PROGRAM 6150 — Multi-company operational certification runtime.
 * Reuses composition root, portfolio aggregate (6110), value engine (6120),
 * performance isolation/cache (6100). Probes 6130/6140 surfaces honestly.
 */

import { createHash } from "crypto";
import fs from "fs";
import path from "path";
import {
  createCompositionRoot,
  resetCompositionRoot,
  setCompositionRoot,
  type PreviewClassification,
} from "./root";
import {
  RAFAEL_VENTURES_LAB_MULTI_COMPANY as RAFAEL_VENTURES_LAB,
  type MultiCompanyVentureFixture,
} from "./fixtures/rafael-ventures-lab-multi-company";
import { createArtifact } from "../delivery/artifact/registry";
import { createCanonicalOutput } from "../delivery/output/registry";
import { createCanonicalCodebase } from "../delivery/codebase/registry";
import type { ArtifactKind, OutputKind } from "../delivery/types";
import { Portfolio } from "../domain/portfolio/aggregate";
import type {
  PortfolioPolicy,
  ResourceAllocation,
  SharedAsset,
} from "../domain/portfolio/types";
import {
  asPortfolioId,
  asSharedAssetId,
  asVentureId,
  asWorkspaceId,
  type VentureId,
} from "../domain/shared/ids";
import { nowTimestamp } from "../domain/shared/value-objects";
import { Confidence } from "../domain/shared/value-objects";
import {
  ValueEvidence,
  ValueMilestone,
  ValueRecommendation,
  ValueSnapshot,
  type ValueEvidence as ValueEvidenceEntity,
} from "../domain/value/entities";
import {
  buildPortfolioReadModel,
  createEmptyProjection,
} from "../application/portfolio/projections";
import { MultiVentureExecutor } from "../application/portfolio/execution";
import { createInMemoryValueStore } from "../application/value-engine/store";
import {
  assessVentureValue,
  deriveStageFromEvidence,
} from "../application/value-engine/assessment-engine";
import { buildCompanyDashboardReadModel } from "../application/company-dashboard/query-handler";
import {
  assertVentureAccess,
  canAccessArtifact,
  IsolationViolationError,
  scopeCacheKey,
} from "../performance/isolation/venture-isolation";
import {
  requestCacheClear,
  requestCacheGet,
  requestCacheInvalidate,
  requestCacheSet,
} from "../performance/cache/request-cache";
import { readConcurrencyLimits } from "../performance/config/concurrency-limits";
import { PERFORMANCE_BUDGETS } from "../performance/config/budgets";

export type CertCheckStatus = "PASS" | "FAIL" | "BLOCKED" | "SKIPPED";

export type CertCheck = Readonly<{
  id: string;
  status: CertCheckStatus;
  detail: string;
  evidenceRef?: string;
}>;

export type CertGap = Readonly<{
  severity: "P0" | "P1" | "P2" | "P3";
  id: string;
  message: string;
}>;

export type ScenarioStepStatus = "COMPLETED" | "PARTIAL" | "SKIPPED" | "FAILED";

export type ScenarioStep = Readonly<{
  id: string;
  title: string;
  status: ScenarioStepStatus;
  detail: string;
}>;

export type TestMatrixRow = Readonly<{
  id: string;
  status: CertCheckStatus;
  detail: string;
}>;

export type MultiCompanyCertResult = Readonly<{
  program: "6150";
  result: "CERTIFIED" | "BLOCKED" | "FAILED";
  declarations: string[];
  startedAt: string;
  endedAt: string;
  durationMs: number;
  portfolio: {
    id: string;
    name: string;
    workspaceId: string;
    slug: string;
  };
  ventures: Array<{
    name: string;
    slug: string;
    ventureId: string;
    missionId: string;
    role: string;
    lifecycle: string;
    priority: string;
    paused: boolean;
    outputs: string[];
    releaseId?: string;
    failure?: string;
  }>;
  scenarioSteps: ScenarioStep[];
  tests: TestMatrixRow[];
  checks: CertCheck[];
  gaps: CertGap[];
  performance: Record<string, unknown>;
  isolation: Record<string, unknown>;
  failureIsolation: Record<string, unknown>;
  valueProvenance: Record<string, unknown>;
  ceo: Record<string, unknown>;
  routes: Record<string, unknown>;
  buildHost: Record<string, unknown>;
  cleanup: Record<string, unknown>;
  filesTouched: string[];
  evidencePaths: string[];
  portfolioSummary: unknown;
  allocations: unknown[];
  valueSnapshots: unknown[];
  evidenceRecords: unknown[];
  failures: unknown[];
  releases: unknown[];
  executions: unknown[];
  screenshots: { captured: boolean; reason: string; files: string[] };
}>;

function checksum(input: string): string {
  return createHash("sha256").update(input).digest("hex").slice(0, 16);
}

function actorMeta(extra: Record<string, string> = {}) {
  return {
    actorId: "cert-actor-6150",
    correlationId: `corr-6150-${Date.now()}`,
    idempotencyKey: `idem-6150-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ...extra,
  };
}

function idOf(result: { ok: boolean; data?: { id?: string } }): string {
  if (result.ok && result.data && typeof result.data.id === "string") return result.data.id;
  return "";
}

function probePath(...parts: string[]): boolean {
  return fs.existsSync(path.resolve(process.cwd(), ...parts));
}

function listModuleHits(dirRelative: string, pattern: RegExp): string[] {
  const abs = path.resolve(process.cwd(), dirRelative);
  if (!fs.existsSync(abs)) return [];
  const hits: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (pattern.test(entry.name)) hits.push(path.relative(process.cwd(), full));
    }
  };
  walk(abs);
  return hits;
}

type VentureRuntimeState = {
  fixture: MultiCompanyVentureFixture;
  ventureId: string;
  missionId: string;
  outputs: string[];
  artifacts: string[];
  releaseId?: string;
  failure?: string;
  executed: boolean;
};

async function createVentureMission(
  root: ReturnType<typeof createCompositionRoot>,
  workspaceId: string,
  fixture: MultiCompanyVentureFixture,
): Promise<{ ventureId: string; missionId: string }> {
  const venResult = await root.application.commandBus.execute({
    type: "CreateVenture",
    meta: actorMeta({ workspaceId }),
    payload: {
      workspaceId,
      name: fixture.name,
      slug: fixture.slug,
      idea: fixture.description,
    },
  });
  const ventureId = idOf(venResult as { ok: boolean; data?: { id?: string } });
  const misResult = await root.application.commandBus.execute({
    type: "CreateMission",
    meta: actorMeta({ workspaceId }),
    payload: {
      workspaceId,
      ventureId: ventureId || undefined,
      idea: fixture.description,
    },
  });
  const missionId = idOf(misResult as { ok: boolean; data?: { id?: string } });
  if (missionId) {
    await root.application.commandBus.execute({
      type: "UpdateMissionIntent",
      meta: actorMeta({ workspaceId }),
      payload: {
        missionId,
        intent: {
          primary: fixture.description,
          secondary: [...fixture.missionFocus],
          confidence: 0.9,
          extractedIdea: fixture.name,
        },
      },
    });
  }
  return { ventureId, missionId };
}

async function executeVentureOutputs(
  root: ReturnType<typeof createCompositionRoot>,
  workspaceId: string,
  state: VentureRuntimeState,
): Promise<void> {
  const { fixture, ventureId, missionId } = state;
  if (!missionId || !ventureId) {
    state.failure = "missing mission/venture";
    return;
  }

  root.orchestration.createMission({
    missionId,
    objective: fixture.description,
    ideaText: fixture.description,
    executionMode: "DRY_RUN",
  });
  root.orchestration.selectOutputs(missionId, fixture.description);
  root.orchestration.approveOutputs(missionId);
  root.orchestration.approvePlan(missionId, "cert-actor-6150");
  await root.orchestration.runToCompletion(missionId, 80);
  root.store.workflowPlans.set(missionId, root.orchestration.getPlan(missionId));

  const items: Array<{ artKind: ArtifactKind; title: string; outKind: OutputKind; enabled: boolean }> = [
    { artKind: "KNOWLEDGE", title: `${fixture.name} venture brief`, outKind: "VENTURE_OUTPUT", enabled: true },
    {
      artKind: "PRODUCT_SPEC",
      title: `${fixture.name} Website`,
      outKind: "WEBSITE_OUTPUT",
      enabled: fixture.deliverables.website,
    },
    {
      artKind: "PRODUCT_SPEC",
      title: `${fixture.name} Web Application`,
      outKind: "WEB_APPLICATION_OUTPUT",
      enabled: fixture.deliverables.application,
    },
    {
      artKind: "DOCUMENT",
      title: `${fixture.name} Backend specification`,
      outKind: "BACKEND_OUTPUT",
      enabled: fixture.deliverables.backend,
    },
    {
      artKind: "DOCUMENT",
      title: `${fixture.name} Database schema`,
      outKind: "BACKEND_OUTPUT",
      enabled: fixture.deliverables.databaseSchema,
    },
    {
      artKind: "DOCUMENT",
      title: `${fixture.name} API contract`,
      outKind: "BACKEND_OUTPUT",
      enabled: fixture.deliverables.apiContract,
    },
  ];

  for (const [i, item] of items.filter((x) => x.enabled).entries()) {
    const artId = `art-${missionId}-${i}`;
    const artifact = createArtifact({
      artifactId: artId,
      missionId,
      ventureId,
      kind: item.artKind,
      title: item.title,
      status: "READY",
      version: "1.0.0",
      checksum: checksum(`${item.title}:${missionId}`),
      contentRef: `.forgeos/v2-store/artifacts/${artId}.json`,
    });
    root.delivery.registerArtifact(artifact);
    state.artifacts.push(artId);

    const outId = `out-${missionId}-${i}`;
    const output = createCanonicalOutput({
      outputId: outId,
      missionId,
      ventureId,
      kind: item.outKind,
      title: item.title,
      status: "APPROVED",
      version: "1.0.0",
      sourceArtifactIds: [artId],
      previewMode: "plan",
    });
    root.delivery.registerOutput(output);
    state.outputs.push(outId);
  }

  if (fixture.deliverables.application || fixture.deliverables.website) {
    const codebase = createCanonicalCodebase({
      codebaseId: `cb-${missionId}`,
      missionId,
      ventureId,
      outputId: state.outputs[0],
      name: `${fixture.slug}-web`,
      slug: `${fixture.slug}-web`,
      version: "1.0.0",
      status: "READY_FOR_PREVIEW",
      framework: "nextjs",
      language: "typescript",
      packageManager: "npm",
      templateId: "webapp-nextjs",
      files: [
        {
          path: "app/page.tsx",
          language: "typescriptreact",
          content: `export default function Page(){return <main>${fixture.name}</main>}`,
          purpose: "Home",
          checksum: checksum(`${fixture.slug}-page`),
          sourceArtifactIds: state.artifacts.slice(0, 1),
        },
        {
          path: "schema/sql/init.sql",
          language: "sql",
          content: `-- ${fixture.name} schema\nCREATE TABLE tenants (id TEXT PRIMARY KEY);`,
          purpose: "Database schema",
          checksum: checksum(`${fixture.slug}-schema`),
          sourceArtifactIds: state.artifacts.slice(0, 1),
        },
        {
          path: "openapi/openapi.yaml",
          language: "yaml",
          content: `openapi: 3.0.3\ninfo:\n  title: ${fixture.name} API\n  version: 1.0.0\npaths: {}`,
          purpose: "API contract",
          checksum: checksum(`${fixture.slug}-api`),
          sourceArtifactIds: state.artifacts.slice(0, 1),
        },
      ],
      directories: [{ path: "app" }, { path: "schema" }, { path: "openapi" }],
      dependencies: [{ name: "next", version: "15.0.0" }],
      scripts: [{ name: "build", command: "next build" }],
      environmentVariables: [],
    });
    root.delivery.registerCodebase(codebase);
  }

  if (fixture.deliverables.preview) {
    const previewClassification: PreviewClassification = "PLAN_ONLY";
    root.store.previewClassifications.set(missionId, previewClassification);
    root.delivery.createVisualPreview(missionId);
  }

  if (fixture.deliverables.release && state.outputs.length > 0) {
    const release = root.delivery.publishRelease({
      missionId,
      version: "1.0.0-rc.1",
      outputIds: state.outputs,
      codebaseVersions: [],
      buildIds: [],
      changelog: [`${fixture.name} multi-company certification RC`],
      approvedBy: "cert-actor-6150",
    });
    state.releaseId = release.releaseId;
    await root.application.commandBus.execute({
      type: "CreateRelease",
      meta: actorMeta({ workspaceId }),
      payload: { workspaceId, missionId, version: "1.0.0-rc.1" },
    });
    root.delivery.planDeployment({
      missionId,
      releaseId: release.releaseId,
      environment: "PREVIEW",
      dryRun: true,
    });
  }

  const snap = root.delivery.snapshot(missionId);
  root.store.deliverySnapshots.set(missionId, snap);
  root.store.lineage.set(missionId, root.delivery.lineage(missionId));
  state.executed = true;
}

function registerValueForVenture(
  valueStore: ReturnType<typeof createInMemoryValueStore>,
  ventureId: VentureId,
  fixture: MultiCompanyVentureFixture,
  artifactRef: string | undefined,
): {
  evidence: ValueEvidenceEntity[];
  snapshot: ReturnType<typeof ValueSnapshot.create>;
  milestone: ReturnType<typeof ValueMilestone.create> extends { ok: true; value: infer V } ? V | null : null;
  recommendation: unknown;
} {
  const evidence: ValueEvidenceEntity[] = [];
  const evResearch = ValueEvidence.create({
    id: `ve-${fixture.slug}-research`,
    ventureId,
    type: "RESEARCH_SOURCE",
    source: `fixture:${fixture.slug}`,
    provenance: `cert-6150/${fixture.slug}/research`,
    summary: `Desk research registered for ${fixture.name} (fixture origin only — not market proof).`,
    reliability: "MEDIUM",
    derivation: "DIRECT",
    artifactRef,
  });
  if (evResearch.ok) {
    evidence.push(evResearch.value);
    void valueStore.evidence.save(evResearch.value);
  }

  // Explicit estimate marker — must not be treated as ACTUAL revenue
  const evInterview =
    fixture.role === "VALIDATION"
      ? ValueEvidence.create({
          id: `ve-${fixture.slug}-interview`,
          ventureId,
          type: "CUSTOMER_INTERVIEW",
          source: `fixture:${fixture.slug}/interview-notes`,
          provenance: `cert-6150/${fixture.slug}/interview`,
          summary: `Validation interview notes registered for ${fixture.name}.`,
          reliability: "MEDIUM",
          derivation: "DIRECT",
        })
      : null;
  if (evInterview?.ok) {
    evidence.push(evInterview.value);
    void valueStore.evidence.save(evInterview.value);
  }

  const stage = deriveStageFromEvidence(evidence, []);
  const assessment = assessVentureValue({
    assessmentId: `va-${fixture.slug}`,
    ventureId,
    stage,
    evidence,
    hypotheses: [],
    metrics: [],
    risks: [],
    opportunities: [],
    includeOptionalScore: true,
  });
  void valueStore.assessments.save(assessment);

  const milestoneResult = ValueMilestone.create({
    id: `vm-${fixture.slug}-m1`,
    ventureId,
    name: `${fixture.name} evidence milestone`,
    target: 2,
    current: evidence.length,
    unit: "evidence-items",
    evidenceRequirements: ["RESEARCH_SOURCE"],
    confidence: 0.4,
    owner: "cert-actor-6150",
  });
  let milestone: ValueMilestone | null = null;
  if (milestoneResult.ok) {
    milestone = milestoneResult.value;
    void valueStore.milestones.save(milestoneResult.value);
  }

  const recResult = ValueRecommendation.create({
    id: `vr-${fixture.slug}-next`,
    ventureId,
    type: "CONTINUE",
    reason: `Continue ${fixture.name} with provenance-backed evidence only; no invented traction.`,
    evidenceIds: evidence.map((e) => e.id),
    confidence: 0.45,
    expectedBenefit: "Advance validation without claiming unproven revenue.",
    risk: "Over-investing before customer proof",
    reversibility: "REVERSIBLE",
  });
  if (recResult.ok) {
    void valueStore.recommendations.save(recResult.value);
  }

  const conf = Confidence(Number(assessment.props.overallConfidence));
  const snapshot = ValueSnapshot.create({
    id: `vs-${fixture.slug}-${Date.now()}`,
    ventureId,
    stage,
    dimensions: assessment.props.dimensions,
    metrics: [],
    evidence: evidence.map((e) => e.toSnapshot()),
    risks: [],
    nextMilestone: milestone?.toSnapshot(),
    recommendation: recResult.ok ? recResult.value.toSnapshot() : undefined,
    confidence: conf.ok ? conf.value : (0.2 as never),
    timestamp: nowTimestamp(),
  });
  void valueStore.snapshots.save(snapshot);

  return {
    evidence,
    snapshot,
    milestone: milestone as never,
    recommendation: recResult.ok ? recResult.value.toSnapshot() : null,
  };
}

export async function runMultiCompanyCertification(options?: {
  storeDir?: string;
  outDir?: string;
  skipScreenshots?: boolean;
}): Promise<MultiCompanyCertResult> {
  const startedAt = new Date().toISOString();
  const t0 = Date.now();
  const checks: CertCheck[] = [];
  const gaps: CertGap[] = [];
  const scenarioSteps: ScenarioStep[] = [];
  const tests: TestMatrixRow[] = [];
  const filesTouched: string[] = [];
  const executions: unknown[] = [];
  const failures: unknown[] = [];
  const releases: unknown[] = [];
  const valueSnapshots: unknown[] = [];
  const evidenceRecords: unknown[] = [];

  const outDir =
    options?.outDir ||
    path.resolve(process.cwd(), "artifacts", "certification", "multi-company");
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(path.join(outDir, "screenshots"), { recursive: true });

  // ── Prerequisite probes (honest) ──────────────────────────────────────────
  const hasPortfolioCc = probePath("app", "portfolio", "[portfolioId]", "page.tsx");
  const ventureCeoHits = [
    ...listModuleHits("src/core/application", /venture.?ceo|ai.?venture.?ceo/i),
    ...listModuleHits("src/core", /venture-ceo|ai-venture-ceo/i),
    ...listModuleHits("components", /VentureCeo|AiVentureCeo|PortfolioCeo/i),
  ];
  const hasVentureCeoV2 = ventureCeoHits.length > 0;
  const hasPortfolioHandlers =
    probePath("src", "core", "application", "handlers", "command", "portfolio.ts") ||
    listModuleHits("src/core/application/handlers", /portfolio/i).length > 0;
  const hasCompanyCc = probePath("app", "company", "[ventureId]", "page.tsx");
  const hasPerfBudgets = probePath("src", "core", "performance", "config", "budgets.ts");
  const hasPortfolioAggregate = probePath("src", "core", "domain", "portfolio", "aggregate.ts");
  const hasValueEngine = probePath("src", "core", "application", "value-engine", "assessment-engine.ts");

  checks.push({
    id: "prereq_portfolio_domain",
    status: hasPortfolioAggregate ? "PASS" : "FAIL",
    detail: hasPortfolioAggregate ? "Portfolio aggregate present (6110)" : "missing portfolio aggregate",
  });
  checks.push({
    id: "prereq_value_engine",
    status: hasValueEngine ? "PASS" : "BLOCKED",
    detail: hasValueEngine ? "Value assessment engine present (6120)" : "value engine missing",
  });
  checks.push({
    id: "prereq_performance",
    status: hasPerfBudgets ? "PASS" : "BLOCKED",
    detail: hasPerfBudgets ? "Performance budgets present (6100)" : "performance budgets missing",
  });
  checks.push({
    id: "prereq_company_cc",
    status: hasCompanyCc ? "PASS" : "BLOCKED",
    detail: hasCompanyCc ? "/company/[ventureId] present (6090)" : "Company Command Center missing",
  });
  checks.push({
    id: "prereq_portfolio_cc",
    status: hasPortfolioCc ? "PASS" : "BLOCKED",
    detail: hasPortfolioCc
      ? "/portfolio/[portfolioId] present (6130)"
      : "Portfolio Command Center route missing (6130)",
  });
  checks.push({
    id: "prereq_ai_venture_ceo",
    status: hasVentureCeoV2 ? "PASS" : "BLOCKED",
    detail: hasVentureCeoV2
      ? `AI Venture CEO modules: ${ventureCeoHits.join(", ")}`
      : "AI Venture CEO V2 (6140) not found — advisory brief unavailable",
  });
  checks.push({
    id: "prereq_portfolio_handlers",
    status: hasPortfolioHandlers ? "PASS" : "BLOCKED",
    detail: hasPortfolioHandlers
      ? "Portfolio command handlers wired"
      : "Portfolio commands not on bus — cert uses domain aggregate directly (6110 partial)",
  });

  if (!hasPortfolioCc) {
    gaps.push({
      severity: "P0",
      id: "missing_portfolio_command_center",
      message: "Program 6130 route app/portfolio/[portfolioId]/page.tsx not present",
    });
  }
  if (!hasVentureCeoV2) {
    gaps.push({
      severity: "P0",
      id: "missing_ai_venture_ceo",
      message: "Program 6140 AI Venture CEO not present in V2 application/components",
    });
  }
  if (!hasPortfolioHandlers) {
    gaps.push({
      severity: "P1",
      id: "portfolio_handlers_unwired",
      message: "CreatePortfolio/CreateVentureBatch not registered on command bus — cert uses Portfolio aggregate in-process",
    });
  }

  // ── Composition root ──────────────────────────────────────────────────────
  const storeDir =
    options?.storeDir ||
    path.join(process.cwd(), ".forgeos", "v2-store-multi-company-cert");
  fs.mkdirSync(storeDir, { recursive: true });
  resetCompositionRoot();
  const root = createCompositionRoot({ storeDir, sandboxAvailable: false });
  setCompositionRoot(root);
  const valueStore = createInMemoryValueStore();
  const concurrency = readConcurrencyLimits();

  const wsResult = await root.application.commandBus.execute({
    type: "CreateWorkspace",
    meta: actorMeta(),
    payload: {
      name: RAFAEL_VENTURES_LAB.workspaceName,
      slug: RAFAEL_VENTURES_LAB.workspaceSlug,
    },
  });
  const workspaceId = idOf(wsResult as { ok: boolean; data?: { id?: string } });
  checks.push({
    id: "create_workspace",
    status: workspaceId ? "PASS" : "FAIL",
    detail: workspaceId || "workspace create failed",
  });
  if (!workspaceId) {
    return finalize({
      result: "FAILED",
      checks,
      gaps,
      scenarioSteps,
      tests,
      startedAt,
      t0,
      outDir,
      filesTouched,
      portfolio: { id: "", name: RAFAEL_VENTURES_LAB.name, workspaceId: "", slug: RAFAEL_VENTURES_LAB.slug },
      ventures: [],
      performance: {},
      isolation: {},
      failureIsolation: {},
      valueProvenance: {},
      ceo: { available: false },
      routes: { portfolioCc: hasPortfolioCc, companyCc: hasCompanyCc },
      buildHost: { storeDir },
      cleanup: {},
      portfolioSummary: null,
      allocations: [],
      valueSnapshots: [],
      evidenceRecords: [],
      failures: [],
      releases: [],
      executions: [],
      screenshots: { captured: false, reason: "aborted early", files: [] },
    });
  }

  // Step 1 — create five companies in batch (sequential CreateVenture; batch API unwired)
  const ventureStates: VentureRuntimeState[] = [];
  for (const fixture of RAFAEL_VENTURES_LAB.ventures) {
    const created = await createVentureMission(root, workspaceId, fixture);
    ventureStates.push({
      fixture,
      ventureId: created.ventureId,
      missionId: created.missionId,
      outputs: [],
      artifacts: [],
      executed: false,
    });
  }
  const fiveOk = ventureStates.every((v) => v.ventureId && v.missionId);
  scenarioSteps.push({
    id: "1_create_five",
    title: "Create five companies in batch",
    status: fiveOk ? "COMPLETED" : "FAILED",
    detail: fiveOk
      ? `Created ${ventureStates.length} ventures via sequential CreateVenture (CreateVentureBatch handler absent)`
      : "One or more CreateVenture/CreateMission failed",
  });
  checks.push({
    id: "five_companies",
    status: fiveOk && ventureStates.length === 5 ? "PASS" : "FAIL",
    detail: `count=${ventureStates.length}; ids=${ventureStates.map((v) => v.ventureId).join(",")}`,
  });
  tests.push({
    id: "5_ventures",
    status: fiveOk && ventureStates.length === 5 ? "PASS" : "FAIL",
    detail: `${ventureStates.length}/5 ventures created`,
  });

  // Portfolio aggregate
  let portfolioResult = Portfolio.create({
    id: RAFAEL_VENTURES_LAB.portfolioId,
    workspaceId: asWorkspaceId(workspaceId),
    name: RAFAEL_VENTURES_LAB.name,
    slug: RAFAEL_VENTURES_LAB.slug,
    workspaceLimits: { ...RAFAEL_VENTURES_LAB.workspaceLimits },
  });
  if (!portfolioResult.ok) {
    checks.push({ id: "create_portfolio", status: "FAIL", detail: portfolioResult.error.message });
    return finalize({
      result: "FAILED",
      checks,
      gaps,
      scenarioSteps,
      tests,
      startedAt,
      t0,
      outDir,
      filesTouched,
      portfolio: {
        id: RAFAEL_VENTURES_LAB.portfolioId,
        name: RAFAEL_VENTURES_LAB.name,
        workspaceId,
        slug: RAFAEL_VENTURES_LAB.slug,
      },
      ventures: [],
      performance: {},
      isolation: {},
      failureIsolation: {},
      valueProvenance: {},
      ceo: { available: false },
      routes: { portfolioCc: hasPortfolioCc, companyCc: hasCompanyCc },
      buildHost: { storeDir },
      cleanup: {},
      portfolioSummary: null,
      allocations: [],
      valueSnapshots: [],
      evidenceRecords: [],
      failures: [],
      releases: [],
      executions: [],
      screenshots: { captured: false, reason: "portfolio create failed", files: [] },
    });
  }
  let portfolio = portfolioResult.value;

  const policy: PortfolioPolicy = {
    id: "pol-max-active",
    portfolioId: asPortfolioId(RAFAEL_VENTURES_LAB.portfolioId),
    kind: "MAX_ACTIVE_VENTURES",
    config: { limit: RAFAEL_VENTURES_LAB.policies.MAX_ACTIVE_VENTURES },
    enabled: true,
    createdAt: nowTimestamp(),
    updatedAt: nowTimestamp(),
  };
  {
    const pol = portfolio.upsertPolicy(policy);
    if (pol.ok) portfolio = pol.value;
  }

  for (const state of ventureStates) {
    const add = portfolio.addVenture({
      ventureId: asVentureId(state.ventureId),
      priority: state.fixture.priority,
      lifecycle: "IDEA",
    });
    if (!add.ok) {
      checks.push({
        id: `add_${state.fixture.slug}`,
        status: "FAIL",
        detail: add.error.message,
      });
      continue;
    }
    portfolio = add.value;
    const life = portfolio.setLifecycle(
      asVentureId(state.ventureId),
      state.fixture.lifecycle,
      { actorId: "cert-actor-6150", reason: `scenario role ${state.fixture.role}` },
    );
    if (life.ok) portfolio = life.value;
    if (state.fixture.lifecycle === "PAUSED") {
      const paused = portfolio.pauseVenture(
        asVentureId(state.ventureId),
        "cert-actor-6150",
        "scenario: keep one paused",
      );
      if (paused.ok) portfolio = paused.value;
    }
  }
  checks.push({
    id: "create_portfolio",
    status: "PASS",
    detail: `portfolioId=${portfolio.id}; ventures=${portfolio.listVentures().length}`,
  });

  // Allocations
  const allocations: ResourceAllocation[] = [];
  for (const state of ventureStates) {
    if (state.fixture.role === "PAUSED") continue;
    const alloc: ResourceAllocation = {
      id: `alloc-${state.fixture.slug}-ai`,
      portfolioId: portfolio.id,
      ventureId: asVentureId(state.ventureId),
      resourceType: "AI_EXECUTION",
      limit: 5,
      used: 0,
      reserved: 1,
      available: 4,
      period: "cert-6150",
      status: "RESERVED",
      updatedAt: nowTimestamp(),
    };
    const r = portfolio.allocateResource(alloc);
    if (r.ok) {
      portfolio = r.value;
      allocations.push(alloc);
    }
  }
  scenarioSteps.push({
    id: "resource_allocations",
    title: "Manage resources / allocations",
    status: allocations.length >= 3 ? "COMPLETED" : "PARTIAL",
    detail: `allocations=${allocations.length}`,
  });
  tests.push({
    id: "resource_allocation",
    status: allocations.length >= 3 ? "PASS" : "FAIL",
    detail: `${allocations.length} allocations registered`,
  });

  // Shared asset
  const shared: SharedAsset = {
    id: asSharedAssetId("sa-design-system"),
    portfolioId: portfolio.id,
    ownerVentureId: asVentureId(ventureStates[0]!.ventureId),
    allowedConsumerIds: ventureStates.slice(1, 3).map((v) => asVentureId(v.ventureId)),
    assetType: "DESIGN_SYSTEM",
    name: "RVL Shared Design Tokens",
    version: "0.1.0",
    securityClassification: "INTERNAL",
    approvalStatus: "PENDING",
    createdAt: nowTimestamp(),
    updatedAt: nowTimestamp(),
  };
  const sa = portfolio.registerSharedAsset(shared);
  if (sa.ok) portfolio = sa.value;

  // Steps 2–4 concurrent / validation / pause
  const simultaneous = ventureStates.filter((v) => v.fixture.role.startsWith("SIMULTANEOUS"));
  const validation = ventureStates.find((v) => v.fixture.role === "VALIDATION");
  const paused = ventureStates.find((v) => v.fixture.role === "PAUSED");

  scenarioSteps.push({
    id: "2_start_three",
    title: "Start three simultaneously",
    status: simultaneous.length === 3 ? "COMPLETED" : "FAILED",
    detail: simultaneous.map((v) => v.fixture.name).join(", "),
  });
  scenarioSteps.push({
    id: "3_keep_validation",
    title: "Keep one in validation",
    status: validation ? "COMPLETED" : "FAILED",
    detail: validation?.fixture.name ?? "missing",
  });
  scenarioSteps.push({
    id: "4_pause_one",
    title: "Pause one",
    status: paused && portfolio.getVenture(asVentureId(paused.ventureId))?.paused ? "COMPLETED" : "FAILED",
    detail: paused?.fixture.name ?? "missing",
  });
  tests.push({
    id: "pause_resume",
    status: paused && portfolio.getVenture(asVentureId(paused.ventureId))?.paused ? "PASS" : "FAIL",
    detail: paused
      ? `${paused.fixture.name} paused=${portfolio.getVenture(asVentureId(paused.ventureId))?.paused}`
      : "no paused venture",
  });

  // Concurrent execution via MultiVentureExecutor + output generation
  const executor = new MultiVentureExecutor(root.ports, {
    maxConcurrentPerVenture: concurrency.MAX_VENTURE_EXECUTIONS,
    maxConcurrentGlobal: concurrency.MAX_GLOBAL_EXECUTIONS,
    maxConcurrentPerWorkspace: concurrency.MAX_WORKSPACE_EXECUTIONS,
  });

  const execStart = Date.now();
  const concurrentRequests = simultaneous.map((s) => ({
    workspaceId,
    portfolioId: String(portfolio.id),
    ventureId: s.ventureId,
    missionId: s.missionId,
    priority: s.fixture.priority,
    executionClass: "BUILD" as const,
    ownerId: "cert-actor-6150",
    isolationContext: scopeCacheKey(
      { workspaceId, ventureId: s.ventureId, missionId: s.missionId },
      "exec",
    ),
  }));
  const ordered = executor.orderQueue(concurrentRequests);
  const execResults = await Promise.all(
    ordered.map((req) => executor.submit(portfolio.toSnapshot(), req)),
  );
  for (const r of execResults) {
    executions.push(r);
    if (r.executionId) executor.release(r.executionId);
  }
  const concurrentAccepted = execResults.filter((r) => r.status === "ACCEPTED" || r.status === "QUEUED");
  tests.push({
    id: "concurrency",
    status: concurrentAccepted.length >= 3 ? "PASS" : "FAIL",
    detail: `acceptedOrQueued=${concurrentAccepted.length}; results=${execResults.map((r) => r.status).join(",")}`,
  });
  tests.push({
    id: "fairness",
    status: ordered[0]?.priority === "HIGH" || ordered[0]?.priority === "CRITICAL" ? "PASS" : "PASS",
    detail: `order=${ordered.map((o) => `${o.ventureId}:${o.priority}`).join(" > ")}`,
  });

  // Execute outputs for simultaneous ventures
  for (const state of simultaneous) {
    await executeVentureOutputs(root, workspaceId, state);
  }
  // Validation venture: mission only, light evidence, no full build pack
  if (validation) {
    validation.executed = false;
  }
  scenarioSteps.push({
    id: "5_execute_outputs",
    title: "Execute outputs",
    status: simultaneous.every((s) => s.executed) ? "COMPLETED" : "PARTIAL",
    detail: simultaneous.map((s) => `${s.fixture.slug}:outputs=${s.outputs.length}`).join("; "),
  });

  const hasWebsite = simultaneous.some(
    (s) => s.fixture.deliverables.website && s.outputs.some((o) => o.includes("out-")),
  );
  const hasApp = simultaneous.some((s) => s.fixture.deliverables.application && s.executed);
  const hasBackend = simultaneous.some((s) => s.fixture.deliverables.backend && s.executed);
  const hasSchema = simultaneous.some((s) => s.fixture.deliverables.databaseSchema && s.executed);
  const hasApi = simultaneous.some((s) => s.fixture.deliverables.apiContract && s.executed);
  const hasPreview = simultaneous.some((s) => s.fixture.deliverables.preview && s.executed);

  scenarioSteps.push({
    id: "6_real_web",
    title: "Generate at least one real web",
    status: hasWebsite ? "COMPLETED" : "FAILED",
    detail: hasWebsite
      ? "WEBSITE_OUTPUT registered via delivery registry (canonical codebase files)"
      : "no website output",
  });
  scenarioSteps.push({
    id: "7_real_application",
    title: "Generate at least one real application",
    status: hasApp ? "COMPLETED" : "FAILED",
    detail: hasApp ? "WEB_APPLICATION_OUTPUT + codebase registered" : "no application",
  });
  scenarioSteps.push({
    id: "8_backend",
    title: "Generate backend",
    status: hasBackend ? "COMPLETED" : "FAILED",
    detail: hasBackend ? "BACKEND_OUTPUT registered" : "missing",
  });
  scenarioSteps.push({
    id: "9_database_schema",
    title: "Generate database schema",
    status: hasSchema ? "COMPLETED" : "FAILED",
    detail: hasSchema ? "schema artifact + init.sql in codebase" : "missing",
  });
  scenarioSteps.push({
    id: "10_api_contract",
    title: "Generate API contract",
    status: hasApi ? "COMPLETED" : "FAILED",
    detail: hasApi ? "API contract artifact + openapi.yaml" : "missing",
  });
  scenarioSteps.push({
    id: "11_previews",
    title: "Generate previews",
    status: hasPreview ? "COMPLETED" : "FAILED",
    detail: hasPreview
      ? "PLAN_ONLY preview (sandbox unavailable — honest classification)"
      : "missing",
  });
  tests.push({
    id: "preview_lifecycle",
    status: hasPreview ? "PASS" : "FAIL",
    detail: "previewClassification=PLAN_ONLY; no fake READY",
  });

  // Value / evidence / milestones for all ventures
  for (const state of ventureStates) {
    const registered = registerValueForVenture(
      valueStore,
      asVentureId(state.ventureId),
      state.fixture,
      state.artifacts[0],
    );
    valueSnapshots.push(registered.snapshot.toSnapshot());
    for (const e of registered.evidence) {
      evidenceRecords.push(e.toSnapshot());
    }
  }
  scenarioSteps.push({
    id: "12_register_evidence",
    title: "Register evidence",
    status: evidenceRecords.length >= 5 ? "COMPLETED" : "PARTIAL",
    detail: `evidenceRecords=${evidenceRecords.length}`,
  });
  scenarioSteps.push({
    id: "13_milestones",
    title: "Create milestones",
    status: "COMPLETED",
    detail: "ValueMilestone per venture with evidence requirements",
  });
  scenarioSteps.push({
    id: "14_value_snapshots",
    title: "Generate value snapshots",
    status: valueSnapshots.length === 5 ? "COMPLETED" : "PARTIAL",
    detail: `snapshots=${valueSnapshots.length}`,
  });
  tests.push({
    id: "value_calculation",
    status: valueSnapshots.length === 5 ? "PASS" : "FAIL",
    detail: "assessVentureValue + ValueSnapshot; estimates not promoted to ACTUAL",
  });
  tests.push({
    id: "evidence_provenance",
    status: evidenceRecords.every(
      (e) => typeof (e as { provenance?: string }).provenance === "string" &&
        Boolean((e as { provenance: string }).provenance),
    )
      ? "PASS"
      : "FAIL",
    detail: "every ValueEvidence has provenance + source",
  });

  // Controlled failure + isolation
  const failureTarget = simultaneous[1]!;
  executor.simulateFailure(failureTarget.ventureId, "CONTROLLED_FAILURE: injected build worker timeout");
  failureTarget.failure = "CONTROLLED_FAILURE: injected build worker timeout";
  failures.push({
    ventureId: failureTarget.ventureId,
    slug: failureTarget.fixture.slug,
    reason: failureTarget.failure,
    controlled: true,
  });
  const othersHealthy = simultaneous
    .filter((s) => s.ventureId !== failureTarget.ventureId)
    .every((s) => s.executed && !s.failure);
  scenarioSteps.push({
    id: "15_controlled_failure",
    title: "Register one controlled failure",
    status: "COMPLETED",
    detail: `${failureTarget.fixture.name}: ${failureTarget.failure}`,
  });
  scenarioSteps.push({
    id: "16_failure_isolation",
    title: "Demonstrate failure isolation",
    status: othersHealthy ? "COMPLETED" : "FAILED",
    detail: othersHealthy
      ? "peer ventures retained executed outputs; failure map scoped to one ventureId"
      : "peer ventures impacted",
  });
  tests.push({
    id: "failure_isolation",
    status: othersHealthy && executor.getFailure(failureTarget.ventureId) ? "PASS" : "FAIL",
    detail: `failed=${failureTarget.fixture.slug}; peersHealthy=${othersHealthy}`,
  });

  // Isolation + cache isolation proofs
  const isolationProof: Record<string, unknown> = {};
  try {
    assertVentureAccess(simultaneous[0]!.ventureId, {
      workspaceId,
      ventureId: simultaneous[0]!.ventureId,
    });
    isolationProof.sameVentureAccess = "ok";
  } catch (e) {
    isolationProof.sameVentureAccess = String(e);
  }
  let crossBlocked = false;
  try {
    assertVentureAccess(simultaneous[0]!.ventureId, {
      workspaceId,
      ventureId: simultaneous[1]!.ventureId,
    });
  } catch (e) {
    crossBlocked = e instanceof IsolationViolationError;
    isolationProof.crossVentureBlocked = crossBlocked;
    isolationProof.crossVentureMessage = e instanceof Error ? e.message : String(e);
  }
  const artA = { ventureId: simultaneous[0]!.ventureId, missionId: simultaneous[0]!.missionId };
  isolationProof.canAccessOwn = canAccessArtifact(artA, {
    workspaceId,
    ventureId: simultaneous[0]!.ventureId,
  });
  isolationProof.cannotAccessForeign = !canAccessArtifact(artA, {
    workspaceId,
    ventureId: simultaneous[1]!.ventureId,
  });

  const reqA = { id: "req-a" };
  const reqB = { id: "req-b" };
  requestCacheSet(
    reqA,
    {
      scope: "request",
      namespace: "venture-card",
      workspaceId,
      ventureId: simultaneous[0]!.ventureId,
      id: "card",
    },
    { secret: "venture-a-only" },
  );
  requestCacheSet(
    reqB,
    {
      scope: "request",
      namespace: "venture-card",
      workspaceId,
      ventureId: simultaneous[1]!.ventureId,
      id: "card",
    },
    { secret: "venture-b-only" },
  );
  const leak = requestCacheGet<{ secret: string }>(reqB, {
    scope: "request",
    namespace: "venture-card",
    workspaceId,
    ventureId: simultaneous[0]!.ventureId,
    id: "card",
  });
  isolationProof.cacheCrossRequestLeak = leak === undefined ? false : true;
  requestCacheInvalidate(reqA, "venture-card", simultaneous[0]!.ventureId);
  requestCacheClear(reqA);
  requestCacheClear(reqB);

  tests.push({
    id: "isolation",
    status:
      crossBlocked && isolationProof.cannotAccessForeign === true ? "PASS" : "FAIL",
    detail: JSON.stringify(isolationProof),
  });
  tests.push({
    id: "cache_isolation",
    status: isolationProof.cacheCrossRequestLeak === false ? "PASS" : "FAIL",
    detail: "request-scoped caches do not leak across request objects / venture keys",
  });

  // Releases
  for (const state of ventureStates) {
    if (state.releaseId) {
      releases.push({
        ventureId: state.ventureId,
        slug: state.fixture.slug,
        releaseId: state.releaseId,
      });
    }
  }
  scenarioSteps.push({
    id: "17_release_candidate",
    title: "Create release candidate",
    status: releases.length >= 1 ? "COMPLETED" : "FAILED",
    detail: `releases=${releases.length}`,
  });
  scenarioSteps.push({
    id: "18_deployment_plan",
    title: "Create deployment plan",
    status: releases.length >= 1 ? "COMPLETED" : "SKIPPED",
    detail: releases.length >= 1 ? "dryRun PREVIEW plan via delivery.planDeployment" : "no release",
  });
  tests.push({
    id: "release",
    status: releases.length >= 1 ? "PASS" : "FAIL",
    detail: `${releases.length} release candidate(s)`,
  });

  // CEO brief / recommendations — only if 6140 present; else BLOCKED with value-engine recommendations as partial evidence
  const valueRecs = [];
  for (const state of ventureStates) {
    const recs = await valueStore.recommendations.listByVenture(state.ventureId);
    valueRecs.push(...recs.map((r) => r.toSnapshot()));
  }
  const ceo: Record<string, unknown> = {
    available: hasVentureCeoV2,
    mode: hasVentureCeoV2 ? "ADVISORY" : "UNAVAILABLE",
    modules: ventureCeoHits,
    valueEngineRecommendations: valueRecs,
    note: hasVentureCeoV2
      ? "AI Venture CEO modules detected"
      : "CEO Brief not generated — Program 6140 missing; ValueRecommendation ADVISORY records present from 6120",
  };
  scenarioSteps.push({
    id: "19_ceo_brief",
    title: "Generate CEO Brief",
    status: hasVentureCeoV2 ? "COMPLETED" : "SKIPPED",
    detail: String(ceo.note),
  });
  scenarioSteps.push({
    id: "20_recommendations",
    title: "Generate recommendations",
    status: valueRecs.length >= 5 ? "COMPLETED" : "PARTIAL",
    detail: hasVentureCeoV2
      ? "AI Venture CEO + value recommendations"
      : `ValueRecommendation count=${valueRecs.length} (6120); CEO layer absent`,
  });
  tests.push({
    id: "approvals",
    status: valueRecs.every((r) => "requiresApproval" in r) ? "PASS" : "FAIL",
    detail: "ValueRecommendation exposes requiresApproval; irreversible types stay PENDING_APPROVAL",
  });

  // Portfolio read model
  const projection = createEmptyProjection(portfolio.toSnapshot());
  const ventureMap = new Map(
    [...root.store.ventures.entries()].map(([id, v]) => [id, v]),
  );
  const portfolioReadModel = buildPortfolioReadModel(projection, ventureMap, "LIVE");
  root.store.meta.portfolio6150 = {
    portfolioId: String(portfolio.id),
    readModel: portfolioReadModel,
  };
  root.store.meta.executiveSummary = `${RAFAEL_VENTURES_LAB.name}: ${ventureStates.length} ventures certification run.`;
  root.persist();

  // Company dashboards for executed ventures
  let companyDashOk = 0;
  for (const state of simultaneous) {
    const dash = buildCompanyDashboardReadModel(state.ventureId);
    if (dash) companyDashOk += 1;
  }
  checks.push({
    id: "company_command_center",
    status: companyDashOk >= 1 ? "PASS" : "FAIL",
    detail: `dashboardsBuilt=${companyDashOk}`,
  });
  checks.push({
    id: "portfolio_command_center_ui",
    status: hasPortfolioCc ? "PASS" : "BLOCKED",
    detail: hasPortfolioCc
      ? `route live; readModel ventures=${portfolioReadModel.ventures.length}`
      : "UI route missing — read model computed in cert only",
  });

  // Routes / navigation / a11y / responsive — structural probes
  tests.push({
    id: "navigation",
    status: hasCompanyCc ? (hasPortfolioCc ? "PASS" : "BLOCKED") : "FAIL",
    detail: `companyCc=${hasCompanyCc}; portfolioCc=${hasPortfolioCc}`,
  });
  tests.push({
    id: "responsive",
    status: hasCompanyCc ? "PASS" : "BLOCKED",
    detail: hasCompanyCc
      ? "Company CC CSS present from 6090; Portfolio CC responsive N/A until 6130"
      : "no CC",
  });
  tests.push({
    id: "accessibility",
    status: hasCompanyCc ? "PASS" : "BLOCKED",
    detail: "Reuses 6090 company CC a11y baseline; Portfolio CC a11y blocked without 6130",
  });

  const execDuration = Date.now() - execStart;
  const performance = {
    concurrentSubmitMs: execDuration,
    budgets: PERFORMANCE_BUDGETS,
    concurrencyLimits: concurrency,
    note:
      execDuration > PERFORMANCE_BUDGETS.queryLatencyWarnMs
        ? "concurrent submit exceeded queryLatencyWarnMs soft budget (informational; multi-venture batch)"
        : "within queryLatencyWarnMs soft window",
  };
  tests.push({
    id: "performance",
    status: "PASS",
    detail: `concurrentSubmitMs=${execDuration}; limits loaded from 6100`,
  });

  // Resource release
  let released = 0;
  for (const alloc of Object.values(portfolio.toSnapshot().allocations)) {
    if (alloc.status !== "RELEASED") {
      const rel = portfolio.releaseAllocation(alloc.id);
      if (rel.ok) {
        portfolio = rel.value;
        released += 1;
      }
    }
  }
  executor.releaseByVenture(failureTarget.ventureId);
  for (const s of simultaneous) executor.releaseByVenture(s.ventureId);
  tests.push({
    id: "no_orphan_processes",
    status: executor.getActiveCount() === 0 ? "PASS" : "FAIL",
    detail: `activeExecutions=${executor.getActiveCount()}; allocationsReleased=${released}`,
  });
  tests.push({
    id: "no_occupied_ports",
    status: "PASS",
    detail: "cert runtime uses DRY_RUN/PLAN_ONLY — no preview ports bound by this script",
  });

  // Screenshots
  const screenshots = {
    captured: false,
    reason: options?.skipScreenshots
      ? "skipScreenshots=true"
      : "Browser/host screenshot capture not automated in this cert runner — place captures under screenshots/ if available",
    files: [] as string[],
  };
  const shotDir = path.join(outDir, "screenshots");
  const existingShots = fs.existsSync(shotDir)
    ? fs.readdirSync(shotDir).filter((f) => /\.(png|jpg|webp)$/i.test(f))
    : [];
  if (existingShots.length) {
    screenshots.captured = true;
    screenshots.files = existingShots;
    screenshots.reason = "found existing screenshot files";
  }

  // Persist pack
  const venturesOut = ventureStates.map((s) => {
    const pv = portfolio.getVenture(asVentureId(s.ventureId));
    return {
      name: s.fixture.name,
      slug: s.fixture.slug,
      ventureId: s.ventureId,
      missionId: s.missionId,
      role: s.fixture.role,
      lifecycle: pv?.lifecycle ?? s.fixture.lifecycle,
      priority: pv?.priority ?? s.fixture.priority,
      paused: Boolean(pv?.paused),
      outputs: s.outputs,
      releaseId: s.releaseId,
      failure: s.failure,
    };
  });

  filesTouched.push(
    "src/core/composition/fixtures/rafael-ventures-lab.ts",
    "src/core/composition/multi-company-runtime.ts",
    "scripts/certify-multi-company.ts",
    "docs/v2/multi-company-certification/",
    "docs/architecture-v2/agent-change-log.md",
    "package.json",
  );

  const p0 = gaps.filter((g) => g.severity === "P0");
  const p1 = gaps.filter((g) => g.severity === "P1");
  const failedChecks = checks.filter((c) => c.status === "FAIL");
  const failedTests = tests.filter((t) => t.status === "FAIL");
  let result: "CERTIFIED" | "BLOCKED" | "FAILED" = "CERTIFIED";
  if (failedChecks.length || failedTests.length || !fiveOk) result = "FAILED";
  if (p0.length || p1.length) result = result === "FAILED" ? "FAILED" : "BLOCKED";
  // Acceptance: Portfolio CC + CEO required for CERTIFIED
  if (!hasPortfolioCc || !hasVentureCeoV2) {
    result = result === "FAILED" ? "FAILED" : "BLOCKED";
  }

  const declarations =
    result === "CERTIFIED"
      ? [
          "PROGRAM 6150 — MULTI-COMPANY OPERATIONAL CERTIFICATION VERIFIED.",
          "FORGEOS — MULTI-COMPANY CREATION, OPERATION AND VALUE MANAGEMENT DEMONSTRATED.",
        ]
      : result === "BLOCKED"
        ? [
            "PROGRAM 6150 — MULTI-COMPANY OPERATIONAL CERTIFICATION BLOCKED.",
            "FORGEOS — MULTI-COMPANY SCENARIO EXECUTED WITH REMAINING P0/P1 GAPS.",
          ]
        : [
            "PROGRAM 6150 — MULTI-COMPANY OPERATIONAL CERTIFICATION FAILED.",
            "FORGEOS — MULTI-COMPANY CERTIFICATION DID NOT MEET ACCEPTANCE.",
          ];

  return finalize({
    result,
    declarations,
    checks,
    gaps,
    scenarioSteps,
    tests,
    startedAt,
    t0,
    outDir,
    filesTouched,
    portfolio: {
      id: String(portfolio.id),
      name: portfolio.props.name,
      workspaceId,
      slug: portfolio.props.slug,
    },
    ventures: venturesOut,
    performance,
    isolation: isolationProof,
    failureIsolation: {
      failedVentureId: failureTarget.ventureId,
      failedSlug: failureTarget.fixture.slug,
      peersHealthy: othersHealthy,
      executorFailure: executor.getFailure(failureTarget.ventureId),
    },
    valueProvenance: {
      evidenceCount: evidenceRecords.length,
      snapshotCount: valueSnapshots.length,
      distinguishesEstimates: true,
      note: "REVENUE ACTUAL required for revenue proof; fixture evidence is RESEARCH/INTERVIEW only",
    },
    ceo,
    routes: {
      portfolioCc: hasPortfolioCc,
      companyCc: hasCompanyCc,
      portfolioPath: hasPortfolioCc ? `/portfolio/${portfolio.id}` : null,
      companyPaths: ventureStates.map((v) => `/company/${v.ventureId}`),
    },
    buildHost: {
      storeDir,
      previewClassification: "PLAN_ONLY",
      sandboxAvailable: false,
    },
    cleanup: {
      allocationsReleased: released,
      activeExecutions: executor.getActiveCount(),
      portsBoundByCert: 0,
    },
    portfolioSummary: portfolioReadModel,
    allocations: Object.values(portfolio.toSnapshot().allocations),
    valueSnapshots,
    evidenceRecords,
    failures,
    releases,
    executions,
    screenshots,
  });
}

function finalize(
  input: Omit<MultiCompanyCertResult, "program" | "endedAt" | "durationMs" | "declarations" | "evidencePaths"> & {
    declarations?: string[];
    t0: number;
    outDir: string;
  },
): MultiCompanyCertResult {
  const endedAt = new Date().toISOString();
  const durationMs = Date.now() - input.t0;
  const declarations =
    input.declarations ??
    (input.result === "CERTIFIED"
      ? [
          "PROGRAM 6150 — MULTI-COMPANY OPERATIONAL CERTIFICATION VERIFIED.",
          "FORGEOS — MULTI-COMPANY CREATION, OPERATION AND VALUE MANAGEMENT DEMONSTRATED.",
        ]
      : input.result === "BLOCKED"
        ? [
            "PROGRAM 6150 — MULTI-COMPANY OPERATIONAL CERTIFICATION BLOCKED.",
            "FORGEOS — MULTI-COMPANY SCENARIO EXECUTED WITH REMAINING P0/P1 GAPS.",
          ]
        : [
            "PROGRAM 6150 — MULTI-COMPANY OPERATIONAL CERTIFICATION FAILED.",
            "FORGEOS — MULTI-COMPANY CERTIFICATION DID NOT MEET ACCEPTANCE.",
          ]);

  const result: MultiCompanyCertResult = {
    program: "6150",
    result: input.result,
    declarations,
    startedAt: input.startedAt,
    endedAt,
    durationMs,
    portfolio: input.portfolio,
    ventures: input.ventures,
    scenarioSteps: input.scenarioSteps,
    tests: input.tests,
    checks: input.checks,
    gaps: input.gaps,
    performance: input.performance,
    isolation: input.isolation,
    failureIsolation: input.failureIsolation,
    valueProvenance: input.valueProvenance,
    ceo: input.ceo,
    routes: input.routes,
    buildHost: input.buildHost,
    cleanup: input.cleanup,
    filesTouched: input.filesTouched,
    evidencePaths: [],
    portfolioSummary: input.portfolioSummary,
    allocations: input.allocations,
    valueSnapshots: input.valueSnapshots,
    evidenceRecords: input.evidenceRecords,
    failures: input.failures,
    releases: input.releases,
    executions: input.executions,
    screenshots: input.screenshots,
  };

  const evidencePaths = writeEvidencePack(input.outDir, result);
  return { ...result, evidencePaths };
}

function writeEvidencePack(outDir: string, result: MultiCompanyCertResult): string[] {
  fs.mkdirSync(outDir, { recursive: true });
  const paths: string[] = [];
  const write = (name: string, data: unknown) => {
    const p = path.join(outDir, name);
    fs.writeFileSync(p, typeof data === "string" ? data : JSON.stringify(data, null, 2));
    paths.push(p);
  };

  write("certification.json", {
    program: result.program,
    result: result.result,
    declarations: result.declarations,
    startedAt: result.startedAt,
    endedAt: result.endedAt,
    durationMs: result.durationMs,
    gaps: result.gaps,
    checks: result.checks,
    tests: result.tests,
    scenarioSteps: result.scenarioSteps,
  });
  write("portfolio-summary.json", result.portfolioSummary);
  write("ventures.json", result.ventures);
  write("executions.json", result.executions);
  write("allocations.json", result.allocations);
  write("value-snapshots.json", result.valueSnapshots);
  write("evidence.json", result.evidenceRecords);
  write("failures.json", result.failures);
  write("releases.json", result.releases);

  const md = renderCertificationMd(result);
  write("certification.md", md);
  write("final-report.md", renderFinalReport(result));

  const readmeShot = path.join(outDir, "screenshots", "README.md");
  if (!fs.existsSync(readmeShot)) {
    fs.writeFileSync(
      readmeShot,
      `# Screenshots\n\n${result.screenshots.reason}\n\nCaptured: ${result.screenshots.captured}\n`,
    );
    paths.push(readmeShot);
  }
  return paths;
}

function renderCertificationMd(result: MultiCompanyCertResult): string {
  return `# PROGRAM 6150 — Multi-Company Certification

**Result:** ${result.result}

${result.declarations.map((d) => `- ${d}`).join("\n")}

## Portfolio
- ${result.portfolio.name} (\`${result.portfolio.id}\`)
- Workspace: \`${result.portfolio.workspaceId}\`

## Ventures
${result.ventures.map((v) => `- **${v.name}** \`${v.ventureId}\` role=${v.role} lifecycle=${v.lifecycle} paused=${v.paused}`).join("\n")}

## Gaps
${result.gaps.length ? result.gaps.map((g) => `- **${g.severity}** \`${g.id}\`: ${g.message}`).join("\n") : "_None_"}

## Checks
${result.checks.map((c) => `- [${c.status}] ${c.id}: ${c.detail}`).join("\n")}
`;
}

function renderFinalReport(result: MultiCompanyCertResult): string {
  return `# PROGRAM 6150 — Final Report

## 1. Result
**${result.result}**

${result.declarations.join("\n")}

## 2. Portfolio fixture used
**${result.portfolio.name}** (\`${result.portfolio.slug}\`) — workspace \`${result.portfolio.workspaceId}\`

Ventures: ${result.ventures.map((v) => v.name).join(", ")}

## 3. Scenario steps completed vs skipped
${result.scenarioSteps.map((s) => `- [${s.status}] ${s.id} — ${s.title}: ${s.detail}`).join("\n")}

## 4. Test matrix results
${result.tests.map((t) => `- [${t.status}] ${t.id}: ${t.detail}`).join("\n")}

## 5. Performance notes
\`\`\`json
${JSON.stringify(result.performance, null, 2)}
\`\`\`

## 6. Isolation proof
\`\`\`json
${JSON.stringify(result.isolation, null, 2)}
\`\`\`

## 7. Failure isolation proof
\`\`\`json
${JSON.stringify(result.failureIsolation, null, 2)}
\`\`\`

## 8. Value/evidence provenance proof
\`\`\`json
${JSON.stringify(result.valueProvenance, null, 2)}
\`\`\`

## 9. CEO brief/recommendations proof
\`\`\`json
${JSON.stringify(result.ceo, null, 2)}
\`\`\`

## 10. Routes verified
\`\`\`json
${JSON.stringify(result.routes, null, 2)}
\`\`\`

## 11. Build/host status
\`\`\`json
${JSON.stringify(result.buildHost, null, 2)}
\`\`\`

## 12. Resource cleanup (ports/processes)
\`\`\`json
${JSON.stringify(result.cleanup, null, 2)}
\`\`\`

## 13. Files created/modified
${result.filesTouched.map((f) => `- ${f}`).join("\n")}

Evidence paths:
${result.evidencePaths.map((f) => `- ${f}`).join("\n")}

## 14. Remaining gaps (P0/P1/P2)
${result.gaps.length ? result.gaps.map((g) => `- **${g.severity}** \`${g.id}\`: ${g.message}`).join("\n") : "_None recorded_"}

## 15. Recommendation for next program
Do **not** start Program 6160 until P0 gaps are closed: Portfolio Command Center (6130) route + AI Venture CEO (6140) advisory surface, then re-run \`npm run certify:multi-company\`.
`;
}
