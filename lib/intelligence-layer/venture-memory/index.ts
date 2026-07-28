import type { VentureProject } from "@/lib/domain/venture";
import type { VentureMemoryRecord } from "../types";
import { STORAGE_KEYS } from "../memory/types";
import { getFromMap, getAllFromMap, upsertInMap } from "../memory/storage";
import { autoRegisterMilestoneDecisions } from "../decision-engine";
import { recordVentureHistoryEvent } from "../history";
import { updateLearningFromVenture } from "../learning-engine";

const BUILD_SECTION_IDS = new Set([
  "arquitectura",
  "base-datos",
  "backend",
  "frontend",
  "build-plan",
]);

function daysBetween(a: string, b: string): number {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
}

function extractResearchSummary(venture: VentureProject): string | null {
  if (!venture.researchReport) return null;
  const r = venture.researchReport;
  const parts = [
    r.marketSummary?.slice(0, 200),
    r.opportunities?.[0]?.slice(0, 100),
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : null;
}

function extractAssumptions(venture: VentureProject): string[] {
  const assumptions: string[] = [];
  if (venture.intelligenceReport?.recommendedBusinessModel) {
    assumptions.push(`Modelo: ${venture.intelligenceReport.recommendedBusinessModel}`);
  }
  if (venture.discoveryContext?.inferredBusinessModel) {
    assumptions.push(`Discovery: ${venture.discoveryContext.inferredBusinessModel}`);
  }
  if (venture.ventureSimulatorResult?.assumptions) {
    const a = venture.ventureSimulatorResult.assumptions;
    assumptions.push(`CAC estimado: ${a.baseCAC}`);
    assumptions.push(`Conversión base: ${(a.baseConversion * 100).toFixed(1)}%`);
  }
  return assumptions;
}

function extractRisks(venture: VentureProject): string[] {
  const risks: string[] = [];
  if (venture.ventureSimulatorResult?.risks) {
    risks.push(...venture.ventureSimulatorResult.risks);
  }
  if (venture.discoveryContext?.remainingQuestions?.length) {
    risks.push(`${venture.discoveryContext.remainingQuestions.length} preguntas de discovery pendientes`);
  }
  return [...new Set(risks)].slice(0, 10);
}

function extractResults(venture: VentureProject): string[] {
  const results: string[] = [];
  if (venture.ventureSimulatorResult) {
    const s = venture.ventureSimulatorResult;
    results.push(`Score: ${s.startupScore}/100`);
    results.push(`Recomendación: ${s.recommendationLabel}`);
    results.push(`Confianza: ${s.confidence}`);
  }
  if (venture.intelligenceAccepted) {
    results.push("Inteligencia aceptada por el fundador");
  }
  return results;
}

export function buildVentureMemory(venture: VentureProject): VentureMemoryRecord {
  const hasBuildPlan =
    venture.sections.some((s) => BUILD_SECTION_IDS.has(s.id) && s.content.trim().length > 0);

  const existing = getFromMap<VentureMemoryRecord>(STORAGE_KEYS.ventureMemory, venture.id);
  const changes = existing?.changes ?? [];
  if (existing && existing.syncedAt !== venture.updatedAt) {
    changes.push({
      updatedAt: venture.updatedAt,
      deltaDays: daysBetween(existing.syncedAt, venture.updatedAt),
    });
  }

  return {
    ventureId: venture.id,
    name: venture.name,
    initialIdea: venture.ideaText,
    discoveryAnswers: venture.discoveryAnswers
      ? (venture.discoveryAnswers as unknown as Record<string, unknown>)
      : null,
    discoveryContext: venture.discoveryContext
      ? (venture.discoveryContext as unknown as Record<string, unknown>)
      : null,
    researchSummary: extractResearchSummary(venture),
    simulatorResult: venture.ventureSimulatorResult
      ? (venture.ventureSimulatorResult as unknown as Record<string, unknown>)
      : null,
    productPRDMeta: venture.productMeta
      ? (venture.productMeta as unknown as Record<string, unknown>)
      : null,
    hasBuildPlan,
    changes,
    decisions: existing?.decisions ?? [],
    assumptions: extractAssumptions(venture),
    risks: extractRisks(venture),
    results: extractResults(venture),
    date: venture.createdAt,
    author: "founder",
    status: venture.status,
    syncedAt: venture.updatedAt,
  };
}

export function syncVentureMemory(venture: VentureProject): VentureMemoryRecord {
  const memory = buildVentureMemory(venture);
  const decisionIds = autoRegisterMilestoneDecisions(venture);
  memory.decisions = [...new Set([...memory.decisions, ...decisionIds])];
  upsertInMap(STORAGE_KEYS.ventureMemory, memory);

  recordVentureHistoryEvent({
    ventureId: venture.id,
    type: "memory_sync",
    title: "Memoria sincronizada",
    description: `Snapshot actualizado para ${venture.name}`,
    date: new Date().toISOString(),
  });

  updateLearningFromVenture(venture);
  return memory;
}

export function getVentureMemory(ventureId: string): VentureMemoryRecord | undefined {
  return getFromMap<VentureMemoryRecord>(STORAGE_KEYS.ventureMemory, ventureId);
}

export function getAllVentureMemories(): VentureMemoryRecord[] {
  return getAllFromMap<VentureMemoryRecord>(STORAGE_KEYS.ventureMemory);
}
