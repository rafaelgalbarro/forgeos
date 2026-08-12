import "server-only";

import fs from "node:fs";
import path from "node:path";

import { readMultiScannerResults } from "@/lib/market-data/scanner-store";
import { getBatchPrices, getDailyBars, getTickerInfo } from "@/lib/market-data/yahoo-finance";
import { sendTelegramMessage } from "@/lib/notifications/telegram-bot";
import { fetchTradingAccountSnapshot } from "@/lib/trading/ibkr-data";
import { loadTradingState } from "@/src/core/trading/trading-state-store";
import { maybeRetrainWeekly } from "@/lib/ml/signal-trainer";

const TZ = "Europe/Madrid";
const MARKERS_DIR = path.resolve(process.cwd(), ".forgeos", "reports");
const DAILY_MARKER = path.join(MARKERS_DIR, "telegram-daily-last.json");
const WEEKLY_MARKER = path.join(MARKERS_DIR, "telegram-weekly-last.json");
const LAST_PREVIEW = path.join(MARKERS_DIR, "telegram-last-preview.json");

const NO_DATA = "NO_DATA";

export type TelegramReportKind = "daily" | "weekly";

export type TelegramReportResult = {
  kind: TelegramReportKind;
  text: string;
  sent: boolean;
  messageId: number | null;
  skippedReason?: string;
  generatedAt: string;
  mode: "ANALYSIS_ONLY";
};

export type TelegramReportsStatus = {
  mode: "ANALYSIS_ONLY";
  timezone: typeof TZ;
  notifyOnReport: boolean;
  dailyHour: number;
  weeklyHour: number;
  lastDaily: SentMarker | null;
  lastWeekly: SentMarker | null;
  lastPreview: TelegramReportResult | null;
  madridNow: MadridClock;
};

type SentMarker = {
  dateKey: string;
  sentAt: string;
  messageId: number | null;
  kind: TelegramReportKind;
};

type MadridClock = {
  dateKey: string;
  weekday: string;
  hour: number;
  minute: number;
  isMarketDay: boolean;
  isSunday: boolean;
};

function notifyOnReport(): boolean {
  return process.env.NOTIFY_ON_REPORT !== "false";
}

function dailyHour(): number {
  const n = Number(process.env.REPORT_DAILY_HOUR ?? 22);
  return Number.isFinite(n) && n >= 0 && n <= 23 ? Math.floor(n) : 22;
}

function weeklyHour(): number {
  const n = Number(process.env.REPORT_WEEKLY_HOUR ?? 20);
  return Number.isFinite(n) && n >= 0 && n <= 23 ? Math.floor(n) : 20;
}

function publicBaseUrl(): string {
  const raw = process.env.FORGEOS_PUBLIC_URL?.trim();
  if (raw) return raw.replace(/\/$/, "");
  return "http://localhost:3000";
}

export function getMadridClock(now = new Date()): MadridClock {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";

  const y = get("year");
  const m = get("month");
  const d = get("day");
  const weekday = (get("weekday") || "Mon").toLowerCase();
  const hour = Number(get("hour") || 0);
  const minute = Number(get("minute") || 0);
  const isSunday = weekday.startsWith("sun");
  const isSaturday = weekday.startsWith("sat");

  return {
    dateKey: `${y}-${m}-${d}`,
    weekday,
    hour: Number.isFinite(hour) ? hour : 0,
    minute: Number.isFinite(minute) ? minute : 0,
    isMarketDay: !isSaturday && !isSunday,
    isSunday,
  };
}

function ensureMarkersDir(): void {
  fs.mkdirSync(MARKERS_DIR, { recursive: true });
}

function readMarker(file: string): SentMarker | null {
  try {
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, "utf8")) as SentMarker;
  } catch {
    return null;
  }
}

function writeMarker(file: string, marker: SentMarker): void {
  ensureMarkersDir();
  fs.writeFileSync(file, JSON.stringify(marker, null, 2), "utf8");
}

function writePreview(result: TelegramReportResult): void {
  ensureMarkersDir();
  fs.writeFileSync(LAST_PREVIEW, JSON.stringify(result, null, 2), "utf8");
}

function readPreview(): TelegramReportResult | null {
  try {
    if (!fs.existsSync(LAST_PREVIEW)) return null;
    return JSON.parse(fs.readFileSync(LAST_PREVIEW, "utf8")) as TelegramReportResult;
  } catch {
    return null;
  }
}

function fmtMoney(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return NO_DATA;
  const abs = Math.abs(n).toFixed(2);
  return n < 0 ? `-$${abs}` : `$${abs}`;
}

