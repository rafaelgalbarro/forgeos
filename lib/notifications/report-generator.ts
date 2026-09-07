import "server-only";

import fs from "node:fs";
import path from "node:path";

import { readDailyCandidates } from "@/lib/market-data/candidate-store";
import { readMultiScannerResults } from "@/lib/market-data/scanner-store";
import { getBatchPrices, getDailyBars, getTickerInfo } from "@/lib/market-data/yahoo-finance";
import { buildReportPdfBuffer, type ReportPdfSection } from "@/lib/notifications/report-pdf";
import { sendTelegramDocument, sendTelegramMessage } from "@/lib/notifications/telegram-bot";
import { fetchTradingAccountSnapshot } from "@/lib/trading/ibkr-data";
import {
  loadTradingState,
  type PendingOrderRecord,
} from "@/src/core/trading/trading-state-store";
import { maybeRetrainWeekly } from "@/lib/ml/signal-trainer";

const TZ = "Europe/Madrid";
const MARKERS_DIR = path.resolve(process.cwd(), ".forgeos", "reports");
const DAILY_MARKER = path.join(MARKERS_DIR, "telegram-daily-last.json");
const MORNING_MARKER = path.join(MARKERS_DIR, "telegram-morning-last.json");
const WEEKLY_MARKER = path.join(MARKERS_DIR, "telegram-weekly-last.json");
const LAST_PREVIEW = path.join(MARKERS_DIR, "telegram-last-preview.json");

const NO_DATA = "NO_DATA";

export type TelegramReportKind = "daily" | "morning" | "weekly";

export type TelegramReportResult = {
  kind: TelegramReportKind;
  text: string;
  sent: boolean;
  messageId: number | null;
  documentMessageId?: number | null;
  pdfAttached?: boolean;
  skippedReason?: string;
  generatedAt: string;
  mode: "ANALYSIS_ONLY";
};

