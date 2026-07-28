import type { VentureProject } from "@/lib/domain/venture";
import { resolvePortfolioNextAction } from "@/lib/portfolio/next-action";

export interface CeoPriorityItem {
  rank: number;
  ventureName: string;
  action: string;
  impact: string;
  href: string;
  priority: "alta" | "media" | "baja";
}

export function resolveCeoTopPriority(ventures: VentureProject[]): CeoPriorityItem | null {
  const next = resolvePortfolioNextAction(ventures);
  if (!next) return null;
  return {
    rank: 1,
    ventureName: next.ventureName,
    action: next.label,
    impact: next.impact,
    href: next.href,
    priority: next.priority,
  };
}

export function resolveCeoPriorityQueue(ventures: VentureProject[]): CeoPriorityItem[] {
  const top = resolveCeoTopPriority(ventures);
  return top ? [top] : [];
}