function fmtSignedPct(n: number | null, digits = 1): string {
  if (n == null || !Number.isFinite(n)) return NO_DATA;
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(digits)}%`;
}

function fmtPctPlain(n: number | null, digits = 1): string {
  if (n == null || !Number.isFinite(n)) return NO_DATA;
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(digits)}%`;
}

async function safeAccount(): Promise<{
  navUSD: number | null;
  dailyPnlUSD: number | null;
  dailyPnlPct: number | null;
  openPositionsCount: number;
  available: boolean;
}> {
  try {
    const acct = await fetchTradingAccountSnapshot();
    const nav = Number.isFinite(acct.navUSD) ? acct.navUSD : null;
    const pnl = Number.isFinite(acct.dailyPnlUSD) ? acct.dailyPnlUSD : null;
    let dailyPnlPct: number | null = null;
    if (nav != null && pnl != null && nav - pnl !== 0) {
      dailyPnlPct = (pnl / (nav - pnl)) * 100;
    }
    return {
      navUSD: nav,
      dailyPnlUSD: pnl,
      dailyPnlPct,
      openPositionsCount: acct.openPositionsCount,
      available: nav != null && nav > 0,
    };
  } catch {
    return {
      navUSD: null,
      dailyPnlUSD: null,
      dailyPnlPct: null,
      openPositionsCount: 0,
      available: false,
    };
  }
}

async function spyQqqChanges(): Promise<{
  spyToday: number | null;
  qqqToday: number | null;
  spyYtd: number | null;
  qqqYtd: number | null;
  spyWeek: number | null;
  qqqWeek: number | null;
}> {
  const [quotes, spyBars, qqqBars] = await Promise.all([
    getBatchPrices(["SPY", "QQQ"]),
    getDailyBars("SPY", "ytd"),
    getDailyBars("QQQ", "ytd"),
  ]);

  const ytdFromBars = (bars: Array<{ close: number }>): number | null => {
    if (bars.length < 2) return null;
    const first = bars[0]!.close;
    const last = bars[bars.length - 1]!.close;
    if (!first || !Number.isFinite(first) || !Number.isFinite(last)) return null;
    return ((last - first) / first) * 100;
  };

  const weekFromBars = (bars: Array<{ close: number }>): number | null => {
    if (bars.length < 2) return null;
    const last = bars[bars.length - 1]!.close;
    const prev = bars[Math.max(0, bars.length - 6)]!.close;
    if (!prev || !Number.isFinite(prev) || !Number.isFinite(last)) return null;
    return ((last - prev) / prev) * 100;
  };

  return {
    spyToday: quotes.get("SPY")?.changePct ?? null,
    qqqToday: quotes.get("QQQ")?.changePct ?? null,
    spyYtd: ytdFromBars(spyBars),
    qqqYtd: ytdFromBars(qqqBars),
    spyWeek: weekFromBars(spyBars),
    qqqWeek: weekFromBars(qqqBars),
  };
}

type SignalMove = { ticker: string; changePct: number; score: number };

function scannerSignalMoves(): {
  analyzed: number;
  best: SignalMove | null;
  worst: SignalMove | null;
  topCandidate: SignalMove | null;
  top5: SignalMove[];
} {
  const snap = readMultiScannerResults();
  if (!snap) {
    return { analyzed: 0, best: null, worst: null, topCandidate: null, top5: [] };
  }

  const byTicker = new Map<string, SignalMove>();
  for (const p of snap.phases ?? []) {
    const ticker = String(p.ticker ?? "").toUpperCase();
    if (!ticker) continue;
    const changePct =
      typeof p.changePct === "number" && Number.isFinite(p.changePct) ? p.changePct : null;
    const score = typeof p.score === "number" && Number.isFinite(p.score) ? p.score : 0;
    const prev = byTicker.get(ticker);
    if (!prev) {
      byTicker.set(ticker, {
        ticker,
        changePct: changePct ?? 0,
        score,
      });
    } else {
      byTicker.set(ticker, {
        ticker,
        changePct: changePct ?? prev.changePct,
        score: Math.max(prev.score, score),
      });
    }
  }

  for (const opp of snap.opportunities ?? []) {
    const ticker = String(opp.ticker ?? "").toUpperCase();
    if (!ticker) continue;
    const prev = byTicker.get(ticker);
    const score = typeof opp.score === "number" ? opp.score : 0;
    if (!prev) {
      byTicker.set(ticker, { ticker, changePct: 0, score });
    } else if (score > prev.score) {
      byTicker.set(ticker, { ...prev, score });
    }
  }

  const moves = [...byTicker.values()];
  const withChange = moves.filter((m) => Number.isFinite(m.changePct));
  const sortedByChange = [...withChange].sort((a, b) => b.changePct - a.changePct);
  const sortedByScore = [...moves].sort((a, b) => b.score - a.score);

  return {
    analyzed: snap.universeSize || snap.phase1Count || moves.length,
    best: sortedByChange[0] ?? null,
    worst: sortedByChange.length ? sortedByChange[sortedByChange.length - 1]! : null,
    topCandidate: sortedByScore[0] ?? null,
    top5: sortedByScore.slice(0, 5),
  };
}

