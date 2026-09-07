import type { MarketIntelligenceRequest, NewsItem, SentimentSignal } from "../../domain";
import { createStubNewsProvider, createStubSentimentProvider } from "./shared";

type Env = Record<string, string | undefined>;

export type TextFetcher = (url: string, init?: RequestInit) => Promise<string>;

function createDefaultTextFetcher(timeoutMs = 8_000): TextFetcher {
  return async (url, init) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...init, signal: controller.signal, cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.text();
    } finally {
      clearTimeout(timer);
    }
  };
}

function parseRssItems(xml: string, feedUrl: string, limit: number): NewsItem[] {
  const items: NewsItem[] = [];
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) ?? xml.match(/<entry[\s\S]*?<\/entry>/gi) ?? [];
  for (const block of blocks.slice(0, limit)) {
    const title =
      block.match(/<title[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/title>/i)?.[1] ??
      block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
    const link =
      block.match(/<link[^>]*href=["']([^"']+)["']/i)?.[1] ??
      block.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1];
    const pub =
      block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)?.[1] ??
      block.match(/<updated[^>]*>([\s\S]*?)<\/updated>/i)?.[1] ??
      block.match(/<published[^>]*>([\s\S]*?)<\/published>/i)?.[1];
    const summary =
      block.match(/<description[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/description>/i)?.[1] ??
      block.match(/<description[^>]*>([\s\S]*?)<\/description>/i)?.[1] ??
      block.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i)?.[1];
    if (!title || !link) continue;
    const cleanTitle = title.replace(/<[^>]+>/g, "").trim();
    const cleanLink = link.replace(/<[^>]+>/g, "").trim();
    if (!cleanTitle || !cleanLink) continue;
    items.push({
      id: cleanLink,
      title: cleanTitle,
      summary: summary ? summary.replace(/<[^>]+>/g, "").trim().slice(0, 280) : undefined,
      url: cleanLink,
      publishedAt: pub ? new Date(pub.trim()).toISOString() : new Date().toISOString(),
      source: feedUrl,
      providerId: "rss",
    });
  }
  return items;
}

/**
 * RSS/Atom feeds from RSS_FEED_URLS (comma-separated) when set.
 * Returns [] when unset or fetch/parse fails — never invents headlines.
 */
export function createRssNewsFetcher(options?: {
  readonly env?: Env;
  readonly textFetcher?: TextFetcher;
}): (request: MarketIntelligenceRequest) => Promise<readonly NewsItem[]> {
  const env = options?.env ?? process.env;
  const textFetcher = options?.textFetcher ?? createDefaultTextFetcher();

  return async (request) => {
    const raw = env.RSS_FEED_URLS?.trim();
    if (!raw) return [];
    const feeds = raw
      .split(",")
      .map((u) => u.trim())
      .filter(Boolean)
      .slice(0, 4);
    const limit = Math.min(Math.max(request.limitNewsItems ?? 8, 1), 20);
    const items: NewsItem[] = [];
    for (const feed of feeds) {
      try {
        const xml = await textFetcher(feed);
        items.push(...parseRssItems(xml, feed, limit));
      } catch {
        /* per-feed isolate */
      }
    }
    return items.slice(0, limit);
  };
}

/** Derived headline polarity from RSS items — not a vendor sentiment API. */
export function createRssSentimentFetcher(options?: {
  readonly env?: Env;
  readonly textFetcher?: TextFetcher;
}): (request: MarketIntelligenceRequest) => Promise<readonly SentimentSignal[]> {
  const newsFetcher = createRssNewsFetcher(options);
  return async (request) => {
    const news = await newsFetcher(request);
    if (news.length === 0) return [];
    const positive = /\b(gain|rally|surge|beat|growth|record|upgrade)\b/i;
    const negative = /\b(fall|drop|loss|miss|cut|downgrade|crash|fear)\b/i;
    return news.slice(0, 8).map((item, index) => {
      let score = 0;
      if (positive.test(item.title)) score += 0.3;
      if (negative.test(item.title)) score -= 0.3;
      score = Math.max(-1, Math.min(1, score));
      return {
        signalId: `rss-sent-${index}`,
        target: request.symbols[0] ?? "MARKETS",
        score,
        confidence: 0.3,
        rationale: `Derived from RSS headline polarity: ${item.title.slice(0, 80)}`,
        providerId: "rss",
        timestamp: item.publishedAt,
      };
    });
  };
}

export function createRssProvider(options?: {
  readonly newsFetcher?: (request: MarketIntelligenceRequest) => Promise<readonly NewsItem[]>;
  readonly sentimentFetcher?: (request: MarketIntelligenceRequest) => Promise<readonly SentimentSignal[]>;
  readonly env?: Env;
  readonly textFetcher?: TextFetcher;
}) {
  const shared = { env: options?.env, textFetcher: options?.textFetcher };
  return {
    news: createStubNewsProvider(
      { id: "rss", kind: "news", displayName: "RSS" },
      options?.newsFetcher ?? createRssNewsFetcher(shared),
    ),
    sentiment: createStubSentimentProvider(
      { id: "rss", kind: "sentiment", displayName: "RSS Sentiment" },
      options?.sentimentFetcher ?? createRssSentimentFetcher(shared),
    ),
  };
}
