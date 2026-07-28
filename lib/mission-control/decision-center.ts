/** Pending decisions — one at a time in conversation. */
/** @deprecated PROGRAM 6070 — decisions: prefer DualWriteService + src/core/domain/decision (see DEPRECATION.md). Do not delete while consumers exist. */

import type { DecisionCategory, Mission, PendingDecision } from "./types";
import { missionToContext } from "./pair-founder/pair-founder-engine";
import { readVentureMemory } from "./pair-founder/venture-memory";
import { detectRisks } from "./pair-founder/risk-detection";
import { prioritizeDecisions } from "./pair-founder/decision-prioritization";

function decisionId(): string {
  return `dec-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function createDecision(
  category: DecisionCategory,
  title: string,
  description: string,
  options: string[],
  important = false
): PendingDecision {
  return {
    id: decisionId(),
    category,
    title,
    description,
    options,
    resolved: false,
    important,
  };
}

export function getPendingDecisions(mission: Mission): PendingDecision[] {
  return mission.pendingDecisions.filter((d) => !d.resolved);
}

export function getNextPendingDecision(mission: Mission): PendingDecision | undefined {
  const ctx = missionToContext(mission);
  const memory = readVentureMemory(mission.id);
  const risks = detectRisks(ctx, memory);
  const ordered = prioritizeDecisions(mission.pendingDecisions, ctx, risks);
  return ordered.find((d) => !d.resolved);
}

export function resolveDecision(mission: Mission, decisionId: string, option: string): Mission {
  const pendingDecisions = mission.pendingDecisions.map((d) =>
    d.id === decisionId ? { ...d, resolved: true, selectedOption: option } : d
  );
  const hasPending = pendingDecisions.some((d) => !d.resolved);
  return {
    ...mission,
    pendingDecisions,
    autoPilot: {
      ...mission.autoPilot,
      pausedForDecision: hasPending,
    },
    status: {
      ...mission.status,
      nextDecision: hasPending
        ? pendingDecisions.find((d) => !d.resolved)?.title
        : undefined,
    },
  };
}

export function seedDecisionsForIntention(mission: Mission): Mission {
  if (!mission.intention || mission.intention === "DISCOVERY") return mission;
  if (mission.pendingDecisions.length) return mission;

  const decisions: PendingDecision[] = [];

  if (mission.intention === "VENTURE" || mission.intention === "WEBSITE") {
    decisions.push(
      createDecision("BRANDING", "Estilo de marca", "¿Qué tono prefieres?", ["Moderno", "Corporativo", "Audaz"], true)
    );
  }
  if (mission.intention === "VENTURE" || mission.intention === "APPLICATION") {
    decisions.push(
      createDecision("PRICING", "Modelo de precios", "¿Cómo monetizas?", ["Suscripción", "Freemium", "Pago único"])
    );
  }
  if (mission.intention === "WEBSITE") {
    decisions.push(
      createDecision("DOMAIN", "Dominio", "¿Tienes dominio?", ["Sí, ya lo tengo", "No, sugiereme uno"])
    );
  }
  if (mission.intention === "APPLICATION" || mission.intention === "MOBILE") {
    decisions.push(
      createDecision("ARCHITECTURE", "Arquitectura", "¿Stack preferido?", ["Next.js + Supabase", "Next.js + Firebase"], true)
    );
  }
  decisions.push(
    createDecision("DEPLOYMENT", "Despliegue", "¿Entorno inicial?", ["Preview", "Staging", "Producción"])
  );

  return {
    ...mission,
    pendingDecisions: decisions,
    status: {
      ...mission.status,
      nextDecision: decisions[0]?.title,
    },
  };
}

export function formatDecisionPrompt(decision: PendingDecision): string {
  const opts = decision.options.map((o, i) => `${i + 1}. ${o}`).join("  ");
  return `${decision.title}: ${decision.description} — ${opts}`;
}

/** PROGRAM 5500 — link approval gates to pending decisions. */
export function createDecisionFromApproval(gate: import("./autonomous-build/types").ApprovalGate): PendingDecision {
  const categoryMap: Record<string, DecisionCategory> = {
    deploy: "DEPLOYMENT",
    spend: "PRICING",
    delete: "ARCHITECTURE",
    irreversible: "ARCHITECTURE",
  };
  return {
    id: gate.id,
    category: categoryMap[gate.reason] ?? "DEPLOYMENT",
    title: gate.title,
    description: gate.description,
    options: ["Sí, autorizo", "No, cancelar"],
    resolved: false,
    important: true,
  };
}

export function linkApprovalToMission(
  mission: Mission,
  gate: import("./autonomous-build/types").ApprovalGate
): Mission {
  const decision = createDecisionFromApproval(gate);
  const exists = mission.pendingDecisions.some((d) => d.id === gate.id);
  if (exists) return mission;
  return {
    ...mission,
    pendingDecisions: [decision, ...mission.pendingDecisions],
    autoPilot: { ...mission.autoPilot, pausedForDecision: true },
    status: {
      ...mission.status,
      nextDecision: gate.title,
    },
  };
}

export function isApprovalDecision(decision: PendingDecision): boolean {
  return decision.options.length === 2 && decision.options[0] === "Sí, autorizo";
}
