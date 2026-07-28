/** Program 4500 — Ventures panel. */

import type { VentureProject } from "@/lib/domain/venture";
import { getVentureHealth } from "@/lib/health";
import {
  formatVentureScore,
  resolveScores,
  resolveStatusBadge,
  ventureHref,
} from "@/lib/portfolio/venture-status";
import { formatRelativeTime } from "@/lib/portfolio/time-utils";
import type { VenturePanelData } from "./types";

function readinessLabel(venture: VentureProject): string {
  if (venture.status === "ready") return "Launch-ready";
  if (venture.status === "building") return "MVP en curso";
  if (venture.productPRD) return "Prototype-ready";
  return "Discovery";
}

function buildStatus(venture: VentureProject): string {
  const badge = resolveStatusBadge(venture);
  return badge.label;
}

function deployStatus(venture: VentureProject): string {
  if (venture.status === "ready") return "Preview disponible";
  if (venture.status === "building") return "Dry-run pendiente";
  return "Sin deploy";
}

export function buildVenturePanel(ventures: VentureProject[]): VenturePanelData {
  const sorted = [...ventures].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  return {
    ventures: sorted.map((v) => {
      const scores = resolveScores(v);
      const health = getVentureHealth(v);
      const scoreNum = scores.ventureScore ?? scores.startupScore ?? 0;
      return {
        id: v.id,
        name: v.name,
        healthScore: scoreNum,
        healthLabel: health.categoryLabel,
        readinessLabel: readinessLabel(v),
        ventureScore: formatVentureScore(scores.ventureScore, scores.hasSimulation).display,
        lastActivity: formatRelativeTime(v.updatedAt),
        buildStatus: buildStatus(v),
        deployStatus: deployStatus(v),
        href: ventureHref(v),
      };
    }),
    emptyMessage: "Aún no hay ventures. Crea tu primera con Venture Factory.",
  };
}
