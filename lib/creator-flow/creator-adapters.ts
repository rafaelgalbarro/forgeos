/**
 * Thin adapters to existing modules — no duplicated business logic (Epic 7.7).
 */

import type { VentureProject } from "@/lib/domain/venture";
import { computeFounderJourney } from "@/lib/founder-journey";
import { buildVentureWorkspaceData } from "@/lib/venture-workspace";
import { buildVentureCeoBrief } from "@/lib/venture-workspace/ceo-brief";
import { buildVentureTimelineSnapshot } from "@/lib/venture-timeline";
import { getRecommendedPatternsForIdea } from "@/lib/knowledge";
import { createReleaseManager } from "@/lib/build-platform/release-manager";
import { PIPELINE_STATE_LABELS } from "@/lib/runtime/execution-engine";
import type { CreatorKnowledgeRef, CreatorStepId, CreatorTimelineHighlight } from "./types";

const FOUNDER_PIPELINE_LABELS: Record<string, string> = {
  READY: "Listo para construir",
  DISPATCHED: "Construcción iniciada",
  VALIDATED: "Plan validado",
  RUNNING: "Construcción en curso",
  FINISHED: "Entrega finalizada",
  COMPLETED: "Construcción completada",
  FAILED: "Requiere revisión",
  CANCELLED: "Pausado",
};

export function adaptJourneyProgress(venture: VentureProject) {
  return computeFounderJourney(venture);
}

export function adaptWorkspaceSnapshot(venture: VentureProject) {
  return buildVentureWorkspaceData(venture);
}

export function adaptCeoBrief(venture: VentureProject) {
  return buildVentureCeoBrief(venture);
}

export function adaptBoardDecision(venture: VentureProject) {
  const sim = venture.ventureSimulatorResult;
  return {
    recommendation: sim?.recommendation ?? null,
    ventureScore: sim?.ventureScore ?? null,
    confidence: sim?.confidence ?? null,
    summary: sim
      ? `Recomendación del board: ${sim.recommendation}. Venture Score ${sim.ventureScore}/100.`
      : "El Venture Simulator aún no ha emitido una decisión de gobernanza.",
  };
}

export function adaptTimelineHighlights(
  venture: VentureProject,
  stepId?: CreatorStepId,
  limit = 5
): CreatorTimelineHighlight[] {
  const snapshot = buildVentureTimelineSnapshot(venture);
  const stepCategories: Partial<Record<CreatorStepId, string[]>> = {
    idea: ["Product"],
    discovery: ["Product", "Research"],
    research: ["Research"],
    ceo: ["CEO Reviews"],
    board: ["Board Decisions", "Finance"],
    product: ["Product"],
    architecture: ["Architecture"],
    build: ["Build", "QA"],
    deploy: ["Deploy"],
    growth: ["Marketing", "Finance"],
  };

  let events = snapshot.events;
  if (stepId && stepCategories[stepId]) {
    const cats = stepCategories[stepId]!;
    events = events.filter((e) => cats.includes(e.category));
  }

  return events.slice(0, limit).map((e) => ({
    id: e.id,
    title: e.title,
    description: e.description,
    timestamp: e.timestamp,
    category: e.category,
  }));
}

export function adaptKnowledgeRefs(venture: VentureProject): CreatorKnowledgeRef[] {
  const fromMeta = [
    ...(venture.productMeta?.usedKnowledgeRefs ?? []),
    ...(venture.researchMeta?.usedKnowledgeRefs ?? []),
  ].map((r) => ({ id: r.id, title: r.title, domain: r.domain }));

  if (fromMeta.length > 0) return fromMeta.slice(0, 8);

  const patterns = getRecommendedPatternsForIdea(venture.ideaText ?? "");
  const combined = [
    ...patterns.patterns,
    ...patterns.architectures,
    ...patterns.businessModels,
  ].slice(0, 5);

  return combined.map((m) => ({
    id: m.entry.id,
    title: m.entry.title,
    domain: m.entry.domain,
  }));
}

export function adaptReleaseSummary(venture: VentureProject) {
  try {
    const manager = createReleaseManager();
    const pkg = manager.buildReleasePackage({ venture });
    const validation = manager.validateReleasePackage(pkg);
    return {
      version: `${pkg.version.major}.${pkg.version.minor}.${pkg.version.patch}`,
      status: pkg.status,
      gatesPassed: pkg.qualityGates.filter((g) => g.status === "pass").length,
      gatesTotal: pkg.qualityGates.length,
      valid: validation.valid,
      checklistItems: pkg.deploymentChecklist.length,
    };
  } catch {
    return {
      version: "0.1.0",
      status: "DRAFT" as const,
      gatesPassed: 0,
      gatesTotal: 0,
      valid: false,
      checklistItems: 0,
    };
  }
}

/** Maps runtime pipeline states to founder-facing labels — hides Worker/Scheduler/Event Bus. */
export function adaptBuildPipelineLabel(pipelineState: string): string {
  return FOUNDER_PIPELINE_LABELS[pipelineState] ?? PIPELINE_STATE_LABELS[pipelineState as keyof typeof PIPELINE_STATE_LABELS] ?? "En progreso";
}

export function adaptBuildStatus(venture: VentureProject) {
  const ws = buildVentureWorkspaceData(venture);
  const pipelineLabel =
    venture.status === "building"
      ? adaptBuildPipelineLabel("RUNNING")
      : venture.status === "ready"
        ? adaptBuildPipelineLabel("COMPLETED")
        : adaptBuildPipelineLabel("READY");

  return {
    phase: ws.buildStatus.phase,
    progress: ws.buildStatus.progress,
    items: ws.buildStatus.items,
    pipelineLabel,
  };
}

export function adaptGrowthStatus(venture: VentureProject) {
  const ws = buildVentureWorkspaceData(venture);
  return {
    lifecycle: ws.founderLifecycle,
    investmentReadiness: ws.investmentReadiness,
    metrics: ws.metrics.slice(0, 3),
  };
}
