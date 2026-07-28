import type { VentureProject } from "@/lib/domain/venture";
import { sectionHasContent } from "@/lib/portfolio/venture-status";
import type { LiveDepartment, LiveTimelineEvent, VentureLivePulse } from "./types";

const DEPT_LABELS: Record<LiveDepartment, string> = {
  ceo: "CEO",
  research: "Research",
  product: "Product",
  marketing: "Marketing",
  simulator: "Simulator",
  cto: "CTO",
  ux: "UX",
  discovery: "Discovery",
};

function formatTime(base: Date, offsetMinutes: number): string {
  const d = new Date(base.getTime() - offsetMinutes * 60_000);
  return d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

function shortName(name: string): string {
  return name.length > 36 ? `${name.slice(0, 33)}…` : name;
}

export function generateVentureTimelineEvents(
  venture: VentureProject,
  baseDate: Date
): LiveTimelineEvent[] {
  const events: LiveTimelineEvent[] = [];
  const name = shortName(venture.name);
  let offset = 0;

  const push = (
    department: LiveDepartment,
    message: string,
    minutesGap = 2
  ) => {
    offset += minutesGap;
    events.push({
      id: `${venture.id}-${department}-${offset}`,
      time: formatTime(baseDate, offset),
      department,
      departmentLabel: DEPT_LABELS[department],
      message,
      ventureId: venture.id,
      ventureName: name,
    });
  };

  if (venture.researchReport) {
    push("research", `Terminó análisis de mercado para ${name}.`);
  } else {
    push("research", `Preparando análisis de mercado para ${name}.`, 1);
  }

  if (venture.productPRD) {
    push("product", "Actualizó el MVP.");
  }

  if (sectionHasContent(venture, "mercado") || venture.researchReport) {
    push("marketing", "Detectó señales de competencia.");
  }

  if (sectionHasContent(venture, "arquitectura")) {
    push("cto", "Revisó la arquitectura.");
  } else if (venture.status === "building") {
    push("cto", "Esperando definición técnica.");
  }

  if (venture.ventureSimulatorResult) {
    push("simulator", "Recalculó Venture Score.");
  }

  const remaining = venture.discoveryContext?.remainingQuestions?.length ?? 0;
  if (remaining > 0) {
    push("discovery", `${remaining} decisión${remaining > 1 ? "es" : ""} pendiente${remaining > 1 ? "s" : ""}.`);
  }

  push("ceo", "Preparó recomendaciones estratégicas.");

  return events;
}

export function generateVenturePulses(venture: VentureProject): VentureLivePulse[] {
  const pulses: VentureLivePulse[] = [];
  const researchDone = !!venture.researchReport;
  const productDone = !!venture.productPRD;
  const archDone = sectionHasContent(venture, "arquitectura");
  const remaining = venture.discoveryContext?.remainingQuestions?.length ?? 0;

  if (!researchDone) {
    pulses.push({ id: `${venture.id}-r`, label: "Research trabajando…", department: "research" });
  } else if (!productDone) {
    pulses.push({ id: `${venture.id}-p`, label: "Product revisando MVP…", department: "product" });
  }

  if (venture.researchReport && !sectionHasContent(venture, "landing")) {
    pulses.push({ id: `${venture.id}-m`, label: "Marketing revisando…", department: "marketing" });
  }

  if (venture.status === "building" && !archDone) {
    pulses.push({ id: `${venture.id}-c`, label: "CTO esperando…", department: "cto" });
  }

  if (remaining > 0) {
    pulses.push({ id: `${venture.id}-d`, label: "ForgeOS esperando tu decisión…", department: "discovery" });
  }

  pulses.push({ id: `${venture.id}-ceo`, label: "CEO analizando…", department: "ceo" });

  return pulses.slice(0, 3);
}

export function generateAbsenceSummary(ventures: VentureProject[]): { id: string; text: string }[] {
  const lines: { id: string; text: string }[] = [];
  let researchCount = 0;
  let marketingSignals = 0;
  let archReviews = 0;
  let ceoBriefings = 0;

  for (const v of ventures) {
    if (v.researchReport) researchCount += 1;
    if (v.researchReport || sectionHasContent(v, "mercado")) marketingSignals += 1;
    if (sectionHasContent(v, "arquitectura")) archReviews += 1;
    if (v.discoveryContext?.answers.length || v.researchReport) ceoBriefings += 1;
  }

  if (researchCount > 0) {
    lines.push({
      id: "research",
      text: `Research completó ${researchCount} análisis.`,
    });
  }
  if (marketingSignals > 0) {
    lines.push({
      id: "marketing",
      text:
        marketingSignals === 1
          ? "Marketing detectó un competidor."
          : `Marketing detectó señales en ${marketingSignals} startups.`,
    });
  }
  if (archReviews > 0) {
    lines.push({
      id: "cto",
      text:
        archReviews === 1
          ? "CTO revisó la arquitectura."
          : `CTO revisó arquitectura en ${archReviews} ventures.`,
    });
  }

  lines.push({
    id: "ceo",
    text: ceoBriefings > 0 ? "CEO AI preparó un briefing." : "CEO AI preparó orientación inicial.",
  });

  if (ventures.length === 0) {
    return [
      { id: "empty", text: "ForgeOS está listo para tu primera empresa." },
      { id: "ceo", text: "CEO AI preparó un briefing de bienvenida." },
    ];
  }

  return lines;
}
