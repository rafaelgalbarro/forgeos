/**
 * Browser-safe portfolio monitor surface.
 * Types + presentation helpers only — no filesystem, Node APIs, or monitor runtime.
 */
export type {
  MonitorAlertCategory,
  MonitorAlertCode,
  MonitorAlertSeverity,
  PortfolioMonitorAlert,
  PortfolioMonitorObservation,
  PortfolioMonitorPolicy,
  PortfolioMonitorSnapshot,
} from "./domain";
export {
  buildPortfolioMonitorDashboardModel,
  type PortfolioMonitorDashboardModel,
  type PortfolioMonitorPanelModel,
} from "./presentation";
