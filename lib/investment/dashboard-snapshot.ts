import "server-only";

import fs from "node:fs";
import path from "node:path";
import {
  DASHBOARD_TIMEOUT_MS,
  DASHBOARD_TTL_MS,
  type AccountSummarySnapshot,
  type BrokerStatusSummary,
  type CommitteeSummarySnapshot,
  type InvestmentDashboardSnapshot,
  type InvestmentHealthState,
  brokerDataSourceForConnection,
  type PortfolioSummarySnapshot,
  type ProviderStatusSnapshot,
  type RecentDecisionItem,
  type RiskSummarySnapshot,
  type RuntimeHealthSnapshot,
  type SignalSummaryItem,
  type SnapshotSectionMeta,
} from "./dashboard-snapshot.types";
import { maskAccountList } from "@/lib/ibkr/account-mask";

const RUNTIME_DIR = path.join(process.cwd(), ".runtime", "investment");
const SNAPSHOT_PATH = path.join(RUNTIME_DIR, "dashboard-snapshot.json");

type SectionKey =
  | "brokerStatus"
  | "accountSummary"
  | "portfolioSummary"
  | "riskSummary"
  | "committeeSummary"
  | "providerStatus"
  | "recentSignals"
  | "runtimeHealth"
  | "recentDecisions"
  | "brainStatus";

declare global {
  // eslint-disable-next-line no-var
  var __forgeosInvestmentDashboardSnapshot: {
    snapshot: InvestmentDashboardSnapshot;
    refreshInFlight: Promise<InvestmentDashboardSnapshot> | null;
    lastRefreshStartedAt: number;
  } | undefined;
}

function nowIso(): string {
  return new Date().toISOString();
}

function sectionMeta(
  state: InvestmentHealthState,
  updatedAt: string | null,
  extras?: Partial<SnapshotSectionMeta>,
): SnapshotSectionMeta {
  return {
    state,
    updatedAt,
    stale: state === "STALE",
    ...extras,
  };
}

function demoBrokerFallback(error?: string): InvestmentDashboardSnapshot["brokerStatus"] {
  return {
    ...sectionMeta("STALE", null, {
      source: "fallback",
      dataSource: "DEMO",
      error: error ?? "IBKR unavailable — DEMO snapshot only",
    }),
    data: {
      connected: false,
      managedAccounts: ["PAPER_SIM"],
      maskedAccounts: ["PAPER_SIM"],
      ibkrReadOnly: true,
      liveTradingEnabled: false,
      engine: "demo",
      dataSource: "DEMO",
    },
  };
}

async function fetchIbkrJson(servicePath: string, signal: AbortSignal): Promise<unknown> {
  // Always talk to the real IBKR FastAPI proxy path — never paper engine for hub status.
  const { createIbkrBrokerEngine } = await import("@/lib/broker-engine");
  const engine = createIbkrBrokerEngine();
  return engine.request({
    path: servicePath,
    method: "GET",
    signal,
  });
}

function emptySnapshot(overrides?: Partial<InvestmentDashboardSnapshot>): InvestmentDashboardSnapshot {
  const generatedAt = nowIso();
  const unavailable = <T,>(data: T): SnapshotSectionMeta & { data: T } => ({
    ...sectionMeta("UNAVAILABLE", null, { source: "fallback" }),
    data,
  });
  return {
    generatedAt,
    mode: "ANALYSIS_ONLY",
    orderExecution: "disabled",
    liveTradingEnabled: false,
    brokerStatus: unavailable<BrokerStatusSummary | null>(null),
    accountSummary: unavailable<AccountSummarySnapshot | null>(null),
    portfolioSummary: unavailable<PortfolioSummarySnapshot | null>(null),
    riskSummary: unavailable<RiskSummarySnapshot | null>(null),
    committeeSummary: unavailable<CommitteeSummarySnapshot | null>(null),
    providerStatus: unavailable<ProviderStatusSnapshot | null>({
      marketProviderStatus: "NO_DATA",
    }),
    recentSignals: unavailable<readonly SignalSummaryItem[]>([]),
    runtimeHealth: unavailable<RuntimeHealthSnapshot | null>(null),
    recentDecisions: unavailable<readonly RecentDecisionItem[]>([]),
    brainStatus: {
      ...sectionMeta("IDLE", generatedAt, { source: "fallback" }),
      data: { status: "IDLE" },
    },
    ...overrides,
  };
}

