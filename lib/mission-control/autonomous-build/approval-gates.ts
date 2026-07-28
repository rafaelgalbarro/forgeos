/** Approval gate detection — deploy, spend, delete, irreversible only. */

import type { ApprovalGate, ApprovalReason } from "./types";
import type { MissionTask } from "../live-mission/types";
import type { MissionPhase } from "../types";

function gateId(): string {
  return `gate-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

const DEPLOY_PATTERNS = [/deploy/i, /desplieg/i, /producci[oó]n/i, /production/i, /staging/i, /preview/i, /publicar/i];
const SPEND_PATTERNS = [/gasto/i, /pago/i, /suscripci[oó]n/i, /paid/i, /billing/i, /precio/i, /monetiz/i, /inversi[oó]n/i, /cfo/i];
const DELETE_PATTERNS = [/borrar/i, /eliminar/i, /delete/i, /remove/i, /destruir/i];
const IRREVERSIBLE_PATTERNS = [/irreversible/i, /no se puede deshacer/i, /permanent/i, /confirmar eliminaci[oó]n/i];

function matchPatterns(text: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(text));
}

export function detectApprovalReason(
  task: MissionTask,
  phase?: MissionPhase
): ApprovalReason | null {
  const text = `${task.label} ${task.department ?? ""}`;

  if (phase === "DEPLOY" || matchPatterns(text, DEPLOY_PATTERNS)) return "deploy";
  if (matchPatterns(text, SPEND_PATTERNS)) return "spend";
  if (matchPatterns(text, DELETE_PATTERNS)) return "delete";
  if (matchPatterns(text, IRREVERSIBLE_PATTERNS)) return "irreversible";

  return null;
}

const REASON_LABELS: Record<ApprovalReason, { title: string; description: string }> = {
  deploy: {
    title: "Aprobación de despliegue",
    description: "Se va a desplegar a un entorno. ¿Autorizas el despliegue?",
  },
  spend: {
    title: "Aprobación de gasto",
    description: "Esta acción implica recursos de pago. ¿Autorizas el gasto?",
  },
  delete: {
    title: "Aprobación de borrado",
    description: "Se eliminarán datos o activos. ¿Confirmas el borrado?",
  },
  irreversible: {
    title: "Acción irreversible",
    description: "Esta acción no se puede deshacer. ¿Continuamos?",
  },
};

export function createApprovalGate(task: MissionTask, reason: ApprovalReason): ApprovalGate {
  const meta = REASON_LABELS[reason];
  return {
    id: gateId(),
    reason,
    title: meta.title,
    description: meta.description,
    taskId: task.id,
    taskLabel: task.label,
    resolved: false,
  };
}

export function requiresApproval(task: MissionTask, phase?: MissionPhase): boolean {
  return detectApprovalReason(task, phase) !== null;
}

export function approvalReasonLabel(reason: ApprovalReason): string {
  const map: Record<ApprovalReason, string> = {
    deploy: "Despliegue",
    spend: "Gasto",
    delete: "Borrado",
    irreversible: "Irreversible",
  };
  return map[reason];
}
