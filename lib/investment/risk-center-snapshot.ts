import "server-only";

import {
  getInvestmentDashboardSnapshot,
  refreshInvestmentDashboardSnapshot,
} from "@/lib/investment/dashboard-snapshot";
import { getPortfolioMonitorRuntime } from "@/lib/investment/portfolio-monitor-runtime";
import { getRiskAlertsSnapshot } from "@/lib/investment/risk-alerts-snapshot";
import {
  buildAdvisoryRecommendations,
  runRiskScenarioSimulations,
  trafficLightForMetric,
  type RiskMetricReading,
  type RiskTrafficLight,
} from "@/lib/investment/risk-center-scenarios";
import type { RiskCenterSnapshot } from "@/lib/investment/risk-center.types";
import { RiskValidationService } from "@/src/core/investment/application/risk-validation-service";
import { DEFAULT_RISK_POLICY } from "@/src/core/investment/domain/risk";
import {
  defaultPortfolioMonitorPolicy,
  type PortfolioMonitorObservation,
  type PortfolioMonitorSnapshot,
} from "@/src/core/investment/portfolio-monitor";
import type { MetricValue } from "@/src/core/investment/domain/portfolio-analytics";
import type { PortfolioMonitorDataLabel } from "@/lib/investment/portfolio-monitor-provider-factory";

export type { RiskCenterSnapshot } from "@/lib/investment/risk-center.types";

function metricDisplay(value: number | null, unit: RiskMetricReading["unit"]): string {
  if (value == null || unit === "NO_DATA") return "NO_DATA";
  if (unit === "RATIO" || unit === "SCORE") return value.toFixed(3);
  return `${value.toFixed(2)}%`;
}

function fromMetricValue(
  mv: MetricValue | null | undefined,
  preferPct: boolean,
): { value: number | null; status: RiskMetricReading["status"]; note: string } {
  if (!mv || mv.value == null || mv.status === "NOT_MEASURED" || mv.status === "UNKNOWN") {
    return { value: null, status: "NO_DATA", note: mv?.note ?? "NO_DATA" };
  }
  const status: RiskMetricReading["status"] = mv.status === "MEASURED" ? "MEASURED" : "ESTIMATED";
  // Portfolio analytics volatility/returns are already in PCT units when unit=PCT.
  void preferPct;
  return { value: mv.value, status, note: mv.note ?? mv.status };
}

function buildLiquidityReading(
  obs: PortfolioMonitorObservation | null,
  liquidityRiskPct: number | undefined,
  thresholds: ReturnType<typeof defaultPortfolioMonitorPolicy>,
): RiskMetricReading {
  if (obs) {
    const cash = obs.cash.value;
    const invested = obs.capitalInvested.value;
    if (cash != null && invested != null && invested + cash > 0) {
      const cashPct = (cash / (invested + cash)) * 100;
      return {
        key: "liquidity",
        label: "Liquidez",
        value: cashPct,
        unit: "PCT",
        display: metricDisplay(cashPct, "PCT"),
        status: obs.cash.status === "MEASURED" ? "MEASURED" : "ESTIMATED",
        light: trafficLightForMetric("liquidity", cashPct, {
          maxDrawdownPct: thresholds.maxDrawdownPct,
          maxConcentrationPct: thresholds.maxConcentrationPct,
          maxCorrelation: thresholds.maxCorrelation,
          maxBeta: thresholds.maxBeta,
          maxExposurePct: thresholds.maxExposurePct,
          maxVarPct: DEFAULT_RISK_POLICY.maxVarPct,
          maxCvarPct: DEFAULT_RISK_POLICY.maxCvarPct,
          minLiquidityScoreOrCashPct: thresholds.minCashPct,
        }),
        note: "Cash / (cash + invested) from portfolio monitor",
        source: "portfolio-monitor",
      };
    }
  }
  if (typeof liquidityRiskPct === "number" && Number.isFinite(liquidityRiskPct)) {
    // Dashboard stores liquidity *risk* — invert for traffic (higher risk = worse liquidity).
    const proxy = Math.max(0, 100 - liquidityRiskPct);
    return {
      key: "liquidity",
      label: "Liquidez",
      value: proxy,
      unit: "PCT",
      display: metricDisplay(proxy, "PCT"),
      status: "ESTIMATED",
      light: trafficLightForMetric("liquidity", proxy, {
        maxDrawdownPct: thresholds.maxDrawdownPct,
        maxConcentrationPct: thresholds.maxConcentrationPct,
        maxCorrelation: thresholds.maxCorrelation,
        maxBeta: thresholds.maxBeta,
        maxExposurePct: thresholds.maxExposurePct,
        maxVarPct: DEFAULT_RISK_POLICY.maxVarPct,
        maxCvarPct: DEFAULT_RISK_POLICY.maxCvarPct,
        minLiquidityScoreOrCashPct: thresholds.minCashPct,
      }),
      note: "ESTIMATED from dashboard liquidityRiskPct (100 − risk). Not a live ADV score.",
      source: "dashboard-risk-summary",
    };
  }
  return {
    key: "liquidity",
    label: "Liquidez",
    value: null,
    unit: "NO_DATA",
    display: "NO_DATA",
    status: "NO_DATA",
    light: "NO_DATA",
    note: "NO_DATA — cash/invested and liquidityRiskPct unavailable",
    source: "none",
  };
}

