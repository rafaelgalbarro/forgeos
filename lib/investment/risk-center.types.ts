/**
 * Browser-safe Risk Center contracts — ANALYSIS_ONLY.
 * Keep free of server-only imports.
 */

import type {
  RiskMetricReading,
  RiskRecommendation,
  RiskScenarioResult,
  RiskTrafficLight,
} from "@/lib/investment/risk-center-scenarios";

export type RiskCenterAlert = {
  readonly id: string;
  readonly source: string;
  readonly code: string;
  readonly severity: string;
  readonly title: string;
  readonly message: string;
  readonly value: number | string | null;
  readonly threshold: number | string | null;
  readonly detectedAt: string;
  readonly symbols: readonly string[];
  readonly dryRun: true;
};

export type RiskCenterSnapshot = {
  readonly generatedAt: string;
  readonly mode: "ANALYSIS_ONLY";
  readonly orderExecution: "disabled";
  readonly liveTradingEnabled: false;
  readonly ibkrReadOnly: true;
  readonly monitorLabel: "DEMO" | "IBKR_LIVE_READ_ONLY" | "NO_DATA";
  readonly monitorNote: string;
  readonly monitorRunning: boolean;
  readonly evaluationCount: number;
  readonly analyticsAsOf: string | null;
  readonly overallLight: RiskTrafficLight;
  readonly metrics: readonly RiskMetricReading[];
  readonly alerts: readonly RiskCenterAlert[];
  readonly stressTest: {
    readonly label: "SIMULATION";
    readonly mode: "ANALYSIS_ONLY";
    readonly orderExecution: "disabled";
    readonly scenarios: readonly RiskScenarioResult[];
    readonly note: string;
  };
  readonly recommendations: readonly RiskRecommendation[];
  readonly posture: {
    readonly analysisOnly: true;
    readonly autoExecuteRecommendations: false;
    readonly scenariosMutatePortfolio: false;
    readonly note: string;
  };
  readonly note: string;
};

export type {
  RiskMetricReading,
  RiskRecommendation,
  RiskScenarioResult,
  RiskTrafficLight,
};
