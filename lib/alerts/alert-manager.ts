import "server-only";

import { getFullMarketAnalysis } from "@/lib/market-data/full-analysis";
import { scanInstitutionalSignals } from "@/lib/market-data/institutional-scanner";
import { getMultiScannerSnapshot } from "@/lib/market-data/market-scanner";
import {
  computeRsi,
  getBatchPrices,
  getDailyBars,
} from "@/lib/market-data/yahoo-finance";
import { notifyAlertTriggered } from "@/lib/notifications/telegram-bot";
import { getUsMarketSession } from "@/src/core/trading/market-session";
import {
  loadAlertsState,
  updateAlertsState,
  type AlertRule,
  type AlertsState,
  type WatchlistEntry,
} from "@/lib/alerts/alert-store";

export type AlertTriggerContext = {
  price?: number;
  rsi?: number | null;
  patternName?: string;
  relativeVolume?: number;
  gapPct?: number;
  score?: number;
  insiderBuy?: boolean;
};

export type AlertEvaluationResult = {
  alertId: string;
  ticker: string;
  label: string;
  triggered: boolean;
  reason?: string;
  context?: AlertTriggerContext;
};

const COOLDOWN_MS = 15 * 60 * 1000;

function newId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function canTrigger(alert: AlertRule): boolean {
  if (!alert.enabled) return false;
  if (!alert.lastTriggeredAt) return true;
  return Date.now() - new Date(alert.lastTriggeredAt).getTime() >= COOLDOWN_MS;
}

function markTriggered(alertId: string): void {
  updateAlertsState((state) => ({
    ...state,
    alerts: state.alerts.map((a) =>
      a.id === alertId
        ? {
            ...a,
            lastTriggeredAt: new Date().toISOString(),
            triggerCount: a.triggerCount + 1,
          }
        : a,
    ),
  }));
}

async function evaluateRule(alert: AlertRule): Promise<AlertEvaluationResult> {
  const base = { alertId: alert.id, ticker: alert.ticker, label: alert.label, triggered: false };
  if (!canTrigger(alert)) return base;

  const ticker = alert.ticker.toUpperCase();

  try {
    switch (alert.type) {
      case "price": {
        const quotes = await getBatchPrices([ticker]);
        const q = quotes.get(ticker);
        if (!q) return base;
        const threshold = alert.params.value ?? 0;
        const hit =
          alert.params.operator === "below"
            ? q.price < threshold
            : alert.params.operator === "above"
              ? q.price > threshold
              : false;
        if (!hit) return base;
        return {
          ...base,
          triggered: true,
          reason: `Precio ${alert.params.operator === "below" ? "bajo" : "sobre"} $${threshold}`,
          context: { price: q.price },
        };
      }
      case "indicator": {
        if (alert.params.indicator !== "rsi") return base;
        const bars = await getDailyBars(ticker);
        const rsi = computeRsi(bars.map((b) => b.close));
        if (rsi == null) return base;
        const threshold = alert.params.value ?? 30;
        const hit =
          alert.params.operator === "below"
            ? rsi < threshold
            : alert.params.operator === "above"
              ? rsi > threshold
              : false;
        if (!hit) return base;
        return {
          ...base,
          triggered: true,
          reason: `RSI ${rsi.toFixed(0)} ${alert.params.operator} ${threshold}`,
          context: { rsi },
        };
      }
      case "volume": {
        const quotes = await getBatchPrices([ticker]);
        const q = quotes.get(ticker);
        if (!q || q.avgVolume <= 0) return base;
        const rel = q.volume / q.avgVolume;
        const mult = alert.params.volumeMultiplier ?? 3;
        if (rel < mult) return base;
        return {
          ...base,
          triggered: true,
          reason: `Volumen ${rel.toFixed(1)}x media (>${mult}x)`,
          context: { relativeVolume: rel, price: q.price },
        };
      }
      case "gap": {
        const session = getUsMarketSession();
        if (session.phase !== "PRE_MARKET" && session.phase !== "REGULAR") return base;
        const quotes = await getBatchPrices([ticker]);
        const q = quotes.get(ticker);
        if (!q) return base;
        const minGap = alert.params.minGapPct ?? 3;
        if (Math.abs(q.changePct) < minGap) return base;
        return {
          ...base,
          triggered: true,
          reason: `Gap apertura ${q.changePct.toFixed(1)}%`,
          context: { gapPct: q.changePct, price: q.price },
        };
      }
      case "pattern": {
        const analysis = await getFullMarketAnalysis(ticker);
        const want = (alert.params.patternName ?? "").toLowerCase();
        const patterns = [...analysis.patterns.candlesticks, ...analysis.patterns.price];
        const hit = patterns.find((p) => p.name.toLowerCase().includes(want));
        if (!hit) return base;
        const price = analysis.bars.at(-1)?.close ?? 0;
        return {
          ...base,
          triggered: true,
          reason: `Patrón ${hit.name} detectado`,
          context: {
            patternName: hit.name,
            rsi: analysis.technicals.momentum.rsi,
            price,
          },
        };
      }
      case "score": {
        const snap = getMultiScannerSnapshot();
        const min = alert.params.minScore ?? 70;
        const hit = snap?.opportunities.find(
          (o) =>
            o.ticker === ticker ||
            (alert.ticker === "*" && o.score >= min),
        );
        if (!hit || hit.score < min) {
          if (alert.ticker !== "*") return base;
          const any = snap?.opportunities.find((o) => o.score >= min);
          if (!any) return base;
          return {
            ...base,
            ticker: any.ticker,
            triggered: true,
            reason: `Score scanner ${any.score} ≥ ${min}`,
            context: { score: any.score },
          };
        }
        return {
          ...base,
          triggered: true,
          reason: `Score ${hit.score} ≥ ${min}`,
          context: { score: hit.score, price: hit.entry },
        };
      }
      case "insider": {
        const inst = await scanInstitutionalSignals(ticker);
        if (!inst.insiderBuyToday) return base;
        return {
          ...base,
          triggered: true,
          reason: "Compra insider hoy (Form 4)",
          context: { insiderBuy: true },
        };
      }
      default:
        return base;
    }
  } catch (err) {
    console.warn(
      `[AlertManager] ${alert.id}:`,
      err instanceof Error ? err.message : err,
    );
    return base;
  }
}

