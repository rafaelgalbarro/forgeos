import "server-only";

import { cacheKey, getCached, setCached } from "@/lib/market-data/cache";
import type { NewsAggregate, NewsItem, SentimentLabel } from "@/lib/market-data/types";

const NEWS_CACHE_TTL_MS = 15 * 60 * 1000;

const TICKER_COMPANY: Record<string, string> = {
  AAPL: "Apple",
  MSFT: "Microsoft",
  NVDA: "NVIDIA",
  TSLA: "Tesla",
  AMZN: "Amazon",
  GOOGL: "Google Alphabet",
  META: "Meta Facebook",
  SPY: "S&P 500",
  QQQ: "Nasdaq QQQ",
  ASML: "ASML",
  SAP: "SAP",
  SHEL: "Shell",
  BP: "BP oil",
  EZU: "Eurozone ETF",
  VGK: "Europe ETF",
  AIR: "Airbus",
  MC: "LVMH",
  BABA: "Alibaba",
  TSM: "TSMC Taiwan Semiconductor",
};

const POSITIVE_WORDS = [
  "surge", "rally", "beat", "upgrade", "growth", "profit", "record", "bullish", "gain", "soar",
  "jump", "rise", "strong", "outperform", "breakout", "recovery", "optimism", "buy",
  "sube", "alcista", "récord", "beneficio", "crecimiento",
];

const NEGATIVE_WORDS = [
  "fall", "drop", "miss", "downgrade", "loss", "bearish", "plunge", "cut", "warn", "decline",
  "crash", "slump", "weak", "underperform", "lawsuit", "investigation", "sell", "recall",
  "baja", "caída", "pérdida", "bajista", "recorte", "alerta",
];

function hoursAgo(iso: string): number {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return 999;
  return Math.floor(ms / 3_600_000);
}

function scoreSentiment(text: string): { sentiment: SentimentLabel; score: number } {
  const lower = text.toLowerCase();
  let pos = 0;
  let neg = 0;
  for (const w of POSITIVE_WORDS) if (lower.includes(w)) pos += 1;
  for (const w of NEGATIVE_WORDS) if (lower.includes(w)) neg += 1;
  if (pos > neg) return { sentiment: "POSITIVE", score: Math.min(1, 0.5 + pos * 0.15) };
  if (neg > pos) return { sentiment: "NEGATIVE", score: Math.min(1, 0.5 + neg * 0.15) };
  return { sentiment: "NEUTRAL", score: 0.5 };
}

function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

function isDuplicate(title: string, seen: Set<string>): boolean {
  const norm = normalizeTitle(title);
  if (norm.length < 8) return false;
  const prefix = norm.slice(0, 48);
  for (const s of seen) {
    if (s.includes(prefix) || prefix.includes(s)) return true;
  }
  seen.add(prefix);
  return false;
}

function overallFromItems(items: readonly NewsItem[]): NewsAggregate["overallSentiment"] {
  if (items.length === 0) return "NEUTRAL";
  const avg =
    items.reduce((s, i) => s + (i.sentiment === "POSITIVE" ? 1 : i.sentiment === "NEGATIVE" ? -1 : 0), 0) /
    items.length;
  if (avg > 0.2) return "BULLISH";
  if (avg < -0.2) return "BEARISH";
  return "NEUTRAL";
}

async function fetchNewsApi(ticker: string, errors: string[]): Promise<NewsItem[]> {
  const key = process.env.NEWS_API_KEY?.trim();
  if (!key) {
    errors.push("NewsAPI: NEWS_API_KEY no configurada");
    return [];
  }
  const query = encodeURIComponent(`${ticker} OR ${TICKER_COMPANY[ticker] ?? ticker}`);
  const from = new Date(Date.now() - 24 * 3_600_000).toISOString();
  const url = `https://newsapi.org/v2/everything?q=${query}&from=${from}&sortBy=publishedAt&language=en&pageSize=15&apiKey=${key}`;
  try {
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(12_000) });
    if (!res.ok) {
      errors.push(`NewsAPI: HTTP ${res.status}`);
      return [];
    }
    const data = (await res.json()) as {
      articles?: Array<{ title?: string; source?: { name?: string }; url?: string; publishedAt?: string }>;
    };
    return (data.articles ?? [])
      .filter((a) => a.title?.trim())
      .map((a) => {
        const { sentiment, score } = scoreSentiment(a.title ?? "");
        const publishedAt = a.publishedAt ?? new Date().toISOString();
        return {
          title: a.title!.trim(),
          source: "NewsAPI",
          url: a.url,
          publishedAt,
          hoursAgo: hoursAgo(publishedAt),
          sentiment,
          sentimentScore: score,
        };
      });
  } catch (err) {
    errors.push(`NewsAPI: ${err instanceof Error ? err.message : "fetch failed"}`);
    return [];
  }
}