async function sectorOpportunityCounts(tickers: string[]): Promise<Array<{ sector: string; count: number }>> {
  const counts = new Map<string, number>();
  const sample = tickers.slice(0, 12);
  await Promise.all(
    sample.map(async (t) => {
      try {
        const info = await getTickerInfo(t);
        const sector = info?.sector?.trim() || "UNKNOWN";
        counts.set(sector, (counts.get(sector) ?? 0) + 1);
      } catch {
        counts.set("UNKNOWN", (counts.get("UNKNOWN") ?? 0) + 1);
      }
    }),
  );
  return [...counts.entries()]
    .map(([sector, count]) => ({ sector, count }))
    .sort((a, b) => b.count - a.count);
}

function todayExecutedStats(): { executed: number; winners: number; losers: number } {
  const state = loadTradingState();
  const executedToday = state.pendingOrders.filter((o) => {
    if (o.status !== "EXECUTED") return false;
    try {
      const clock = getMadridClock(new Date(o.updatedAt || o.createdAt));
      return clock.dateKey === getMadridClock().dateKey;
    } catch {
      return false;
    }
  });

  // Without realized P&L ledger we do not invent winners/losers.
  const executed = executedToday.length || state.risk.dailyTradeCount || 0;
  return { executed, winners: 0, losers: 0 };
}

function reportButtons() {
  return [
    [
      { text: "📊 VER DASHBOARD", callback_data: "report_dashboard" },
      { text: "📈 VER PORTFOLIO", callback_data: "report_portfolio" },
    ],
  ];
}

export async function generateDailyTelegramReport(opts?: {
  send?: boolean;
  force?: boolean;
}): Promise<TelegramReportResult> {
  const send = opts?.send ?? false;
  const force = opts?.force ?? false;
  const clock = getMadridClock();
  const generatedAt = new Date().toISOString();

  if (send && !force) {
    const marker = readMarker(DAILY_MARKER);
    if (marker?.dateKey === clock.dateKey) {
      const result: TelegramReportResult = {
        kind: "daily",
        text: "",
        sent: false,
        messageId: marker.messageId,
        skippedReason: `already_sent_${clock.dateKey}`,
        generatedAt,
        mode: "ANALYSIS_ONLY",
      };
      return result;
    }
  }

  const [acct, bm, signals] = await Promise.all([
    safeAccount(),
    spyQqqChanges(),
    Promise.resolve(scannerSignalMoves()),
  ]);
  const trades = todayExecutedStats();

  const fecha = clock.dateKey;
  const navLine = acct.available
    ? `${fmtMoney(acct.navUSD)} (${fmtSignedPct(acct.dailyPnlPct)} vs ayer)`
    : `${NO_DATA} (${NO_DATA} vs ayer)`;
  const pnlLine = acct.available
    ? `${fmtMoney(acct.dailyPnlUSD)} (${fmtSignedPct(acct.dailyPnlPct)})`
    : `${NO_DATA} (${NO_DATA})`;

  const bestLine = signals.best
    ? `${signals.best.ticker} ${fmtSignedPct(signals.best.changePct)}`
    : NO_DATA;
  const worstLine = signals.worst
    ? `${signals.worst.ticker} ${fmtSignedPct(signals.worst.changePct)}`
    : NO_DATA;
  const topLine = signals.topCandidate
    ? `${signals.topCandidate.ticker} (score ${signals.topCandidate.score.toFixed(0)})`
    : NO_DATA;

  // ForgeOS YTD / vs-SPX requires historical NAV — never invent.
  const forgeToday = acct.dailyPnlPct;
  const forgeYtd: number | null = null;

  const winnersLabel =
    trades.executed > 0 && trades.winners + trades.losers === 0
      ? NO_DATA
      : String(trades.winners);
  const losersLabel =
    trades.executed > 0 && trades.winners + trades.losers === 0
      ? NO_DATA
      : String(trades.losers);

  const text = [
    "📊 <b>REPORTE DIARIO FORGEOS</b>",
    `Fecha: ${fecha}`,
    "─────────────────",
    `💰 NAV: ${navLine}`,
    `📈 P&amp;L hoy: ${pnlLine}`,
    `🎯 Operaciones: ${trades.executed} ejecutadas`,
    `✅ Ganadoras: ${winnersLabel} | ❌ Perdedoras: ${losersLabel}`,
    "─────────────────",
    `🏆 Mejor señal: ${bestLine}`,
    `💩 Peor señal: ${worstLine}`,
    "─────────────────",
    `📊 vs S&amp;P 500 hoy: ${fmtPctPlain(forgeToday)} vs ${fmtPctPlain(bm.spyToday)}`,
    `📊 vs S&amp;P 500 YTD: ${fmtPctPlain(forgeYtd)} vs ${fmtPctPlain(bm.spyYtd)}`,
    "─────────────────",
    `🔍 Scanner: ${signals.analyzed} oportunidades analizadas`,
    `⚡ Top candidato mañana: ${topLine}`,
    "",
    `🔗 ${publicBaseUrl()}/investment`,
  ].join("\n");

  let messageId: number | null = null;
  let sent = false;
  let skippedReason: string | undefined;

  if (send) {
    if (!notifyOnReport()) {
      skippedReason = "NOTIFY_ON_REPORT=false";
    } else {
      messageId = await sendTelegramMessage(text, reportButtons());
      sent = messageId != null;
      if (sent) {
        writeMarker(DAILY_MARKER, {
          dateKey: clock.dateKey,
          sentAt: generatedAt,
          messageId,
          kind: "daily",
        });
      } else {
        skippedReason = "telegram_send_failed";
      }
    }
  }

  const result: TelegramReportResult = {
    kind: "daily",
    text,
    sent,
    messageId,
    skippedReason,
    generatedAt,
    mode: "ANALYSIS_ONLY",
  };
  writePreview(result);
  return result;
}