/**
 * Parametric VaR / ES via existing RiskValidationService — only when volatility + capital measured.
 * Never invents live VaR; returns NO_DATA when inputs missing.
 */
function tryVarEsFromRiskEngine(
  obs: PortfolioMonitorObservation | null,
): { varPct: RiskMetricReading; esPct: RiskMetricReading } {
  const noData = (key: "var" | "expectedShortfall", label: string): RiskMetricReading => ({
    key,
    label,
    value: null,
    unit: "NO_DATA",
    display: "NO_DATA",
    status: "NO_DATA",
    light: "NO_DATA",
    note: "NO_DATA — need MEASURED volatility + capitalInvested for RiskValidationService probe",
    source: "risk-validation-service",
  });

  if (!obs) {
    return { varPct: noData("var", "VaR"), esPct: noData("expectedShortfall", "Expected Shortfall") };
  }

  const vol = fromMetricValue(obs.volatility, true);
  const capital = fromMetricValue(obs.capitalInvested, false);
  const exposure = fromMetricValue(obs.exposure, true);
  const drawdown = fromMetricValue(obs.drawdown, true);
  const concentration = fromMetricValue(obs.concentration, true);

  if (vol.status === "NO_DATA" || vol.value == null || capital.status === "NO_DATA" || capital.value == null || capital.value <= 0) {
    return { varPct: noData("var", "VaR"), esPct: noData("expectedShortfall", "Expected Shortfall") };
  }

  try {
    const bookPct = Math.min(
      500,
      Math.max(0, exposure.value ?? (concentration.value != null ? concentration.value : 0)),
    );
    if (bookPct <= 0) {
      return { varPct: noData("var", "VaR"), esPct: noData("expectedShortfall", "Expected Shortfall") };
    }

    const service = new RiskValidationService();
    // Tiny probe trade so metrics reflect current book (exposure %), not a large add.
    const result = service.validateOperation({
      operationId: "risk-center-analysis-only",
      symbol: obs.symbols[0] ?? "PORTFOLIO",
      side: "BUY",
      quantity: 1,
      price: 1,
      sector: obs.topSector ?? "UNKNOWN",
      country: obs.topCountry ?? "UNKNOWN",
      currency: obs.baseCurrency || "USD",
      expectedReturnPct: 0,
      volatilityPct: Math.abs(vol.value),
      confidence: 0.55,
      currentPositionPct: Math.min(100, bookPct),
      currentSectorExposurePct: Math.min(100, Math.max(0, concentration.value ?? bookPct)),
      currentCountryExposurePct: Math.min(100, Math.max(0, concentration.value ?? bookPct)),
      currentCurrencyExposurePct: Math.min(100, Math.max(0, concentration.value ?? bookPct)),
      currentDrawdownPct: Math.min(100, Math.max(0, drawdown.value ?? 0)),
      currentGrossExposurePct: Math.min(500, Math.max(0, exposure.value ?? bookPct)),
      portfolioValue: capital.value,
      avgDailyVolume: 1_000_000,
      bidAskSpreadPct: 0.05,
      openPositions: obs.positionCount,
    });

    const varPct = result.metrics.varPct;
    const cvarPct = result.metrics.cvarPct;
    const policy = defaultPortfolioMonitorPolicy();

    return {
      varPct: {
        key: "var",
        label: "VaR",
        value: varPct,
        unit: "PCT",
        display: metricDisplay(varPct, "PCT"),
        status: "ESTIMATED",
        light: trafficLightForMetric("var", varPct, {
          maxDrawdownPct: policy.maxDrawdownPct,
          maxConcentrationPct: policy.maxConcentrationPct,
          maxCorrelation: policy.maxCorrelation,
          maxBeta: policy.maxBeta,
          maxExposurePct: policy.maxExposurePct,
          maxVarPct: DEFAULT_RISK_POLICY.maxVarPct,
          maxCvarPct: DEFAULT_RISK_POLICY.maxCvarPct,
          minLiquidityScoreOrCashPct: policy.minCashPct,
        }),
        note: `ESTIMATED parametric VaR via RiskValidationService (${DEFAULT_RISK_POLICY.confidenceLevel * 100}% / ${DEFAULT_RISK_POLICY.horizonDays}d). Not live market VaR.`,
        source: "risk-validation-service",
      },
      esPct: {
        key: "expectedShortfall",
        label: "Expected Shortfall",
        value: cvarPct,
        unit: "PCT",
        display: metricDisplay(cvarPct, "PCT"),
        status: "ESTIMATED",
        light: trafficLightForMetric("expectedShortfall", cvarPct, {
          maxDrawdownPct: policy.maxDrawdownPct,
          maxConcentrationPct: policy.maxConcentrationPct,
          maxCorrelation: policy.maxCorrelation,
          maxBeta: policy.maxBeta,
          maxExposurePct: policy.maxExposurePct,
          maxVarPct: DEFAULT_RISK_POLICY.maxVarPct,
          maxCvarPct: DEFAULT_RISK_POLICY.maxCvarPct,
          minLiquidityScoreOrCashPct: policy.minCashPct,
        }),
        note: "ESTIMATED CVaR/ES via RiskValidationService Normal-tail approximation. Not live ES.",
        source: "risk-validation-service",
      },
    };
  } catch {
    return { varPct: noData("var", "VaR"), esPct: noData("expectedShortfall", "Expected Shortfall") };
  }
}

