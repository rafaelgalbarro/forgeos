import { computePortfolioAnalytics } from "../application/portfolio-analytics-engine";
import type { PortfolioAnalyticsInput, PortfolioAnalyticsSnapshot } from "../domain/portfolio-analytics";
import type { PortfolioAnalyticsDataProvider } from "../infrastructure/portfolio-analytics-provider";
import {
  buildObservationFromAnalytics,
  defaultPortfolioMonitorPolicy,
  ensurePortfolioMonitorAlert,
  ensurePortfolioMonitorSnapshot,
  groupAlertsByCategory,
  type MonitorAlertCategory,
  type MonitorAlertCode,
  type MonitorAlertSeverity,
  type PortfolioMonitorAlert,
  type PortfolioMonitorObservation,
  type PortfolioMonitorPolicy,
  type PortfolioMonitorSnapshot,
} from "./domain";

export interface PortfolioMonitorSnapshotStore {
  load(): Promise<PortfolioMonitorSnapshot | null>;
  save(snapshot: PortfolioMonitorSnapshot): Promise<void>;
}

export interface PortfolioMonitorDeps {
  readonly snapshotProvider: PortfolioAnalyticsDataProvider;
  readonly store?: PortfolioMonitorSnapshotStore;
  readonly now?: () => Date;
  readonly policy?: Partial<PortfolioMonitorPolicy>;
  readonly pollIntervalMs?: number;
}

function mergePolicy(policy?: Partial<PortfolioMonitorPolicy>): PortfolioMonitorPolicy {
  return { ...defaultPortfolioMonitorPolicy(), ...policy };
}

function metricNumber(value: { value: number | null } | null | undefined): number | null {
  if (!value || value.value == null || !Number.isFinite(value.value)) return null;
  return value.value;
}

function makeAlert(input: {
  category: MonitorAlertCategory;
  code: MonitorAlertCode;
  severity: MonitorAlertSeverity;
  title: string;
  message: string;
  metric?: string | null;
  value?: number | null;
  threshold?: number | null;
  symbols?: readonly string[];
  detectedAt: string;
  evidence: readonly string[];
}): PortfolioMonitorAlert {
  return ensurePortfolioMonitorAlert({
    id: `${input.code}-${input.detectedAt}-${input.symbols?.[0] ?? "portfolio"}`,
    category: input.category,
    code: input.code,
    severity: input.severity,
    title: input.title,
    message: input.message,
    metric: input.metric ?? null,
    value: input.value ?? null,
    threshold: input.threshold ?? null,
    symbols: input.symbols ?? [],
    detectedAt: input.detectedAt,
    evidence: input.evidence,
  });
}

export function detectDuplicateSymbols(
  input: PortfolioAnalyticsInput,
): readonly { symbol: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const position of input.positions) {
    const key = position.symbol.trim().toUpperCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([symbol, count]) => ({ symbol, count }));
}

