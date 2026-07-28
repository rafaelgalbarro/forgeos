/**
 * RC1 E2E validation harness — validates VANDL venture through full ForgeOS pipeline.
 * Epic 7.8 — Program 3 capstone integration.
 */

import { buildBuildContextFromVenture } from "@/lib/build-platform/build-context";
import { createBuildDnaFromContext } from "@/lib/build-platform/build-dna";
import { createBackendFactory, createBackendFactoryInput } from "@/lib/build-platform/backend-factory";
import { createDatabaseFactory, createDatabaseFactoryInput } from "@/lib/build-platform/database-factory";
import { createFrontendFactory, createFrontendFactoryInput } from "@/lib/build-platform/frontend-factory";
import { createInfrastructureFactory, createInfraFactoryInput } from "@/lib/build-platform/infrastructure-factory";
import { createQaFactory, createQaFactoryInput } from "@/lib/build-platform/qa-factory";
import { createReleaseManager } from "@/lib/build-platform/release-manager";
import { formatSemanticVersion } from "@/lib/build-platform/release-manager/release-versioning";
import { buildVentureCeoBrief } from "@/lib/venture-workspace/ceo-brief";
import { computeFounderJourney } from "@/lib/founder-journey/journey-engine";
import { buildVentureWorkspaceData } from "@/lib/venture-workspace/workspace-data";
import { VANDL_VENTURE } from "@/lib/fixtures/vandl-venture";
import type { VentureProject } from "@/lib/domain/venture";
import { sectionHasContent } from "@/lib/portfolio/venture-status";

export type Rc1StepId =
  | "idea"
  | "research"
  | "ceo"
  | "board"
  | "product"
  | "architecture"
  | "build-context"
  | "build-dna"
  | "factories"
  | "release-package"
  | "deploy-spec";

export interface Rc1ValidationStep {
  id: Rc1StepId;
  label: string;
  passed: boolean;
  output: string;
  detail?: string;
  href?: string;
}

export interface Rc1ValidationResult {
  ventureId: string;
  ventureName: string;
  passed: boolean;
  passedCount: number;
  totalCount: number;
  steps: Rc1ValidationStep[];
  validatedAt: string;
}

function step(
  id: Rc1StepId,
  label: string,
  passed: boolean,
  output: string,
  detail?: string,
  href?: string
): Rc1ValidationStep {
  return { id, label, passed, output, detail, href };
}