async function fetchAlpacaNews(ticker: string, errors: string[]): Promise<NewsItem[]> {
  const url = `https://data.alpaca.markets/v1beta1/news?symbols=${encodeURIComponent(ticker)}&limit=15&sort=desc`;
  try {
    const res = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      errors.push(`Alpaca: HTTP ${res.status}`);
      return [];
    }
    const data = (await res.json()) as {
      news?: Array<{ headline?: string; source?: string; url?: string; created_at?: string }>;
    };
    const rows = data.news ?? [];
    return rows
      .filter((a) => (a.headline ?? "").trim())
      .map((a) => {
        const title = (a.headline ?? "").trim();
        const { sentiment, score } = scoreSentiment(title);
        const publishedAt = a.created_at ?? new Date().toISOString();
        return {
          title,
          source: "Alpaca",
          url: a.url,
          publishedAt,
          hoursAgo: hoursAgo(publishedAt),
          sentiment,
          sentimentScore: score,
        };
      });
  } catch (err) {
    errors.push(`Alpaca: ${err instanceof Error ? err.message : "fetch failed"}`);
    return [];
  }
}

function parseYahooRss(xml: string): NewsItem[] {
  const items: NewsItem[] = [];
  const itemBlocks = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];
  for (const block of itemBlocks) {
    const title =
      block.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/i)?.[1] ??
      block.match(/<title>([\s\S]*?)<\/title>/i)?.[1];
    const link = block.match(/<link>([\s\S]*?)<\/link>/i)?.[1];
    const pubDate = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)?.[1];
    if (!title?.trim()) continue;
    const publishedAt = pubDate ? new Date(pubDate).toISOString() : new Date().toISOString();
    const { sentiment, score } = scoreSentiment(title);
    items.push({
      title: title.trim(),
      source: "Yahoo RSS",
      url: link?.trim(),
      publishedAt,
      hoursAgo: hoursAgo(publishedAt),
      sentiment,
      sentimentScore: score,
    });
  }
  return items.filter((i) => i.hoursAgo <= 24);
}

async function fetchYahooRss(ticker: string, errors: string[]): Promise<NewsItem[]> {
  const url = `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(ticker)}&region=US&lang=en-US`;
  try {
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(12_000) });
    if (!res.ok) {
      errors.push(`Yahoo RSS: HTTP ${res.status}`);
      return [];
    }
    return parseYahooRss(await res.text());
  } catch (err) {
    errors.push(`Yahoo RSS: ${err instanceof Error ? err.message : "fetch failed"}`);
    return [];
  }
}

async function fetchRedditMentions(ticker: string, errors: string[]): Promise<NewsItem[]> {
  const subs = ["wallstreetbets", "investing"];
  const out: NewsItem[] = [];
  for (const sub of subs) {
    const url = `https://www.reddit.com/r/${sub}/search.json?q=${encodeURIComponent(ticker)}&restrict_sr=1&sort=new&limit=5`;
    try {
      const res = await fetch(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
        headers: { "User-Agent": "ForgeOS-Investment/1.0" },
      });
      if (!res.ok) continue;
      const data = (await res.json()) as {
        data?: { children?: Array<{ data?: { title?: string; created_utc?: number; permalink?: string } }> };
      };
      for (const child of data.data?.children ?? []) {
        const title = child.data?.title?.trim();
        if (!title) continue;
        const publishedAt = new Date((child.data?.created_utc ?? 0) * 1000).toISOString();
        const { sentiment, score } = scoreSentiment(title);
        out.push({
          title: `[r/${sub}] ${title}`,
          source: "Reddit",
          url: child.data?.permalink ? `https://reddit.com${child.data.permalink}` : undefined,
          publishedAt,
          hoursAgo: hoursAgo(publishedAt),
          sentiment,
          sentimentScore: score,
        });
      }
    } catch {
      // optional
    }
  }
  if (out.length === 0) errors.push("Reddit: sin menciones recientes");
  return out.filter((i) => i.hoursAgo <= 24);
}

/** Aggregates news from NewsAPI, Alpaca, Yahoo RSS (+ Reddit). Cache 15 min. */
export async function aggregateNews(ticker: string): Promise<NewsAggregate> {
  const symbol = ticker.trim().toUpperCase();
  const cacheId = cacheKey("news", symbol);
  const cached = getCached<NewsAggregate>(cacheId);
  if (cached) return cached;

  const errors: string[] = [];
  const sourcesUsed: string[] = [];

  const [newsApi, alpaca, yahoo, reddit] = await Promise.all([
    fetchNewsApi(symbol, errors),
    fetchAlpacaNews(symbol, errors),
    fetchYahooRss(symbol, errors),
    fetchRedditMentions(symbol, errors),
  ]);

  if (newsApi.length) sourcesUsed.push("NewsAPI");
  if (alpaca.length) sourcesUsed.push("Alpaca");
  if (yahoo.length) sourcesUsed.push("Yahoo RSS");
  if (reddit.length) sourcesUsed.push("Reddit");

  const seen = new Set<string>();
  const merged = [...newsApi, ...alpaca, ...yahoo, ...reddit]
    .filter((item) => !isDuplicate(item.title, seen))
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  const items = merged.slice(0, 5);
  const result: NewsAggregate = {
    items,
    overallSentiment: overallFromItems(items),
    newsCount24h: merged.length,
    sourcesUsed,
    errors,
  };

  setCached(cacheId, result, NEWS_CACHE_TTL_MS);
  console.log(`[NewsAggregator] ${symbol} → ${items.length} items (${sourcesUsed.join(", ") || "none"})`);
  return result;
}