export async function generateWeeklyTelegramReport(opts?: {
  send?: boolean;
  force?: boolean;
}): Promise<TelegramReportResult> {
  const send = opts?.send ?? false;
  const force = opts?.force ?? false;
  const clock = getMadridClock();
  const generatedAt = new Date().toISOString();
  const weekKey = (() => {
    // ISO-ish week key from Madrid date (YYYY-Www approx via dateKey Sunday)
    return `week-${clock.dateKey}`;
  })();

  if (send && !force) {
    const marker = readMarker(WEEKLY_MARKER);
    if (marker?.dateKey === weekKey || marker?.dateKey === clock.dateKey) {
      return {
        kind: "weekly",
        text: "",
        sent: false,
        messageId: marker.messageId,
        skippedReason: `already_sent_${marker.dateKey}`,
        generatedAt,
        mode: "ANALYSIS_ONLY",
      };
    }
  }

  const [acct, bm, signals] = await Promise.all([
    safeAccount(),
    spyQqqChanges(),
    Promise.resolve(scannerSignalMoves()),
  ]);

  const topTickers = signals.top5.map((t) => t.ticker);
  const sectors = await sectorOpportunityCounts(topTickers.length ? topTickers : signals.top5.map((t) => t.ticker));

  // Strategy P&L ledger not available in ANALYSIS_ONLY — report scanner score leaders as strategy proxies.
  const bestStrategy = signals.topCandidate
    ? `${signals.topCandidate.ticker} (score ${signals.topCandidate.score.toFixed(0)})`
    : NO_DATA;
  const worstStrategy = signals.worst
    ? `${signals.worst.ticker} (${fmtSignedPct(signals.worst.changePct)})`
    : NO_DATA;

  const sectorLines =
    sectors.length > 0
      ? sectors
          .slice(0, 5)
          .map((s) => `  · ${s.sector}: ${s.count}`)
          .join("\n")
      : `  · ${NO_DATA}`;

  const top5Lines =
    signals.top5.length > 0
      ? signals.top5
          .map((t, i) => `  ${i + 1}. ${t.ticker} (score ${t.score.toFixed(0)})`)
          .join("\n")
      : `  · ${NO_DATA}`;

  const forgeWeek: number | null = null;

  const text = [
    "📅 <b>REPORTE SEMANAL FORGEOS</b>",
    `Semana (Madrid): ${clock.dateKey}`,
    "─────────────────",
    `💰 NAV: ${acct.available ? fmtMoney(acct.navUSD) : NO_DATA}`,
    `📈 ForgeOS semana: ${fmtPctPlain(forgeWeek)}`,
    `📊 vs S&amp;P 500: ${fmtPctPlain(forgeWeek)} vs ${fmtPctPlain(bm.spyWeek)}`,
    `📊 vs NASDAQ (QQQ): ${fmtPctPlain(forgeWeek)} vs ${fmtPctPlain(bm.qqqWeek)}`,
    "─────────────────",
    `🏆 Mejor estrategia / señal: ${bestStrategy}`,
    `💩 Peor estrategia / señal: ${worstStrategy}`,
    "─────────────────",
    "🏭 Sectores con más oportunidades:",
    sectorLines,
    "─────────────────",
    "⚡ Top 5 tickers próxima semana:",
    top5Lines,
    "",
    `🔗 ${publicBaseUrl()}/investment`,
  ].join("\n");

  let messageId: number | null = null;
  let sent = false;
  let skippedReason: string | undefined;

  if (send) {
    if (!notifyOnReport()) {
      skippedReason = "NOTIFY_ON_REPORT=false";
    } else {
      messageId = await sendTelegramMessage(text, reportButtons());
      sent = messageId != null;
      if (sent) {
        writeMarker(WEEKLY_MARKER, {
          dateKey: weekKey,
          sentAt: generatedAt,
          messageId,
          kind: "weekly",
        });
      } else {
        skippedReason = "telegram_send_failed";
      }
    }
  }

  const result: TelegramReportResult = {
    kind: "weekly",
    text,
    sent,
    messageId,
    skippedReason,
    generatedAt,
    mode: "ANALYSIS_ONLY",
  };
  writePreview(result);
  return result;
}

