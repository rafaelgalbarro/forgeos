/** Generate 2-3 alternatives with justification. */

import type { Alternative, MissionContext, VentureMemory } from "./types";
import type { FounderPreference } from "./types";

function id(): string {
  return `alt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
}

export function proposeAlternatives(
  ctx: MissionContext,
  memory: VentureMemory,
  prefs: FounderPreference
): Alternative[] {
  const alts: Alternative[] = [];

  if (!ctx.intention) {
    alts.push(
      {
        id: id(),
        title: "Modo descubrimiento",
        description: "Explorar oportunidades antes de comprometerte.",
        justification: "Reduce riesgo de elegir la idea equivocada.",
        impact: "medium",
      },
      {
        id: id(),
        title: "Venture directo",
        description: "Lanzar empresa con la idea actual.",
        justification: "Velocidad máxima si ya tienes convicción.",
        impact: "high",
      }
    );
    return alts;
  }

  if (ctx.pendingDecisions.some((d) => !d.resolved)) {
    const pending = ctx.pendingDecisions.find((d) => !d.resolved)!;
    alts.push({
      id: id(),
      title: `Resolver: ${pending.title}`,
      description: `Elegir entre ${pending.options.join(", ")}`,
      justification: "Desbloquea el siguiente paso del pipeline.",
      impact: "high",
    });
  }

  if (prefs.autoPilotBias === "speed") {
    alts.push({
      id: id(),
      title: "Auto-resolver decisiones menores",
      description: "Dejar que Auto Pilot elija opciones no críticas.",
      justification: "Alineado con tu preferencia de velocidad.",
      impact: "medium",
    });
  } else {
    alts.push({
      id: id(),
      title: "Validar con consejo ejecutivo",
      description: "Escalar decisiones importantes al mesh.",
      justification: "Alineado con tu preferencia de calidad.",
      impact: "medium",
    });
  }

  alts.push({
    id: id(),
    title: `Avanzar fase ${ctx.phase}`,
    description: memory.ventureSummary || "Continuar el flujo de misión.",
    justification: "Mantiene momentum estratégico coherente.",
    impact: "low",
  });

  return alts.slice(0, 3);
}
