/** PROGRAM 5400 — Executive Board participant registry (7 departments). */

import type { BoardDepartmentId, BoardParticipant } from "./types";

export const BOARD_PARTICIPANTS: BoardParticipant[] = [
  {
    id: "CEO",
    label: "CEO",
    labelEn: "CEO",
    focus: "Visión estratégica y alineación de misión",
  },
  {
    id: "CTO",
    label: "CTO",
    labelEn: "CTO",
    focus: "Arquitectura técnica y viabilidad de build",
  },
  {
    id: "CFO",
    label: "CFO",
    labelEn: "CFO",
    focus: "Modelo económico, pricing y runway",
  },
  {
    id: "CMO",
    label: "CMO",
    labelEn: "CMO",
    focus: "Posicionamiento, marca y go-to-market",
  },
  {
    id: "Legal",
    label: "Legal",
    labelEn: "Legal",
    focus: "Cumplimiento, contratos y riesgo regulatorio",
  },
  {
    id: "Research",
    label: "Research",
    labelEn: "Research",
    focus: "Validación de mercado y oportunidad",
  },
  {
    id: "QA",
    label: "QA",
    labelEn: "QA",
    focus: "Calidad, pruebas y readiness de despliegue",
  },
];

export const BOARD_DEPARTMENT_IDS: BoardDepartmentId[] = BOARD_PARTICIPANTS.map((p) => p.id);

export function getParticipant(id: BoardDepartmentId): BoardParticipant {
  return BOARD_PARTICIPANTS.find((p) => p.id === id)!;
}
