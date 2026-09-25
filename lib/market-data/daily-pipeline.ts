import "server-only";

import { getBatchPrices, type YahooQuote } from "@/lib/market-data/yahoo-finance";
import { getTickerUniverse } from "@/lib/market-data/ticker-universe";
import { isEuropeTicker } from "@/lib/market-data/europe-indices";
import { scanInstitutionalSignals } from "@/lib/market-data/institutional-scanner";
import { getMacroContext } from "@/lib/market-data/macro-context";
import { aggregateNews } from "@/lib/market-data/news-aggregator";
import {
  alreadyRanToday,
  markPipelineSession,
  readDailyCandidates,
  writeDailyCandidates,
  type DailyCandidate,
  type DailyCandidateSnapshot,
} from "@/lib/market-data/candidate-store";
import { notifyScannerBriefing } from "@/lib/notifications/telegram-bot";
import { queueTickerForCycle } from "@/lib/alerts/alert-manager";
import { TRADING_CONFIG } from "@/src/core/trading/trading.config";

export type PipelineSession = "overnight" | "europe_open" | "us_premarket" | "active" | "close";

function madridParts() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const weekday = get("weekday").toLowerCase();
  const hour = Number(get("hour"));
  const minute = Number(get("minute"));
  const dayKey = `${get("year")}-${get("month")}-${get("day")}`;
  return { weekday, hour, minute, mins: hour * 60 + minute, dayKey };
}

function relVol(q: YahooQuote): number {
  const base = q.avgVolume > 0 ? q.avgVolume : q.volume;
  if (base <= 0) return 0;
  return q.volume / base;
}

function tapeScore(q: YahooQuote): { score: number; badges: string[]; reason: string } {
  const rv = relVol(q);
  const gap = Math.abs(q.changePct);
  let score = Math.min(40, gap * 6) + Math.min(25, rv * 8);
  const badges: string[] = [];
  const reasons: string[] = [];
  if (gap >= 3 && rv >= 1.5) {
    score += 20;
    badges.push(q.changePct >= 0 ? "GAP UP" : "GAP DOWN");
    reasons.push(`Gap ${q.changePct.toFixed(1)}% vol ${rv.toFixed(1)}x`);
  }
  if (rv >= 3) {
    badges.push("MOMENTUM");
    reasons.push(`Volumen ${rv.toFixed(1)}x`);
  }
  if (gap >= 2) reasons.push(`${q.changePct >= 0 ? "+" : ""}${q.changePct.toFixed(1)}%`);
  return { score: Math.round(Math.min(100, score)), badges, reason: reasons.join(" · ") || "mover" };
}

async function scoreUniverse(tickers: readonly string[], regionFilter?: "US" | "EU"): Promise<DailyCandidate[]> {
  const out: DailyCandidate[] = [];
  const unique = [...new Set(tickers.map((t) => t.toUpperCase()))];
  for (let i = 0; i < unique.length; i += 200) {
    const chunk = unique.slice(i, i + 200);
    const quotes = await getBatchPrices(chunk);
    for (const [ticker, q] of quotes) {
      const region: "US" | "EU" = isEuropeTicker(ticker) ? "EU" : "US";
      if (regionFilter && region !== regionFilter) continue;
      const tape = tapeScore(q);
      if (tape.score < 8 && Math.abs(q.changePct) < 1.2) continue;
      out.push({
        ticker,
        region,
        score: tape.score,
        changePct: q.changePct,
        relativeVolume: relVol(q),
        price: q.price,
        badges: tape.badges,
        reason: tape.reason,
      });
    }
  }
  out.sort((a, b) => b.score - a.score);
  return out;
}

async function enrichTopInstitutional(rows: DailyCandidate[], limit: number): Promise<DailyCandidate[]> {
  const top = rows.slice(0, limit);
  const rest = rows.slice(limit);
  const enriched: DailyCandidate[] = [];
  for (const row of top) {
    try {
      const inst = await scanInstitutionalSignals(row.ticker);
      enriched.push({
        ...row,
        score: Math.max(0, Math.min(100, row.score + inst.scoreDelta)),
        badges: [...new Set([...row.badges, ...inst.badges])],
        reason: [row.reason, ...inst.signals.slice(0, 2)].filter(Boolean).join(" · "),
      });
    } catch {
      enriched.push(row);
    }
  }
  const merged = [...enriched, ...rest];
  merged.sort((a, b) => b.score - a.score);
  return merged;
}

function applyVixPenalty(rows: DailyCandidate[], vix: number | null): DailyCandidate[] {
  if (vix == null || vix <= 30) return rows;
  return rows.map((r) => ({
    ...r,
    score: Math.max(0, r.score - 10),
    reason: `${r.reason} · VIX ${vix.toFixed(0)}`,
  }));
}

function allowedSet(): Set<string> {
  return new Set(TRADING_CONFIG.allowedTickers.map((t) => t.toUpperCase()));
}

function queueTopForCycle(rows: DailyCandidate[], n: number): void {
  const allow = allowedSet();
  const pick = rows.filter((r) => allow.has(r.ticker)).slice(0, n);
  for (const row of pick) queueTickerForCycle(row.ticker);
}

