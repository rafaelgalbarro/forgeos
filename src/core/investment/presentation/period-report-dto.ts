import type { InvestmentReportViewModel } from "./dto";

/**
 * Lightweight Reports Center view model — distinct from pipeline InvestmentReportViewModel
 * but follows the same presentation layer conventions.
 */
export type PeriodReportViewModel = {
  readonly id: string;
  readonly generatedAt: string;
  readonly title: string;
  readonly periodType: "daily" | "weekly" | "monthly" | "annual";
  readonly periodKey: string;
  readonly version: number;
  readonly paperPnl: string;
  readonly shadowPnl: string;
  readonly sectionTitles: readonly string[];
  readonly mode: "ANALYSIS_ONLY";
  readonly orderExecution: "disabled";
};

type PeriodReportLike = {
  readonly id: string;
  readonly generatedAt: string;
  readonly title: string;
  readonly periodType: PeriodReportViewModel["periodType"];
  readonly periodKey: string;
  readonly version: number;
  readonly comparative: { readonly paperPnl: string; readonly shadowPnl: string };
  readonly sections: ReadonlyArray<{ readonly title: string }>;
};

export function toPeriodReportViewModel(report: PeriodReportLike): PeriodReportViewModel {
  return {
    id: report.id,
    generatedAt: report.generatedAt,
    title: report.title,
    periodType: report.periodType,
    periodKey: report.periodKey,
    version: report.version,
    paperPnl: report.comparative.paperPnl,
    shadowPnl: report.comparative.shadowPnl,
    sectionTitles: report.sections.map((s) => s.title),
    mode: "ANALYSIS_ONLY",
    orderExecution: "disabled",
  };
}

/** Optional bridge when a classic decision report is embedded in a period section note. */
export function summarizeClassicReportVm(vm: InvestmentReportViewModel): string {
  return `decision=${vm.decision.recommendation} conf=${vm.decision.confidence.toFixed(2)} signals=${vm.signalCount} risk=${vm.risk.level}`;
}
