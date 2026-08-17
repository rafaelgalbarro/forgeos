/**
 * FOREX dashboard snapshot + Telegram-supervised cycle.
 * Never places/stages at IBKR from the cycle — founder must tap APROBAR.
 */

import "server-only";

import { ibkrServiceFetch } from "@/lib/ibkr/service-client";
import { getBatchPrices } from "@/lib/market-data/yahoo-finance";
import { sendTelegramMessage } from "@/lib/notifications/telegram-bot";
import {
  FOREX_PAIRS,
  FOREX_RISK_POLICY,
  buildSlTpFromPips,
  getForexSessionSnapshot,
  loadForexEnvConfig,
  priceToPips,
  type ForexIbkrContract,
} from "@/lib/investment/forex/config";
import { getInvestmentRuntimeFlags } from "@/lib/investment/runtime-flags";
import { readForexEnabledAtRuntime } from "@/lib/investment/forex/server-env";
import { computeForexIndicators, inferForexSignal, type ForexBar } from "@/lib/investment/forex/indicators";
import { getForexMacroSnapshot } from "@/lib/investment/forex/macro-calendar";

export type ForexQuoteRow = {
  pairId: string;
  display: string;
  bid: number | null;
  ask: number | null;
  mid: number | null;
  spreadPips: number | null;
  source: "IBKR" | "YAHOO" | "NO_DATA";
};

export type ForexPairAnalysis = {
  pairId: string;
  display: string;
  quote: ForexQuoteRow;
  indicators: ReturnType<typeof computeForexIndicators>;
  signal: ReturnType<typeof inferForexSignal>;
  levels: ReturnType<typeof buildSlTpFromPips> | null;
};

export type ForexDashboardSnapshot = {
  generatedAt: string;
  mode: "ANALYSIS_ONLY" | "STAGED" | "LIVE_GATED";
  forexEnabled: boolean;
  session: ReturnType<typeof getForexSessionSnapshot>;
  config: ReturnType<typeof loadForexEnvConfig>;
  quotes: ForexQuoteRow[];
  analyses: ForexPairAnalysis[];
  positions: unknown[];
  macro: Awaited<ReturnType<typeof getForexMacroSnapshot>>;
  pnl: { pips: number | null; eurEstimate: number | null; note: string };
  errors: string[];
};

function yahooSymbol(pair: ForexIbkrContract): string {
  return `${pair.pairId}=X`;
}

async function loadIbkrQuotes(): Promise<{ quotes: ForexQuoteRow[]; errors: string[] }> {
  const errors: string[] = [];
  try {
    const data = await ibkrServiceFetch<{
      quotes?: Array<{
        pairId: string;
        display?: string;
        bid?: number | null;
        ask?: number | null;
        mid?: number | null;
        spreadPips?: number | null;
      }>;
    }>("/api/forex/quotes");
    const quotes: ForexQuoteRow[] = (data.quotes ?? []).map((q) => ({
      pairId: q.pairId,
      display: q.display ?? q.pairId,
      bid: typeof q.bid === "number" ? q.bid : null,
      ask: typeof q.ask === "number" ? q.ask : null,
      mid: typeof q.mid === "number" ? q.mid : null,
      spreadPips: typeof q.spreadPips === "number" ? q.spreadPips : null,
      source: q.bid != null && q.ask != null ? "IBKR" : "NO_DATA",
    }));
    return { quotes, errors };
  } catch (err) {
    errors.push(err instanceof Error ? err.message : "IBKR quotes failed");
    return { quotes: [], errors };
  }
}

async function yahooFallbackQuotes(): Promise<ForexQuoteRow[]> {
  const map = await getBatchPrices(FOREX_PAIRS.map((p) => yahooSymbol(p))).catch(() => new Map());
  return FOREX_PAIRS.map((p) => {
    const q = map.get(yahooSymbol(p));
    if (!q || !Number.isFinite(q.price)) {
      return {
        pairId: p.pairId,
        display: p.display,
        bid: null,
        ask: null,
        mid: null,
        spreadPips: null,
        source: "NO_DATA" as const,
      };
    }
    const mid = q.price;
    const half = p.jpyQuoted ? 0.005 : 0.00005;
    return {
      pairId: p.pairId,
      display: p.display,
      bid: mid - half,
      ask: mid + half,
      mid,
      spreadPips: priceToPips(p, mid - half, mid + half),
      source: "YAHOO" as const,
    };
  });
}

