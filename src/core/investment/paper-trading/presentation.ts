import type {
  PaperTradingCertificationReport,
  PaperTradingDashboardModel,
  PaperTradingPerformanceReport,
} from "./domain";

export interface PaperTradingCertificationViewModel {
  readonly certified: boolean;
  readonly tradingMode: "paper";
  readonly liveTradingEnabled: false;
  readonly gates: ReadonlyArray<{ readonly name: string; readonly passed: boolean; readonly summary: string }>;
  readonly performanceSummary: ReadonlyArray<{ readonly label: string; readonly value: string }>;
}

export interface PaperTradingPerformanceViewModel {
  readonly totalPnl: string;
  readonly winRate: string;
  readonly sharpe: string;
  readonly sortino: string;
  readonly maxDrawdownPct: string;
  readonly tradeCount: number;
  readonly averageMae: string;
  readonly averageMfe: string;
}

export function toCertificationViewModel(
  report: PaperTradingCertificationReport,
): PaperTradingCertificationViewModel {
  return {
    certified: report.certified,
    tradingMode: "paper",
    liveTradingEnabled: false,
    gates: [
      {
        name: "minimumClosedTrades",
        passed: report.gates.minimumClosedTrades.passed,
        summary: `${report.gates.minimumClosedTrades.actual}/${report.gates.minimumClosedTrades.required}`,
      },
      {
        name: "minimumEvaluationDays",
        passed: report.gates.minimumEvaluationDays.passed,
        summary: `${report.gates.minimumEvaluationDays.actual}/${report.gates.minimumEvaluationDays.required}`,
      },
      {
        name: "multipleSessions",
        passed: report.gates.multipleSessions.passed,
        summary: `${report.gates.multipleSessions.actual}/${report.gates.multipleSessions.required}`,
      },
      {
        name: "multipleRegimes",
        passed: report.gates.multipleRegimes.passed,
        summary: `${report.gates.multipleRegimes.actual}/${report.gates.multipleRegimes.required}`,
      },
    ],
    performanceSummary: [
      { label: "Total PnL", value: report.performance.totalPnl.toFixed(2) },
      { label: "Win rate", value: `${(report.performance.winRate * 100).toFixed(1)}%` },
      { label: "Sharpe", value: report.performance.sharpe?.toFixed(3) ?? "N/A" },
      { label: "Sortino", value: report.performance.sortino?.toFixed(3) ?? "N/A" },
      {
        label: "Max drawdown",
        value: report.performance.maxDrawdownPct == null ? "N/A" : `${report.performance.maxDrawdownPct.toFixed(2)}%`,
      },
      { label: "Avg MAE", value: report.performance.averageMae.toFixed(4) },
      { label: "Avg MFE", value: report.performance.averageMfe.toFixed(4) },
    ],
  };
}

export function toPerformanceViewModel(
  report: PaperTradingPerformanceReport,
): PaperTradingPerformanceViewModel {
  return {
    totalPnl: report.totalPnl.toFixed(2),
    winRate: `${(report.winRate * 100).toFixed(1)}%`,
    sharpe: report.sharpe?.toFixed(3) ?? "N/A",
    sortino: report.sortino?.toFixed(3) ?? "N/A",
    maxDrawdownPct: report.maxDrawdownPct == null ? "N/A" : `${report.maxDrawdownPct.toFixed(2)}%`,
    tradeCount: report.tradeCount,
    averageMae: report.averageMae.toFixed(4),
    averageMfe: report.averageMfe.toFixed(4),
  };
}

export function summarizeDashboard(model: PaperTradingDashboardModel): {
  readonly certification: PaperTradingCertificationViewModel;
  readonly performance: PaperTradingPerformanceViewModel;
} {
  return {
    certification: toCertificationViewModel(model.certification),
    performance: toPerformanceViewModel(model.performance),
  };
}
