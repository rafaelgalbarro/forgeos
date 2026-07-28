/** STEP 5 — Context change handling (integrates with mission-session/runner). */

import type { Mission } from "@/lib/mission-control/types";
import type { ContextChangeResult, MissionContext, VentureMemory } from "./types";
import { appendStrategyNote } from "./venture-memory";

const CONTEXT_CHANGE_PATTERNS: Array<{
  pattern: RegExp;
  label: string;
  affectedArtifacts: string[];
  dependencies: string[];
}> = [
  {
    pattern: /b2b|b2c|enterprise|consumidor|segmento|cliente objetivo/i,
    label: "Cambio de cliente objetivo",
    affectedArtifacts: ["icp", "pricing", "gtm", "value_prop"],
    dependencies: ["market", "business_model"],
  },
  {
    pattern: /presupuesto|budget|recort|70%|reducir.*coste/i,
    label: "Cambio de presupuesto",
    affectedArtifacts: ["architecture", "mobile_readiness", "gtm", "application"],
    dependencies: ["business_model", "prd"],
  },
  {
    pattern: /timeline|plazo|semanas|meses|deadline|fecha/i,
    label: "Cambio de timeline",
    affectedArtifacts: ["prd", "architecture", "application", "qa"],
    dependencies: ["value_prop"],
  },
  {
    pattern: /precio|pricing|freemium|suscripción|modelo de negocio/i,
    label: "Cambio de modelo de precios",
    affectedArtifacts: ["pricing", "business_model", "gtm"],
    dependencies: ["value_prop", "icp"],
  },
  {
    pattern: /mobile|app móvil|ios|android/i,
    label: "Cambio de scope mobile",
    affectedArtifacts: ["mobile_readiness", "application", "architecture"],
    dependencies: ["prd"],
  },
];

export function detectContextChange(userInput?: string): ContextChangeResult | null {
  if (!userInput?.trim()) return null;

  for (const { pattern, label, affectedArtifacts, dependencies } of CONTEXT_CHANGE_PATTERNS) {
    if (pattern.test(userInput)) {
      return {
        changed: true,
        summary: `${label} detectado — recalculando dependencias sin regenerar todo el plan.`,
        affectedArtifacts,
        recalculatedDependencies: dependencies,
      };
    }
  }
  return null;
}

export function applyContextChangeToMission(
  mission: Mission,
  change: ContextChangeResult,
  memory: VentureMemory
): { mission: Mission; memory: VentureMemory } {
  const updatedMemory = appendStrategyNote(
    memory,
    `Context change: ${change.summary}`
  );

  const markers = change.affectedArtifacts.map((a) => `[${a}] requiere revisión`);
  const recommendations = [
    ...mission.status.recommendations.filter((r) => !r.startsWith("[Context]")),
    `[Context] ${change.summary}`,
    ...markers.slice(0, 3),
  ];

  const updatedMission: Mission = {
    ...mission,
    status: {
      ...mission.status,
      recommendations: recommendations.slice(0, 8),
      risks: [
        ...mission.status.risks.filter((r) => !r.startsWith("[Context]")),
        `[Context] ${change.affectedArtifacts.length} artefactos afectados`,
      ],
    },
  };

  return { mission: updatedMission, memory: updatedMemory };
}

export function explainContextChange(change: ContextChangeResult): string {
  const artifacts = change.affectedArtifacts.join(", ");
  const deps = change.recalculatedDependencies.join(", ");
  return `${change.summary}\nArtefactos afectados: ${artifacts}.\nDependencias recalculadas: ${deps}.`;
}

export function isExplicitReviewRequest(input: string): boolean {
  return /\brevisar\b|\brevisa\b|\banaliza\b|\bco-founder\b|\bpair founder\b/i.test(input.trim());
}

export function buildContextChangeFromContradiction(
  ctx: MissionContext,
  contradictionSummary: string
): ContextChangeResult {
  return {
    changed: true,
    summary: contradictionSummary,
    affectedArtifacts: ctx.snapshots.filter((s) => s.progress > 0).map((s) => s.id).slice(0, 4),
    recalculatedDependencies: ["value_prop", "business_model"],
  };
}
