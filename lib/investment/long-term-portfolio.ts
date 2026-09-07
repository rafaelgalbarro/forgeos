import "server-only";

import { ibkrServiceFetch } from "@/lib/ibkr/service-client";
import {
  LONG_TERM_HORIZON_LABEL,
  VALUE_SCREEN_CRITERIA,
  type CatalystAlert,
  type DividendGrowthRow,
  type LongTermPortfolioSnapshot,
  type RebalanceSuggestion,
  type ValueScreenerHit,
} from "@/lib/investment/long-term-portfolio.types";
import {
  getUpgradeDowngradeHistory,
  getYahooCorporateEvents,
  getYahooFundamentals,
  isYahooFinanceEnabled,
  type YahooCorporateEvent,
  type YahooFundamentals,
} from "@/lib/market-data/yahoo-finance";
import { notifyAlertTriggered } from "@/lib/notifications/telegram-bot";

const DEFAULT_SEED = [
  "AAPL",
  "MSFT",
  "JNJ",
  "PG",
  "KO",
  "PEP",
  "XOM",
  "CVX",
  "JPM",
  "BAC",
  "WFC",
  "INTC",
  "IBM",
  "CSCO",
  "VZ",
  "T",
  "PFE",
  "MRK",
  "ABBV",
  "UNH",
  "HD",
  "LOW",
  "WMT",
  "COST",
  "MCD",
  "NKE",
  "DIS",
  "CMCSA",
  "ORCL",
  "QCOM",
  "TXN",
  "AMGN",
  "BMY",
  "CAT",
  "DE",
  "MMM",
  "GE",
  "BA",
  "UPS",
  "FDX",
] as const;

const MAX_FUNDAMENTAL_SCAN = 36;
const MAX_EVENT_SCAN = 18;
const CATALYST_ALERT_COOLDOWN_MS = 6 * 60 * 60 * 1000;

const catalystAlertCooldown = new Map<string, number>();

function envBool(name: string, defaultValue = true): boolean {
  const v = process.env[name]?.trim().toLowerCase();
  if (!v) return defaultValue;
  return v === "true" || v === "1" || v === "yes";
}

export function isLongTermPortfolioEnabled(): boolean {
  return envBool("LONG_TERM_PORTFOLIO_ENABLED", true);
}

function fmtNum(n: number | null, digits = 2): string {
  if (n == null || !Number.isFinite(n)) return "NO_DATA";
  return n.toFixed(digits);
}

/** Next calendar quarter start (UTC) for soft rebalance cadence. */
export function nextQuarterStartIso(from = new Date()): string {
  const y = from.getUTCFullYear();
  const m = from.getUTCMonth();
  const nextQ = Math.floor(m / 3) * 3 + 3;
  if (nextQ >= 12) return new Date(Date.UTC(y + 1, 0, 1)).toISOString();
  return new Date(Date.UTC(y, nextQ, 1)).toISOString();
}

export function annualDividendTotals(
  dividends: readonly YahooCorporateEvent[],
): Array<{ year: number; total: number }> {
  const byYear = new Map<number, number>();
  for (const d of dividends) {
    if (d.type !== "dividend" || d.amount == null || !Number.isFinite(d.amount)) continue;
    const year = new Date(d.date).getUTCFullYear();
    if (!Number.isFinite(year)) continue;
    byYear.set(year, (byYear.get(year) ?? 0) + d.amount);
  }
  return [...byYear.entries()]
    .map(([year, total]) => ({ year, total }))
    .sort((a, b) => a.year - b.year);
}

/** Count consecutive rising annual dividend years ending at the latest year with data. */
export function consecutiveRisingDividendYears(
  annual: readonly { year: number; total: number }[],
): number {
  if (annual.length < 2) return 0;
  let streak = 0;
  for (let i = annual.length - 1; i >= 1; i -= 1) {
    const cur = annual[i]!;
    const prev = annual[i - 1]!;
    if (cur.year !== prev.year + 1) break;
    if (cur.total > prev.total * 1.001) streak += 1;
    else break;
  }
  return streak;
}