async function loadHistoryBars(pairId: string): Promise<ForexBar[]> {
  try {
    const data = await ibkrServiceFetch<{
      bars?: Array<{ open?: number; high?: number; low?: number; close?: number; date?: string }>;
    }>(`/api/forex/history?pair=${encodeURIComponent(pairId)}&duration=${encodeURIComponent("5 D")}&barSize=${encodeURIComponent("5 mins")}`);
    return (data.bars ?? [])
      .map((b) => ({
        date: b.date,
        open: Number(b.open),
        high: Number(b.high),
        low: Number(b.low),
        close: Number(b.close),
      }))
      .filter((b) => [b.open, b.high, b.low, b.close].every((n) => Number.isFinite(n)));
  } catch {
    return [];
  }
}

export async function buildForexDashboardSnapshot(): Promise<ForexDashboardSnapshot> {
  const config = loadForexEnvConfig();
  const enabled =
    readForexEnabledAtRuntime() || config.enabled || getInvestmentRuntimeFlags().forexEnabled;
  const session = getForexSessionSnapshot();
  const macro = await getForexMacroSnapshot();
  const errors: string[] = [];

  let { quotes, errors: qErr } = await loadIbkrQuotes();
  errors.push(...qErr);
  if (quotes.every((q) => q.mid == null)) {
    quotes = await yahooFallbackQuotes();
  } else {
    const missing = FOREX_PAIRS.filter((p) => !quotes.some((q) => q.pairId === p.pairId && q.mid != null));
    if (missing.length) {
      const yahoo = await yahooFallbackQuotes();
      for (const m of missing) {
        const y = yahoo.find((q) => q.pairId === m.pairId);
        if (y) quotes.push(y);
      }
    }
  }

  const analyses: ForexPairAnalysis[] = [];
  for (const pair of FOREX_PAIRS) {
    const quote =
      quotes.find((q) => q.pairId === pair.pairId) ??
      ({
        pairId: pair.pairId,
        display: pair.display,
        bid: null,
        ask: null,
        mid: null,
        spreadPips: null,
        source: "NO_DATA" as const,
      });
    const bars = await loadHistoryBars(pair.pairId);
    const indicators = computeForexIndicators(bars);
    const signal = inferForexSignal(indicators);
    const entry = quote.mid;
    const levels =
      entry != null && (signal.side === "BUY" || signal.side === "SELL")
        ? buildSlTpFromPips({
            pair,
            side: signal.side,
            entry,
            stopPips: config.stopPips,
            tpPips: config.tpPips,
          })
        : null;
    analyses.push({ pairId: pair.pairId, display: pair.display, quote, indicators, signal, levels });
  }

  let positions: unknown[] = [];
  try {
    const data = await ibkrServiceFetch<{ positions?: unknown[] }>("/api/forex/positions");
    positions = data.positions ?? [];
  } catch (err) {
    errors.push(err instanceof Error ? err.message : "positions failed");
  }

  return {
    generatedAt: new Date().toISOString(),
    mode: enabled ? "LIVE_GATED" : "ANALYSIS_ONLY",
    forexEnabled: enabled,
    session,
    config: { ...config, enabled },
    quotes,
    analyses,
    positions,
    macro,
    pnl: {
      pips: null,
      eurEstimate: null,
      note: "P&L FOREX agregado requiere fills IDEALPRO — NO_DATA hasta historial de trades FX",
    },
    errors,
  };
}

export type ForexCycleResult = {
  ranAt: string;
  skipped: boolean;
  reason?: string;
  actionable: Array<{
    pairId: string;
    side: "BUY" | "SELL";
    confidence: number;
    staged: boolean;
    pendingTelegram: boolean;
    approvalId?: string;
    orderId?: number;
  }>;
  errors: string[];
};

