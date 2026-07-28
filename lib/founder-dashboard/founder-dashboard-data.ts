import type { VentureProject } from "@/lib/domain/venture";
import {
  formatStartupScore,
  formatVentureScore,
  formatVentureType,
  resolveLifeStage,
  resolveScores,
  resolveStatusBadge,
  ventureHref,
} from "@/lib/portfolio/venture-status";
import { formatRelativeTime } from "@/lib/portfolio/time-utils";
import { deriveNextActionLabel } from "@/lib/portfolio/venture-status";
import { countPriorityActions } from "@/lib/portfolio/next-action";
import type { FounderEmpresasSection, FounderVentureCard } from "./types";

const USER_NAME = "Rafael";

function shortDescription(venture: VentureProject): string {
  return (
    venture.description?.slice(0, 120) ||
    venture.ideaText.slice(0, 120) + (venture.ideaText.length > 120 ? "…" : "")
  );
}

function buildVentureCard(venture: VentureProject): FounderVentureCard {
  const scores = resolveScores(venture);
  const life = resolveLifeStage(venture, scores.ventureScore);
  const badge = resolveStatusBadge(venture);

  return {
    id: venture.id,
    name: venture.name,
    shortDescription: shortDescription(venture),
    ventureType: formatVentureType(venture.category),
    lifeStageLabel: life.label,
    statusLabel: badge.label,
    startupScore: formatStartupScore(scores.startupScore).display,
    ventureScore: formatVentureScore(scores.ventureScore, scores.hasSimulation).display,
    lastUpdatedRelative: formatRelativeTime(venture.updatedAt),
    nextAction: deriveNextActionLabel(venture),
    href: ventureHref(venture),
  };
}

export function buildFounderEmpresasSection(ventures: VentureProject[]): FounderEmpresasSection {
  const sorted = [...ventures].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  return {
    ventures: sorted.map(buildVentureCard),
    emptyMessage:
      "Tu portfolio está vacío. Captura una idea y ForgeOS te ayudará a validarla y construirla.",
  };
}

export function buildFounderHeader(ventures: VentureProject[]) {
  return {
    userName: USER_NAME,
    kicker: "Venture OS",
    title: `Buenos días, ${USER_NAME}.`,
    subtitle:
      "Vista ejecutiva de tu portfolio — prioridades, empresas y capital en un solo lugar.",
    ventureCount: ventures.length,
    priorityCount: countPriorityActions(ventures),
  };
}
