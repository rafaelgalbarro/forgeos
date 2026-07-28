import type { VentureProject } from "@/lib/domain/venture";
import type { PortfolioMemory } from "../types";
import { STORAGE_KEYS } from "../memory/types";
import { readStorage, writeStorage } from "../memory/storage";
import { getAllVentureMemories } from "../venture-memory";
import { getAllDecisions } from "../decision-engine";
import { detectPatterns } from "../pattern-engine";
import { generateInsights } from "../insights";

export function buildPortfolioMemory(ventures: VentureProject[]): PortfolioMemory {
  const memories = getAllVentureMemories();
  const decisions = getAllDecisions();
  const patterns = detectPatterns(ventures);

  const aggregatedRisks: string[] = [];
  const aggregatedOpportunities: string[] = [];

  for (const v of ventures) {
    if (v.ventureSimulatorResult?.risks) {
      aggregatedRisks.push(...v.ventureSimulatorResult.risks);
    }
    if (v.ventureSimulatorResult?.opportunities) {
      aggregatedOpportunities.push(...v.ventureSimulatorResult.opportunities);
    }
  }

  const portfolio: PortfolioMemory = {
    totalVentures: ventures.length,
    ventureIds: ventures.map((v) => v.id),
    aggregatedRisks: [...new Set(aggregatedRisks)].slice(0, 20),
    aggregatedOpportunities: [...new Set(aggregatedOpportunities)].slice(0, 20),
    patterns,
    insights: [],
    lastUpdated: new Date().toISOString(),
  };

  portfolio.insights = generateInsights(portfolio, ventures, memories, decisions);
  writeStorage(STORAGE_KEYS.portfolio, portfolio);
  return portfolio;
}

export function getPortfolioMemory(): PortfolioMemory | null {
  return readStorage<PortfolioMemory | null>(STORAGE_KEYS.portfolio, null);
}