/** Cycle never transmits — Telegram approve is the only live path. */
export async function runForexCycle(opts?: {
  transmit?: boolean;
  staged?: boolean;
}): Promise<ForexCycleResult> {
  const config = loadForexEnvConfig();
  const flags = getInvestmentRuntimeFlags();
  const forexEnabled = flags.forexEnabled || config.enabled;
  const staged = forexEnabled ? false : opts?.staged !== false;
  const session = getForexSessionSnapshot();
  const macro = await getForexMacroSnapshot();
  const errors: string[] = [];
  const actionable: ForexCycleResult["actionable"] = [];

  if (!session.tradingWindowActive) {
    return {
      ranAt: new Date().toISOString(),
      skipped: true,
      reason: "Fuera de horario 07:00–22:00 Madrid — solo análisis",
      actionable,
      errors,
    };
  }
  if (macro.blackoutActive) {
    return {
      ranAt: new Date().toISOString(),
      skipped: true,
      reason: "Blackout noticias HIGH (±30m)",
      actionable,
      errors,
    };
  }

  const { scanForexStrategySignals } = await import("@/lib/investment/forex/signal-scanner");
  const { assessForexRisk } = await import("@/lib/investment/forex/risk-engine");
  const { notifyForexSignal } = await import("@/lib/investment/forex/telegram");
  const { enqueueForexApproval } = await import("@/lib/investment/forex/approval");
  const { canOpenForexTrade } = await import(
    "@/lib/investment/forex/goals"
  );
  const { isStrategyWindowActive } = await import("@/lib/investment/forex/strategies/defs");

  const scan = await scanForexStrategySignals();
  const weekend = session.label.toLowerCase().includes("fin de semana");

  let nav = 0;
  let cash = 0;
  try {
    const { fetchTradingAccountSnapshot } = await import("@/lib/trading/ibkr-data");
    const acct = await fetchTradingAccountSnapshot();
    nav = Number.isFinite(acct.navUSD) ? acct.navUSD : 0;
    cash = Number.isFinite(acct.tradingCashUSD) ? acct.tradingCashUSD : acct.cashUSD;
  } catch {
    /* no invented cash/NAV */
  }

  for (const sig of scan.signals) {
    if (!sig.canExecute) continue;
    const gate = canOpenForexTrade(sig.style);
    if (!gate.ok) {
      errors.push(`${sig.pairId}: ${gate.reason}`);
      continue;
    }
    const pair = FOREX_PAIRS.find((p) => p.pairId === sig.pairId);
    if (!pair) continue;
    const strategyWindow = isStrategyWindowActive(sig.style, session.madridMinutes, weekend);
    const risk = assessForexRisk({
      signal: sig,
      pair,
      nav,
      cash,
      openPairCount: actionable.length,
      blackoutActive: false,
      tradingWindowActive: true,
      strategyWindowActive: strategyWindow,
    });
    if (!risk.allowed || !risk.units) {
      errors.push(`${sig.pairId}: ${risk.reason}`);
      continue;
    }

    const pending = enqueueForexApproval({ signal: sig, units: risk.units });
    await notifyForexSignal({
      signal: sig,
      backtest: sig.backtest,
      units: risk.units,
      requireConfirm: true,
      approvalId: pending.approvalId,
    });
    actionable.push({
      pairId: sig.pairId,
      side: sig.side,
      confidence: sig.confidence,
      staged,
      pendingTelegram: true,
      approvalId: pending.approvalId,
    });

    if (actionable.length >= Math.min(config.maxPositions, FOREX_RISK_POLICY.maxConcurrentPairs)) break;
  }

  return {
    ranAt: new Date().toISOString(),
    skipped: false,
    actionable,
    errors,
  };
}

export async function sendForexEuropeOpenReport(): Promise<boolean> {
  const snap = await buildForexDashboardSnapshot();
  const top = [...snap.analyses]
    .filter((a) => a.signal.side !== "HOLD")
    .sort((a, b) => b.signal.confidence - a.signal.confidence)
    .slice(0, 3);
  const lines = [
    "FOREX — Apertura Europa (08:00 Madrid)",
    snap.session.label,
    "",
    ...top.map(
      (t) =>
        `${t.signal.side} ${t.pairId} conf ${(t.signal.confidence * 100).toFixed(0)}% · mid ${t.quote.mid?.toFixed(5) ?? "NO_DATA"}`,
    ),
    top.length === 0 ? "Sin señales accionables ahora." : "",
    "",
    "Niveles: SL<=20p · TP>=40p · IDEALPRO CASH",
  ];
  const id = await sendTelegramMessage(lines.filter(Boolean).join("\n"));
  return id != null;
}

export async function sendForexSessionCloseReport(): Promise<boolean> {
  const snap = await buildForexDashboardSnapshot();
  const lines = [
    "FOREX — Cierre sesion 22:00 Madrid",
    `Pares cubiertos: ${snap.quotes.length}`,
    `Posiciones CASH abiertas: ${snap.positions.length}`,
    snap.pnl.note,
    snap.macro.blackoutActive ? "Blackout macro activo" : "Macro: sin blackout HIGH",
  ];
  const id = await sendTelegramMessage(lines.join("\n"));
  return id != null;
}
