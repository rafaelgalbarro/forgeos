/** Time-aware morning opening brief. */

import type { Mission } from "../types";
import type { MorningBrief } from "./types";
import { getPendingDecisions } from "../decision-center";
import { missionToContext } from "../pair-founder/pair-founder-engine";
import { readVentureMemory } from "../pair-founder/venture-memory";
import { detectRisks } from "../pair-founder/risk-detection";

function timeOfDay(): MorningBrief["timeOfDay"] {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "morning";
  if (h >= 12 && h < 18) return "afternoon";
  if (h >= 18 && h < 22) return "evening";
  return "night";
}

function greetingFor(tod: MorningBrief["timeOfDay"], name = "Fundador"): string {
  switch (tod) {
    case "morning":
      return `Buenos días, ${name}.`;
    case "afternoon":
      return `Buenas tardes, ${name}.`;
    case "evening":
      return `Buenas tardes, ${name}.`;
    case "night":
      return `Buenas noches, ${name}.`;
  }
}

export function generateMorningBrief(mission: Mission): MorningBrief {
  const tod = timeOfDay();
  const pending = getPendingDecisions(mission);
  const ctx = missionToContext(mission);
  const memory = readVentureMemory(mission.id);
  const risks = detectRisks(ctx, memory);

  const keyItems: string[] = [];

  if (mission.intention) {
    keyItems.push(`Misión activa: ${mission.title} (${mission.intention})`);
  }
  if (mission.phase) {
    keyItems.push(`Fase actual: ${mission.phase}`);
  }
  if (pending.length) {
    keyItems.push(`${pending.length} decisión(es) pendiente(s)`);
  }
  if (risks.filter((r) => r.severity === "high" || r.severity === "critical").length) {
    keyItems.push("Riesgos elevados detectados — revisar panel CEO");
  }
  if (mission.liveExecution.active) {
    keyItems.push("Ejecución en vivo activa");
  }
  if (keyItems.length === 0) {
    keyItems.push("Sin bloqueos críticos — buen momento para avanzar");
  }

  const headline =
    pending.length > 0
      ? `Tienes ${pending.length} decisión(es) que requieren atención hoy.`
      : mission.idea
        ? `Seguimos construyendo: ${mission.idea.slice(0, 60)}`
        : "Mission Control listo — elige tu próximo paso.";

  return {
    greeting: greetingFor(tod),
    timeOfDay: tod,
    headline,
    keyItems: keyItems.slice(0, 5),
    pendingDecisionCount: pending.length,
    riskCount: risks.length,
    generatedAt: new Date().toISOString(),
  };
}

export function formatMorningBriefText(brief: MorningBrief): string {
  const items = brief.keyItems.map((i) => `• ${i}`).join("\n");
  return `${brief.greeting}\n\n${brief.headline}\n\n${items}`;
}