export function passesValueScreen(f: YahooFundamentals): {
  passes: boolean;
  missingFields: string[];
} {
  const missing: string[] = [];
  if (f.trailingPE == null) missing.push("P/E");
  if (f.priceToBook == null) missing.push("P/B");
  if (f.returnOnEquity == null) missing.push("ROE");
  if (f.debtToEquity == null) missing.push("D/E");

  if (missing.length > 0) return { passes: false, missingFields: missing };

  const peOk = f.trailingPE! > 0 && f.trailingPE! < VALUE_SCREEN_CRITERIA.maxPE;
  const pbOk = f.priceToBook! > 0 && f.priceToBook! < VALUE_SCREEN_CRITERIA.maxPB;
  const roeOk = f.returnOnEquity! * 100 > VALUE_SCREEN_CRITERIA.minRoePct;
  const deOk = f.debtToEquity! >= 0 && f.debtToEquity! < VALUE_SCREEN_CRITERIA.maxDebtEquity;
  return { passes: peOk && pbOk && roeOk && deOk, missingFields: [] };
}

async function fetchUndervaluedSeed(): Promise<string[]> {
  try {
    const url =
      "https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?scrIds=undervalued_large_caps&count=80";
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (ForgeOS Long-Term Portfolio)" },
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      finance?: { result?: Array<{ quotes?: Array<{ symbol?: string }> }> };
    };
    return (data.finance?.result?.[0]?.quotes ?? [])
      .map((q) => String(q.symbol ?? "").trim().toUpperCase())
      .filter((s) => /^[A-Z][A-Z0-9]{0,5}$/.test(s));
  } catch {
    return [];
  }
}

type HeldPosition = { ticker: string; weightPct: number | null; marketValue: number | null };

async function loadHeldPositions(): Promise<HeldPosition[]> {
  try {
    const raw = await ibkrServiceFetch<
      Array<{
        symbol?: string;
        position?: number;
        marketValue?: number | null;
        secType?: string;
      }>
    >("/api/ibkr/positions");
    const rows = Array.isArray(raw) ? raw : [];
    const equity = rows.filter((r) => {
      const qty = Math.abs(Number(r.position ?? 0));
      const sec = String(r.secType ?? "STK").toUpperCase();
      return qty > 0 && (sec === "STK" || sec === "ETF" || sec === "");
    });
    const total = equity.reduce((s, r) => s + Math.abs(Number(r.marketValue ?? 0)), 0);
    return equity.map((r) => {
      const mv = Number(r.marketValue);
      const marketValue = Number.isFinite(mv) ? Math.abs(mv) : null;
      return {
        ticker: String(r.symbol ?? "").trim().toUpperCase(),
        marketValue,
        weightPct:
          total > 0 && marketValue != null ? (marketValue / total) * 100 : null,
      };
    }).filter((r) => Boolean(r.ticker));
  } catch {
    return [];
  }
}

function mapValueHit(f: YahooFundamentals): ValueScreenerHit {
  const { passes, missingFields } = passesValueScreen(f);
  const note = missingFields.length
    ? `NO_DATA — missing ${missingFields.join(", ")}`
    : passes
      ? "Passes value screen"
      : `Fails screen (P/E<${VALUE_SCREEN_CRITERIA.maxPE}, P/B<${VALUE_SCREEN_CRITERIA.maxPB}, ROE>${VALUE_SCREEN_CRITERIA.minRoePct}%, D/E<${VALUE_SCREEN_CRITERIA.maxDebtEquity})`;
  return {
    ticker: f.symbol,
    name: f.shortName ?? f.symbol,
    sector: f.sector ?? "NO_DATA",
    pe: f.trailingPE,
    pb: f.priceToBook,
    roePct: f.returnOnEquity != null ? f.returnOnEquity * 100 : null,
    debtEquity: f.debtToEquity,
    passes,
    missingFields,
    note,
  };
}

async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = [];
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i;
      i += 1;
      out[idx] = await fn(items[idx]!);
    }
  }
  const n = Math.min(limit, Math.max(1, items.length));
  await Promise.all(Array.from({ length: n }, () => worker()));
  return out;
}