export function generateMonitorAlerts(params: {
  input: PortfolioAnalyticsInput;
  analytics: PortfolioAnalyticsSnapshot;
  previous: PortfolioMonitorObservation | null;
  nowIso: string;
  policy: PortfolioMonitorPolicy;
}): readonly PortfolioMonitorAlert[] {
  const { input, analytics, previous, nowIso, policy } = params;
  const alerts: PortfolioMonitorAlert[] = [];
  const observation = buildObservationFromAnalytics(analytics);

  const drawdown = metricNumber(analytics.drawdown);
  if (drawdown != null && Math.abs(drawdown) >= policy.maxDrawdownPct) {
    alerts.push(
      makeAlert({
        category: "RiskAlerts",
        code: "DRAWDOWN",
        severity: Math.abs(drawdown) >= policy.maxDrawdownPct * 1.5 ? "CRITICAL" : "WARN",
        title: "Drawdown threshold breached",
        message: `Portfolio drawdown ${drawdown.toFixed(2)}% exceeds ${policy.maxDrawdownPct}%.`,
        metric: "drawdown",
        value: drawdown,
        threshold: policy.maxDrawdownPct,
        detectedAt: nowIso,
        evidence: [`drawdown=${drawdown.toFixed(4)}`, `maxDrawdownPct=${policy.maxDrawdownPct}`],
      }),
    );
  }

  const concentration = metricNumber(analytics.concentration);
  if (concentration != null && concentration >= policy.maxConcentrationPct) {
    alerts.push(
      makeAlert({
        category: "PortfolioAlerts",
        code: "CONCENTRATION",
        severity: concentration >= policy.maxConcentrationPct * 1.25 ? "CRITICAL" : "WARN",
        title: "Rising concentration",
        message: `Concentration ${concentration.toFixed(2)}% exceeds ${policy.maxConcentrationPct}%.`,
        metric: "concentration",
        value: concentration,
        threshold: policy.maxConcentrationPct,
        detectedAt: nowIso,
        evidence: [`concentration=${concentration.toFixed(4)}`],
      }),
    );
  }

  const topWeight = observation.topPositionWeightPct;
  const topSymbol = observation.symbols[0];
  if (topWeight != null && topWeight >= policy.maxDominantPositionPct) {
    alerts.push(
      makeAlert({
        category: "PortfolioAlerts",
        code: "DOMINANT_POSITION",
        severity: topWeight >= policy.maxDominantPositionPct * 1.5 ? "CRITICAL" : "WARN",
        title: "Dominant position detected",
        message: `${topSymbol ?? "Top holding"} weight ${topWeight.toFixed(2)}% exceeds ${policy.maxDominantPositionPct}%.`,
        metric: "topPositionWeightPct",
        value: topWeight,
        threshold: policy.maxDominantPositionPct,
        symbols: topSymbol ? [topSymbol] : [],
        detectedAt: nowIso,
        evidence: [`topWeight=${topWeight.toFixed(4)}`, `symbol=${topSymbol ?? "UNKNOWN"}`],
      }),
    );
  }

  for (const dup of detectDuplicateSymbols(input)) {
    alerts.push(
      makeAlert({
        category: "PortfolioAlerts",
        code: "DUPLICATE_POSITION",
        severity: "WARN",
        title: "Duplicate position rows",
        message: `Symbol ${dup.symbol} appears ${dup.count} times in the snapshot.`,
        metric: "duplicateCount",
        value: dup.count,
        threshold: 1,
        symbols: [dup.symbol],
        detectedAt: nowIso,
        evidence: [`symbol=${dup.symbol}`, `count=${dup.count}`],
      }),
    );
  }

  const correlation = metricNumber(analytics.correlations);
  if (correlation != null && Math.abs(correlation) >= policy.maxCorrelation) {
    alerts.push(
      makeAlert({
        category: "RiskAlerts",
        code: "DANGEROUS_CORRELATION",
        severity: "CRITICAL",
        title: "Dangerous correlation",
        message: `Average portfolio correlation ${correlation.toFixed(3)} exceeds ${policy.maxCorrelation}.`,
        metric: "correlations",
        value: correlation,
        threshold: policy.maxCorrelation,
        detectedAt: nowIso,
        evidence: [`correlation=${correlation.toFixed(4)}`],
      }),
    );
  }

  const beta = metricNumber(analytics.beta);
  if (beta != null && Math.abs(beta) >= policy.maxBeta) {
    alerts.push(
      makeAlert({
        category: "RiskAlerts",
        code: "BETA_ELEVATED",
        severity: "WARN",
        title: "Elevated beta",
        message: `Portfolio beta ${beta.toFixed(3)} exceeds ${policy.maxBeta}.`,
        metric: "beta",
        value: beta,
        threshold: policy.maxBeta,
        detectedAt: nowIso,
        evidence: [`beta=${beta.toFixed(4)}`],
      }),
    );
  }

  const exposure = metricNumber(analytics.exposure);
  if (exposure != null && exposure >= policy.maxExposurePct) {
    alerts.push(
      makeAlert({
        category: "RiskAlerts",
        code: "EXPOSURE_HIGH",
        severity: "WARN",
        title: "High gross exposure",
        message: `Exposure ${exposure.toFixed(2)}% exceeds ${policy.maxExposurePct}%.`,
        metric: "exposure",
        value: exposure,
        threshold: policy.maxExposurePct,
        detectedAt: nowIso,
        evidence: [`exposure=${exposure.toFixed(4)}`],
      }),
    );
  }

  const totalRisk = metricNumber(analytics.totalRisk);
  const previousRisk = metricNumber(previous?.totalRisk ?? null);
  if (totalRisk != null && previousRisk != null && totalRisk - previousRisk >= policy.risingRiskDelta) {
    alerts.push(
      makeAlert({
        category: "RiskAlerts",
        code: "RISING_RISK",
        severity: "WARN",
        title: "Rising risk",
        message: `Total risk rose from ${previousRisk.toFixed(2)} to ${totalRisk.toFixed(2)}.`,
        metric: "totalRisk",
        value: totalRisk,
        threshold: previousRisk + policy.risingRiskDelta,
        detectedAt: nowIso,
        evidence: [`previousRisk=${previousRisk.toFixed(4)}`, `currentRisk=${totalRisk.toFixed(4)}`],
      }),
    );
  }

  const cash = metricNumber(analytics.cash);
  const invested = metricNumber(analytics.capitalInvested);
  if (cash != null && invested != null && invested + cash > 0) {
    const cashPct = (cash / (invested + cash)) * 100;
    if (cashPct < policy.minCashPct) {
      alerts.push(
        makeAlert({
          category: "AllocationAlerts",
          code: "CASH_LOW",
          severity: "WARN",
          title: "Low cash buffer",
          message: `Cash ratio ${cashPct.toFixed(2)}% is below ${policy.minCashPct}%.`,
          metric: "cashPct",
          value: cashPct,
          threshold: policy.minCashPct,
          detectedAt: nowIso,
          evidence: [`cash=${cash.toFixed(4)}`, `invested=${invested.toFixed(4)}`],
        }),
      );
    }
  }

  const previousCash = metricNumber(previous?.cash ?? null);
  if (cash != null && previousCash != null && previousCash !== 0) {
    const changePct = (Math.abs(cash - previousCash) / Math.abs(previousCash)) * 100;
    if (changePct >= policy.liquidityChangePct) {
      alerts.push(
        makeAlert({
          category: "PortfolioAlerts",
          code: "LIQUIDITY_CHANGE",
          severity: "WARN",
          title: "Liquidity change",
          message: `Cash moved ${changePct.toFixed(2)}% versus prior observation.`,
          metric: "cashChangePct",
          value: changePct,
          threshold: policy.liquidityChangePct,
          detectedAt: nowIso,
          evidence: [`previousCash=${previousCash.toFixed(4)}`, `cash=${cash.toFixed(4)}`],
        }),
      );
    }
  }

  const topSector = analytics.bySector[0];
  const sectorWeight = metricNumber(topSector?.weightPct ?? null);
  if (topSector && sectorWeight != null && sectorWeight >= policy.maxSectorWeightPct) {
    alerts.push(
      makeAlert({
        category: "AllocationAlerts",
        code: "SECTOR_CONCENTRATION",
        severity: "WARN",
        title: "Sector concentration",
        message: `Sector ${topSector.label} at ${sectorWeight.toFixed(2)}% exceeds ${policy.maxSectorWeightPct}%.`,
        metric: "sectorWeightPct",
        value: sectorWeight,
        threshold: policy.maxSectorWeightPct,
        detectedAt: nowIso,
        evidence: [`sector=${topSector.label}`, `weight=${sectorWeight.toFixed(4)}`],
      }),
    );
  }

  const topCountry = analytics.byCountry[0];
  const countryWeight = metricNumber(topCountry?.weightPct ?? null);
  if (topCountry && countryWeight != null && countryWeight >= policy.maxCountryWeightPct) {
    alerts.push(
      makeAlert({
        category: "AllocationAlerts",
        code: "COUNTRY_CONCENTRATION",
        severity: "WARN",
        title: "Country concentration",
        message: `Country ${topCountry.label} at ${countryWeight.toFixed(2)}% exceeds ${policy.maxCountryWeightPct}%.`,
        metric: "countryWeightPct",
        value: countryWeight,
        threshold: policy.maxCountryWeightPct,
        detectedAt: nowIso,
        evidence: [`country=${topCountry.label}`, `weight=${countryWeight.toFixed(4)}`],
      }),
    );
  }

  const topCurrency = analytics.byCurrency[0];
  const currencyWeight = metricNumber(topCurrency?.weightPct ?? null);
  if (topCurrency && currencyWeight != null && currencyWeight >= policy.maxCurrencyWeightPct) {
    alerts.push(
      makeAlert({
        category: "AllocationAlerts",
        code: "CURRENCY_EXPOSURE",
        severity: "INFO",
        title: "Currency exposure",
        message: `Currency ${topCurrency.label} at ${currencyWeight.toFixed(2)}% exceeds ${policy.maxCurrencyWeightPct}%.`,
        metric: "currencyWeightPct",
        value: currencyWeight,
        threshold: policy.maxCurrencyWeightPct,
        detectedAt: nowIso,
        evidence: [`currency=${topCurrency.label}`, `weight=${currencyWeight.toFixed(4)}`],
      }),
    );
  }

  const returns = metricNumber(analytics.returns);
  if (returns != null && returns < 0 && drawdown != null && Math.abs(drawdown) >= policy.maxDrawdownPct * 0.5) {
    alerts.push(
      makeAlert({
        category: "PortfolioAlerts",
        code: "PNL_PRESSURE",
        severity: "INFO",
        title: "PnL pressure",
        message: `Negative return ${returns.toFixed(2)}% with drawdown ${drawdown?.toFixed(2)}%.`,
        metric: "returns",
        value: returns,
        threshold: 0,
        detectedAt: nowIso,
        evidence: [`returns=${returns.toFixed(4)}`, `drawdown=${drawdown?.toFixed(4) ?? "n/a"}`],
      }),
    );
  }

  const diversification = metricNumber(analytics.diversification);
  if (diversification != null && diversification < 40) {
    alerts.push(
      makeAlert({
        category: "OpportunityAlerts",
        code: "DIVERSIFICATION_GAP",
        severity: "INFO",
        title: "Diversification opportunity",
        message: `Diversification score ${diversification.toFixed(2)} suggests room to spread risk.`,
        metric: "diversification",
        value: diversification,
        threshold: 40,
        detectedAt: nowIso,
        evidence: [`diversification=${diversification.toFixed(4)}`],
      }),
    );
  }

  if (
    concentration != null &&
    concentration >= policy.maxConcentrationPct * 0.8 &&
    cash != null &&
    invested != null &&
    invested + cash > 0
  ) {
    const cashPct = (cash / (invested + cash)) * 100;
    if (cashPct >= policy.minCashPct) {
      alerts.push(
        makeAlert({
          category: "OpportunityAlerts",
          code: "REBALANCE_OPPORTUNITY",
          severity: "INFO",
          title: "Rebalance opportunity",
          message: "Concentration is elevated while cash remains available for rebalancing.",
          metric: "concentration",
          value: concentration,
          threshold: policy.maxConcentrationPct,
          detectedAt: nowIso,
          evidence: [`concentration=${concentration.toFixed(4)}`, `cashPct=${cashPct.toFixed(4)}`],
        }),
      );
    }
  }

  return alerts;
}