function buildMetricFromObs(
  key: RiskMetricReading["key"],
  label: string,
  mv: MetricValue | null | undefined,
  unit: RiskMetricReading["unit"],
  thresholds: ReturnType<typeof defaultPortfolioMonitorPolicy>,
  source: string,
): RiskMetricReading {
  const parsed = fromMetricValue(mv, unit === "PCT");
  if (parsed.status === "NO_DATA") {
    return {
      key,
      label,
      value: null,
      unit: "NO_DATA",
      display: "NO_DATA",
      status: "NO_DATA",
      light: "NO_DATA",
      note: parsed.note,
      source,
    };
  }
  return {
    key,
    label,
    value: parsed.value,
    unit,
    display: metricDisplay(parsed.value, unit),
    status: parsed.status,
    light: trafficLightForMetric(key, parsed.value, {
      maxDrawdownPct: thresholds.maxDrawdownPct,
      maxConcentrationPct: thresholds.maxConcentrationPct,
      maxCorrelation: thresholds.maxCorrelation,
      maxBeta: thresholds.maxBeta,
      maxExposurePct: thresholds.maxExposurePct,
      maxVarPct: DEFAULT_RISK_POLICY.maxVarPct,
      maxCvarPct: DEFAULT_RISK_POLICY.maxCvarPct,
      minLiquidityScoreOrCashPct: thresholds.minCashPct,
    }),
    note: parsed.note,
    source,
  };
}

function overallFromMetrics(metrics: readonly RiskMetricReading[]): RiskTrafficLight {
  if (metrics.every((m) => m.light === "NO_DATA")) return "NO_DATA";
  if (metrics.some((m) => m.light === "RED")) return "RED";
  if (metrics.some((m) => m.light === "AMBER")) return "AMBER";
  if (metrics.some((m) => m.light === "GREEN")) return "GREEN";
  return "NO_DATA";
}

async function loadMonitorSnapshot(): Promise<{
  snapshot: PortfolioMonitorSnapshot | null;
  label: PortfolioMonitorDataLabel;
  note: string;
}> {
  try {
    const runtime = getPortfolioMonitorRuntime();
    if (!runtime.monitor.isRunning()) {
      runtime.monitor.start();
    }
    const snapshot = await runtime.monitor.evaluateNow();
    return { snapshot, label: runtime.label, note: runtime.note };
  } catch (error) {
    return {
      snapshot: null,
      label: "NO_DATA",
      note:
        error instanceof Error
          ? `Monitor unavailable (${error.message})`
          : "Monitor unavailable",
    };
  }
}

/**
 * Professional Risk Center snapshot — ANALYSIS_ONLY.
 * Reuses portfolio monitor + risk alerts + RiskValidationService. Never sends orders.
 */
