import type { VentureProject } from "@/lib/domain/venture";
import type { IntelligenceMetrics, PortfolioMemory } from "../types";
import { getAllDecisions } from "../decision-engine";
import { getCachedPatterns } from "../pattern-engine";
import { getAllLearning } from "../learning-engine";
import { getAllVentureMemories } from "../venture-memory";
import { readStorage } from "../memory/storage";
import { STORAGE_KEYS } from "../memory/types";

export function computeIntelligenceMetrics(
  ventures: VentureProject[]
): IntelligenceMetrics {
  const decisions = getAllDecisions();
  const patterns = getCachedPatterns();
  const learning = getAllLearning();
  const portfolio = readStorage<PortfolioMemory | null>(STORAGE_KEYS.portfolio, null);

  const withSimulator = ventures.filter((v) => v.ventureSimulatorResult).length;
  const withDiscovery = ventures.filter(
    (v) => (v.discoveryContext?.answers.length ?? 0) > 0
  ).length;

  const scores = ventures
    .map((v) => v.ventureSimulatorResult?.startupScore)
    .filter((s): s is number => s !== undefined);
  const avgScore =
    scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

  const memories = getAllVentureMemories();
  const lastSynced = memories.length > 0
    ? memories.sort((a, b) => new Date(b.syncedAt).getTime() - new Date(a.syncedAt).getTime())[0].syncedAt
    : null;

  return {
    totalDecisions: decisions.length,
    completedDecisions: decisions.filter((d) => d.status === "completed").length,
    totalPatterns: patterns.length,
    totalInsights: portfolio?.insights.length ?? 0,
    totalLessons: learning.reduce((n, l) => n + l.lessonsLearned.length, 0),
    venturesWithSimulator: withSimulator,
    venturesWithDiscovery: withDiscovery,
    averageSimulatorScore: avgScore,
    lastSyncedAt: lastSynced,
  };
}

export function getMetricsSummary(ventures: VentureProject[]): Record<string, string | number> {
  const m = computeIntelligenceMetrics(ventures);
  return {
    decisiones: m.totalDecisions,
    completadas: m.completedDecisions,
    patrones: m.totalPatterns,
    insights: m.totalInsights,
    lecciones: m.totalLessons,
    conSimulador: m.venturesWithSimulator,
    conDiscovery: m.venturesWithDiscovery,
    scorePromedio: m.averageSimulatorScore ?? "—",
  };
}
