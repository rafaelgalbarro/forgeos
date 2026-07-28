/**
 * ISOLATED — not imported by /dashboard (Release 0.2.5 rollback).
 * Do not import from app/ or components/dashboard/.
 */
import type { VentureProject } from "@/lib/domain/venture";
import type { BoardEngineOutput } from "@/lib/board/types";
import type { BuildEngineOutput } from "@/lib/build-engine/types";
import { runBuildEngine } from "@/lib/build-engine/orchestrator";
import type { CeoEngineOutput } from "@/lib/ceo/ceo-engine";
import { runCeoEngine } from "@/lib/ceo/ceo-engine";
import type { FosSnapshot } from "@/lib/fos/types";
import { runFos } from "@/lib/fos/kernel";
import { getFosDashboardSnapshot, type FosDashboardSnapshot } from "@/lib/fos/fos-dashboard-adapter";
import {
  buildPortfolioDashboardData,
  type CEOBriefing,
  type DashboardHeaderData,
  type PortfolioDashboardData,
  type PortfolioMetric,
} from "@/lib/portfolio";

export interface UnifiedDashboardData extends PortfolioDashboardData {
  fos: FosDashboardSnapshot;
  ceo: CeoEngineOutput;
  board: BoardEngineOutput;
  build: BuildEngineOutput;
}

function emptyBuildOutput(): BuildEngineOutput {
  return {
    queue: [],
    timeline: [],
    prompts: [],
    connectors: [],
    computedAt: new Date().toISOString(),
  };
}

function safeRunFos(ventures: VentureProject[]): FosSnapshot {
  try {
    const result = runFos(ventures);
    return {
      metrics: result.metrics,
      ventureContexts: result.ventureContexts,
      topPriorityVentureId: result.topPriorityVentureId,
      computedAt: result.computedAt,
    };
  } catch (error) {
    console.error("[dashboard-engine] runFos failed:", error);
    return {
      metrics: {
        dailyFocus: "Modo degradado",
        attentionScore: 0,
        portfolioHealth: 0,
        portfolioGrowth: 0,
        portfolioReadiness: 0,
        impactScore: 0,
        momentum: 0,
        confidence: 0,
        risk: 0,
      },
      ventureContexts: [],
      topPriorityVentureId: null,
      computedAt: new Date().toISOString(),
    };
  }
}

function safeRunCeoEngine(ventures: VentureProject[], fos: FosSnapshot): CeoEngineOutput {
  try {
    return runCeoEngine(ventures, fos);
  } catch (error) {
    console.error("[dashboard-engine] runCeoEngine failed:", error);
    try {
      return runCeoEngine([], fos);
    } catch {
      return runCeoEngine([], {
        ...fos,
        ventureContexts: [],
        topPriorityVentureId: null,
      });
    }
  }
}

function safeRunBuildEngine(ventures: VentureProject[]): BuildEngineOutput {
  try {
    return runBuildEngine(ventures);
  } catch (error) {
    console.error("[dashboard-engine] runBuildEngine failed:", error);
    return emptyBuildOutput();
  }
}

function mapCeoToBriefing(ceo: CeoEngineOutput): CEOBriefing {
  const base = ceo.morningBrief.briefing;
  const topRisk = ceo.criticalRisks[0];
  const rec = ceo.recommendation;
  const weekly = ceo.weeklyReview.headline;
  const monthly = ceo.monthlyReview.headline;

  return {
    ...base,
    observation: [base.observation, weekly, monthly].filter(Boolean).join(" "),
    criticalRisk: topRisk ? `${topRisk.label}: ${topRisk.description}` : base.criticalRisk,
    recommendation: rec.rationale ? `${rec.action} — ${rec.rationale}` : rec.action,
    expectedImpact: rec.expectedImpact,
    ctaLabel: rec.action,
    ctaHref: rec.href,
  };
}

function enrichHeader(
  header: DashboardHeaderData,
  fos: FosDashboardSnapshot,
  ceo: CeoEngineOutput
): DashboardHeaderData {
  const top = ceo.topPriority;
  return {
    ...header,
    subtitle: fos.dailyFocus || header.subtitle,
    nextActionLine: top
      ? `${top.action} · ${top.ventureName}`
      : fos.topPriority || header.nextActionLine,
    continueHref: top?.href ?? header.continueHref,
    continueLabel: top?.action ?? header.continueLabel,
  };
}

function enrichMetrics(metrics: PortfolioMetric[], fos: FosDashboardSnapshot): PortfolioMetric[] {
  return metrics.map((m) => {
    if (m.id === "portfolio-value") {
      return {
        ...m,
        trend: `FOS Health ${fos.portfolioHealth}%`,
        microcopy: `Kernel ${fos.kernelStatus} · ${fos.eventCount} eventos`,
      };
    }
    if (m.id === "active-startups") {
      return {
        ...m,
        trend: `Atención ${fos.attentionScore}%`,
      };
    }
    if (m.id === "validated-ideas") {
      return {
        ...m,
        explanation: fos.topPriority
          ? `Prioridad: ${fos.topPriority}`
          : m.explanation,
      };
    }
    if (m.id === "time-saved") {
      return {
        ...m,
        microcopy: `Daily Focus: ${fos.dailyFocus}`,
      };
    }
    return m;
  });
}

export function buildUnifiedDashboardData(ventures: VentureProject[]): UnifiedDashboardData {
  const sorted = [...ventures].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  const fosSnapshot = getFosDashboardSnapshot(sorted);
  const fos = safeRunFos(sorted);
  const ceo = safeRunCeoEngine(sorted, fos);
  const build = safeRunBuildEngine(sorted);
  const portfolio = buildPortfolioDashboardData(sorted);

  return {
    ...portfolio,
    header: enrichHeader(portfolio.header, fosSnapshot, ceo),
    metrics: enrichMetrics(portfolio.metrics, fosSnapshot),
    ceoBriefing: mapCeoToBriefing(ceo),
    fos: fosSnapshot,
    ceo,
    board: ceo.board,
    build,
  };
}

export function safeBuildUnifiedDashboardData(ventures: VentureProject[]): {
  data: UnifiedDashboardData;
  error: string | null;
} {
  try {
    return { data: buildUnifiedDashboardData(ventures), error: null };
  } catch (error) {
    console.error("[dashboard-engine] unified build failed:", error);
    try {
      const portfolio = buildPortfolioDashboardData(ventures);
      const fos = getFosDashboardSnapshot(ventures);
      return {
        data: {
          ...portfolio,
          fos,
          ceo: safeRunCeoEngine([], safeRunFos([])),
          board: safeRunCeoEngine([], safeRunFos([])).board,
          build: emptyBuildOutput(),
        },
        error: error instanceof Error ? error.message : "Modo degradado",
      };
    } catch {
      const portfolio = buildPortfolioDashboardData([]);
      return {
        data: {
          ...portfolio,
          fos: getFosDashboardSnapshot([]),
          ceo: safeRunCeoEngine([], safeRunFos([])),
          board: safeRunCeoEngine([], safeRunFos([])).board,
          build: emptyBuildOutput(),
        },
        error: "Dashboard en modo recuperación",
      };
    }
  }
}
