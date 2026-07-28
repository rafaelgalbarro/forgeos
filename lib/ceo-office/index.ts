import type { VentureProject } from "@/lib/domain/venture";
import { buildExecutiveSummary, buildDailyReport, runCeoEngine, type CeoEngineOutput } from "@/lib/ceo";
import { runBuildEngine, type BuildEngineOutput } from "@/lib/build-engine";
import { runFos, type FosSnapshot } from "@/lib/fos";
import { initHealthFosBridge } from "@/lib/health/fos-bridge";
import { buildHeadquartersSnapshot } from "@/lib/headquarters";
import { buildPortfolioHealthSnapshot, getVentureHealth } from "@/lib/health";
import { initLiveFosBridge } from "@/lib/live/fos-bridge";
import { buildLiveActivitySnapshot } from "@/lib/live";
import { buildNotificationCenter } from "@/lib/notifications";
import type { SmartAction } from "@/lib/portfolio/impact-engine";
import {
  buildPortfolioDashboardData,
  type VenturePortfolioCard,
} from "@/lib/portfolio";
import { initPortfolioFosBridge } from "@/lib/portfolio/fos-bridge";
import { buildPortfolioSmartAction } from "@/lib/portfolio/impact-engine";
import { getDefaultBoardQuestion, runBoardEngine } from "@/lib/board";
import { buildCEOBriefing } from "@/lib/portfolio/ceo-briefing";

export interface ExecutiveVentureCard extends VenturePortfolioCard {
  healthLabel: string;
  healthCategory: string;
  livePulses: { id: string; label: string }[];
  impactSummary: string;
}

export interface CeoOfficeHeader {
  userName: string;
  title: string;
  absenceLines: { id: string; text: string }[];
}

export interface CeoOfficeData {
  header: CeoOfficeHeader;
  smartAction: SmartAction | null;
  portfolio: ReturnType<typeof buildPortfolioDashboardData>;
  live: ReturnType<typeof buildLiveActivitySnapshot>;
  headquarters: ReturnType<typeof buildHeadquartersSnapshot>;
  health: ReturnType<typeof buildPortfolioHealthSnapshot>;
  notifications: ReturnType<typeof buildNotificationCenter>;
  executiveSummary: ReturnType<typeof buildExecutiveSummary>;
  dailyReport: ReturnType<typeof buildDailyReport>;
  executiveVentures: ExecutiveVentureCard[];
  fos: FosSnapshot;
  ceo: CeoEngineOutput;
  build: BuildEngineOutput;
}

const USER_NAME = "Rafael";

function emptyBuildOutput(): BuildEngineOutput {
  return {
    queue: [],
    timeline: [],
    prompts: [],
    connectors: [],
    computedAt: new Date().toISOString(),
  };
}

function emptyCeoOutput(fos: FosSnapshot): CeoEngineOutput {
  const briefing = buildCEOBriefing([]);
  return {
    morningBrief: {
      type: "morning",
      date: new Date().toLocaleDateString("es-ES", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }),
      briefing,
      dailyFocus: fos.metrics.dailyFocus,
      attentionScore: fos.metrics.attentionScore,
    },
    weeklyReview: {
      type: "weekly",
      weekLabel: `Semana ${Math.ceil(new Date().getDate() / 7)}`,
      headline: "CEO Office en modo recuperación.",
      highlights: ["ForgeOS está restableciendo el entorno."],
      venturesReviewed: 0,
      momentum: fos.metrics.momentum,
    },
    monthlyReview: {
      type: "monthly",
      monthLabel: new Date().toLocaleDateString("es-ES", { month: "long", year: "numeric" }),
      headline: "Revisión mensual pendiente.",
      portfolioGrowth: fos.metrics.portfolioGrowth,
      readiness: fos.metrics.portfolioReadiness,
      summary: "Datos del portfolio no disponibles temporalmente.",
    },
    executiveSummary: {
      portfolioSize: 0,
      activeVentures: 0,
      topPriority: "Revisar consola",
      ceoMessage: "ForgeOS está recuperando el estado del portfolio.",
      impactScore: fos.metrics.impactScore,
      confidence: fos.metrics.confidence,
      risk: fos.metrics.risk,
    },
    criticalRisks: [],
    topOpportunities: [],
    topPriority: null,
    recommendation: {
      action: "Revisar consola y recargar",
      rationale: "El motor CEO no pudo completar el análisis.",
      expectedImpact: "Restaurar visibilidad del portfolio.",
      href: "/dashboard",
      estimatedTime: "1 min",
      priority: "alta",
    },
    ventureReviews: [],
    board: runBoardEngine(getDefaultBoardQuestion([]), []),
    computedAt: new Date().toISOString(),
  };
}