export async function getRiskCenterSnapshot(): Promise<RiskCenterSnapshot> {
  const [alertsSnap, monitorPack] = await Promise.all([
    getRiskAlertsSnapshot(),
    loadMonitorSnapshot(),
  ]);

  void refreshInvestmentDashboardSnapshot({ preferCache: true });
  const dash = getInvestmentDashboardSnapshot();
  const riskSummary = dash.riskSummary?.data;
  const thresholds = defaultPortfolioMonitorPolicy();
  const obs = monitorPack.snapshot?.observation ?? null;

  const { varPct, esPct } = tryVarEsFromRiskEngine(obs);

  let metrics: RiskMetricReading[] = [
    buildMetricFromObs("exposure", "Exposición", obs?.exposure, "PCT", thresholds, "portfolio-monitor"),
    buildMetricFromObs("drawdown", "Drawdown", obs?.drawdown, "PCT", thresholds, "portfolio-monitor"),
    varPct,
    esPct,
    buildMetricFromObs("beta", "Beta", obs?.beta, "RATIO", thresholds, "portfolio-monitor"),
    buildMetricFromObs(
      "volatility",
      "Volatilidad",
      obs?.volatility,
      "PCT",
      thresholds,
      "portfolio-monitor",
    ),
    buildLiquidityReading(obs, riskSummary?.liquidityRiskPct, thresholds),
    buildMetricFromObs(
      "concentration",
      "Concentración",
      obs?.concentration,
      "PCT",
      thresholds,
      "portfolio-monitor",
    ),
    buildMetricFromObs(
      "correlations",
      "Correlaciones",
      obs?.correlations,
      "RATIO",
      thresholds,
      "portfolio-monitor",
    ),
  ];

  const lightThresholds = {
    maxDrawdownPct: thresholds.maxDrawdownPct,
    maxConcentrationPct: thresholds.maxConcentrationPct,
    maxCorrelation: thresholds.maxCorrelation,
    maxBeta: thresholds.maxBeta,
    maxExposurePct: thresholds.maxExposurePct,
    maxVarPct: DEFAULT_RISK_POLICY.maxVarPct,
    maxCvarPct: DEFAULT_RISK_POLICY.maxCvarPct,
    minLiquidityScoreOrCashPct: thresholds.minCashPct,
  };

  // Prefer dashboard expected drawdown only when monitor DD is NO_DATA.
  if (
    metrics.find((m) => m.key === "drawdown")?.status === "NO_DATA" &&
    typeof riskSummary?.expectedDrawdownPct === "number"
  ) {
    const v = riskSummary.expectedDrawdownPct;
    metrics = metrics.map((m) =>
      m.key !== "drawdown"
        ? m
        : {
            key: "drawdown",
            label: "Drawdown",
            value: v,
            unit: "PCT",
            display: metricDisplay(v, "PCT"),
            status: "ESTIMATED",
            light: trafficLightForMetric("drawdown", v, lightThresholds),
            note: "ESTIMATED from dashboard riskSummary.expectedDrawdownPct",
            source: "dashboard-risk-summary",
          },
    );
  }

  if (
    metrics.find((m) => m.key === "concentration")?.status === "NO_DATA" &&
    typeof riskSummary?.concentrationRiskPct === "number"
  ) {
    const v = riskSummary.concentrationRiskPct;
    metrics = metrics.map((m) =>
      m.key !== "concentration"
        ? m
        : {
            key: "concentration",
            label: "Concentración",
            value: v,
            unit: "PCT",
            display: metricDisplay(v, "PCT"),
            status: "ESTIMATED",
            light: trafficLightForMetric("concentration", v, lightThresholds),
            note: "ESTIMATED from dashboard riskSummary.concentrationRiskPct",
            source: "dashboard-risk-summary",
          },
    );
  }

  const scenarios = runRiskScenarioSimulations(metrics, {
    demoLabel: monitorPack.label === "DEMO",
  });

  const recommendations = buildAdvisoryRecommendations({
    metrics,
    alertCodes: alertsSnap.alerts.map((a) => a.code),
    scenarios,
  });

  const overallLight = overallFromMetrics(metrics);

  return {
    generatedAt: new Date().toISOString(),
    mode: "ANALYSIS_ONLY",
    orderExecution: "disabled",
    liveTradingEnabled: false,
    ibkrReadOnly: true,
    monitorLabel: monitorPack.label,
    monitorNote: monitorPack.note,
    monitorRunning: monitorPack.snapshot?.monitorRunning ?? false,
    evaluationCount: monitorPack.snapshot?.evaluationCount ?? alertsSnap.evaluationCount,
    analyticsAsOf: monitorPack.snapshot?.analyticsAsOf ?? obs?.asOf ?? null,
    overallLight,
    metrics,
    alerts: alertsSnap.alerts,
    stressTest: {
      label: "SIMULATION",
      mode: "ANALYSIS_ONLY",
      orderExecution: "disabled",
      scenarios,
      note: "Stress / escenarios are SIMULATION only — never modify positions or broker state.",
    },
    recommendations,
    posture: {
      analysisOnly: true,
      autoExecuteRecommendations: false,
      scenariosMutatePortfolio: false,
      note: "IBKR_READ_ONLY · LIVE_TRADING_ENABLED=false · recommendations ADVISORY_ONLY",
    },
    note:
      overallLight === "NO_DATA"
        ? `NO_DATA dominant — monitor=${monitorPack.label}. Wire portfolio returns/positions for measured metrics.`
        : `Risk Center ready — monitor=${monitorPack.label}. ANALYSIS_ONLY · dry-run alerts · simulation scenarios.`,
  };
}
