/**
 * Orchestrates 22:00 daily close: premium Telegram text + PDF attachment.
 */

import "server-only";

import fs from "node:fs";
import path from "node:path";

import { getDailyPnlSummary, listTrades, type TradeRow } from "@/lib/db/database";
import {
  writeDailyClosePdf,
  type DailyCloseOpenLine,
  type DailyCloseTradeLine,
} from "@/lib/notifications/daily-close-pdf";
import { sendTelegramDocument, sendTelegramMessage } from "@/lib/notifications/telegram-bot";
import {
  computeRiskRewardLabel,
  formatDailyClosePremium,
  unicodeBar,
  usdToEur,
} from "@/lib/notifications/telegram-premium-format";
import { fetchTradingAccountSnapshot, fetchTradingPrice } from "@/lib/trading/ibkr-data";
import { ibkrServiceFetch } from "@/lib/ibkr/service-client";
import { loadOptimizerState } from "@/src/core/trading/portfolio-optimizer";

const MADRID_TZ = "Europe/Madrid";
const NAV_CACHE = path.resolve(process.cwd(), ".forgeos", "cache", "nav-intraday.json");

function madridDateKey(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: MADRID_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function madridDateLabel(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("es-ES", {
    timeZone: MADRID_TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(now);
  const pick = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${pick("day")}/${pick("month")}/${pick("year")}`;
}

function tradeMadridDay(ts: string): string {
  return madridDateKey(new Date(ts));
}

async function fetchOpenLines(): Promise<DailyCloseOpenLine[]> {
  const rows = await ibkrServiceFetch<
    Array<{ symbol?: string; position?: number; avgCost?: number; secType?: string }>
  >("/api/ibkr/positions").catch(() => []);
  const out: DailyCloseOpenLine[] = [];
  for (const row of rows ?? []) {
    const symbol = String(row.symbol ?? "").trim().toUpperCase();
    const shares = Math.abs(Number(row.position ?? 0));
    const avgCost = Number(row.avgCost ?? 0);
    if (!symbol || !(shares > 0)) continue;
    let price = avgCost;
    try {
      const q = await fetchTradingPrice(symbol);
      if (q.currentPrice > 0) price = q.currentPrice;
    } catch {
      /* keep avg */
    }
    const pnlUsd = (price - avgCost) * shares;
    const pnlPct = avgCost > 0 ? ((price - avgCost) / avgCost) * 100 : 0;
    out.push({ symbol, shares, avgCost, price, pnlUsd, pnlPct });
  }
  return out.sort((a, b) => b.pnlUsd - a.pnlUsd);
}

/** Persist lightweight NAV samples through the day for sparkline. */
export function recordNavSample(navUsd: number): void {
  if (!(navUsd > 0)) return;
  try {
    const today = madridDateKey();
    let store: { dateKey: string; samples: Array<{ at: string; nav: number }> } = {
      dateKey: today,
      samples: [],
    };
    if (fs.existsSync(NAV_CACHE)) {
      const raw = JSON.parse(fs.readFileSync(NAV_CACHE, "utf8")) as typeof store;
      if (raw?.dateKey === today && Array.isArray(raw.samples)) store = raw;
    }
    store.samples.push({ at: new Date().toISOString(), nav: navUsd });
    store.samples = store.samples.slice(-96);
    fs.mkdirSync(path.dirname(NAV_CACHE), { recursive: true });
    fs.writeFileSync(NAV_CACHE, JSON.stringify(store, null, 2), "utf8");
  } catch {
    /* ignore */
  }
}

function readNavSeries(fallbackNav: number): number[] {
  try {
    if (!fs.existsSync(NAV_CACHE)) {
      return fallbackNav > 0 ? [fallbackNav * 0.998, fallbackNav] : [];
    }
    const raw = JSON.parse(fs.readFileSync(NAV_CACHE, "utf8")) as {
      dateKey?: string;
      samples?: Array<{ nav: number }>;
    };
    if (raw.dateKey !== madridDateKey() || !Array.isArray(raw.samples)) {
      return fallbackNav > 0 ? [fallbackNav * 0.998, fallbackNav] : [];
    }
    const series = raw.samples.map((s) => Number(s.nav)).filter((n) => n > 0);
    if (series.length >= 2) return series;
    return fallbackNav > 0 ? [fallbackNav * 0.998, fallbackNav] : series;
  } catch {
    return fallbackNav > 0 ? [fallbackNav * 0.998, fallbackNav] : [];
  }
}

export async function generateAndSendDailyCloseReport(): Promise<{
  pdfPath: string | null;
  telegramTextSent: boolean;
  pdfSent: boolean;
}> {
  const dateKey = madridDateKey();
  const dateLabel = madridDateLabel();
  const account = await fetchTradingAccountSnapshot().catch(() => null);
  const navUsd = account?.combinedNav ?? account?.navUSD ?? 0;
  recordNavSample(navUsd);

  const summary = getDailyPnlSummary(dateKey);
  const allTrades = listTrades(500);
  const dayTrades = allTrades.filter((t) => tradeMadridDay(t.timestamp) === dateKey);
  const sells = dayTrades.filter((t) => t.side.toUpperCase() === "SELL");
  const tradeLines: DailyCloseTradeLine[] = dayTrades.map((t: TradeRow) => ({
    symbol: t.symbol,
    side: t.side,
    qty: t.qty,
    price: t.price,
    pnl: t.pnl,
    kind: t.kind,
    timestamp: t.timestamp,
  }));

  let closedForStats = sells;
  if (closedForStats.length === 0) {
    const outcomes = loadOptimizerState().closedOutcomes.filter((o) =>
      (o.closedAt ?? "").startsWith(dateKey),
    );
    closedForStats = outcomes.map((o, i) => ({
      id: i,
      symbol: o.ticker,
      side: "SELL",
      qty: 0,
      price: 0,
      pnl: o.pnlUSD ?? 0,
      timestamp: o.closedAt ?? dateKey,
      account: null,
      kind: o.kind ?? null,
    }));
  }

  const wins = closedForStats.filter((t) => t.pnl > 0);
  const losses = closedForStats.filter((t) => t.pnl < 0);
  const winPnls = wins.map((t) => t.pnl);
  const lossPnls = losses.map((t) => t.pnl);
  const dailyPnl =
    closedForStats.length > 0
      ? closedForStats.reduce((s, t) => s + t.pnl, 0)
      : summary.totalPnl;
  const winRate =
    closedForStats.length > 0
      ? (wins.length / closedForStats.length) * 100
      : summary.winRate * (summary.winRate <= 1 ? 100 : 1);
  const riskReward = computeRiskRewardLabel(winPnls, lossPnls);
  const best =
    closedForStats.length > 0
      ? [...closedForStats].sort((a, b) => b.pnl - a.pnl)[0]!
      : null;
  const worst =
    closedForStats.length > 0
      ? [...closedForStats].sort((a, b) => a.pnl - b.pnl)[0]!
      : null;
  const opens = await fetchOpenLines();
  const dailyPnlPct = navUsd > 0 ? (dailyPnl / navUsd) * 100 : 0;
  const navSeries = readNavSeries(navUsd);
  const tradePnls = closedForStats.map((t) => t.pnl);

  const toLine = (t: {
    symbol: string;
    side: string;
    qty: number;
    price: number;
    pnl: number;
    kind: string | null;
    timestamp: string;
  }): DailyCloseTradeLine => ({
    symbol: t.symbol,
    side: t.side,
    qty: t.qty,
    price: t.price,
    pnl: t.pnl,
    kind: t.kind,
    timestamp: t.timestamp,
  });

  let pdfPath: string | null = null;
  let buffer: Buffer | null = null;
  try {
    const written = writeDailyClosePdf({
      dateKey,
      dateLabel,
      generatedAtIso: new Date().toISOString(),
      dailyPnl,
      dailyPnlPct,
      navUsd,
      trades: tradeLines.length > 0 ? tradeLines : closedForStats.map(toLine),
      opens,
      winRate,
      riskReward,
      best: best ? toLine(best) : null,
      worst: worst ? toLine(worst) : null,
      navSeries,
      tradePnls,
    });
    pdfPath = written.absolutePath;
    buffer = written.buffer;
  } catch (err) {
    console.warn("[DailyClose] PDF failed:", err instanceof Error ? err.message : err);
  }

  const text = formatDailyClosePremium({
    dateLabel,
    dailyPnlUsd: dailyPnl,
    dailyPnlPct,
    ops: closedForStats.length,
    wins: wins.length,
    losses: losses.length,
    winRate,
    riskReward,
    best: best ? { ticker: best.symbol, pnlUSD: best.pnl, pnlPct: 0, kind: "TP" } : null,
    worst: worst ? { ticker: worst.symbol, pnlUSD: worst.pnl, pnlPct: 0, kind: "SL" } : null,
    open: opens.map((o) => ({
      ticker: o.symbol,
      shares: o.shares,
      price: o.price,
      pnlPct: o.pnlPct,
      sl: o.avgCost * 0.97,
      tp: o.avgCost * 1.05,
    })),
    navEur: usdToEur(navUsd),
    navBar: unicodeBar(Math.min(100, Math.max(0, 50 + dailyPnlPct * 10)), 10),
    winBar: unicodeBar(winRate, 10),
  });

  await sendTelegramMessage(text, undefined, { plain: true });

  let pdfSent = false;
  if (buffer) {
    const mid = await sendTelegramDocument({
      buffer,
      filename: `${dateKey}.pdf`,
      caption: `ForgeOS daily report ${dateLabel}`,
      mimeType: "application/pdf",
    });
    pdfSent = mid != null;
  }

  console.log(
    `[DailyClose] date=${dateKey} pdf=${pdfPath ?? "n/a"} telegram=ok pdfSent=${pdfSent}`,
  );
  return { pdfPath, telegramTextSent: true, pdfSent };
}
