/** STEP 4 — Structured recommendations (no private reasoning exposed). */

import type {
  Alternative,
  Contradiction,
  FounderPreference,
  MissionContext,
  PairFounderRecommendation,
  Risk,
  VentureMemory,
} from "./types";
import { topDecisionTitle } from "./priority-advisor";
import { readExitStrategySelection } from "@/lib/mission-control/exit-strategy/exit-strategy-selector";
import { getExitStrategyLabel } from "@/lib/mission-control/exit-strategy/exit-strategy-registry";
import { generateAdaptationPlan } from "@/lib/mission-control/exit-strategy/strategy-adaptations";

export function buildRecommendation(
  ctx: MissionContext,
  memory: VentureMemory,
  prefs: FounderPreference,
  alternatives: Alternative[]
): { action: string; justification: string; alternatives: Alternative[] } {
  const pendingTitle = topDecisionTitle(ctx.pendingDecisions);

  const exitSelection = readExitStrategySelection(ctx.missionId);
  if (exitSelection) {
    const plan = generateAdaptationPlan(exitSelection.strategy);
    const topRec = plan.recommendations.find((r) => r.priority === "high");
    if (topRec && !pendingTitle) {
      return {
        action: `[${getExitStrategyLabel(exitSelection.strategy)}] ${topRec.action}`,
        justification: topRec.rationale,
        alternatives,
      };
    }
  }

  if (pendingTitle) {
    const pending = ctx.pendingDecisions.find((d) => !d.resolved && d.title === pendingTitle)!;
    return {
      action: `Resolver: ${pendingTitle}`,
      justification: `${pending.description} — ${preferenceJustification(prefs)}`,
      alternatives,
    };
  }

  if (!ctx.intention) {
    return {
      action: "Definir intención de misión",
      justification: "Sin intención no podemos enrutar ni priorizar decisiones.",
      alternatives,
    };
  }

  if (
    (ctx.intention === "VENTURE" || ctx.intention === "WEBSITE" || ctx.intention === "APPLICATION") &&
    !exitSelection &&
    ctx.phase === "PLAN"
  ) {
    return {
      action: "Definir estrategia de salida",
      justification: "El exit path adaptará Roadmap, Finanzas, Marketing y Producto desde el inicio.",
      alternatives,
    };
  }

  if (ctx.phase === "UNDERSTAND" && !ctx.idea) {
    return {
      action: "Articula la idea en una frase",
      justification: "Necesito entender el venture antes de planificar.",
      alternatives,
    };
  }

  const activeSnapshots = ctx.snapshots.filter((s) => s.progress > 0 && s.progress < 100);
  if (activeSnapshots.length) {
    const weakest = activeSnapshots.sort((a, b) => a.progress - b.progress)[0];
    return {
      action: `Fortalecer ${weakest.id} (${weakest.progress}%)`,
      justification: `Es el dominio más débil. ${memory.ventureSummary || ""}`.trim(),
      alternatives,
    };
  }

  return {
    action: `Avanzar a la siguiente fase desde ${ctx.phase}`,
    justification: `Estrategia coherente: ${memory.strategyNotes[memory.strategyNotes.length - 1] ?? "mantener momentum"}. ${preferenceJustification(prefs)}`,
    alternatives,
  };
}

function preferenceJustification(prefs: FounderPreference): string {
  if (prefs.autoPilotBias === "speed") return "Priorizo velocidad según tus preferencias.";
  if (prefs.riskTolerance === "conservative") return "Prefiero validar antes de avanzar.";
  return "Equilibrio entre velocidad y calidad.";
}

export function buildStructuredRecommendations(
  ctx: MissionContext,
  memory: VentureMemory,
  prefs: FounderPreference,
  alternatives: Alternative[],
  contradictions: Contradiction[],
  risks: Risk[],
  confidence: number
): PairFounderRecommendation[] {
  const primary = buildRecommendation(ctx, memory, prefs, alternatives);
  const recs: PairFounderRecommendation[] = [];

  recs.push({
    recommendation: primary.action,
    rationaleSummary: primary.justification,
    expectedImpact: contradictions.length ? "Requiere resolver contradicción antes de avanzar" : "Desbloquea siguiente fase",
    confidence,
    assumptions: buildAssumptions(ctx, memory),
    risk: risks[0]?.title ?? "Sin riesgos críticos identificados",
    alternative: alternatives[0]?.title,
  });

  for (const alt of alternatives.slice(0, 2)) {
    recs.push({
      recommendation: alt.title,
      rationaleSummary: alt.justification,
      expectedImpact: `Impacto ${alt.impact}`,
      confidence: Math.max(40, confidence - 15),
      assumptions: ["Founder prefiere explorar alternativas"],
      risk: alt.impact === "high" ? "Mayor complejidad de ejecución" : "Menor urgencia",
      alternative: primary.action,
    });
  }

  return recs.slice(0, 3);
}

function buildAssumptions(ctx: MissionContext, memory: VentureMemory): string[] {
  const assumptions: string[] = [];
  if (ctx.intention) assumptions.push(`Intención: ${ctx.intention}`);
  if (memory.priorDecisions.length) assumptions.push("Decisiones previas se mantienen");
  if (ctx.founderProfile?.presupuesto) assumptions.push(`Presupuesto: ${ctx.founderProfile.presupuesto}`);
  return assumptions.slice(0, 3);
}

export function buildVentureUnderstanding(ctx: MissionContext, memory: VentureMemory): string {
  const parts: string[] = [];
  if (memory.ventureSummary) parts.push(memory.ventureSummary);
  else if (ctx.title) parts.push(`Misión: ${ctx.title}`);
  if (ctx.intention) parts.push(`Objetivo: ${ctx.intention}`);
  if (ctx.founderProfile?.tipoEmpresaDeseada) {
    parts.push(`Tipo empresa: ${ctx.founderProfile.tipoEmpresaDeseada}`);
  }
  if (memory.priorDecisions.length) {
    parts.push(`Decisiones tomadas: ${memory.priorDecisions.slice(-3).join("; ")}`);
  }
  if (memory.keyFacts.length) {
    parts.push(`Hechos clave: ${memory.keyFacts.slice(-2).join("; ")}`);
  }
  return parts.join(". ") || "Esperando contexto del venture.";
}

export function recommendationsToStatusStrings(rec: { action: string; justification: string }): string[] {
  return [`${rec.action} — ${rec.justification}`];
}