export function validateRc1Pipeline(venture: VentureProject = VANDL_VENTURE): Rc1ValidationResult {
  const steps: Rc1ValidationStep[] = [];

  // 1. Idea
  const ideaOk = (venture.ideaText?.trim().length ?? 0) >= 20 && !!venture.name;
  steps.push(
    step(
      "idea",
      "Idea",
      ideaOk,
      ideaOk ? `${venture.name}: ${venture.ideaText.slice(0, 80)}…` : "Idea incompleta",
      undefined,
      "/founder"
    )
  );

  // 2. Research
  const researchOk = !!venture.researchReport?.marketSummary;
  steps.push(
    step(
      "research",
      "Research",
      researchOk,
      researchOk
        ? venture.researchReport!.marketSummary.slice(0, 100) + "…"
        : "Sin research report",
      researchOk
        ? `${venture.researchReport!.competitors.length} competidores mapeados`
        : undefined,
      `/venture/${venture.id}/knowledge`
    )
  );

  // 3. CEO
  const ceoBrief = buildVentureCeoBrief(venture);
  const ceoOk = venture.intelligenceAccepted === true && !!ceoBrief.recommendation;
  steps.push(
    step(
      "ceo",
      "CEO Review",
      ceoOk,
      ceoOk ? ceoBrief.recommendation.slice(0, 100) : "CEO review pendiente",
      ceoBrief.criticalRisk ? `Riesgo: ${ceoBrief.criticalRisk.slice(0, 60)}` : undefined,
      "/ceo"
    )
  );

  // 4. Board
  const boardOk = !!venture.ventureSimulatorResult?.recommendation;
  const boardRec = venture.ventureSimulatorResult?.recommendation ?? "—";
  steps.push(
    step(
      "board",
      "Board Decision",
      boardOk,
      boardOk ? `Recomendación: ${boardRec}` : "Sin decisión de board",
      boardOk
        ? `Venture score: ${venture.ventureSimulatorResult!.ventureScore}`
        : undefined,
      "/founder-journey"
    )
  );

  // 5. Product
  const productOk = !!venture.productPRD?.executiveSummary;
  steps.push(
    step(
      "product",
      "Product / PRD",
      productOk,
      productOk
        ? venture.productPRD!.executiveSummary.slice(0, 100) + "…"
        : "PRD pendiente",
      productOk ? `${venture.productPRD!.mvpScope.length} items MVP` : undefined,
      `/venture/${venture.id}`
    )
  );

  // 6. Architecture
  const archOk = sectionHasContent(venture, "arquitectura");
  const archSection = venture.sections.find((s) => s.id === "arquitectura");
  steps.push(
    step(
      "architecture",
      "Architecture",
      archOk,
      archOk ? archSection!.content.slice(0, 100) + "…" : "Arquitectura pendiente",
      undefined,
      `/venture/${venture.id}`
    )
  );

  // 7. Build Context
  const context = buildBuildContextFromVenture(venture, { persist: false, recordHistory: false });
  const contextOk = context.meta.completenessScore >= 40;
  steps.push(
    step(
      "build-context",
      "Build Context",
      contextOk,
      `Completeness: ${context.meta.completenessScore}%`,
      `${Object.keys(context.sections).length} secciones`,
      "/lab/build-context"
    )
  );

  // 8. Build DNA
  const dna = createBuildDnaFromContext(context);
  const dnaOk = dna.meta.completenessScore >= 50;
  steps.push(
    step(
      "build-dna",
      "Build DNA",
      dnaOk,
      `DNA completeness: ${dna.meta.completenessScore}%`,
      `Stack: ${dna.stack.framework}`,
      "/lab/build-dna"
    )
  );

  // 9. Factories
  let factoryOutputs: string[] = [];
  let factoriesOk = true;
  try {
    const fe = createFrontendFactory().generateBlueprint(
      createFrontendFactoryInput(context, dna)
    );
    const be = createBackendFactory().generateBlueprint(
      createBackendFactoryInput(context, dna)
    );
    const db = createDatabaseFactory().generateBlueprint(
      createDatabaseFactoryInput(context, dna)
    );
    const qa = createQaFactory().generateBlueprint(createQaFactoryInput(context, dna));
    const infra = createInfrastructureFactory().generateBlueprint(
      createInfraFactoryInput(context, dna)
    );
    factoryOutputs = [
      `FE: ${fe.pages.length} pages`,
      `BE: ${be.services.length} services`,
      `DB: ${db.entities.length} entities`,
      `QA: ${qa.unitTests.testCases.length} unit tests`,
      `Infra: ${infra.docker.services.length} docker services`,
    ];
    factoriesOk =
      fe.pages.length > 0 &&
      be.services.length > 0 &&
      db.entities.length > 0 &&
      qa.unitTests.testCases.length > 0 &&
      infra.docker.services.length > 0;
  } catch (e) {
    factoriesOk = false;
    factoryOutputs = [`Error: ${e instanceof Error ? e.message : "factory failure"}`];
  }
  steps.push(
    step(
      "factories",
      "Factories",
      factoriesOk,
      factoryOutputs.join(" · "),
      "Frontend, Backend, Database, QA, Infrastructure",
      "/lab/frontend-factory"
    )
  );

  // 10. Release Package
  const manager = createReleaseManager();
  const releasePkg = manager.buildReleasePackage({ venture });
  const releaseOk =
    !!releasePkg.releaseId &&
    releasePkg.artifacts.refs.length > 0 &&
    releasePkg.qualityGates.length > 0;
  steps.push(
    step(
      "release-package",
      "Release Package",
      releaseOk,
      `Release ${formatSemanticVersion(releasePkg.version)} — ${releasePkg.artifacts.refs.length} artifacts`,
      `Status: ${releasePkg.status}`,
      "/lab/release-manager"
    )
  );

  // 11. Deploy Spec
  const deployOk = releasePkg.deploymentChecklist.length > 0;
  steps.push(
    step(
      "deploy-spec",
      "Deploy Spec",
      deployOk,
      `${releasePkg.deploymentChecklist.length} checklist items`,
      releasePkg.deploymentChecklist[0]?.label ?? "Deployment checklist generado",
      "/lab/infrastructure-factory"
    )
  );

  const passedCount = steps.filter((s) => s.passed).length;

  return {
    ventureId: venture.id,
    ventureName: venture.name,
    passed: passedCount === steps.length,
    passedCount,
    totalCount: steps.length,
    steps,
    validatedAt: new Date().toISOString(),
  };
}

export function validateRc1FounderExperience(venture: VentureProject = VANDL_VENTURE) {
  const journey = computeFounderJourney(venture);
  const workspace = buildVentureWorkspaceData(venture);
  return {
    journeyProgress: journey.summary.overallProgress,
    workspaceTimelineEvents: workspace.timeline.length,
    knowledgeLinked: workspace.knowledge.hasContent,
  };
}

export function runRc1ValidationLab(): Rc1ValidationResult {
  return validateRc1Pipeline(VANDL_VENTURE);
}
