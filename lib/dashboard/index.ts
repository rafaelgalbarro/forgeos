/**
 * @deprecated Use @/lib/portfolio — kept for backward compatibility.
 */
export {
  buildPortfolioDashboardData as buildDashboardData,
  buildCEOBriefing as buildCEOBrief,
  buildPortfolioMetrics as buildPortfolioSummary,
  buildRecentActivity as buildActivityFeed,
  deriveNextAction,
  buildPipeline,
  formatRelativeTime,
} from "@/lib/portfolio";

export type {
  PortfolioDashboardData as DashboardData,
  VenturePortfolioCard as PortfolioVentureCard,
  CEOBriefing as CEOBrief,
  ActivityEvent,
  PipelineStep,
} from "@/lib/portfolio";
