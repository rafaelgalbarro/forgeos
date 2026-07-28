/** PROGRAM 5400 — Read-only executive-mesh hints for board reviews (no chain-of-thought). */

import type { Mission } from "../../types";
import type { BoardDepartmentId, DepartmentReview, ImpactLevel } from "../types";
import { BOARD_DEPARTMENT_IDS } from "../board-participants";

export interface MeshBoardHints {
  topicSummary: string;
  departmentHints: Partial<Record<BoardDepartmentId, MeshDepartmentHint>>;
  overallConfidence: number;
}

export interface MeshDepartmentHint {
  recomendacion: string;
  riesgos: string[];
  impacto: ImpactLevel;
  confianza: number;
}

const MESH_DEPT_MAP: Partial<Record<BoardDepartmentId, string>> = {
  CEO: "ceo",
  CTO: "cto",
  CFO: "cfo",
  CMO: "cmo",
  Legal: "legal",
  Research: "research",
  QA: "qa",
};

/** Read-only consult — never exposes mesh turns, debates, or reasoning traces. */
export async function fetchMeshBoardHints(mission: Mission, topic: string): Promise<MeshBoardHints> {
  try {
    const { consultExecutiveMesh } = await import("../../adapters/executive-mesh-adapter");
    const { meshGetMemoryRecords } = await import("@/lib/executive-mesh");

    const meshSummary = await consultExecutiveMesh(topic);
    const records = meshGetMemoryRecords(mission.projectId ?? mission.id).slice(0, 7);

    const departmentHints: Partial<Record<BoardDepartmentId, MeshDepartmentHint>> = {};
    let confidenceSum = 0;
    let confidenceCount = 0;

    for (const dept of BOARD_DEPARTMENT_IDS) {
      const meshId = MESH_DEPT_MAP[dept];
      const record = records.find((r) => r.owner === meshId);
      if (record) {
        const hint: MeshDepartmentHint = {
          recomendacion: sanitizeSnapshot(record.reasoning),
          riesgos: extractRisks(record.reasoning),
          impacto: record.confidence >= 0.8 ? "high" : record.confidence >= 0.5 ? "medium" : "low",
          confianza: Math.round(record.confidence * 100),
        };
        departmentHints[dept] = hint;
        confidenceSum += hint.confianza;
        confidenceCount++;
      }
    }

    return {
      topicSummary: sanitizeSnapshot(meshSummary.summary),
      departmentHints,
      overallConfidence: confidenceCount
        ? Math.round(confidenceSum / confidenceCount)
        : Math.min(90, mission.status.confidence + 8),
    };
  } catch {
    return {
      topicSummary: `Evaluación sobre "${topic.slice(0, 60)}" — sin señales del mesh.`,
      departmentHints: {},
      overallConfidence: mission.status.confidence,
    };
  }
}

export function mergeMeshHintIntoReview(
  review: DepartmentReview,
  hint: MeshDepartmentHint | undefined
): DepartmentReview {
  if (!hint) return review;
  return {
    ...review,
    recomendacion: hint.recomendacion || review.recomendacion,
    riesgos: hint.riesgos.length ? hint.riesgos : review.riesgos,
    impacto: hint.impacto,
    confianza: Math.round((review.confianza + hint.confianza) / 2),
  };
}

function sanitizeSnapshot(text: string): string {
  return text
    .replace(/chain-of-thought|reasoning trace|internal prompt/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 280);
}

function extractRisks(text: string): string[] {
  const risks: string[] = [];
  if (/riesgo|risk/i.test(text)) risks.push("Riesgo señalado en evaluación ejecutiva");
  if (/legal|compliance/i.test(text)) risks.push("Revisar cumplimiento normativo");
  if (/coste|budget|runway/i.test(text)) risks.push("Impacto en presupuesto");
  return risks.slice(0, 3);
}