function buildRebalanceSuggestions(input: {
  held: readonly HeldPosition[];
  valueHits: readonly ValueScreenerHit[];
  fundamentalsByTicker: Map<string, YahooFundamentals>;
}): RebalanceSuggestion[] {
  const passSet = new Set(input.valueHits.filter((h) => h.passes).map((h) => h.ticker));
  const heldTickers = input.held.map((h) => h.ticker).filter(Boolean);
  const sleeve = heldTickers.length
    ? heldTickers
    : [...passSet].slice(0, 8);
  if (sleeve.length === 0) return [];

  const target = 100 / sleeve.length;
  const suggestions: RebalanceSuggestion[] = [];

  for (const h of input.held) {
    const f = input.fundamentalsByTicker.get(h.ticker);
    const screen = f ? passesValueScreen(f) : { passes: false, missingFields: ["fundamentals"] };
    if (f && !screen.passes && screen.missingFields.length === 0) {
      suggestions.push({
        ticker: h.ticker,
        action: "ROTATE_OUT",
        currentWeightPct: h.weightPct,
        targetWeightPct: 0,
        rationale: `Fails long-term value screen — soft quarterly rotate suggestion (ANALYSIS_ONLY)`,
        soft: true,
      });
      continue;
    }
    if (h.weightPct == null) {
      suggestions.push({
        ticker: h.ticker,
        action: "HOLD",
        currentWeightPct: null,
        targetWeightPct: target,
        rationale: "NO_DATA — weight unavailable; hold pending measured NAV",
        soft: true,
      });
      continue;
    }
    if (h.weightPct > target * 1.25) {
      suggestions.push({
        ticker: h.ticker,
        action: "TRIM",
        currentWeightPct: h.weightPct,
        targetWeightPct: target,
        rationale: `Overweight vs equal-weight quarterly target ~${fmtNum(target, 1)}%`,
        soft: true,
      });
    } else if (h.weightPct < target * 0.75) {
      suggestions.push({
        ticker: h.ticker,
        action: "ADD",
        currentWeightPct: h.weightPct,
        targetWeightPct: target,
        rationale: `Underweight vs equal-weight quarterly target ~${fmtNum(target, 1)}%`,
        soft: true,
      });
    } else {
      suggestions.push({
        ticker: h.ticker,
        action: "HOLD",
        currentWeightPct: h.weightPct,
        targetWeightPct: target,
        rationale: "Within soft quarterly band (±25% of equal weight)",
        soft: true,
      });
    }
  }

  for (const hit of input.valueHits.filter((h) => h.passes).slice(0, 6)) {
    if (heldTickers.includes(hit.ticker)) continue;
    suggestions.push({
      ticker: hit.ticker,
      action: "CANDIDATE",
      currentWeightPct: 0,
      targetWeightPct: target,
      rationale: `Value screen candidate for long-term sleeve (${LONG_TERM_HORIZON_LABEL})`,
      soft: true,
    });
  }

  return suggestions.slice(0, 20);
}

async function collectCatalysts(
  tickers: readonly string[],
  fundamentalsByTicker: Map<string, YahooFundamentals>,
): Promise<CatalystAlert[]> {
  const alerts: CatalystAlert[] = [];
  const horizonMs = 120 * 24 * 60 * 60 * 1000; // ~4 months lookback for “recent”
  const now = Date.now();

  const eventResults = await mapWithConcurrency(tickers, 3, async (ticker) => {
    const [events, ratings] = await Promise.all([
      getYahooCorporateEvents(ticker, "5y"),
      getUpgradeDowngradeHistory(ticker),
    ]);
    return { ticker, events, ratings };
  });

  for (const { ticker, events, ratings } of eventResults) {
    if (events.status === "NO_DATA" && events.splits.length === 0) {
      // Keep silent for empty NO_DATA unless all modules missing — UI shows section note.
    } else {
      for (const split of events.splits) {
        const ts = Date.parse(split.date);
        if (!Number.isFinite(ts) || now - ts > horizonMs) continue;
        alerts.push({
          id: `split_${ticker}_${split.date}`,
          ticker,
          kind: "split",
          severity: "watch",
          title: `Stock split ${split.splitRatio ?? ""}`.trim(),
          detail: `Split event from Yahoo chart events`,
          date: split.date,
          status: "OK",
        });
      }
    }

    if (ratings.status === "NO_DATA") {
      // Defer generic NO_DATA to summary — avoid one row per ticker.
    } else {
      for (const item of ratings.items.slice(0, 3)) {
        const ts = Date.parse(item.date);
        if (item.date !== "NO_DATA" && Number.isFinite(ts) && now - ts > horizonMs) continue;
        const action = (item.action || "change").toLowerCase();
        alerts.push({
          id: `rating_${ticker}_${item.date}_${item.firm}`,
          ticker,
          kind: "rating_change",
          severity: action.includes("down") ? "watch" : "info",
          title: `${item.firm}: ${item.fromGrade || "—"} → ${item.toGrade || action}`,
          detail: `Yahoo upgradeDowngradeHistory · action=${item.action || "NO_DATA"}`,
          date: item.date === "NO_DATA" ? null : item.date,
          status: "OK",
        });
      }
    }

    const f = fundamentalsByTicker.get(ticker);
    if (f && !f.modulesMissing.includes("cashflowStatementHistory") && f.repurchaseOfStock != null && f.repurchaseOfStock < 0) {
      alerts.push({
        id: `buyback_${ticker}_${Math.abs(f.repurchaseOfStock)}`,
        ticker,
        kind: "buyback",
        severity: "watch",
        title: "Share repurchase (cashflow)",
        detail: `Latest cashflow repurchaseOfStock=${fmtNum(f.repurchaseOfStock, 0)} (Yahoo)`,
        date: null,
        status: "OK",
      });
    }
  }

  const ok = alerts.filter((a) => a.status === "OK");
  if (ok.length === 0) {
    return [
      {
        id: "catalysts_nodata",
        ticker: "—",
        kind: "rating_change",
        severity: "info",
        title: "Catalyst modules sparse",
        detail: "NO_DATA — splits / ratings / buybacks not present for scanned set",
        date: null,
        status: "NO_DATA",
      },
    ];
  }
  return ok.slice(0, 24);
}

