/** STEP 2 — Build Pair Founder context from memory snapshots (adapters only). */

import type { Mission } from "@/lib/mission-control/types";
import type { MissionContext } from "./types";
import { readFounderProfile, adaptFounderProfileFromInput, profileSummaryForContext } from "./founder-profile";
import { readVentureMemory } from "./venture-memory";
import { getDecisionGraphAvailable } from "./adapters/decision-graph-adapter";

const DEFAULT_WORKSPACE = "ws-default";

export function missionToContext(mission: Mission, workspaceId = DEFAULT_WORKSPACE): MissionContext {
  return {
    missionId: mission.id,
    workspaceId,
    title: mission.title,
    idea: mission.idea,
    intention: mission.intention,
    phase: mission.phase,
    pendingDecisions: mission.pendingDecisions,
    recentMessages: mission.messages.slice(-6).map((m) => ({ role: m.role, content: m.content })),
    snapshots: mission.snapshots.map((s) => ({ id: s.id, progress: s.progress, status: s.status })),
    founderProfile: readFounderProfile(workspaceId),
  };
}

export async function buildPairFounderContext(
  mission: Mission,
  userInput?: string,
  workspaceId = DEFAULT_WORKSPACE
): Promise<MissionContext> {
  if (userInput) adaptFounderProfileFromInput(workspaceId, userInput);

  const ctx = missionToContext(mission, workspaceId);
  const memory = readVentureMemory(mission.id);
  const graphAvailable = await getDecisionGraphAvailable();

  const meshHints: string[] = [];
  if (graphAvailable) meshHints.push("Decision Graph vinculado");
  if (memory.priorDecisions.length) {
    meshHints.push(`${memory.priorDecisions.length} decisiones en memoria`);
  }

  const profile = ctx.founderProfile!;
  const profileHint = profileSummaryForContext(profile);
  if (profileHint) meshHints.push(profileHint);

  return { ...ctx, meshHints };
}

export function buildHypotheses(ctx: MissionContext, memory: ReturnType<typeof readVentureMemory>): string[] {
  const hypotheses: string[] = [];

  if (ctx.intention === "VENTURE" && ctx.phase === "PLAN") {
    hypotheses.push("El founder busca validar product-market fit antes de escalar.");
  }
  if (ctx.idea?.match(/enterprise|b2b/i)) {
    hypotheses.push("Segmento enterprise implica ciclos de venta largos y mayor complejidad técnica.");
  }
  if (memory.priorDecisions.some((d) => d.includes("Freemium"))) {
    hypotheses.push("Modelo freemium sugiere adquisición orgánica como canal principal.");
  }
  if (ctx.founderProfile?.estrategiaCrecimiento?.includes("Bootstrap")) {
    hypotheses.push("Estrategia bootstrap — priorizar revenue temprano sobre crecimiento agresivo.");
  }
  if (ctx.snapshots.some((s) => s.id === "architecture" && s.progress > 50)) {
    hypotheses.push("Arquitectura avanzada — riesgo de over-engineering si no hay usuarios aún.");
  }

  return hypotheses.slice(0, 4);
}

export function buildPriorities(ctx: MissionContext): string[] {
  const priorities: string[] = [];
  const pending = ctx.pendingDecisions.filter((d) => !d.resolved);

  if (pending.length) {
    priorities.push(`Resolver decisión: ${pending[0].title}`);
  }
  if (!ctx.intention) {
    priorities.push("Definir intención de misión");
  }
  if (ctx.phase === "UNDERSTAND" && !ctx.idea) {
    priorities.push("Articular la idea en una frase");
  }

  const weak = ctx.snapshots.filter((s) => s.progress > 0 && s.progress < 50).sort((a, b) => a.progress - b.progress);
  if (weak.length) {
    priorities.push(`Fortalecer ${weak[0].id} (${weak[0].progress}%)`);
  }

  if (ctx.founderProfile?.presupuesto && ctx.founderProfile.restricciones.length) {
    priorities.push("Ajustar scope a restricciones de presupuesto");
  }

  return priorities.slice(0, 4);
}
