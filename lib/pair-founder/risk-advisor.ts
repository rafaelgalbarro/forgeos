/** STEP 3 — Risk advisor from mission context + executive mesh hints. */

import type { MissionContext, Risk, VentureMemory } from "./types";

function id(): string {
  return `risk-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
}

export function detectRisks(ctx: MissionContext, memory: VentureMemory, meshHints?: string[]): Risk[] {
  const risks: Risk[] = [];

  if (!ctx.intention) {
    risks.push({
      id: id(),
      severity: "medium",
      title: "Intención no definida",
      description: "Sin intención clara, el equipo no puede enrutar a la fábrica correcta.",
      mitigation: "Elige una tarjeta o describe qué quieres construir.",
    });
  }

  if (ctx.phase === "BUILD" && ctx.snapshots.every((s) => s.progress < 30)) {
    risks.push({
      id: id(),
      severity: "high",
      title: "Construcción sin fundamentos",
      description: "Avanzamos a BUILD con snapshots por debajo del 30%.",
      mitigation: "Completar research y business model antes de construir.",
    });
  }

  const pendingImportant = ctx.pendingDecisions.filter((d) => !d.resolved && d.important);
  if (pendingImportant.length > 1) {
    risks.push({
      id: id(),
      severity: "medium",
      title: "Decisiones importantes acumuladas",
      description: `${pendingImportant.length} decisiones críticas pendientes.`,
      mitigation: "Resolver branding/arquitectura antes de continuar.",
    });
  }

  if (memory.priorDecisions.some((d) => d.includes("Freemium")) && ctx.idea?.match(/enterprise|b2b/i)) {
    risks.push({
      id: id(),
      severity: "medium",
      title: "Desalineación pricing-segmento",
      description: "Freemium elegido pero la idea apunta a enterprise B2B.",
      mitigation: "Revisar modelo de precios con el segmento objetivo.",
    });
  }

  if (ctx.founderProfile?.presupuesto && ctx.founderProfile.restricciones.length > 2) {
    risks.push({
      id: id(),
      severity: "medium",
      title: "Scope vs restricciones",
      description: "Múltiples restricciones con presupuesto definido — riesgo de scope creep.",
      mitigation: "Priorizar MVP mínimo viable.",
    });
  }

  if (meshHints?.length) {
    for (const hint of meshHints.slice(0, 2)) {
      risks.push({
        id: id(),
        severity: "low",
        title: "Señal del mesh ejecutivo",
        description: hint,
      });
    }
  }

  if (ctx.phase === "DEPLOY" && !ctx.snapshots.find((s) => s.id === "deployment")?.progress) {
    risks.push({
      id: id(),
      severity: "high",
      title: "Despliegue sin pipeline",
      description: "Fase DEPLOY sin progreso en deployment snapshot.",
      mitigation: "Configurar entorno preview o staging primero.",
    });
  }

  return risks.sort((a, b) => severityRank(b.severity) - severityRank(a.severity));
}

function severityRank(s: Risk["severity"]): number {
  return { critical: 4, high: 3, medium: 2, low: 1 }[s];
}

export function risksToStatusStrings(risks: Risk[]): string[] {
  return risks.slice(0, 5).map((r) => `[${r.severity}] ${r.title}: ${r.description}`);
}