function safeRunCeoEngine(ventures: VentureProject[], fos: FosSnapshot): CeoEngineOutput {
  try {
    return runCeoEngine(ventures, fos);
  } catch (error) {
    console.error("[ceo-office] runCeoEngine failed:", error);
    try {
      return runCeoEngine([], fos);
    } catch (fallbackError) {
      console.error("[ceo-office] runCeoEngine fallback failed:", fallbackError);
      return emptyCeoOutput(fos);
    }
  }
}

function initFosBridges(): void {
  initPortfolioFosBridge();
  initHealthFosBridge();
  initLiveFosBridge();
}

export function buildCeoOfficeData(ventures: VentureProject[]): CeoOfficeData {
  initFosBridges();

  const sorted = [...ventures].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  const fosResult = runFos(sorted);
  const fos: FosSnapshot = {
    metrics: fosResult.metrics,
    ventureContexts: fosResult.ventureContexts,
    topPriorityVentureId: fosResult.topPriorityVentureId,
    computedAt: fosResult.computedAt,
  };

  const ceo = safeRunCeoEngine(sorted, fos);

  let build: BuildEngineOutput;
  try {
    build = runBuildEngine(sorted);
  } catch (error) {
    console.error("[ceo-office] runBuildEngine failed:", error);
    build = emptyBuildOutput();
  }

  const portfolio = buildPortfolioDashboardData(sorted);
  const live = buildLiveActivitySnapshot(sorted);
  const smartAction = buildPortfolioSmartAction(sorted);

  const executiveVentures: ExecutiveVentureCard[] = portfolio.ventures.map((v) => {
    const venture = sorted.find((s) => s.id === v.id);
    const health = venture
      ? getVentureHealth(venture)
      : { categoryLabel: "Pendiente", category: "healthy" as const };
    return {
      ...v,
      healthLabel: health.categoryLabel,
      healthCategory: health.category,
      livePulses: live.venturePulses[v.id] ?? [],
      impactSummary: v.nextActionData.impact,
    };
  });

  return {
    header: {
      userName: USER_NAME,
      title: "Durante tu ausencia ForgeOS ha seguido trabajando.",
      absenceLines: live.absenceSummary,
    },
    smartAction,
    portfolio,
    live,
    headquarters: buildHeadquartersSnapshot(sorted),
    health: buildPortfolioHealthSnapshot(sorted),
    notifications: buildNotificationCenter(sorted),
    executiveSummary: buildExecutiveSummary(sorted),
    dailyReport: buildDailyReport(sorted),
    executiveVentures,
    fos,
    ceo,
    build,
  };
}

