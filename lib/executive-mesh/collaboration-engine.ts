/** Executive Intelligence Mesh — Collaboration Engine (RC3.5). */

import type { MeshAction, MeshCollaborationLink, MeshConversationTurn, MeshDepartmentId } from "./types";
import { getDepartment } from "./departments";

export const DEFAULT_COLLABORATION_CHAINS: MeshCollaborationLink[] = [
  { from: "ceo", to: "cto", action: "consult", label: "CEO consulta a CTO" },
  { from: "cto", to: "architecture", action: "delegate", label: "CTO delega a Architecture" },
  { from: "architecture", to: "backend", action: "delegate", label: "Architecture consulta Backend" },
  { from: "backend", to: "infrastructure", action: "consult", label: "Backend consulta Infrastructure" },
  { from: "qa", to: "backend", action: "request_review", label: "QA revisa Backend" },
  { from: "security", to: "architecture", action: "request_review", label: "Security valida Architecture" },
  { from: "legal", to: "product", action: "request_review", label: "Legal revisa Product" },
  { from: "finance", to: "capital", action: "consult", label: "Finance calcula impacto con Capital" },
  { from: "capital", to: "cfo", action: "escalate", label: "Capital escala inversión a CFO" },
  { from: "research", to: "product", action: "consult", label: "Research alimenta Product" },
  { from: "product", to: "ux", action: "delegate", label: "Product delega a UX" },
  { from: "deployment", to: "infrastructure", action: "consult", label: "Deployment coordina con Infrastructure" },
];

export function runCollaborationChain(
  topic: string,
  chain: MeshCollaborationLink[] = DEFAULT_COLLABORATION_CHAINS
): MeshConversationTurn[] {
  const turns: MeshConversationTurn[] = [];
  const now = Date.now();

  for (let i = 0; i < chain.length; i++) {
    const link = chain[i]!;
    const fromDept = getDepartment(link.from);
    const toDept = getDepartment(link.to);
    if (!fromDept || !toDept) continue;

    turns.push({
      departmentId: link.from,
      action: link.action,
      targetDepartmentId: link.to,
      message: buildCollaborationMessage(link.action, fromDept.label, toDept.label, topic),
      confidence: 0.75 + (i % 3) * 0.05,
      at: new Date(now + i * 100).toISOString(),
    });

    turns.push({
      departmentId: link.to,
      action: "approve",
      targetDepartmentId: link.from,
      message: `${toDept.label} responde a ${fromDept.label}: input incorporado sobre "${topic}".`,
      confidence: 0.8,
      at: new Date(now + i * 100 + 50).toISOString(),
    });
  }

  return turns;
}

function buildCollaborationMessage(
  action: MeshAction,
  from: string,
  to: string,
  topic: string
): string {
  const verbs: Record<MeshAction, string> = {
    consult: "consulta a",
    debate: "debate con",
    delegate: "delega en",
    request_review: "solicita revisión a",
    escalate: "escala a",
    reject: "rechaza propuesta de",
    approve: "aprueba con",
    consensus: "busca consenso con",
    request_skill: "solicita skill a",
    request_capability: "solicita capability a",
    vote: "vota con",
    await_response: "espera respuesta de",
    update_memory: "actualiza memoria con",
  };
  return `${from} ${verbs[action]} ${to} sobre: ${topic}`;
}

export function getCollaborationGraph(): MeshCollaborationLink[] {
  return DEFAULT_COLLABORATION_CHAINS;
}
