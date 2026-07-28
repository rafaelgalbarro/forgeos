import type { VentureProject } from "@/lib/domain/venture";
import type { LearningSnapshot } from "../types";
import { STORAGE_KEYS } from "../memory/types";
import { readStorage, upsertInMap } from "../memory/storage";

function readLearningMap(): Record<string, LearningSnapshot> {
  return readStorage<Record<string, LearningSnapshot>>(STORAGE_KEYS.learning, {});
}

export function updateLearningFromVenture(venture: VentureProject): LearningSnapshot {
  const existing = readLearningMap()[venture.id];
  const lessonsLearned: string[] = [...(existing?.lessonsLearned ?? [])];
  const bestPractices: string[] = [...(existing?.bestPractices ?? [])];
  const repeatedMistakes: string[] = [...(existing?.repeatedMistakes ?? [])];
  const recommendedActions: string[] = [...(existing?.recommendedActions ?? [])];

  const discoveryCount = venture.discoveryContext?.answers.length ?? 0;
  if (discoveryCount >= 3) {
    const lesson = "Completar discovery mejora la calidad de las decisiones";
    if (!lessonsLearned.includes(lesson)) lessonsLearned.push(lesson);
    const practice = "Responder al menos 3 preguntas de discovery antes del simulador";
    if (!bestPractices.includes(practice)) bestPractices.push(practice);
  } else if (discoveryCount > 0 && discoveryCount < 3) {
    const mistake = "Discovery parcial puede subestimar riesgos";
    if (!repeatedMistakes.includes(mistake)) repeatedMistakes.push(mistake);
    recommendedActions.push("Completar las preguntas restantes de discovery");
  }

  if (venture.researchReport && !venture.productPRD) {
    recommendedActions.push("Generar PRD aprovechando el research disponible");
  }

  if (venture.ventureSimulatorResult) {
    const s = venture.ventureSimulatorResult;
    if (s.startupScore >= 70) {
      const lesson = `Score alto (${s.startupScore}) indica buen encaje mercado-producto`;
      if (!lessonsLearned.includes(lesson)) lessonsLearned.push(lesson);
    }
    if (s.recommendation === "research_more" || s.recommendation === "do_not_build_yet") {
      const action = "Profundizar research antes de invertir en build";
      if (!recommendedActions.includes(action)) recommendedActions.push(action);
    }
    if (s.recommendation === "build" || s.recommendation === "build_small_mvp") {
      const practice = "Simulador favorable: priorizar MVP acotado";
      if (!bestPractices.includes(practice)) bestPractices.push(practice);
    }
  }

  const daysSinceCreation = Math.round(
    (Date.now() - new Date(venture.createdAt).getTime()) / (1000 * 60 * 60 * 24)
  );
  const hasBuild = venture.sections.some(
    (s) => ["arquitectura", "backend", "frontend"].includes(s.id) && s.content.trim()
  );
  if (daysSinceCreation > 21 && !hasBuild && venture.status === "intelligence") {
    const mistake = "Tiempo prolongado en fase intelligence sin avanzar a build";
    if (!repeatedMistakes.includes(mistake)) repeatedMistakes.push(mistake);
  }

  const snapshot: LearningSnapshot = {
    ventureId: venture.id,
    lessonsLearned: [...new Set(lessonsLearned)],
    bestPractices: [...new Set(bestPractices)],
    repeatedMistakes: [...new Set(repeatedMistakes)],
    recommendedActions: [...new Set(recommendedActions)],
    updatedAt: new Date().toISOString(),
  };

  upsertInMap(STORAGE_KEYS.learning, snapshot);
  return snapshot;
}

export function getLearningForVenture(ventureId: string): LearningSnapshot | undefined {
  return readLearningMap()[ventureId];
}

export function getAllLearning(): LearningSnapshot[] {
  return Object.values(readLearningMap());
}