/** Soft Telegram notify for high-signal catalysts (cooldown; never places orders). */
export async function emitLongTermCatalystAlerts(
  catalysts: readonly CatalystAlert[],
): Promise<number> {
  let sent = 0;
  for (const c of catalysts) {
    if (c.status !== "OK" || c.severity !== "watch") continue;
    if (c.kind !== "split" && c.kind !== "rating_change" && c.kind !== "buyback") continue;
    const key = `${c.kind}:${c.ticker}`;
    const last = catalystAlertCooldown.get(key) ?? 0;
    if (Date.now() - last < CATALYST_ALERT_COOLDOWN_MS) continue;
    catalystAlertCooldown.set(key, Date.now());
    try {
      await notifyAlertTriggered({
        alertId: `lt_${c.id}`,
        ticker: c.ticker,
        label: `Largo plazo · ${c.kind}`,
        reason: `${c.title} — ${c.detail}`,
      });
      sent += 1;
    } catch (err) {
      console.warn(
        "[LongTermPortfolio] catalyst notify:",
        err instanceof Error ? err.message : err,
      );
    }
  }
  return sent;
}

export function emptyLongTermPortfolioSnapshot(
  note: string,
  enabled = isLongTermPortfolioEnabled(),
): LongTermPortfolioSnapshot {
  return {
    generatedAt: new Date().toISOString(),
    mode: "ANALYSIS_ONLY",
    orderExecution: "disabled",
    enabled,
    horizon: LONG_TERM_HORIZON_LABEL,
    criteria: VALUE_SCREEN_CRITERIA,
    status: enabled ? "NO_DATA" : "DISABLED",
    note,
    nextQuarterlyRebalance: enabled ? nextQuarterStartIso() : null,
    scannedCount: 0,
    valueScreener: [],
    dividendGrowth: [],
    rebalanceSuggestions: [],
    catalysts: [],
  };
}

/**
 * Build Cartera Largo Plazo snapshot — value screen, dividend growth,
 * soft quarterly rebalance, catalyst list. ANALYSIS_ONLY / no orders.
 */
