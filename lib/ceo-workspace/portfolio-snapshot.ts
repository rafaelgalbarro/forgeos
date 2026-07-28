import type { VentureProject } from "@/lib/domain/venture";
import { getPortfolioHighlights } from "@/lib/ceo-office/portfolio-ranking";
import { resolveNextAction } from "@/lib/portfolio/next-action";
import { deriveCurrentState } from "@/lib/portfolio/venture-status";
import type { PortfolioSnapshot } from "./types";

function shortName(name: string): string {
  return name.length > 48 ? `${name.slice(0, 45)}…` : name;
}

export function buildPortfolioSnapshot(ventures: VentureProject[]): PortfolioSnapshot {
  const highlights = getPortfolioHighlights(ventures);
  const activeCount = ventures.filter(
    (v) => v.status === "building" || v.status === "ready"
  ).length;

  const priorityActionCount = ventures
    .map(resolveNextAction)
    .filter((a) => a.priority === "alta").length;

  const venturesRows = highlights.rankings.map((ranking) => {
    const venture = ventures.find((v) => v.id === ranking.ventureId);
    const next = venture ? resolveNextAction(venture) : null;

    return {
      id: ranking.ventureId,
      name: shortName(ranking.name),
      statusLabel: venture ? deriveCurrentState(venture) : "—",
      nextAction: next?.label ?? "Revisar estado",
      href: ranking.href,
      riskLevel: ranking.risk,
    };
  });

  return {
    ventureCount: ventures.length,
    activeCount,
    priorityActionCount: priorityActionCount || (ventures.length > 0 ? 1 : 0),
    topVenture: highlights.topVenture
      ? { name: highlights.topVenture.name, href: highlights.topVenture.href }
      : null,
    criticalVenture: highlights.mostCritical
      ? { name: highlights.mostCritical.name, href: highlights.mostCritical.href }
      : null,
    promisingVenture: highlights.mostPromising
      ? { name: highlights.mostPromising.name, href: highlights.mostPromising.href }
      : null,
    ventures: venturesRows,
    highlights,
  };
}
