/**
 * Analysis-only risk scenario simulations.
 * Never mutates positions, never submits orders — illustrative shocks only.
 */

export type RiskScenarioId =
  | "CRASH"
  | "HIGH_VOLATILITY"
  | "RATE_HIKE"
  | "INFLATION"
  | "RECESSION";

export type RiskTrafficLight = "GREEN" | "AMBER" | "RED" | "NO_DATA";

export type RiskMetricKey =
  | "exposure"
  | "drawdown"
  | "var"
  | "expectedShortfall"
  | "beta"
  | "volatility"
  | "liquidity"
  | "concentration"
  | "correlations";

export type RiskMetricReading = {
  readonly key: RiskMetricKey;
  readonly label: string;
  readonly value: number | null;
  readonly unit: "PCT" | "RATIO" | "SCORE" | "NO_DATA";
  readonly display: string;
  readonly status: "MEASURED" | "ESTIMATED" | "NO_DATA";
  readonly light: RiskTrafficLight;
  readonly note: string;
  readonly source: string;
};

export type RiskScenarioShock = {
  readonly metric: RiskMetricKey;
  readonly baseline: number | null;
  readonly shocked: number | null;
  readonly deltaPctPoints: number | null;
  readonly display: string;
};

export type RiskScenarioResult = {
  readonly id: RiskScenarioId;
  readonly title: string;
  readonly description: string;
  readonly label: "SIMULATION" | "DEMO";
  readonly mode: "ANALYSIS_ONLY";
  readonly orderExecution: "disabled";
  readonly severity: RiskTrafficLight;
  readonly shocks: readonly RiskScenarioShock[];
  readonly advisory: readonly string[];
  readonly note: string;
};

export type RiskRecommendation = {
  readonly id: string;
  readonly priority: "HIGH" | "MEDIUM" | "LOW";
  readonly title: string;
  readonly action: string;
  readonly rationale: string;
  readonly autoExecute: false;
  readonly label: "ADVISORY_ONLY";
};

/** Illustrative shock coefficients — not live forecasts. */
const SCENARIO_DEFS: ReadonlyArray<{
  id: RiskScenarioId;
  title: string;
  description: string;
  shocks: Partial<Record<RiskMetricKey, number>>;
  advisory: readonly string[];
}> = [
  {
    id: "CRASH",
    title: "Crash",
    description: "Equity market crash shock (−25% proxy on risked capital).",
    shocks: {
      drawdown: 25,
      var: 2.2,
      expectedShortfall: 2.5,
      volatility: 1.8,
      correlations: 0.15,
      liquidity: -20,
      exposure: 1.05,
    },
    advisory: [
      "Consider reducing gross exposure and cutting high-beta names.",
      "Raise cash buffer; avoid adding correlated risk.",
    ],
  },
  {
    id: "HIGH_VOLATILITY",
    title: "Alta volatilidad",
    description: "Vol spike regime — wider tails and higher VaR/ES.",
    shocks: {
      volatility: 2.0,
      var: 1.9,
      expectedShortfall: 2.1,
      beta: 1.15,
      drawdown: 8,
      liquidity: -10,
    },
    advisory: [
      "Tighten position sizing; prefer lower participation rates.",
      "Review stop distances vs elevated realized volatility.",
    ],
  },
  {
    id: "RATE_HIKE",
    title: "Subidas tipos",
    description: "Parallel rate hike stress — duration / growth sensitivity.",
    shocks: {
      beta: 0.9,
      correlations: 0.1,
      concentration: 1.1,
      drawdown: 6,
      liquidity: -8,
      var: 1.3,
    },
    advisory: [
      "Diversify away from rate-sensitive concentration.",
      "Reassess leverage and long-duration exposures.",
    ],
  },
  {
    id: "INFLATION",
    title: "Inflación",
    description: "Sticky inflation path — real return and cost-of-capital pressure.",
    shocks: {
      volatility: 1.25,
      correlations: 0.08,
      concentration: 1.05,
      drawdown: 5,
      expectedShortfall: 1.35,
      liquidity: -5,
    },
    advisory: [
      "Review sector mix for inflation-resilient cash flows.",
      "Avoid over-concentration in a single inflation narrative.",
    ],
  },
  {
    id: "RECESSION",
    title: "Recesión",
    description: "Growth contraction — earnings and liquidity stress.",
    shocks: {
      drawdown: 18,
      var: 1.7,
      expectedShortfall: 1.9,
      beta: 1.2,
      volatility: 1.45,
      liquidity: -25,
      exposure: 0.95,
      correlations: 0.12,
    },
    advisory: [
      "Reduce cyclical exposure; improve cash / liquidity score.",
      "Diversify across uncorrelated sleeves where available.",
    ],
  },
];