export async function getLongTermPortfolioSnapshot(options?: {
  /** When true, soft-notify Telegram for watch catalysts (cooldown). */
  emitAlerts?: boolean;
}): Promise<LongTermPortfolioSnapshot> {
  if (!isLongTermPortfolioEnabled()) {
    return emptyLongTermPortfolioSnapshot(
      "LONG_TERM_PORTFOLIO_ENABLED=false — section disabled",
      false,
    );
  }
  if (!isYahooFinanceEnabled()) {
    return emptyLongTermPortfolioSnapshot(
      "NO_DATA — Yahoo Finance disabled (USE_YAHOO_FINANCE=false)",
    );
  }

  const held = await loadHeldPositions();
  const undervalued = await fetchUndervaluedSeed();
  const universe = [
    ...new Set([
      ...held.map((h) => h.ticker),
      ...undervalued,
      ...DEFAULT_SEED,
    ]),
  ]
    .filter(Boolean)
    .slice(0, MAX_FUNDAMENTAL_SCAN);

  const fundamentalsList = (
    await mapWithConcurrency(universe, 4, (t) => getYahooFundamentals(t))
  ).filter((f): f is YahooFundamentals => f != null);

  const fundamentalsByTicker = new Map(fundamentalsList.map((f) => [f.symbol, f]));
  const valueScreener = fundamentalsList
    .map(mapValueHit)
    .sort((a, b) => Number(b.passes) - Number(a.passes) || a.ticker.localeCompare(b.ticker));

  const passers = valueScreener.filter((h) => h.passes).map((h) => h.ticker);
  const dividendFocus = [
    ...new Set([...held.map((h) => h.ticker), ...passers, ...DEFAULT_SEED.slice(0, 12)]),
  ].slice(0, MAX_EVENT_SCAN);

  const dividendGrowth: DividendGrowthRow[] = await mapWithConcurrency(
    dividendFocus,
    3,
    async (ticker) => {
      const f = fundamentalsByTicker.get(ticker);
      const events = await getYahooCorporateEvents(ticker, "10y");
      if (events.status === "NO_DATA" || events.dividends.length === 0) {
        return {
          ticker,
          name: f?.shortName ?? ticker,
          risingYears: null,
          qualifies: false,
          latestAnnualDividend: null,
          status: "NO_DATA" as const,
          note: events.detail || "NO_DATA — dividend events missing",
        };
      }
      const annual = annualDividendTotals(events.dividends);
      const risingYears = consecutiveRisingDividendYears(annual);
      const qualifies = risingYears >= VALUE_SCREEN_CRITERIA.minDividendRisingYears;
      return {
        ticker,
        name: f?.shortName ?? ticker,
        risingYears,
        qualifies,
        latestAnnualDividend: annual.at(-1)?.total ?? null,
        status: "OK" as const,
        note: qualifies
          ? `${risingYears} consecutive rising dividend years`
          : `Rising streak ${risingYears}y (need ≥${VALUE_SCREEN_CRITERIA.minDividendRisingYears})`,
      };
    },
  );
  dividendGrowth.sort(
    (a, b) => Number(b.qualifies) - Number(a.qualifies) || (b.risingYears ?? 0) - (a.risingYears ?? 0),
  );

  const catalystTickers = [
    ...new Set([...held.map((h) => h.ticker), ...passers.slice(0, 8)]),
  ].slice(0, 12);
  const catalysts = await collectCatalysts(catalystTickers, fundamentalsByTicker);

  const rebalanceSuggestions = buildRebalanceSuggestions({
    held,
    valueHits: valueScreener,
    fundamentalsByTicker,
  });

  if (options?.emitAlerts !== false) {
    void emitLongTermCatalystAlerts(catalysts).catch(() => undefined);
  }

  const hasAny =
    valueScreener.some((h) => h.passes) ||
    dividendGrowth.some((d) => d.status === "OK") ||
    catalysts.some((c) => c.status === "OK");
  const hasPartial =
    fundamentalsList.length > 0 ||
    dividendGrowth.some((d) => d.status === "NO_DATA") ||
    catalysts.some((c) => c.status === "NO_DATA");

  const status = hasAny ? "OK" : hasPartial ? "PARTIAL" : "NO_DATA";
  const note =
    status === "NO_DATA"
      ? "NO_DATA — Yahoo fundamentals/events unavailable for scanned universe"
      : `Scanned ${fundamentalsList.length}/${universe.length} · value hits ${passers.length} · horizon ${LONG_TERM_HORIZON_LABEL} · ANALYSIS_ONLY (no orders)`;

  return {
    generatedAt: new Date().toISOString(),
    mode: "ANALYSIS_ONLY",
    orderExecution: "disabled",
    enabled: true,
    horizon: LONG_TERM_HORIZON_LABEL,
    criteria: VALUE_SCREEN_CRITERIA,
    status,
    note,
    nextQuarterlyRebalance: nextQuarterStartIso(),
    scannedCount: fundamentalsList.length,
    valueScreener: valueScreener.filter((h) => h.passes || h.missingFields.length > 0).slice(0, 40),
    dividendGrowth: dividendGrowth.slice(0, 24),
    rebalanceSuggestions,
    catalysts,
  };
}