class AlertRing {
  private readonly items: PortfolioMonitorAlert[] = [];
  private readonly lastSeen = new Map<string, number>();

  constructor(private readonly policy: PortfolioMonitorPolicy) {}

  ingest(alerts: readonly PortfolioMonitorAlert[], nowMs: number): void {
    for (const alert of alerts) {
      const key = `${alert.code}:${alert.symbols.join(",")}:${alert.metric ?? ""}`;
      const seenAt = this.lastSeen.get(key);
      if (seenAt != null && nowMs - seenAt < this.policy.dedupeTtlMs) continue;
      this.lastSeen.set(key, nowMs);
      this.items.push(alert);
      if (this.items.length > this.policy.maxAlertsRetained) this.items.shift();
    }
    for (const [key, seenAt] of this.lastSeen.entries()) {
      if (nowMs - seenAt > this.policy.dedupeTtlMs * 2) this.lastSeen.delete(key);
    }
  }

  list(): readonly PortfolioMonitorAlert[] {
    return [...this.items].reverse();
  }
}

export class ContinuousPortfolioMonitor {
  private readonly policy: PortfolioMonitorPolicy;
  private readonly now: () => Date;
  private readonly intervalMs: number;
  private readonly alertRing: AlertRing;
  private timer: ReturnType<typeof setInterval> | null = null;
  private startedAt: string | null = null;
  private evaluationCount = 0;
  private lastEvaluatedAt: string | null = null;
  private observation: PortfolioMonitorObservation | null = null;
  private analyticsAsOf: string | null = null;