/** Safe wrapper — never throws; returns degraded data on catastrophic failure. */
export function safeBuildCeoOfficeData(ventures: VentureProject[]): {
  data: CeoOfficeData;
  error: string | null;
} {
  try {
    return { data: buildCeoOfficeData(ventures), error: null };
  } catch (error) {
    console.error("[ceo-office] buildCeoOfficeData failed:", error);
    try {
      const sorted = [...ventures].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      const portfolio = buildPortfolioDashboardData(sorted);
      const live = buildLiveActivitySnapshot(sorted);
      const fosResult = runFos(sorted);
      const fos: FosSnapshot = {
        metrics: fosResult.metrics,
        ventureContexts: fosResult.ventureContexts,
        topPriorityVentureId: fosResult.topPriorityVentureId,
        computedAt: fosResult.computedAt,
      };
      return {
        data: {
          header: {
            userName: USER_NAME,
            title: "Durante tu ausencia ForgeOS ha seguido trabajando.",
            absenceLines: live.absenceSummary,
          },
          smartAction: buildPortfolioSmartAction(sorted),
          portfolio,
          live,
          headquarters: buildHeadquartersSnapshot(sorted),
          health: buildPortfolioHealthSnapshot(sorted),
          notifications: buildNotificationCenter(sorted),
          executiveSummary: buildExecutiveSummary(sorted),
          dailyReport: buildDailyReport(sorted),
          executiveVentures: portfolio.ventures.map((v) => ({
            ...v,
            healthLabel: "Pendiente",
            healthCategory: "healthy",
            livePulses: [],
            impactSummary: v.nextActionData.impact,
          })),
          fos,
          ceo: safeRunCeoEngine([], fos),
          build: emptyBuildOutput(),
        },
        error: error instanceof Error ? error.message : "Error al cargar CEO Office",
      };
    } catch (fallbackError) {
      console.error("[ceo-office] fallback failed:", fallbackError);
      try {
        const empty = buildPortfolioDashboardData([]);
        const live = buildLiveActivitySnapshot([]);
        const fosResult = runFos([]);
        const fos: FosSnapshot = {
          metrics: fosResult.metrics,
          ventureContexts: fosResult.ventureContexts,
          topPriorityVentureId: fosResult.topPriorityVentureId,
          computedAt: fosResult.computedAt,
        };
        return {
          data: {
            header: {
              userName: USER_NAME,
              title: "CEO Office en modo recuperación.",
              absenceLines: [{ id: "recovery", text: "ForgeOS está restableciendo el entorno." }],
            },
            smartAction: null,
            portfolio: empty,
            live,
            headquarters: buildHeadquartersSnapshot([]),
            health: buildPortfolioHealthSnapshot([]),
            notifications: buildNotificationCenter([]),
            executiveSummary: buildExecutiveSummary([]),
            dailyReport: buildDailyReport([]),
            executiveVentures: [],
            fos,
            ceo: safeRunCeoEngine([], fos),
            build: emptyBuildOutput(),
          },
          error: "Modo degradado — recarga la página o revisa la consola.",
        };
      } catch (ultimateError) {
        console.error("[ceo-office] ultimate fallback failed:", ultimateError);
        const fos: FosSnapshot = {
          metrics: {
            dailyFocus: "Recuperar CEO Office",
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
        return {
          data: {
            header: {
              userName: USER_NAME,
              title: "CEO Office en modo recuperación.",
              absenceLines: [{ id: "recovery", text: "ForgeOS está restableciendo el entorno." }],
            },
            smartAction: null,
            portfolio: {
              header: {
                userName: USER_NAME,
                subtitle: "Modo recuperación",
                nextActionLine: "Revisa la consola del navegador.",
                expectedImpact: "",
                missionLabel: "Sin misión crítica",
                missionVenture: "",
                missionPriority: null,
                estimatedTime: "",
                impactBullets: [],
                continueHref: "/",
                continueLabel: "Ir al inicio",
                priorityActions: 0,
                startupsInProgress: 0,
                importantDecisions: 0,
              },
              metrics: [],
              ceoBriefing: buildCEOBriefing([]),
              ventures: [],
              recentActivity: [],
              upcomingActions: [],
            },
            live: { timeline: [], absenceSummary: [], venturePulses: {} },
            headquarters: { departments: [], activeCount: 0, waitingCount: 0 },
            health: {
              healthy: 0,
              atRisk: 0,
              blocked: 0,
              operating: 0,
              scaling: 0,
              items: [],
            },
            notifications: { notifications: [], unreadCount: 0 },
            executiveSummary: buildExecutiveSummary([]),
            dailyReport: buildDailyReport([]),
            executiveVentures: [],
            fos,
            ceo: emptyCeoOutput(fos),
            build: emptyBuildOutput(),
          },
          error: "Modo degradado — recarga la página o revisa la consola.",
        };
      }
    }
  }
}