export type TelegramReportsStatus = {
  mode: "ANALYSIS_ONLY";
  timezone: typeof TZ;
  notifyOnReport: boolean;
  morningHour: number;
  morningMinute: number;
  dailyHour: number;
  weeklyHour: number;
  lastMorning: SentMarker | null;
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

type OperationRow = {
  ticker: string;
  direction: string;
  shares: number;
  price: number;
  orderValueUSD: number;
  status: string;
  reasoning: string;
  estimatedPnlUSD: number | null;
  estimatedPnlPct: number | null;
};

type SignalRow = {
  ticker: string;
  side: string;
  score: number;
  reasoning: string;
};

function notifyOnReport(): boolean {
  return process.env.NOTIFY_ON_REPORT !== "false";
}

function morningHour(): number {
  const n = Number(process.env.REPORT_MORNING_HOUR ?? 8);
  return Number.isFinite(n) && n >= 0 && n <= 23 ? Math.floor(n) : 8;
}

function morningMinute(): number {
  const n = Number(process.env.REPORT_MORNING_MINUTE ?? 30);
  return Number.isFinite(n) && n >= 0 && n <= 59 ? Math.floor(n) : 30;
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

function collectSignalRows(): SignalRow[] {
  const snap = readMultiScannerResults();
  const rows: SignalRow[] = [];
  if (snap?.opportunities?.length) {
    for (const opp of snap.opportunities.slice(0, 20)) {
      rows.push({
        ticker: opp.ticker,
        side: opp.side,
        score: opp.score,
        reasoning: (opp.signals ?? []).slice(0, 3).join(" | ") || "NO_DATA",
      });
    }
  }
  if (!rows.length && snap?.phases?.length) {
    for (const p of snap.phases.filter((x) => x.phase === 2 || x.phase === 3).slice(0, 20)) {
      rows.push({
        ticker: p.ticker,
        side: p.direction ?? "HOLD",
        score: p.score ?? 0,
        reasoning: p.reasoning?.trim() || "NO_DATA",
      });
    }
  }
  return rows;
}

function topOpportunitiesTomorrow(): Array<{ ticker: string; score: number; reason: string }> {
  const candidates = readDailyCandidates();
  const fromPool = [
    ...candidates.europeTop30,
    ...candidates.usTop30,
    ...candidates.overnightTop200,
  ];
  if (fromPool.length) {
    const dedup = new Map<string, { ticker: string; score: number; reason: string }>();
    for (const c of fromPool) {
      const prev = dedup.get(c.ticker);
      if (!prev || c.score > prev.score) {
        dedup.set(c.ticker, {
          ticker: c.ticker,
          score: c.score,
          reason: c.reason || c.badges.join(", ") || "candidate",
        });
      }
    }
    return [...dedup.values()].sort((a, b) => b.score - a.score).slice(0, 10);
  }
  return scannerSignalMoves().top5.map((t) => ({
    ticker: t.ticker,
    score: t.score,
    reason: `scanner score ${t.score.toFixed(0)}`,
  }));
}

function todayOrders(): PendingOrderRecord[] {
  const state = loadTradingState();
  const today = getMadridClock().dateKey;
  return state.pendingOrders.filter((o) => {
    try {
      return getMadridClock(new Date(o.updatedAt || o.createdAt)).dateKey === today;
    } catch {
      return false;
    }
  });
}

async function buildOperationRows(): Promise<OperationRow[]> {
  const orders = todayOrders().filter((o) => o.status === "EXECUTED" || o.status === "APPROVED");
  const state = loadTradingState();
  const tickers = [
    ...new Set([
      ...orders.map((o) => o.ticker.toUpperCase()),
      ...state.monitoredPositions.map((p) => p.ticker.toUpperCase()),
    ]),
  ];
  const quotes = tickers.length ? await getBatchPrices(tickers) : new Map();

  const fromOrders: OperationRow[] = orders.map((o) => {
    const q = quotes.get(o.ticker.toUpperCase());
    const mark = q?.price ?? null;
    let estimatedPnlUSD: number | null = null;
    let estimatedPnlPct: number | null = null;
    if (mark != null && o.price > 0 && o.shares > 0) {
      const dir = o.direction === "SELL" ? -1 : 1;
      estimatedPnlUSD = (mark - o.price) * o.shares * dir;
      estimatedPnlPct = ((mark - o.price) / o.price) * 100 * dir;
    }
    return {
      ticker: o.ticker,
      direction: o.direction,
      shares: o.shares,
      price: o.price,
      orderValueUSD: o.orderValueUSD,
      status: o.status,
      reasoning: o.signal?.reasoning || o.reason || NO_DATA,
      estimatedPnlUSD,
      estimatedPnlPct,
    };
  });

  if (fromOrders.length) return fromOrders;

  // Fallback: open monitored positions as "open ops" with mark-to-market (not invented ledger).
  return state.monitoredPositions.slice(0, 20).map((p) => {
    const q = quotes.get(p.ticker.toUpperCase());
    const mark = q?.price ?? null;
    let estimatedPnlUSD: number | null = null;
    let estimatedPnlPct: number | null = null;
    if (mark != null && p.entryPrice > 0 && p.shares > 0) {
      estimatedPnlUSD = (mark - p.entryPrice) * p.shares;
      estimatedPnlPct = ((mark - p.entryPrice) / p.entryPrice) * 100;
    }
    return {
      ticker: p.ticker,
      direction: "BUY",
      shares: p.shares,
      price: p.entryPrice,
      orderValueUSD: p.entryPrice * p.shares,
      status: "OPEN",
      reasoning: `Monitored position SL=${p.stopLoss} TP=${p.takeProfit}`,
      estimatedPnlUSD,
      estimatedPnlPct,
    };
  });
}

function todayExecutedStats(ops: OperationRow[]): {
  executed: number;
  winners: number;
  losers: number;
} {
  const executed = ops.filter((o) => o.status === "EXECUTED" || o.status === "OPEN").length;
  let winners = 0;
  let losers = 0;
  for (const o of ops) {
    if (o.estimatedPnlUSD == null) continue;
    if (o.estimatedPnlUSD > 0) winners += 1;
    else if (o.estimatedPnlUSD < 0) losers += 1;
  }
  const state = loadTradingState();
  return {
    executed: executed || state.risk.dailyTradeCount || 0,
    winners,
    losers,
  };
}

async function sectorOpportunityCounts(
  tickers: string[],
): Promise<Array<{ sector: string; count: number }>> {
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

function reportButtons() {
  return [
    [
      { text: "📊 VER DASHBOARD", callback_data: "report_dashboard" },
      { text: "📈 VER PORTFOLIO", callback_data: "report_portfolio" },
    ],
  ];
}

function pdfSectionsFromPayload(params: {
  navLine: string;
  pnlLine: string;
  forgeToday: number | null;
  spyToday: number | null;
  ops: OperationRow[];
  signals: SignalRow[];
  topTomorrow: Array<{ ticker: string; score: number; reason: string }>;
  trades: { executed: number; winners: number; losers: number };
}): ReportPdfSection[] {
  const opLines =
    params.ops.length > 0
      ? params.ops.slice(0, 25).map((o) => {
          const pnl =
            o.estimatedPnlUSD != null
              ? `${fmtMoney(o.estimatedPnlUSD)} (${fmtSignedPct(o.estimatedPnlPct)})`
              : NO_DATA;
          return `${o.ticker} ${o.direction} x${o.shares} @ ${o.price.toFixed(2)} | P&L ${pnl} | ${o.status}`;
        })
      : [NO_DATA];

  const signalLines =
    params.signals.length > 0
      ? params.signals.slice(0, 20).map(
          (s) =>
            `${s.ticker} ${s.side} score=${s.score.toFixed(0)} — ${s.reasoning.slice(0, 120)}`,
        )
      : [NO_DATA];

  const topLines =
    params.topTomorrow.length > 0
      ? params.topTomorrow.map(
          (t, i) => `${i + 1}. ${t.ticker} score ${t.score.toFixed(0)} — ${t.reason.slice(0, 80)}`,
        )
      : [NO_DATA];

  return [
    {
      title: "Account",
      lines: [
        `NAV: ${params.navLine}`,
        `P&L today: ${params.pnlLine}`,
        `Operations: ${params.trades.executed} | Winners: ${params.trades.winners || NO_DATA} | Losers: ${params.trades.losers || NO_DATA}`,
      ],
    },
    {
      title: "Benchmark",
      lines: [
        `ForgeOS vs S&P 500 today: ${fmtPctPlain(params.forgeToday)} vs ${fmtPctPlain(params.spyToday)}`,
      ],
    },
    { title: "Operations P&L", lines: opLines },
    { title: "Signals (BUY/SELL/HOLD)", lines: signalLines },
    { title: "Top opportunities tomorrow", lines: topLines },
  ];
}

async function sendReportBundle(params: {
  text: string;
  pdfTitle: string;
  pdfSubtitle: string;
  filename: string;
  sections: ReportPdfSection[];
  generatedAt: string;
}): Promise<{ messageId: number | null; documentMessageId: number | null; pdfAttached: boolean }> {
  const messageId = await sendTelegramMessage(params.text, reportButtons());
  const pdf = buildReportPdfBuffer({
    title: params.pdfTitle,
    subtitle: params.pdfSubtitle,
    generatedAtIso: params.generatedAt,
    sections: params.sections,
  });
  const documentMessageId = await sendTelegramDocument({
    buffer: pdf,
    filename: params.filename,
    caption: `📎 <b>${params.pdfTitle}</b>\nResumen completo ForgeOS`,
    mimeType: "application/pdf",
  });
  return {
    messageId,
    documentMessageId,
    pdfAttached: documentMessageId != null,
  };
}

/** Morning market briefing — default 08:30 Europe/Madrid. */
export async function generateMorningTelegramReport(opts?: {
  send?: boolean;
  force?: boolean;
}): Promise<TelegramReportResult> {
  const send = opts?.send ?? false;
  const force = opts?.force ?? false;
  const clock = getMadridClock();
  const generatedAt = new Date().toISOString();

  if (send && !force) {
    const marker = readMarker(MORNING_MARKER);
    if (marker?.dateKey === clock.dateKey) {
      return {
        kind: "morning",
        text: "",
        sent: false,
        messageId: marker.messageId,
        skippedReason: `already_sent_${clock.dateKey}`,
        generatedAt,
        mode: "ANALYSIS_ONLY",
      };
    }
  }

  const [acct, bm, ops] = await Promise.all([
    safeAccount(),
    spyQqqChanges(),
    buildOperationRows(),
  ]);
  const signals = collectSignalRows();
  const topTomorrow = topOpportunitiesTomorrow();
  const trades = todayExecutedStats(ops);
  const scanner = scannerSignalMoves();

  const navLine = acct.available
    ? `${fmtMoney(acct.navUSD)} (${fmtSignedPct(acct.dailyPnlPct)} vs ayer)`
    : `${NO_DATA} (${NO_DATA} vs ayer)`;
  const pnlLine = acct.available
    ? `${fmtMoney(acct.dailyPnlUSD)} (${fmtSignedPct(acct.dailyPnlPct)})`
    : `${NO_DATA} (${NO_DATA})`;

  const topLines =
    topTomorrow.length > 0
      ? topTomorrow
          .slice(0, 5)
          .map((t, i) => `${i + 1}. <b>${t.ticker}</b> ${t.score.toFixed(0)}`)
          .join("\n")
      : NO_DATA;

  const signalPreview =
    signals.length > 0
      ? signals
          .slice(0, 5)
          .map((s) => `· ${s.ticker} ${s.side} (${s.score.toFixed(0)})`)
          .join("\n")
      : NO_DATA;

  const text = [
    "🌅 <b>REPORTE MERCADO FORGEOS</b>",
    `Fecha: ${clock.dateKey} · 08:30 Madrid`,
    "─────────────────",
    `💰 NAV: ${navLine}`,
    `📈 P&amp;L: ${pnlLine}`,
    `📊 vs S&amp;P 500: ${fmtPctPlain(acct.dailyPnlPct)} vs ${fmtPctPlain(bm.spyToday)}`,
    "─────────────────",
    `🔍 Scanner: ${scanner.analyzed} | señales: ${signals.length}`,
    signalPreview,
    "─────────────────",
    "⚡ Top oportunidades hoy:",
    topLines,
    "",
    `🔗 ${publicBaseUrl()}/investment`,
  ].join("\n");

  const sections = pdfSectionsFromPayload({
    navLine,
    pnlLine,
    forgeToday: acct.dailyPnlPct,
    spyToday: bm.spyToday,
    ops,
    signals,
    topTomorrow,
    trades,
  });

  let messageId: number | null = null;
  let documentMessageId: number | null = null;
  let pdfAttached = false;
  let sent = false;
  let skippedReason: string | undefined;

  if (send) {
    if (!notifyOnReport()) {
      skippedReason = "NOTIFY_ON_REPORT=false";
    } else {
      const bundle = await sendReportBundle({
        text,
        pdfTitle: "ForgeOS Morning Market Report",
        pdfSubtitle: `Madrid ${clock.dateKey} 08:30`,
        filename: `forgeos-morning-${clock.dateKey}.pdf`,
        sections,
        generatedAt,
      });
      messageId = bundle.messageId;
      documentMessageId = bundle.documentMessageId;
      pdfAttached = bundle.pdfAttached;
      sent = messageId != null || documentMessageId != null;
      if (sent) {
        writeMarker(MORNING_MARKER, {
          dateKey: clock.dateKey,
          sentAt: generatedAt,
          messageId: messageId ?? documentMessageId,
          kind: "morning",
        });
      } else {
        skippedReason = "telegram_send_failed";
      }
    }
  }

  const result: TelegramReportResult = {
    kind: "morning",
    text,
    sent,
    messageId,
    documentMessageId,
    pdfAttached,
    skippedReason,
    generatedAt,
    mode: "ANALYSIS_ONLY",
  };
  writePreview(result);
  return result;
}

/** Evening operations report — default 22:00 Europe/Madrid. */
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
      return {
        kind: "daily",
        text: "",
        sent: false,
        messageId: marker.messageId,
        skippedReason: `already_sent_${clock.dateKey}`,
        generatedAt,
        mode: "ANALYSIS_ONLY",
      };
    }
  }

  const [acct, bm, ops] = await Promise.all([
    safeAccount(),
    spyQqqChanges(),
    buildOperationRows(),
  ]);
  const signals = collectSignalRows();
  const topTomorrow = topOpportunitiesTomorrow();
  const trades = todayExecutedStats(ops);
  const scannerMoves = scannerSignalMoves();

  const fecha = clock.dateKey;
  const navLine = acct.available
    ? `${fmtMoney(acct.navUSD)} (${fmtSignedPct(acct.dailyPnlPct)} vs ayer)`
    : `${NO_DATA} (${NO_DATA} vs ayer)`;
  const pnlLine = acct.available
    ? `${fmtMoney(acct.dailyPnlUSD)} (${fmtSignedPct(acct.dailyPnlPct)})`
    : `${NO_DATA} (${NO_DATA})`;

  const bestLine = scannerMoves.best
    ? `${scannerMoves.best.ticker} ${fmtSignedPct(scannerMoves.best.changePct)}`
    : NO_DATA;
  const topLine = topTomorrow[0]
    ? `${topTomorrow[0].ticker} (score ${topTomorrow[0].score.toFixed(0)})`
    : scannerMoves.topCandidate
      ? `${scannerMoves.topCandidate.ticker} (score ${scannerMoves.topCandidate.score.toFixed(0)})`
      : NO_DATA;

  const winnersLabel =
    trades.executed > 0 && trades.winners + trades.losers === 0
      ? NO_DATA
      : String(trades.winners);
  const losersLabel =
    trades.executed > 0 && trades.winners + trades.losers === 0
      ? NO_DATA
      : String(trades.losers);

  const opPreview =
    ops.length > 0
      ? ops
          .slice(0, 5)
          .map((o) => {
            const pnl =
              o.estimatedPnlUSD != null
                ? `${fmtMoney(o.estimatedPnlUSD)}`
                : NO_DATA;
            return `· ${o.ticker} ${o.direction} P&amp;L ${pnl}`;
          })
          .join("\n")
      : `· ${NO_DATA}`;

  const text = [
    "📊 <b>REPORTE DIARIO FORGEOS</b>",
    `Fecha: ${fecha} · 22:00 Madrid`,
    "─────────────────",
    `💰 NAV: ${navLine}`,
    `📈 P&amp;L hoy: ${pnlLine}`,
    `🎯 Operaciones: ${trades.executed} ejecutadas`,
    `✅ Ganadoras: ${winnersLabel} | ❌ Perdedoras: ${losersLabel}`,
    opPreview,
    "─────────────────",
    `🏆 Mejor señal: ${bestLine}`,
    "─────────────────",
    `📊 vs S&amp;P 500 hoy: ${fmtPctPlain(acct.dailyPnlPct)} vs ${fmtPctPlain(bm.spyToday)}`,
    "─────────────────",
    `🔍 Scanner: ${scannerMoves.analyzed} oportunidades`,
    `⚡ Top candidato mañana: ${topLine}`,
    "",
    `🔗 ${publicBaseUrl()}/investment`,
  ].join("\n");

  const sections = pdfSectionsFromPayload({
    navLine,
    pnlLine,
    forgeToday: acct.dailyPnlPct,
    spyToday: bm.spyToday,
    ops,
    signals,
    topTomorrow,
    trades,
  });

  let messageId: number | null = null;
  let documentMessageId: number | null = null;
  let pdfAttached = false;
  let sent = false;
  let skippedReason: string | undefined;

  if (send) {
    if (!notifyOnReport()) {
      skippedReason = "NOTIFY_ON_REPORT=false";
    } else {
      const bundle = await sendReportBundle({
        text,
        pdfTitle: "ForgeOS Daily Operations Report",
        pdfSubtitle: `Madrid ${fecha} 22:00`,
        filename: `forgeos-daily-${fecha}.pdf`,
        sections,
        generatedAt,
      });
      messageId = bundle.messageId;
      documentMessageId = bundle.documentMessageId;
      pdfAttached = bundle.pdfAttached;
      sent = messageId != null || documentMessageId != null;
      if (sent) {
        writeMarker(DAILY_MARKER, {
          dateKey: clock.dateKey,
          sentAt: generatedAt,
          messageId: messageId ?? documentMessageId,
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
    documentMessageId,
    pdfAttached,
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
  const weekKey = `week-${clock.dateKey}`;

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

  const [acct, bm, ops] = await Promise.all([
    safeAccount(),
    spyQqqChanges(),
    buildOperationRows(),
  ]);
  const signals = collectSignalRows();
  const topTomorrow = topOpportunitiesTomorrow();
  const scannerMoves = scannerSignalMoves();
  const topTickers = scannerMoves.top5.map((t) => t.ticker);
  const sectors = await sectorOpportunityCounts(
    topTickers.length ? topTickers : topTomorrow.map((t) => t.ticker),
  );
  const trades = todayExecutedStats(ops);

  const bestStrategy = scannerMoves.topCandidate
    ? `${scannerMoves.topCandidate.ticker} (score ${scannerMoves.topCandidate.score.toFixed(0)})`
    : NO_DATA;
  const worstStrategy = scannerMoves.worst
    ? `${scannerMoves.worst.ticker} (${fmtSignedPct(scannerMoves.worst.changePct)})`
    : NO_DATA;

  const sectorLines =
    sectors.length > 0
      ? sectors
          .slice(0, 5)
          .map((s) => `  · ${s.sector}: ${s.count}`)
          .join("\n")
      : `  · ${NO_DATA}`;

  const top5Lines =
    scannerMoves.top5.length > 0
      ? scannerMoves.top5
          .map((t, i) => `  ${i + 1}. ${t.ticker} (score ${t.score.toFixed(0)})`)
          .join("\n")
      : topTomorrow
          .slice(0, 5)
          .map((t, i) => `  ${i + 1}. ${t.ticker} (score ${t.score.toFixed(0)})`)
          .join("\n") || `  · ${NO_DATA}`;

  const forgeWeek: number | null = null;
  const navLine = acct.available ? fmtMoney(acct.navUSD) : NO_DATA;
  const pnlLine = acct.available
    ? `${fmtMoney(acct.dailyPnlUSD)} (${fmtSignedPct(acct.dailyPnlPct)})`
    : NO_DATA;

  const text = [
    "📅 <b>REPORTE SEMANAL FORGEOS</b>",
    `Semana (Madrid): ${clock.dateKey}`,
    "─────────────────",
    `💰 NAV: ${navLine}`,
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

  const sections = pdfSectionsFromPayload({
    navLine,
    pnlLine,
    forgeToday: acct.dailyPnlPct,
    spyToday: bm.spyToday,
    ops,
    signals,
    topTomorrow: topTomorrow.length
      ? topTomorrow
      : scannerMoves.top5.map((t) => ({
          ticker: t.ticker,
          score: t.score,
          reason: "weekly top",
        })),
    trades,
  });

  let messageId: number | null = null;
  let documentMessageId: number | null = null;
  let pdfAttached = false;
  let sent = false;
  let skippedReason: string | undefined;

  if (send) {
    if (!notifyOnReport()) {
      skippedReason = "NOTIFY_ON_REPORT=false";
    } else {
      const bundle = await sendReportBundle({
        text,
        pdfTitle: "ForgeOS Weekly Report",
        pdfSubtitle: `Madrid week ${clock.dateKey}`,
        filename: `forgeos-weekly-${clock.dateKey}.pdf`,
        sections,
        generatedAt,
      });
      messageId = bundle.messageId;
      documentMessageId = bundle.documentMessageId;
      pdfAttached = bundle.pdfAttached;
      sent = messageId != null || documentMessageId != null;
      if (sent) {
        writeMarker(WEEKLY_MARKER, {
          dateKey: weekKey,
          sentAt: generatedAt,
          messageId: messageId ?? documentMessageId,
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
    documentMessageId,
    pdfAttached,
    skippedReason,
    generatedAt,
    mode: "ANALYSIS_ONLY",
  };
  writePreview(result);
  return result;
}

/**
 * Europe/Madrid schedule (at most once per day/week):
 * - Morning market: weekdays at REPORT_MORNING_HOUR:MINUTE (default 08:30)
 * - Daily ops: weekdays at REPORT_DAILY_HOUR (default 22)
 * - Weekly: Sundays at REPORT_WEEKLY_HOUR (default 20)
 */
export async function maybeSendScheduledReports(): Promise<{
  mode: "ANALYSIS_ONLY";
  madridNow: MadridClock;
  morning: TelegramReportResult | null;
  daily: TelegramReportResult | null;
  weekly: TelegramReportResult | null;
}> {
  const clock = getMadridClock();
  const mHour = morningHour();
  const mMin = morningMinute();
  const dHour = dailyHour();
  const wHour = weeklyHour();

  let morning: TelegramReportResult | null = null;
  let daily: TelegramReportResult | null = null;
  let weekly: TelegramReportResult | null = null;

  const inMorningWindow =
    clock.isMarketDay &&
    clock.hour === mHour &&
    clock.minute >= mMin &&
    clock.minute < mMin + 15;

  if (inMorningWindow) {
    const marker = readMarker(MORNING_MARKER);
    if (marker?.dateKey !== clock.dateKey) {
      morning = await generateMorningTelegramReport({ send: true });
    } else {
      morning = {
        kind: "morning",
        text: "",
        sent: false,
        messageId: marker.messageId,
        skippedReason: `already_sent_${clock.dateKey}`,
        generatedAt: new Date().toISOString(),
        mode: "ANALYSIS_ONLY",
      };
    }
  }

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

  return { mode: "ANALYSIS_ONLY", madridNow: clock, morning, daily, weekly };
}

export function getTelegramReportsStatus(): TelegramReportsStatus {
  return {
    mode: "ANALYSIS_ONLY",
    timezone: TZ,
    notifyOnReport: notifyOnReport(),
    morningHour: morningHour(),
    morningMinute: morningMinute(),
    dailyHour: dailyHour(),
    weeklyHour: weeklyHour(),
    lastMorning: readMarker(MORNING_MARKER),
    lastDaily: readMarker(DAILY_MARKER),
    lastWeekly: readMarker(WEEKLY_MARKER),
    lastPreview: readPreview(),
    madridNow: getMadridClock(),
  };
}