export async function runOvernightPreAnalysis(): Promise<DailyCandidateSnapshot> {
  const universe = await getTickerUniverse();
  const scored = await scoreUniverse(universe.tickers);
  const macro = await getMacroContext().catch(() => null);
  const withVix = applyVixPenalty(scored, macro?.vix.price ?? null);
  const overnightTop200 = (await enrichTopInstitutional(withVix, 80)).slice(0, 200);

  const newsSample = overnightTop200.slice(0, 12);
  for (const row of newsSample) {
    try {
      const news = await aggregateNews(row.ticker);
      if (news.overallSentiment === "BULLISH") row.score = Math.min(100, row.score + 5);
      if (news.overallSentiment === "BEARISH") row.score = Math.max(0, row.score - 5);
    } catch {
      /* optional */
    }
  }
  overnightTop200.sort((a, b) => b.score - a.score);

  const snap: DailyCandidateSnapshot = {
    ...readDailyCandidates(),
    updatedAt: new Date().toISOString(),
    session: "overnight",
    overnightTop200,
    activePool: overnightTop200.slice(0, 60).map((c) => c.ticker),
    universeSize: universe.tickers.length,
  };
  writeDailyCandidates(snap);
  console.log(`[DailyPipeline] overnight top200=${overnightTop200.length} universe=${universe.tickers.length}`);
  return snap;
}

export async function runEuropeOpenScan(): Promise<DailyCandidateSnapshot> {
  const universe = await getTickerUniverse();
  const europe = universe.tickers.filter(isEuropeTicker);
  const scored = await scoreUniverse(europe.length ? europe : universe.tickers, "EU");
  const gaps = scored.filter((c) => Math.abs(c.changePct) >= 2);
  const europeTop30 = (await enrichTopInstitutional(gaps.length ? gaps : scored, 40)).slice(0, 30);
  const prev = readDailyCandidates();
  const snap: DailyCandidateSnapshot = {
    ...prev,
    updatedAt: new Date().toISOString(),
    session: "europe_open",
    europeTop30,
    activePool: [...new Set([...europeTop30.map((c) => c.ticker), ...prev.usTop30.map((c) => c.ticker)])].slice(0, 60),
    universeSize: universe.tickers.length,
  };
  writeDailyCandidates(snap);
  queueTopForCycle(europeTop30, 10);
  await notifyScannerBriefing({
    title: "🌅 Buenos días — Top oportunidades Europa hoy",
    lines: europeTop30.slice(0, 10).map(
      (c, i) =>
        `${i + 1}. <b>${c.ticker}</b> ${c.score} ${c.changePct >= 0 ? "+" : ""}${c.changePct.toFixed(1)}% ${c.badges[0] ?? ""}`,
    ),
  });
  return snap;
}

export async function runUsPremarketScan(): Promise<DailyCandidateSnapshot> {
  const universe = await getTickerUniverse();
  const us = universe.tickers.filter((t) => !isEuropeTicker(t));
  const scored = await scoreUniverse(us, "US");
  const usTop30 = (await enrichTopInstitutional(scored, 50)).slice(0, 30);
  const prev = readDailyCandidates();
  const snap: DailyCandidateSnapshot = {
    ...prev,
    updatedAt: new Date().toISOString(),
    session: "us_premarket",
    usTop30,
    activePool: [...new Set([...prev.europeTop30.map((c) => c.ticker), ...usTop30.map((c) => c.ticker)])].slice(0, 60),
    universeSize: universe.tickers.length,
  };
  writeDailyCandidates(snap);
  queueTopForCycle(usTop30, 10);
  await notifyScannerBriefing({
    title: "🇺🇸 Abre USA — Top candidatos sesión",
    lines: usTop30.slice(0, 10).map(
      (c, i) =>
        `${i + 1}. <b>${c.ticker}</b> ${c.score} ${c.changePct >= 0 ? "+" : ""}${c.changePct.toFixed(1)}% ${c.badges[0] ?? ""}`,
    ),
  });
  return snap;
}

export async function runCloseScanNote(): Promise<DailyCandidateSnapshot> {
  const prev = readDailyCandidates();
  const top = [...prev.europeTop30, ...prev.usTop30, ...prev.overnightTop200]
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
  const snap = { ...prev, session: "close" as const, updatedAt: new Date().toISOString() };
  writeDailyCandidates(snap);
  await notifyScannerBriefing({
    title: "🌙 Cierre — candidatos mañana",
    lines: top.map((c, i) => `${i + 1}. <b>${c.ticker}</b> score ${c.score} · ${c.reason}`),
  });
  return snap;
}

export async function runPipelineSession(session: PipelineSession): Promise<DailyCandidateSnapshot> {
  switch (session) {
    case "overnight":
      return runOvernightPreAnalysis();
    case "europe_open":
      return runEuropeOpenScan();
    case "us_premarket":
      return runUsPremarketScan();
    case "close":
      return runCloseScanNote();
    default:
      return readDailyCandidates();
  }
}

/** Detects Madrid clock windows and runs each session once per day. */
export async function maybeRunScheduledPipeline(): Promise<{ ran: PipelineSession | null; snapshot: DailyCandidateSnapshot }> {
  const { weekday, mins, dayKey } = madridParts();
  const weekend = weekday.startsWith("sat") || weekday.startsWith("sun");
  let session: PipelineSession | null = null;
  if (!weekend && mins >= 30 && mins < 60) session = "overnight"; // 00:30 Asia prep
  else if (!weekend && mins >= 510 && mins < 540) session = "europe_open"; // 08:30
  else if (!weekend && mins >= 840 && mins < 870) session = "us_premarket"; // 14:00
  else if (!weekend && mins >= 1320 && mins < 1350) session = "close";

  if (!session || alreadyRanToday(session, dayKey)) {
    return { ran: null, snapshot: readDailyCandidates() };
  }
  const snapshot = await runPipelineSession(session);
  markPipelineSession(session, dayKey);
  return { ran: session, snapshot };
}
