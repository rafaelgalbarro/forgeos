import type { VentureProject } from "@/lib/domain/venture";
import { buildLiveActivitySnapshot } from "@/lib/live";
import type { CeoOfficeBriefing } from "@/lib/ceo-office/ceo-ai-bridge";
import type { CeoDirectorNarrative, PriorityItem } from "./types";

const USER_NAME = "Rafael";

function formatDateGreeting(): string {
  const now = new Date();
  const hour = now.getHours();
  const salute = hour < 12 ? "Buenos días" : hour < 20 ? "Buenas tardes" : "Buenas noches";
  const dateLabel = now.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return `${salute}, ${USER_NAME}. Hoy es ${dateLabel}.`;
}

function buildAbsenceSummary(ventures: VentureProject[]): string {
  const live = buildLiveActivitySnapshot(ventures);
  if (live.absenceSummary.length === 0) {
    if (ventures.length === 0) {
      return "Durante tu ausencia, ForgeOS ha mantenido el entorno listo para tu primera startup.";
    }
    return "Durante tu ausencia, ForgeOS ha seguido monitorizando el portfolio sin novedades críticas.";
  }

  const lines = live.absenceSummary.slice(0, 3).map((l) => l.text);
  if (lines.length === 1) {
    return `Durante tu ausencia, ${lines[0].charAt(0).toLowerCase()}${lines[0].slice(1)}.`;
  }
  const last = lines.pop();
  return `Durante tu ausencia: ${lines.join("; ")}; y ${last?.charAt(0).toLowerCase()}${last?.slice(1) ?? ""}.`;
}

function buildPrioritiesLead(priorities: PriorityItem[], focusName: string | null): string {
  if (priorities.length === 0) {
    return "No hay prioridades activas — conviene definir la primera startup del portfolio.";
  }
  const top = priorities[0];
  const focus = focusName ? ` con foco en ${focusName}` : "";
  if (priorities.length === 1) {
    return `Mi recomendación principal${focus} es ${top.label.toLowerCase()}.`;
  }
  return `He ordenado ${priorities.length} prioridades${focus}. La más urgente: ${top.label.toLowerCase()}.`;
}

export function buildCeoDirectorNarrative(
  ventures: VentureProject[],
  briefing: CeoOfficeBriefing,
  priorities: PriorityItem[],
  focusVentureName: string | null
): CeoDirectorNarrative {
  const greeting = formatDateGreeting();
  const absenceSummary = buildAbsenceSummary(ventures);
  const prioritiesLead = buildPrioritiesLead(priorities, focusVentureName);

  const observation =
    briefing.executiveSummary ?? briefing.observation ?? briefing.openingLine;
  const riskNote = briefing.criticalRisk
    ? ` El riesgo que más me preocupa: ${briefing.criticalRisk}`
    : "";
  const actionNote = briefing.recommendation
    ? ` Mi siguiente movimiento recomendado: ${briefing.recommendation}`
    : "";

  const fullMessage = [
    greeting,
    absenceSummary,
    observation,
    prioritiesLead,
    riskNote,
    actionNote,
  ]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  return {
    greeting,
    absenceSummary,
    prioritiesLead,
    fullMessage,
  };
}
