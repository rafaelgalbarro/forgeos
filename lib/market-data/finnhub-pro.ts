/**
 * Finnhub news + sentiment for pro-strategies (FINNHUB_API_KEY required).
 */

import "server-only";

import { cacheKey, getOrSetCached } from "@/lib/market-data/cache";

const FINNHUB_BASE = "https://finnhub.io/api/v1";
const NEWS_TTL_MS = 5 * 60_000;
const SENTIMENT_TTL_MS = 10 * 60_000;
const FETCH_TIMEOUT_MS = 15_000;

function readFinnhubKey(): string | null {
  const raw = process.env["FINNHUB_API_KEY"];
  if (typeof raw !== "string") return null;
  const key = raw.trim().replace(/^['"]|['"]$/g, "");
  return key || null;
}

export function isFinnhubProEnabled(): boolean {
  return Boolean(readFinnhubKey());
}

async function finnhubGet<T>(path: string): Promise<T | null> {
  const key = readFinnhubKey();
  if (!key) return null;
  const url = `${FINNHUB_BASE}${path}${path.includes("?") ? "&" : "?"}token=${encodeURIComponent(key)}`;
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export type FinnhubProNewsItem = {
  headline: string;
  summary?: string;
  url?: string;
  datetime: number;
  source?: string;
};

export type FinnhubProNewsContext = {
  items6h: FinnhubProNewsItem[];
  items24h: FinnhubProNewsItem[];
  positive6h: boolean;
  positive24h: boolean;
};

export type FinnhubProSentiment = {
  score: number;
  bullishPercent: number | null;
  bearishPercent: number | null;
};

function isPositiveHeadline(text: string): boolean {
  const lower = text.toLowerCase();
  const bullish = ["beat", "surge", "upgrade", "growth", "record", "profit", "strong", "buy", "raise"];
  const bearish = ["miss", "cut", "downgrade", "loss", "weak", "sell", "probe", "lawsuit", "decline"];
  let score = 0;
  for (const w of bullish) if (lower.includes(w)) score += 1;
  for (const w of bearish) if (lower.includes(w)) score -= 1;
  return score >= 0;
}

/** Company news for symbol — last 24h window, tagged for 6h catalyst. */
export async function fetchCompanyNewsContext(symbol: string): Promise<FinnhubProNewsContext> {
  const sym = symbol.trim().toUpperCase();
  if (!sym || !isFinnhubProEnabled()) {
    return { items6h: [], items24h: [], positive6h: false, positive24h: false };
  }

  const cacheId = cacheKey("finnhub-pro-news", sym);
  return getOrSetCached(cacheId, NEWS_TTL_MS, async () => {
    const to = new Date();
    const from = new Date(to.getTime() - 24 * 60 * 60 * 1000);
    const fromStr = from.toISOString().slice(0, 10);
    const toStr = to.toISOString().slice(0, 10);
    const body = await finnhubGet<
      Array<{
        headline?: string;
        summary?: string;
        url?: string;
        datetime?: number;
        source?: string;
      }>
    >(`/company-news?symbol=${encodeURIComponent(sym)}&from=${fromStr}&to=${toStr}`);

    const nowSec = Math.floor(Date.now() / 1000);
    const items24h: FinnhubProNewsItem[] = [];
    for (const row of body ?? []) {
      if (!row.headline || typeof row.datetime !== "number") continue;
      items24h.push({
        headline: row.headline,
        summary: row.summary,
        url: row.url,
        datetime: row.datetime,
        source: row.source,
      });
    }

    const items6h = items24h.filter((n) => nowSec - n.datetime <= 6 * 3600);
    const positive6h = items6h.some(
      (n) => isPositiveHeadline(`${n.headline} ${n.summary ?? ""}`),
    );
    const positive24h = items24h.some(
      (n) => isPositiveHeadline(`${n.headline} ${n.summary ?? ""}`),
    );

    return { items6h, items24h, positive6h, positive24h };
  });
}

/** News-sentiment vendor score for symbol (-1..1). */
export async function fetchNewsSentiment(symbol: string): Promise<FinnhubProSentiment | null> {
  const sym = symbol.trim().toUpperCase();
  if (!sym || !isFinnhubProEnabled()) return null;

  const cacheId = cacheKey("finnhub-pro-sentiment", sym);
  return getOrSetCached(cacheId, SENTIMENT_TTL_MS, async () => {
    const body = await finnhubGet<{
      companyNewsScore?: number;
      sentiment?: { bullishPercent?: number; bearishPercent?: number };
    }>(`/news-sentiment?symbol=${encodeURIComponent(sym)}`);

    if (!body) return null;
    const bull = body.sentiment?.bullishPercent;
    const bear = body.sentiment?.bearishPercent;
    let score: number | null = null;
    if (typeof bull === "number" && typeof bear === "number") score = (bull - bear) / 100;
    else if (typeof body.companyNewsScore === "number") score = body.companyNewsScore * 2 - 1;
    if (score == null || !Number.isFinite(score)) return null;
    return {
      score: Math.max(-1, Math.min(1, score)),
      bullishPercent: typeof bull === "number" ? bull : null,
      bearishPercent: typeof bear === "number" ? bear : null,
    };
  });
}

const CATALYST_WORDS = [
  "earnings beat",
  "beats estimates",
  "fda approval",
  "contract",
  "upgrade",
  "acquires",
  "acquisition",
  "merger",
  "m&a",
  "raises guidance",
];

/**
 * General market news → extract likely ticker symbols for session universe boost.
 * Uses FINNHUB_API_KEY from env (never hardcode).
 */
export async function fetchGeneralNewsCatalysts(): Promise<string[]> {
  if (!isFinnhubProEnabled()) return [];
  const cacheId = cacheKey("finnhub-pro-general-catalysts", "v1");
  return getOrSetCached(cacheId, NEWS_TTL_MS, async () => {
    const body = await finnhubGet<
      Array<{ headline?: string; summary?: string; related?: string }>
    >(`/news?category=general`);
    const tickers = new Set<string>();
    for (const row of body ?? []) {
      const text = `${row.headline ?? ""} ${row.summary ?? ""}`.toLowerCase();
      const related = String(row.related ?? "")
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .filter((s) => /^[A-Z]{1,5}$/.test(s));
      const isCatalyst = CATALYST_WORDS.some((w) => text.includes(w));
      if (!isCatalyst && !isPositiveHeadline(text)) continue;
      for (const t of related) tickers.add(t);
    }
    return [...tickers].slice(0, 40);
  });
}