  constructor(private readonly deps: PortfolioMonitorDeps) {
    this.policy = mergePolicy(deps.policy);
    this.now = deps.now ?? (() => new Date());
    this.intervalMs = Math.max(2_000, deps.pollIntervalMs ?? 10_000);
    this.alertRing = new AlertRing(this.policy);
  }

  start(): void {
    if (this.timer) return;
    this.startedAt = this.now().toISOString();
    this.timer = setInterval(() => {
      this.evaluateOnce().catch(() => {
        // Keep loop alive; snapshot remains last good observation.
      });
    }, this.intervalMs);
  }

  stop(): void {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
  }

  isRunning(): boolean {
    return this.timer != null;
  }

  async evaluateNow(): Promise<PortfolioMonitorSnapshot> {
    await this.evaluateOnce();
    return this.getSnapshot();
  }

  getSnapshot(): PortfolioMonitorSnapshot {
    const alerts = this.alertRing.list();
    return ensurePortfolioMonitorSnapshot({
      monitorStartedAt: this.startedAt,
      monitorRunning: this.isRunning(),
      evaluationCount: this.evaluationCount,
      lastEvaluatedAt: this.lastEvaluatedAt,
      mode: "ANALYSIS_ONLY",
      orderExecution: "disabled",
      observation: this.observation,
      alerts,
      alertsByCategory: groupAlertsByCategory(alerts),
      analyticsAsOf: this.analyticsAsOf,
    });
  }

  private async evaluateOnce(): Promise<void> {
    const now = this.now();
    const nowIso = now.toISOString();
    const nowMs = now.getTime();
    this.evaluationCount += 1;
    this.lastEvaluatedAt = nowIso;

    const input = await this.deps.snapshotProvider.loadSnapshot();
    const analytics = computePortfolioAnalytics(input);
    const previous = this.observation;
    const nextObservation = buildObservationFromAnalytics(analytics);
    const generated = generateMonitorAlerts({
      input,
      analytics,
      previous,
      nowIso,
      policy: this.policy,
    });
    this.alertRing.ingest(generated, nowMs);
    this.observation = nextObservation;
    this.analyticsAsOf = analytics.asOf;

    if (this.deps.store) {
      await this.deps.store.save(this.getSnapshot());
    }
  }
}

export function createContinuousPortfolioMonitor(deps: PortfolioMonitorDeps): ContinuousPortfolioMonitor {
  return new ContinuousPortfolioMonitor(deps);
}