function fmtMetric(value: number | null, unit: RiskMetricReading["unit"]): string {
  if (value == null || unit === "NO_DATA") return "NO_DATA";
  if (unit === "RATIO" || unit === "SCORE") return value.toFixed(3);
  return `${value.toFixed(2)}%`;
}

function applyShock(
  baseline: number | null,
  shock: number | undefined,
  mode: "multiply" | "add",
): number | null {
  if (baseline == null || shock == undefined) return null;
  if (mode === "add") return baseline + shock;
  return baseline * shock;
}

function shockMode(metric: RiskMetricKey): "multiply" | "add" {
  return metric === "drawdown" || metric === "correlations" || metric === "liquidity"
    ? "add"
    : "multiply";
}

function scenarioSeverity(shocks: readonly RiskScenarioShock[]): RiskTrafficLight {
  const worstDd = shocks.find((s) => s.metric === "drawdown")?.shocked;
  if (worstDd != null && worstDd >= 20) return "RED";
  if (worstDd != null && worstDd >= 10) return "AMBER";
  const vol = shocks.find((s) => s.metric === "volatility")?.shocked;
  if (vol != null && vol >= 5) return "AMBER";
  return "GREEN";
}

/**
 * Run illustrative scenario set against baseline metric readings.
 * Outputs are always SIMULATION / ANALYSIS_ONLY — never broker-affecting.
 */
export function runRiskScenarioSimulations(
  metrics: readonly RiskMetricReading[],
  options?: { readonly demoLabel?: boolean },
): readonly RiskScenarioResult[] {
  const byKey = new Map(metrics.map((m) => [m.key, m]));
  const label = options?.demoLabel ? "DEMO" : "SIMULATION";

  return SCENARIO_DEFS.map((def) => {
    const shocks: RiskScenarioShock[] = (Object.keys(def.shocks) as RiskMetricKey[]).map((key) => {
      const reading = byKey.get(key);
      const baseline =
        reading && reading.status !== "NO_DATA" && reading.value != null ? reading.value : null;
      const factor = def.shocks[key];
      const shocked = applyShock(baseline, factor, shockMode(key));
      const delta =
        baseline != null && shocked != null ? Number((shocked - baseline).toFixed(4)) : null;
      return {
        metric: key,
        baseline,
        shocked,
        deltaPctPoints: delta,
        display:
          baseline == null
            ? `NO_DATA baseline → illustrative ${key} shock only`
            : `${fmtMetric(baseline, reading?.unit ?? "PCT")} → ${fmtMetric(shocked, reading?.unit ?? "PCT")}`,
      };
    });

    const measuredCount = shocks.filter((s) => s.baseline != null).length;
    return {
      id: def.id,
      title: def.title,
      description: def.description,
      label,
      mode: "ANALYSIS_ONLY",
      orderExecution: "disabled",
      severity: measuredCount === 0 ? "NO_DATA" : scenarioSeverity(shocks),
      shocks,
      advisory: def.advisory,
      note:
        measuredCount === 0
          ? "SIMULATION — baseline metrics NO_DATA; advisory text only, no portfolio mutation."
          : `${label} — illustrative model shocks on measured baselines. ANALYSIS_ONLY · no orders.`,
    };
  });
}