/**
 * Checks Europe/Madrid schedule and sends at most once per day/week.
 * Daily: market days at REPORT_DAILY_HOUR (default 22).
 * Weekly: Sundays at REPORT_WEEKLY_HOUR (default 20).
 */
export async function maybeSendScheduledReports(): Promise<{
  mode: "ANALYSIS_ONLY";
  madridNow: MadridClock;
  daily: TelegramReportResult | null;
  weekly: TelegramReportResult | null;
}> {
  const clock = getMadridClock();
  const dHour = dailyHour();
  const wHour = weeklyHour();

  let daily: TelegramReportResult | null = null;
  let weekly: TelegramReportResult | null = null;

  if (clock.isMarketDay && clock.hour === dHour) {
    const marker = readMarker(DAILY_MARKER);
    if (marker?.dateKey !== clock.dateKey) {
      daily = await generateDailyTelegramReport({ send: true });
    } else {
      daily = {
        kind: "daily",
        text: "",
        sent: false,
        messageId: marker.messageId,
        skippedReason: `already_sent_${clock.dateKey}`,
        generatedAt: new Date().toISOString(),
        mode: "ANALYSIS_ONLY",
      };
    }
  }

  if (clock.isSunday && clock.hour === wHour) {
    const weekKey = `week-${clock.dateKey}`;
    const marker = readMarker(WEEKLY_MARKER);
    if (marker?.dateKey !== weekKey && marker?.dateKey !== clock.dateKey) {
      weekly = await generateWeeklyTelegramReport({ send: true });
    } else {
      weekly = {
        kind: "weekly",
        text: "",
        sent: false,
        messageId: marker?.messageId ?? null,
        skippedReason: `already_sent_${marker?.dateKey ?? weekKey}`,
        generatedAt: new Date().toISOString(),
        mode: "ANALYSIS_ONLY",
      };
    }
  }

  // Phase H — weekly ML retrain (ANALYSIS_ONLY; never places orders)
  try {
    const ml = maybeRetrainWeekly();
    if (ml.trained) {
      console.log(`[Reports] ML weekly retrain: ${ml.note}`);
    }
  } catch (err) {
    console.warn(
      "[Reports] maybeRetrainWeekly failed:",
      err instanceof Error ? err.message : err,
    );
  }

  return { mode: "ANALYSIS_ONLY", madridNow: clock, daily, weekly };
}

export function getTelegramReportsStatus(): TelegramReportsStatus {
  return {
    mode: "ANALYSIS_ONLY",
    timezone: TZ,
    notifyOnReport: notifyOnReport(),
    dailyHour: dailyHour(),
    weeklyHour: weeklyHour(),
    lastDaily: readMarker(DAILY_MARKER),
    lastWeekly: readMarker(WEEKLY_MARKER),
    lastPreview: readPreview(),
    madridNow: getMadridClock(),
  };
}