/** Evalúa todas las alertas + condiciones de watchlist IA. */
export async function evaluateAllAlerts(): Promise<AlertEvaluationResult[]> {
  const state = loadAlertsState();
  const results: AlertEvaluationResult[] = [];

  for (const alert of state.alerts) {
    const result = await evaluateRule(alert);
    if (result.triggered) {
      results.push(result);
      markTriggered(alert.id);
      void notifyAlertTriggered({
        alertId: alert.id,
        ticker: result.ticker,
        label: result.label,
        reason: result.reason ?? alert.label,
        price: result.context?.price,
        rsi: result.context?.rsi,
        patternName: result.context?.patternName,
      }).catch((err) => console.warn("[AlertManager] Telegram:", err));
    }
  }

  for (const entry of state.watchlist) {
    const synthetic = await evaluateWatchlistEntry(entry);
    if (synthetic) {
      results.push(synthetic);
      void notifyAlertTriggered({
        alertId: `watch_${entry.ticker}`,
        ticker: entry.ticker,
        label: `Watchlist IA — ${entry.ticker}`,
        reason: synthetic.reason ?? "Condición watchlist",
        price: synthetic.context?.price,
        rsi: synthetic.context?.rsi,
        patternName: synthetic.context?.patternName,
        isWatchlist: true,
      }).catch((err) => console.warn("[AlertManager] Watchlist Telegram:", err));
    }
  }

  console.log(`[AlertManager] Evaluadas ${state.alerts.length} alertas — ${results.length} disparadas`);
  return results;
}

const watchCooldown = new Map<string, number>();

