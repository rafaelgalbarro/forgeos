import type { VentureProject } from "@/lib/domain/venture";
import {
  buildPipeline,
  deriveCurrentState,
  sectionHasContent,
} from "@/lib/portfolio/venture-status";
import { resolveNextAction } from "@/lib/portfolio/next-action";
import {
  runVentureSimulator,
  ventureToSimulatorInput,
} from "@/lib/venture-simulator";
import type { FounderBuildSection } from "./types";

function shortName(name: string): string {
  return name.length > 40 ? `${name.slice(0, 37)}…` : name;
}

function pipelineProgress(venture: VentureProject): number {
  const sim =
    venture.ventureSimulatorResult ?? runVentureSimulator(ventureToSimulatorInput(venture));
  const pipeline = buildPipeline(venture, sim?.recommendation);
  const weights = { complete: 1, active: 0.6, pending: 0.15, blocked: 0 };
  const total = pipeline.reduce((sum, step) => sum + weights[step.status], 0);
  return Math.round((total / pipeline.length) * 100);
}

function phaseLabel(venture: VentureProject): string {
  if (venture.status === "ready") return "Listo para lanzar";
  if (venture.status === "building") return "Construcción";
  if (!venture.researchReport) return "Validación";
  if (!venture.productPRD) return "Definición de producto";
  if (sectionHasContent(venture, "frontend") || sectionHasContent(venture, "backend")) {
    return "Desarrollo";
  }
  return "Preparación";
}

function statusMessage(venture: VentureProject): string {
  const state = deriveCurrentState(venture);
  if (venture.status === "ready") return "Paquete completo — revisar antes de salir al mercado.";
  if (venture.status === "building") return "Producto en construcción — mantener momentum.";
  return `Estado actual: ${state}`;
}

function nextMilestone(venture: VentureProject): string {
  const next = resolveNextAction(venture);
  return next.label;
}

function workspaceHref(venture: VentureProject): string {
  if (venture.status === "ready") return `/venture/${venture.id}`;
  if (venture.status === "building") return `/build/${venture.id}`;
  return `/intelligence/${venture.id}`;
}

export function buildFounderBuildSection(ventures: VentureProject[]): FounderBuildSection {
  if (ventures.length === 0) {
    return {
      headline: "Sin proyectos en construcción",
      items: [],
    };
  }

  const sorted = [...ventures].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  const items = sorted.map((venture) => ({
    id: venture.id,
    ventureName: shortName(venture.name),
    phaseLabel: phaseLabel(venture),
    progressPercent: pipelineProgress(venture),
    statusMessage: statusMessage(venture),
    nextMilestone: nextMilestone(venture),
    href: workspaceHref(venture),
  }));

  const inBuild = items.filter((i) => i.phaseLabel === "Construcción" || i.phaseLabel === "Desarrollo").length;
  const headline =
    inBuild > 0
      ? `${inBuild} empresa${inBuild > 1 ? "s" : ""} en fase de construcción`
      : "Estado de construcción por empresa";

  return { headline, items };
}
