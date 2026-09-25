import type { MonitorAlertCategory, PortfolioMonitorAlert, PortfolioMonitorSnapshot } from "./domain";

export interface PortfolioMonitorPanelModel {
  readonly category: MonitorAlertCategory;
  readonly title: string;
  readonly alerts: readonly PortfolioMonitorAlert[];
}

export interface PortfolioMonitorDashboardModel {
  readonly mode: "ANALYSIS_ONLY";
  readonly orderExecution: "disabled";
  readonly monitorRunning: boolean;
  readonly evaluationCount: number;
  readonly lastEvaluatedAt: string | null;
  readonly observationSummary: readonly string[];
  readonly panels: readonly PortfolioMonitorPanelModel[];
  readonly totalAlerts: number;
}

const PANEL_TITLES: Readonly<Record<MonitorAlertCategory, string>> = {
  PortfolioAlerts: "Portfolio Alerts",
  RiskAlerts: "Risk Alerts",
  OpportunityAlerts: "Opportunity Alerts",
  AllocationAlerts: "Allocation Alerts",
};

function fmtMetric(label: string, value: number | null | undefined, suffix = ""): string {
  if (value == null || !Number.isFinite(value)) return `${label}: UNKNOWN`;
  return `${label}: ${value.toFixed(2)}${suffix}`;
}

export function buildPortfolioMonitorDashboardModel(
  snapshot: PortfolioMonitorSnapshot,
): PortfolioMonitorDashboardModel {
  const obs = snapshot.observation;
  const observationSummary = obs
    ? [
        `Positions: ${obs.positionCount}`,
        fmtMetric("Cash", obs.cash.value),
        fmtMetric("PnL proxy", obs.pnlProxy.value),
        fmtMetric("Drawdown", obs.drawdown.value, "%"),
        fmtMetric("Beta", obs.beta.value),
        fmtMetric("Correlation", obs.correlations.value),
        fmtMetric("Exposure", obs.exposure.value, "%"),
        fmtMetric("Concentration", obs.concentration.value, "%"),
        `Sector: ${obs.topSector ?? "UNKNOWN"}`,
        `Country: ${obs.topCountry ?? "UNKNOWN"}`,
        `Currency: ${obs.topCurrency ?? "UNKNOWN"}`,
      ]
    : ["NO_DATA"];

  const categories = Object.keys(PANEL_TITLES) as MonitorAlertCategory[];
  const panels = categories.map((category) => ({
    category,
    title: PANEL_TITLES[category],
    alerts: snapshot.alertsByCategory[category] ?? [],
  }));

  return {
    mode: "ANALYSIS_ONLY",
    orderExecution: "disabled",
    monitorRunning: snapshot.monitorRunning,
    evaluationCount: snapshot.evaluationCount,
    lastEvaluatedAt: snapshot.lastEvaluatedAt,
    observationSummary,
    panels,
    totalAlerts: snapshot.alerts.length,
  };
}