async function evaluateWatchlistEntry(entry: WatchlistEntry): Promise<AlertEvaluationResult | null> {
  const key = entry.ticker;
  const last = watchCooldown.get(key) ?? 0;
  if (Date.now() - last < COOLDOWN_MS) return null;

  try {
    const analysis = await getFullMarketAnalysis(entry.ticker);
    const rsi = analysis.technicals.momentum.rsi;
    const price = analysis.bars.at(-1)?.close;
    const relVol = analysis.technicals.volume.relativeVolume;
    const topPattern =
      analysis.patterns.candlesticks[0]?.name ?? analysis.patterns.price[0]?.name;

    const interesting =
      (rsi != null && (rsi < 32 || rsi > 68)) ||
      (relVol != null && relVol >= 2) ||
      (topPattern && analysis.patterns.candlesticks[0]?.confidence >= 75);

    if (!interesting) return null;

    watchCooldown.set(key, Date.now());
    return {
      alertId: `watch_${entry.ticker}`,
      ticker: entry.ticker,
      label: entry.note ?? `Watchlist ${entry.ticker}`,
      triggered: true,
      reason:
        rsi != null && rsi < 32
          ? `RSI sobreventa ${rsi.toFixed(0)}`
          : rsi != null && rsi > 68
            ? `RSI sobrecompra ${rsi.toFixed(0)}`
            : relVol != null && relVol >= 2
              ? `Volumen ${relVol.toFixed(1)}x`
              : `Patrón ${topPattern}`,
      context: { price, rsi, patternName: topPattern ?? undefined, relativeVolume: relVol ?? undefined },
    };
  } catch {
    return null;
  }
}

export function listAlertsSnapshot(): AlertsState {
  return loadAlertsState();
}

export function createAlert(input: Omit<AlertRule, "id" | "createdAt" | "triggerCount" | "enabled"> & { enabled?: boolean }): AlertRule {
  const rule: AlertRule = {
    ...input,
    id: newId("alert"),
    ticker: input.ticker.toUpperCase(),
    enabled: input.enabled ?? true,
    createdAt: new Date().toISOString(),
    triggerCount: 0,
  };
  updateAlertsState((s) => ({ ...s, alerts: [rule, ...s.alerts] }));
  return rule;
}

export function updateAlert(id: string, patch: Partial<Pick<AlertRule, "enabled" | "label" | "params">>): AlertRule | null {
  let updated: AlertRule | null = null;
  updateAlertsState((s) => ({
    ...s,
    alerts: s.alerts.map((a) => {
      if (a.id !== id) return a;
      updated = { ...a, ...patch, params: { ...a.params, ...patch.params } };
      return updated;
    }),
  }));
  return updated;
}

export function deleteAlert(id: string): boolean {
  let found = false;
  updateAlertsState((s) => {
    const next = s.alerts.filter((a) => {
      if (a.id === id) {
        found = true;
        return false;
      }
      return true;
    });
    return { ...s, alerts: next };
  });
  return found;
}

export function addWatchlistTicker(ticker: string, note?: string): WatchlistEntry {
  const entry: WatchlistEntry = {
    ticker: ticker.toUpperCase(),
    addedAt: new Date().toISOString(),
    note,
  };
  updateAlertsState((s) => ({
    ...s,
    watchlist: [entry, ...s.watchlist.filter((w) => w.ticker !== entry.ticker)],
  }));
  return entry;
}

export function removeWatchlistTicker(ticker: string): void {
  updateAlertsState((s) => ({
    ...s,
    watchlist: s.watchlist.filter((w) => w.ticker !== ticker.toUpperCase()),
  }));
}

export function queueTickerForCycle(ticker: string): void {
  const upper = ticker.toUpperCase();
  updateAlertsState((s) => ({
    ...s,
    cycleQueue: [...new Set([upper, ...s.cycleQueue])].slice(0, 60),
  }));
}

export function popCycleQueue(): string[] {
  let queue: string[] = [];
  updateAlertsState((s) => {
    queue = [...s.cycleQueue];
    return { ...s, cycleQueue: [] };
  });
  return queue;
}

export function disableAlertById(id: string): void {
  updateAlert(id, { enabled: false });
}

/** Plantillas de alerta rápidas para el dashboard. */
export const ALERT_TEMPLATES = [
  { type: "price" as const, label: "Precio bajo umbral", defaults: { operator: "below" as const, value: 120 } },
  { type: "indicator" as const, label: "RSI cruza 30", defaults: { indicator: "rsi" as const, operator: "below" as const, value: 30 } },
  { type: "pattern" as const, label: "Patrón Hammer", defaults: { patternName: "Hammer" } },
  { type: "volume" as const, label: "Volumen 3x media", defaults: { volumeMultiplier: 3 } },
  { type: "score" as const, label: "Score scanner ≥70", defaults: { minScore: 70 } },
  { type: "insider" as const, label: "Insider buy hoy", defaults: { minInsiderUsd: 1_000_000 } },
  { type: "gap" as const, label: "Gap apertura >3%", defaults: { minGapPct: 3 } },
];
