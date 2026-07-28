/** Program 9000 — Best practices content. */

import { buildBestPractices, getTopBestPractice } from "@/lib/network/best-practices-engine";
import type { BestPractice, NetworkContext } from "@/lib/network/types";

export { getTopBestPractice };

export function buildNetworkBestPractices(ctx: NetworkContext): BestPractice[] {
  return buildBestPractices(ctx);
}

export function summarizeBestPractices(practices: BestPractice[]): string {
  const top = getTopBestPractice(practices);
  if (!top) return "Sin mejores prácticas disponibles.";
  return `${top.title} — adopción ${top.adoptionRatePct}% en la red`;
}
