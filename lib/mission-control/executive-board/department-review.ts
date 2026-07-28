/** PROGRAM 5400 — Per-department review generator (heuristic + mesh hints). */

import type { Mission } from "../types";
import type { BoardDepartmentId, BoardTriggerContext, DepartmentReview, ImpactLevel } from "./types";
import { BOARD_DEPARTMENT_IDS, getParticipant } from "./board-participants";
import {
  fetchMeshBoardHints,
  mergeMeshHintIntoReview,
} from "./adapters/executive-mesh-board-adapter";

function reviewId(dept: BoardDepartmentId): string {
  return `rev-${dept}-${Date.now().toString(36)}`;
}

export async function generateDepartmentReview(
  mission: Mission,
  department: BoardDepartmentId,
  trigger: BoardTriggerContext,
  meshHints?: Awaited<ReturnType<typeof fetchMeshBoardHints>>
): Promise<DepartmentReview> {
  const heuristic = buildHeuristicReview(mission, department, trigger);
  const hint = meshHints?.departmentHints[department];
  return mergeMeshHintIntoReview(heuristic, hint);
}

export async function collectDepartmentReviews(
  mission: Mission,
  trigger: BoardTriggerContext
): Promise<DepartmentReview[]> {
  const topic = buildReviewTopic(mission, trigger);
  const meshHints = await fetchMeshBoardHints(mission, topic);

  const reviews: DepartmentReview[] = [];
  for (const dept of BOARD_DEPARTMENT_IDS) {
    reviews.push(await generateDepartmentReview(mission, dept, trigger, meshHints));
  }
  return reviews;
}

function buildReviewTopic(mission: Mission, trigger: BoardTriggerContext): string {
  const idea = mission.idea ?? mission.title;
  if (trigger.decision) return `${trigger.decision.title}: ${trigger.decision.description} — ${idea}`;
  return `${trigger.label} — ${idea}`;
}

function buildHeuristicReview(
  mission: Mission,
  department: BoardDepartmentId,
  trigger: BoardTriggerContext
): DepartmentReview {
  const participant = getParticipant(department);
  const idea = mission.idea ?? mission.title;
  const phase = mission.phase;
  const pending = trigger.decision;

  const templates: Record<
    BoardDepartmentId,
    () => { recomendacion: string; riesgos: string[]; impacto: ImpactLevel; confianza: number }
  > = {
    CEO: () => ({
      recomendacion: `Priorizar ${pending?.title ?? "validación estratégica"} antes de escalar. Mantener foco en "${idea.slice(0, 50)}".`,
      riesgos: ["Desalineación entre velocidad y calidad", "Scope creep en fase " + phase],
      impacto: phase === "DEPLOY" ? "high" : "medium",
      confianza: 82,
    }),
    CTO: () => ({
      recomendacion: pending?.category === "ARCHITECTURE"
        ? `Adoptar stack ${pending.options[0]} con despliegue incremental.`
        : `Validar arquitectura y deuda técnica antes de ${phase}.`,
      riesgos: ["Complejidad de integración", "Deuda técnica en MVP"],
      impacto: pending?.category === "ARCHITECTURE" ? "high" : "medium",
      confianza: 78,
    }),
    CFO: () => ({
      recomendacion:
        pending?.category === "PRICING"
          ? `Modelo ${pending.options[0]} alineado con segmento objetivo.`
          : "Confirmar unit economics y runway antes de despliegue.",
      riesgos: ["CAC vs LTV incierto", "Burn rate en fase temprana"],
      impacto: pending?.category === "PRICING" ? "high" : "medium",
      confianza: 74,
    }),
    CMO: () => ({
      recomendacion: "Consolidar propuesta de valor y canal de adquisición inicial.",
      riesgos: ["Posicionamiento difuso", "Time-to-market vs competencia"],
      impacto: "medium",
      confianza: 76,
    }),
    Legal: () => ({
      recomendacion: "Revisar términos, privacidad y licencias antes de producción.",
      riesgos: ["GDPR/privacidad", "Propiedad intelectual"],
      impacto: phase === "DEPLOY" ? "high" : "low",
      confianza: 80,
    }),
    Research: () => ({
      recomendacion: `Validar demanda y fit de mercado para "${idea.slice(0, 40)}".`,
      riesgos: ["Hipótesis de mercado no verificada", "Competencia subestimada"],
      impacto: phase === "VALIDATE" ? "high" : "medium",
      confianza: 77,
    }),
    QA: () => ({
      recomendacion:
        pending?.category === "DEPLOYMENT"
          ? `Desplegar primero en ${pending.options[0] ?? "Preview"} con smoke tests.`
          : "Plan de pruebas E2E y criterios de aceptación antes de release.",
      riesgos: ["Regresiones en flujos críticos", "Cobertura de tests insuficiente"],
      impacto: phase === "DEPLOY" || pending?.category === "DEPLOYMENT" ? "high" : "medium",
      confianza: 79,
    }),
  };

  const base = templates[department]();
  return {
    department,
    recomendacion: base.recomendacion,
    riesgos: base.riesgos,
    impacto: base.impacto,
    confianza: base.confianza,
    completedAt: new Date().toISOString(),
  };
}

export function formatDepartmentReviewForCeo(review: DepartmentReview): string {
  const p = getParticipant(review.department);
  return `${p.label}: ${review.recomendacion}`;
}