export function buildAdvisoryRecommendations(input: {
  readonly metrics: readonly RiskMetricReading[];
  readonly alertCodes: readonly string[];
  readonly scenarios: readonly RiskScenarioResult[];
}): readonly RiskRecommendation[] {
  const out: RiskRecommendation[] = [];
  const byKey = new Map(input.metrics.map((m) => [m.key, m]));

  const push = (
    id: string,
    priority: RiskRecommendation["priority"],
    title: string,
    action: string,
    rationale: string,
  ) => {
    out.push({
      id,
      priority,
      title,
      action,
      rationale,
      autoExecute: false,
      label: "ADVISORY_ONLY",
    });
  };

  const concentration = byKey.get("concentration");
  if (concentration?.light === "RED" || concentration?.light === "AMBER") {
    push(
      "rec-diversify",
      concentration.light === "RED" ? "HIGH" : "MEDIUM",
      "Diversificar concentración",
      "Reduce largest position / sector weight toward policy caps.",
      `Concentration light=${concentration.light} (${concentration.display}). Advisory only — not auto-executed.`,
    );
  }

  const exposure = byKey.get("exposure");
  if (exposure?.light === "RED" || exposure?.light === "AMBER") {
    push(
      "rec-reduce-exposure",
      exposure.light === "RED" ? "HIGH" : "MEDIUM",
      "Reducir exposición",
      "Lower gross exposure or hedge directional risk.",
      `Exposure light=${exposure.light} (${exposure.display}). ANALYSIS_ONLY recommendation.`,
    );
  }

  const drawdown = byKey.get("drawdown");
  if (drawdown?.light === "RED" || drawdown?.light === "AMBER") {
    push(
      "rec-drawdown",
      drawdown.light === "RED" ? "HIGH" : "MEDIUM",
      "Contener drawdown",
      "Pause risk-add; review stops and position sizes.",
      `Drawdown light=${drawdown.light} (${drawdown.display}).`,
    );
  }

  const liquidity = byKey.get("liquidity");
  if (liquidity?.light === "RED" || liquidity?.light === "AMBER") {
    push(
      "rec-liquidity",
      "MEDIUM",
      "Mejorar liquidez",
      "Increase cash buffer; avoid illiquid additions.",
      `Liquidity light=${liquidity.light} (${liquidity.display}).`,
    );
  }

  const corr = byKey.get("correlations");
  if (corr?.light === "RED" || corr?.light === "AMBER") {
    push(
      "rec-correlation",
      "MEDIUM",
      "Reducir correlaciones",
      "Cut duplicate / highly correlated sleeves.",
      `Correlations light=${corr.light} (${corr.display}).`,
    );
  }

  if (input.alertCodes.includes("BETA_ELEVATED")) {
    push(
      "rec-beta",
      "MEDIUM",
      "Moderar beta",
      "Trim high-beta names or add defensive ballast.",
      "Monitor alert BETA_ELEVATED (dry-run).",
    );
  }

  const redScenarios = input.scenarios.filter((s) => s.severity === "RED");
  if (redScenarios.length > 0) {
    push(
      "rec-stress",
      "HIGH",
      "Preparar plan de estrés",
      "Pre-define reduce-exposure playbook for crash / recession paths.",
      `Stress scenarios RED: ${redScenarios.map((s) => s.id).join(", ")}. Simulation only.`,
    );
  }

  if (out.length === 0) {
    push(
      "rec-maintain",
      "LOW",
      "Mantener vigilancia",
      "Continue ANALYSIS_ONLY monitoring; no forced action.",
      "No RED/AMBER metric lights or critical alert codes in current snapshot.",
    );
  }

  return out;
}

export function trafficLightForMetric(
  key: RiskMetricKey,
  value: number | null,
  thresholds: {
    readonly maxDrawdownPct: number;
    readonly maxConcentrationPct: number;
    readonly maxCorrelation: number;
    readonly maxBeta: number;
    readonly maxExposurePct: number;
    readonly maxVarPct: number;
    readonly maxCvarPct: number;
    readonly minLiquidityScoreOrCashPct: number;
  },
): RiskTrafficLight {
  if (value == null || !Number.isFinite(value)) return "NO_DATA";
  switch (key) {
    case "drawdown":
      if (value >= thresholds.maxDrawdownPct) return "RED";
      if (value >= thresholds.maxDrawdownPct * 0.7) return "AMBER";
      return "GREEN";
    case "concentration":
      if (value >= thresholds.maxConcentrationPct) return "RED";
      if (value >= thresholds.maxConcentrationPct * 0.75) return "AMBER";
      return "GREEN";
    case "correlations":
      if (value >= thresholds.maxCorrelation) return "RED";
      if (value >= thresholds.maxCorrelation * 0.85) return "AMBER";
      return "GREEN";
    case "beta":
      if (value >= thresholds.maxBeta) return "RED";
      if (value >= thresholds.maxBeta * 0.85) return "AMBER";
      return "GREEN";
    case "exposure":
      if (value >= thresholds.maxExposurePct) return "RED";
      if (value >= thresholds.maxExposurePct * 0.85) return "AMBER";
      return "GREEN";
    case "var":
      if (value >= thresholds.maxVarPct) return "RED";
      if (value >= thresholds.maxVarPct * 0.75) return "AMBER";
      return "GREEN";
    case "expectedShortfall":
      if (value >= thresholds.maxCvarPct) return "RED";
      if (value >= thresholds.maxCvarPct * 0.75) return "AMBER";
      return "GREEN";
    case "volatility":
      if (value >= 8) return "RED";
      if (value >= 4) return "AMBER";
      return "GREEN";
    case "liquidity":
      // Higher cash/liquidity score is better when unit is PCT cash or SCORE 0-1 scaled to %.
      if (value < thresholds.minLiquidityScoreOrCashPct) return "RED";
      if (value < thresholds.minLiquidityScoreOrCashPct * 1.5) return "AMBER";
      return "GREEN";
    default:
      return "NO_DATA";
  }
}