function ensureRuntimeDir(): void {
  if (!fs.existsSync(RUNTIME_DIR)) {
    fs.mkdirSync(RUNTIME_DIR, { recursive: true });
  }
}

function readPersistedSnapshot(): InvestmentDashboardSnapshot | null {
  try {
    if (!fs.existsSync(SNAPSHOT_PATH)) return null;
    const raw = fs.readFileSync(SNAPSHOT_PATH, "utf8").replace(/^\uFEFF/, "");
    const parsed = JSON.parse(raw) as InvestmentDashboardSnapshot;
    if (parsed?.mode !== "ANALYSIS_ONLY") return null;
    return parsed;
  } catch {
    return null;
  }
}

function persistSnapshot(snapshot: InvestmentDashboardSnapshot): void {
  try {
    ensureRuntimeDir();
    const tmp = `${SNAPSHOT_PATH}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(snapshot, null, 2), "utf8");
    fs.renameSync(tmp, SNAPSHOT_PATH);
  } catch {
    // Non-fatal — in-memory snapshot remains authoritative for this process.
  }
}

function getMemory(): {
  snapshot: InvestmentDashboardSnapshot;
  refreshInFlight: Promise<InvestmentDashboardSnapshot> | null;
  lastRefreshStartedAt: number;
} {
  if (!globalThis.__forgeosInvestmentDashboardSnapshot) {
    const persisted = readPersistedSnapshot();
    globalThis.__forgeosInvestmentDashboardSnapshot = {
      snapshot: persisted ?? emptySnapshot(),
      refreshInFlight: null,
      lastRefreshStartedAt: 0,
    };
  }
  return globalThis.__forgeosInvestmentDashboardSnapshot;
}

async function withTimeout<T>(
  factory: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
): Promise<{ ok: true; value: T } | { ok: false; error: string; timedOut: boolean }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const value = await factory(controller.signal);
    return { ok: true, value };
  } catch (error) {
    const timedOut = controller.signal.aborted;
    return {
      ok: false,
      timedOut,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timer);
  }
}

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function extractAccountSummary(accountPayload: unknown): AccountSummarySnapshot {
  const root = asObject(accountPayload);
  if (!root) return {};
  const accountIds = Object.keys(root);
  let netLiquidation: number | undefined;
  let totalCashValue: number | undefined;
  let buyingPower: number | undefined;
  let currency: string | undefined;
  let rawTagCount = 0;

  for (const accountId of accountIds) {
    const tags = asObject(root[accountId]);
    if (!tags) continue;
    rawTagCount += Object.keys(tags).length;
    const nl = asObject(tags.NetLiquidation);
    const cash = asObject(tags.TotalCashValue);
    const bp = asObject(tags.BuyingPower);
    if (nl && typeof nl.value === "string") {
      const n = Number(nl.value);
      if (Number.isFinite(n)) netLiquidation = (netLiquidation ?? 0) + n;
      if (typeof nl.currency === "string") currency = nl.currency;
    }
    if (cash && typeof cash.value === "string") {
      const n = Number(cash.value);
      if (Number.isFinite(n)) totalCashValue = (totalCashValue ?? 0) + n;
    }
    if (bp && typeof bp.value === "string") {
      const n = Number(bp.value);
      if (Number.isFinite(n)) buyingPower = (buyingPower ?? 0) + n;
    }
  }

  return {
    netLiquidation,
    totalCashValue,
    buyingPower,
    currency,
    accountIds,
    rawTagCount,
  };
}

function markStaleIfNeeded<T extends SnapshotSectionMeta>(
  section: T,
  ttlMs: number,
  nowMs: number,
): T {
  if (!section.updatedAt) return section;
  const age = nowMs - Date.parse(section.updatedAt);
  if (!Number.isFinite(age) || age <= ttlMs) return section;
  if (section.state === "DISCONNECTED" || section.state === "UNAVAILABLE" || section.state === "ERROR") {
    return section;
  }
  return { ...section, state: "STALE" as InvestmentHealthState, stale: true };
}

async function fetchBrokerJson(
  servicePath: string,
  signal: AbortSignal,
): Promise<unknown> {
  return fetchIbkrJson(servicePath, signal);
}

/**
 * Snapshot refresh: independent sections via Promise.allSettled.
 * Never reconnects IBKR — reads available status only.
 * ANALYSIS_ONLY — no order endpoints.
 */
async function refreshSnapshotInternal(): Promise<InvestmentDashboardSnapshot> {
  const mem = getMemory();
  const previous = mem.snapshot;
  const generatedAt = nowIso();
  const nowMs = Date.now();

  const brokerResult = await withTimeout(
    (signal) => fetchBrokerJson("/status", signal),
    DASHBOARD_TIMEOUT_MS.brokerStatus,
  );

  let brokerStatus: InvestmentDashboardSnapshot["brokerStatus"];
  if (brokerResult.ok) {
    const body = asObject(brokerResult.value);
    const connected = Boolean(body?.connected);
    const accounts = Array.isArray(body?.managedAccounts)
      ? (body!.managedAccounts as string[])
      : [];
    // FastAPI may answer while TWS is offline — never label that as LIVE.
    const dataSource = brokerDataSourceForConnection(connected);
    brokerStatus = {
      ...sectionMeta(connected ? "CONNECTED" : "DISCONNECTED", generatedAt, {
        source: connected ? "live" : "fallback",
        dataSource,
      }),
      data: {
        connected,
        nextOrderIdReady: Boolean(body?.nextOrderIdReady),
        managedAccounts: accounts,
        maskedAccounts: maskAccountList(accounts),
        ibkrReadOnly: body?.ibkrReadOnly !== false,
        liveTradingEnabled: body?.liveTradingEnabled === true,
        engine: "ibkr",
        dataSource,
      },
    };
  } else if (
    previous.brokerStatus.data?.dataSource === "IBKR_LIVE_READ_ONLY" &&
    previous.brokerStatus.data
  ) {
    brokerStatus = {
      ...previous.brokerStatus,
      ...sectionMeta(
        brokerResult.timedOut ? "STALE" : "DISCONNECTED",
        previous.brokerStatus.updatedAt,
        {
          source: "cache",
          dataSource: "CACHE",
          error: brokerResult.error,
        },
      ),
      data: {
        ...previous.brokerStatus.data,
        connected: brokerResult.timedOut ? Boolean(previous.brokerStatus.data.connected) : false,
        liveTradingEnabled: false,
        ibkrReadOnly: true,
        dataSource: "CACHE",
        maskedAccounts:
          previous.brokerStatus.data.maskedAccounts ??
          maskAccountList(previous.brokerStatus.data.managedAccounts),
      },
    };
  } else {
    // Never present PAPER_SIM / paper engine as live IBKR.
    brokerStatus = demoBrokerFallback(brokerResult.error);
  }

  const connected = Boolean(brokerStatus.data?.connected);
  const liveIbkr = brokerStatus.data?.dataSource === "IBKR_LIVE_READ_ONLY" && connected;

  const accountPromise = liveIbkr
    ? withTimeout((signal) => fetchBrokerJson("/account", signal), DASHBOARD_TIMEOUT_MS.account)
    : Promise.resolve({
        ok: false as const,
        timedOut: false,
        error: "IBKR disconnected — skipping account",
      });

  const positionsPromise = liveIbkr
    ? withTimeout(
        (signal) => fetchBrokerJson("/positions", signal),
        DASHBOARD_TIMEOUT_MS.positions,
      )
    : Promise.resolve({
        ok: false as const,
        timedOut: false,
        error: "IBKR disconnected — skipping positions",
      });

  const ordersPromise = liveIbkr
    ? withTimeout((signal) => fetchBrokerJson("/orders", signal), DASHBOARD_TIMEOUT_MS.orders)
    : Promise.resolve({
        ok: false as const,
        timedOut: false,
        error: "IBKR disconnected — skipping orders",
      });

  const metaPromise = withTimeout(async () => {
    const { getCompositionRoot } = await import("@/src/core/composition");
    return getCompositionRoot().store.meta as Record<string, unknown>;
  }, DASHBOARD_TIMEOUT_MS.meta);

  const monitorPromise = withTimeout(async () => {
    const { getPortfolioMonitorRuntime } = await import("@/lib/investment/portfolio-monitor-runtime");
    const runtime = getPortfolioMonitorRuntime();
    // Prefer last snapshot; do not force heavy evaluate on every refresh.
    const snap = runtime.monitor.getSnapshot();
    if (!runtime.monitor.isRunning()) runtime.monitor.start();
    return snap;
  }, DASHBOARD_TIMEOUT_MS.monitor);

  const settled = await Promise.allSettled([
    accountPromise,
    positionsPromise,
    ordersPromise,
    metaPromise,
    monitorPromise,
  ]);

  const accountSettled = settled[0].status === "fulfilled" ? settled[0].value : { ok: false as const, timedOut: false, error: "account failed" };
  const positionsSettled = settled[1].status === "fulfilled" ? settled[1].value : { ok: false as const, timedOut: false, error: "positions failed" };
  const ordersSettled = settled[2].status === "fulfilled" ? settled[2].value : { ok: false as const, timedOut: false, error: "orders failed" };
  const metaSettled = settled[3].status === "fulfilled" ? settled[3].value : { ok: false as const, timedOut: false, error: "meta failed" };
  const monitorSettled = settled[4].status === "fulfilled" ? settled[4].value : { ok: false as const, timedOut: false, error: "monitor failed" };

  let accountSummary: InvestmentDashboardSnapshot["accountSummary"];
  if (accountSettled.ok) {
    accountSummary = {
      ...sectionMeta("CONNECTED", generatedAt, {
        source: "live",
        dataSource: "IBKR_LIVE_READ_ONLY",
      }),
      data: extractAccountSummary(accountSettled.value),
    };
  } else if (
    liveIbkr === false &&
    previous.accountSummary.dataSource !== "IBKR_LIVE_READ_ONLY" &&
    previous.accountSummary.dataSource !== "CACHE"
  ) {
    // Do not surface PAPER_SIM demo numbers as portfolio when IBKR is down.
    accountSummary = {
      ...sectionMeta("STALE", null, {
        source: "fallback",
        dataSource: "DEMO",
        error: accountSettled.error,
      }),
      data: null,
    };
  } else if (
    previous.accountSummary.data &&
    (previous.accountSummary.dataSource === "IBKR_LIVE_READ_ONLY" ||
      previous.accountSummary.dataSource === "CACHE")
  ) {
    accountSummary = {
      ...previous.accountSummary,
      ...sectionMeta(accountSettled.timedOut ? "STALE" : "PARTIAL", previous.accountSummary.updatedAt, {
        source: "cache",
        dataSource: "CACHE",
        error: accountSettled.error,
      }),
      data: previous.accountSummary.data,
    };
  } else {
    accountSummary = {
      ...sectionMeta(connected ? (accountSettled.timedOut ? "STALE" : "ERROR") : "DISCONNECTED", null, {
        source: "fallback",
        dataSource: liveIbkr ? "UNAVAILABLE" : "DEMO",
        error: accountSettled.error,
      }),
      data: null,
    };
  }

  const positions = positionsSettled.ok && Array.isArray(positionsSettled.value) ? positionsSettled.value : [];
  const orders = ordersSettled.ok && Array.isArray(ordersSettled.value) ? ordersSettled.value : [];
  const nl = accountSummary.data?.netLiquidation;
  const cash = accountSummary.data?.totalCashValue;
  const cashRatioPct =
    typeof nl === "number" && nl > 0 && typeof cash === "number" ? (cash / nl) * 100 : undefined;

  let portfolioSummary: InvestmentDashboardSnapshot["portfolioSummary"];
  if (positionsSettled.ok || accountSettled.ok) {
    portfolioSummary = {
      ...sectionMeta(
        positionsSettled.ok && accountSettled.ok ? "CONNECTED" : "PARTIAL",
        generatedAt,
        { source: "live", dataSource: "IBKR_LIVE_READ_ONLY" },
      ),
      data: {
        totalValue: nl,
        baseCurrency: accountSummary.data?.currency,
        cashRatioPct,
        positionCount: positions.length,
        openOrderCount: orders.length,
      },
    };
  } else if (
    previous.portfolioSummary.data &&
    (previous.portfolioSummary.dataSource === "IBKR_LIVE_READ_ONLY" ||
      previous.portfolioSummary.dataSource === "CACHE")
  ) {
    portfolioSummary = {
      ...previous.portfolioSummary,
      ...sectionMeta(
        positionsSettled.timedOut || accountSettled.timedOut ? "STALE" : "PARTIAL",
        previous.portfolioSummary.updatedAt,
        {
          source: "cache",
          dataSource: "CACHE",
          error: positionsSettled.error ?? accountSettled.error,
        },
      ),
      data: previous.portfolioSummary.data,
    };
  } else {
    portfolioSummary = {
      ...sectionMeta(connected ? "UNAVAILABLE" : "STALE", null, {
        source: "fallback",
        dataSource: "DEMO",
        error: positionsSettled.error,
      }),
      data: null,
    };
  }

  // Meta-backed summaries (committee/risk/signals) — last persisted analysis only, no recompute.
  let riskSummary = previous.riskSummary;
  let committeeSummary = previous.committeeSummary;
  let providerStatus = previous.providerStatus;
  let recentSignals = previous.recentSignals;
  let recentDecisions = previous.recentDecisions;
  let brainStatus = previous.brainStatus;

  if (metaSettled.ok) {
    const meta = metaSettled.value as Record<string, unknown>;
    const fromInvestment = asObject(meta.investment);
    const fromWorkspace = asObject(meta.investmentWorkspace);
    const fromReadModel = asObject(meta.investmentReadModel);
    const source = fromInvestment ?? fromWorkspace ?? fromReadModel ?? {};
    const report =
      asObject(source.report) ??
      asObject(source.investmentReport) ??
      asObject(asObject(meta.investmentReport) ?? undefined);
    const decision = asObject(report?.decision);
    const risk = asObject(report?.risk);
    const marketSnapshot = asObject(source.marketSnapshot);
    const signals = Array.isArray(source.signals) ? source.signals : [];

    if (risk) {
      riskSummary = {
        ...sectionMeta("READY", generatedAt, { source: "cache" }),
        data: {
          level: typeof risk.level === "string" ? risk.level : undefined,
          concentrationRiskPct:
            typeof risk.concentrationRiskPct === "number" ? risk.concentrationRiskPct : undefined,
          liquidityRiskPct: typeof risk.liquidityRiskPct === "number" ? risk.liquidityRiskPct : undefined,
          expectedDrawdownPct:
            typeof risk.expectedDrawdownPct === "number" ? risk.expectedDrawdownPct : undefined,
          factors: Array.isArray(risk.factors) ? (risk.factors as string[]) : undefined,
        },
      };
    } else {
      riskSummary = {
        ...sectionMeta("UNAVAILABLE", generatedAt, { source: "fallback" }),
        data: null,
      };
    }

    if (decision) {
      const recommendation = typeof decision.recommendation === "string" ? decision.recommendation : undefined;
      committeeSummary = {
        ...sectionMeta(recommendation ? "ACTIVE" : "IDLE", generatedAt, { source: "cache" }),
        data: {
          recommendation,
          confidence: typeof decision.confidence === "number" ? decision.confidence : undefined,
          reasoning: Array.isArray(decision.reasoning) ? (decision.reasoning as string[]) : undefined,
          status: recommendation ? "ACTIVE" : "IDLE",
        },
      };
      brainStatus = {
        ...sectionMeta(report ? "READY" : "IDLE", generatedAt, { source: "cache" }),
        data: { status: report ? "READY" : "IDLE" },
      };
      recentDecisions = {
        ...sectionMeta("READY", generatedAt, { source: "cache" }),
        data: (Array.isArray(decision.reasoning) ? (decision.reasoning as string[]) : [])
          .slice(0, 5)
          .map((label) => ({ label, at: typeof report?.generatedAt === "string" ? report.generatedAt : generatedAt })),
      };
    } else {
      committeeSummary = {
        ...sectionMeta("IDLE", generatedAt, { source: "fallback" }),
        data: { status: "IDLE" },
      };
      brainStatus = {
        ...sectionMeta("IDLE", generatedAt, { source: "fallback" }),
        data: { status: "IDLE" },
      };
      recentDecisions = {
        ...sectionMeta("UNAVAILABLE", generatedAt, { source: "fallback" }),
        data: [],
      };
    }

    providerStatus = {
      ...sectionMeta(marketSnapshot ? "CONNECTED" : "UNAVAILABLE", generatedAt, {
        source: marketSnapshot ? "cache" : "fallback",
      }),
      data: {
        marketProviderStatus: marketSnapshot ? "CONNECTED" : "NO_DATA",
      },
    };

    recentSignals = {
      ...sectionMeta(signals.length > 0 ? "READY" : "UNAVAILABLE", generatedAt, {
        source: signals.length > 0 ? "cache" : "fallback",
      }),
      data: signals.slice(0, 8).map((item) => {
        const row = asObject(item) ?? {};
        return {
          name: typeof row.name === "string" ? row.name : undefined,
          direction: typeof row.direction === "string" ? row.direction : undefined,
          strength: typeof row.strength === "number" ? row.strength : undefined,
          timeframe: typeof row.timeframe === "string" ? row.timeframe : undefined,
        };
      }),
    };
  } else {
    riskSummary = markStaleIfNeeded(previous.riskSummary, DASHBOARD_TTL_MS.risk, nowMs) as typeof riskSummary;
    committeeSummary = markStaleIfNeeded(
      previous.committeeSummary,
      DASHBOARD_TTL_MS.committee,
      nowMs,
    ) as typeof committeeSummary;
    providerStatus = markStaleIfNeeded(
      previous.providerStatus,
      DASHBOARD_TTL_MS.provider,
      nowMs,
    ) as typeof providerStatus;
  }

  let runtimeHealth: InvestmentDashboardSnapshot["runtimeHealth"];
  if (monitorSettled.ok) {
    const snap = asObject(monitorSettled.value);
    runtimeHealth = {
      ...sectionMeta("READY", generatedAt, { source: "live" }),
      data: {
        monitorRunning: Boolean(snap?.monitorRunning),
        evaluationCount: typeof snap?.evaluationCount === "number" ? snap.evaluationCount : 0,
        lastEvaluatedAt: typeof snap?.lastEvaluatedAt === "string" ? snap.lastEvaluatedAt : null,
        note: "Portfolio monitor snapshot (ANALYSIS_ONLY)",
      },
    };
  } else if (previous.runtimeHealth.data) {
    runtimeHealth = {
      ...previous.runtimeHealth,
      ...sectionMeta(monitorSettled.timedOut ? "STALE" : "PARTIAL", previous.runtimeHealth.updatedAt, {
        source: "cache",
        error: monitorSettled.error,
      }),
      data: previous.runtimeHealth.data,
    };
  } else {
    runtimeHealth = {
      ...sectionMeta("UNAVAILABLE", null, { source: "fallback", error: monitorSettled.error }),
      data: { monitorRunning: false, evaluationCount: 0, lastEvaluatedAt: null },
    };
  }

  const next = emptySnapshot({
    generatedAt,
    brokerStatus: markStaleIfNeeded(brokerStatus, DASHBOARD_TTL_MS.broker, nowMs) as typeof brokerStatus,
    accountSummary: markStaleIfNeeded(accountSummary, DASHBOARD_TTL_MS.account, nowMs) as typeof accountSummary,
    portfolioSummary: markStaleIfNeeded(
      portfolioSummary,
      DASHBOARD_TTL_MS.positions,
      nowMs,
    ) as typeof portfolioSummary,
    riskSummary: markStaleIfNeeded(riskSummary, DASHBOARD_TTL_MS.risk, nowMs) as typeof riskSummary,
    committeeSummary: markStaleIfNeeded(
      committeeSummary,
      DASHBOARD_TTL_MS.committee,
      nowMs,
    ) as typeof committeeSummary,
    providerStatus: markStaleIfNeeded(
      providerStatus,
      DASHBOARD_TTL_MS.provider,
      nowMs,
    ) as typeof providerStatus,
    recentSignals: markStaleIfNeeded(recentSignals, DASHBOARD_TTL_MS.analytics, nowMs) as typeof recentSignals,
    runtimeHealth: markStaleIfNeeded(runtimeHealth, DASHBOARD_TTL_MS.runtime, nowMs) as typeof runtimeHealth,
    recentDecisions: markStaleIfNeeded(
      recentDecisions,
      DASHBOARD_TTL_MS.memory,
      nowMs,
    ) as typeof recentDecisions,
    brainStatus: markStaleIfNeeded(brainStatus, DASHBOARD_TTL_MS.committee, nowMs) as typeof brainStatus,
  });

  mem.snapshot = next;
  persistSnapshot(next);
  return next;
}

/** Last-good snapshot only — never blocks on IBKR / meta / providers. */
export function getInvestmentDashboardSnapshot(): InvestmentDashboardSnapshot {
  return getMemory().snapshot;
}

/**
 * Kick a background refresh if stale. Returns last-good immediately when `preferCache`.
 * Dedupes concurrent refreshes.
 */
export function refreshInvestmentDashboardSnapshot(options?: {
  force?: boolean;
  preferCache?: boolean;
}): Promise<InvestmentDashboardSnapshot> {
  const mem = getMemory();
  const preferCache = options?.preferCache !== false;
  const force = options?.force === true;
  const age = Date.now() - Date.parse(mem.snapshot.generatedAt || "0");
  const freshEnough = Number.isFinite(age) && age < DASHBOARD_TTL_MS.broker;

  if (preferCache && !force && freshEnough) {
    return Promise.resolve(mem.snapshot);
  }

  if (mem.refreshInFlight) {
    return preferCache ? Promise.resolve(mem.snapshot) : mem.refreshInFlight;
  }

  mem.lastRefreshStartedAt = Date.now();
  mem.refreshInFlight = refreshSnapshotInternal()
    .catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      const degraded = {
        ...mem.snapshot,
        generatedAt: nowIso(),
        brokerStatus: {
          ...mem.snapshot.brokerStatus,
          state: "ERROR" as const,
          error: message,
          stale: true,
        },
      };
      mem.snapshot = degraded;
      return degraded;
    })
    .finally(() => {
      mem.refreshInFlight = null;
    });

  return preferCache ? Promise.resolve(mem.snapshot) : mem.refreshInFlight;
}

export function getInvestmentDashboardSection<K extends SectionKey>(
  key: K,
): InvestmentDashboardSnapshot[K] {
  return getMemory().snapshot[key];
}

export function getDashboardSnapshotPath(): string {
  return SNAPSHOT_PATH;
}
