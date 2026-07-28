import type { VentureProject } from "@/lib/domain/venture";
import { sectionHasContent } from "@/lib/portfolio/venture-status";
import type { FounderLifecycleStageId, FounderLifecycleStep, FounderLifecycleStepStatus } from "./types";

const STAGE_LABELS: Record<FounderLifecycleStageId, string> = {
  idea: "Idea",
  validacion: "Validación",
  mercado: "Mercado",
  producto: "Producto",
  construccion: "Construcción",
  lanzamiento: "Lanzamiento",
  crecimiento: "Crecimiento",
};

function stepStatus(done: boolean, active: boolean, blocked = false): FounderLifecycleStepStatus {
  if (blocked) return "blocked";
  if (done) return "complete";
  if (active) return "active";
  return "pending";
}

function discoveryDone(venture: VentureProject): boolean {
  return (
    (venture.discoveryContext?.answers.length ?? 0) >= 2 ||
    (venture.discoveryAnswers ? Object.keys(venture.discoveryAnswers).length >= 2 : false)
  );
}

function validacionDone(venture: VentureProject): boolean {
  return (
    discoveryDone(venture) &&
    (venture.intelligenceAccepted === true || !!venture.ventureSimulatorResult)
  );
}

function mercadoDone(venture: VentureProject): boolean {
  return !!venture.researchReport;
}

function productoDone(venture: VentureProject): boolean {
  return !!venture.productPRD;
}

function construccionDone(venture: VentureProject): boolean {
  return (
    venture.status === "ready" &&
    (sectionHasContent(venture, "frontend") ||
      sectionHasContent(venture, "backend") ||
      sectionHasContent(venture, "arquitectura"))
  );
}

function lanzamientoDone(venture: VentureProject): boolean {
  return sectionHasContent(venture, "landing");
}

function crecimientoDone(venture: VentureProject): boolean {
  const hasKpis = sectionHasContent(venture, "kpis");
  const highScore = (venture.ventureSimulatorResult?.ventureScore ?? 0) >= 70;
  return lanzamientoDone(venture) && (hasKpis || highScore);
}

export function resolveActiveLifecycleStage(venture: VentureProject): FounderLifecycleStageId {
  if (!venture.intelligenceReport) return "idea";
  if (!validacionDone(venture)) return "validacion";
  if (!mercadoDone(venture)) return "mercado";
  if (!productoDone(venture)) return "producto";
  if (!construccionDone(venture)) return "construccion";
  if (!lanzamientoDone(venture)) return "lanzamiento";
  if (!crecimientoDone(venture)) return "crecimiento";
  return "crecimiento";
}

export function buildFounderLifecycle(venture: VentureProject): FounderLifecycleStep[] {
  const idea = !!venture.intelligenceReport || !!venture.ideaText;
  const validacion = validacionDone(venture);
  const mercado = mercadoDone(venture);
  const producto = productoDone(venture);
  const construccion = construccionDone(venture);
  const lanzamiento = lanzamientoDone(venture);
  const crecimiento = crecimientoDone(venture);

  const active = resolveActiveLifecycleStage(venture);
  const buildBlocked =
    venture.ventureSimulatorResult?.recommendation === "do_not_build_yet" && !construccion;

  const stages: { id: FounderLifecycleStageId; done: boolean; blocked?: boolean }[] = [
    { id: "idea", done: idea },
    { id: "validacion", done: validacion },
    { id: "mercado", done: mercado, blocked: !validacion && !mercado },
    { id: "producto", done: producto },
    { id: "construccion", done: construccion, blocked: buildBlocked },
    { id: "lanzamiento", done: lanzamiento, blocked: !construccion && !lanzamiento },
    { id: "crecimiento", done: crecimiento },
  ];

  return stages.map(({ id, done, blocked }) => ({
    id,
    label: STAGE_LABELS[id],
    status: stepStatus(done, active === id && !done, blocked),
  }));
}
