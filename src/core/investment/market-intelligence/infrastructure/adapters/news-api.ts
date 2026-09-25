import type { MarketIntelligenceRequest, NewsItem, SentimentSignal } from "../../domain";
import {
  createDefaultJsonFetcher,
  requireApiKey,
  type JsonFetcher,
} from "./http-shared";
import { createStubNewsProvider, createStubSentimentProvider } from "./shared";

type Env = Record<string, string | undefined>;

/**
 * Official NewsAPI everything endpoint when NEWSAPI_KEY is set.
 * Returns [] when key missing or HTTP fails — never invents headlines.
 */
export function createNewsApiNewsFetcher(options?: {
  readonly apiKey?: string;
  readonly env?: Env;
  readonly jsonFetcher?: JsonFetcher;
}): (request: MarketIntelligenceRequest) => Promise<readonly NewsItem[]> {
  const env = options?.env ?? process.env;
  const jsonFetcher = options?.jsonFetcher ?? createDefaultJsonFetcher();

  return async (request) => {
    let apiKey: string;
    try {
      apiKey = requireApiKey(options?.apiKey ?? env.NEWSAPI_KEY, "newsapi");
    } catch {
      return [];
    }

    const query = request.symbols.slice(0, 3).join(" OR ") || "markets";
    const limit = Math.min(Math.max(request.limitNewsItems ?? 8, 1), 20);
    try {
      const url =
        `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}` +
        `&pageSize=${limit}&language=en&sortBy=publishedAt` +
        `&apiKey=${encodeURIComponent(apiKey)}`;
      const body = (await jsonFetcher(url)) as {
        status?: string;
        articles?: Array<{
          title?: string;
          description?: string;
          url?: string;
          publishedAt?: string;
          source?: { name?: string; id?: string };
        }>;
      };
      if (body.status === "error" || !Array.isArray(body.articles)) return [];

      return body.articles
        .filter((a) => a.title && a.url)
        .map((a, index) => ({
          id: `${a.url}-${index}`,
          title: a.title!,
          summary: a.description,
          url: a.url!,
          publishedAt: a.publishedAt ?? new Date().toISOString(),
          source: a.source?.name ?? a.source?.id ?? "newsapi",
          providerId: "newsapi",
          symbols: request.symbols.slice(0, 4),
        }));
    } catch {
      return [];
    }
  };
}

/**
 * Lightweight headline polarity heuristic — labeled as derived, not a vendor sentiment API.
 * Returns [] when no news can be fetched.
 */
export function createNewsApiSentimentFetcher(options?: {
  readonly apiKey?: string;
  readonly env?: Env;
  readonly jsonFetcher?: JsonFetcher;
}): (request: MarketIntelligenceRequest) => Promise<readonly SentimentSignal[]> {
  const newsFetcher = createNewsApiNewsFetcher(options);
  return async (request) => {
    const news = await newsFetcher(request);
    if (news.length === 0) return [];
    const positive = /\b(gain|rally|surge|beat|growth|record|upgrade)\b/i;
    const negative = /\b(fall|drop|loss|miss|cut|downgrade|crash|fear)\b/i;
    const now = new Date().toISOString();
    return news.slice(0, 8).map((item, index) => {
      let score = 0;
      if (positive.test(item.title)) score += 0.35;
      if (negative.test(item.title)) score -= 0.35;
      score = Math.max(-1, Math.min(1, score));
      return {
        signalId: `newsapi-sent-${index}-${item.id.slice(0, 24)}`,
        target: request.symbols[0] ?? "MARKETS",
        score,
        confidence: 0.35,
        rationale: `Derived from NewsAPI headline polarity (not a vendor sentiment feed): ${item.title.slice(0, 80)}`,
        providerId: "newsapi",
        timestamp: item.publishedAt || now,
      };
    });
  };
}

export function createNewsApiProvider(options?: {
  readonly newsFetcher?: (request: MarketIntelligenceRequest) => Promise<readonly NewsItem[]>;
  readonly sentimentFetcher?: (request: MarketIntelligenceRequest) => Promise<readonly SentimentSignal[]>;
  readonly apiKey?: string;
  readonly env?: Env;
  readonly jsonFetcher?: JsonFetcher;
}) {
  const shared = {
    apiKey: options?.apiKey,
    env: options?.env,
    jsonFetcher: options?.jsonFetcher,
  };
  return {
    news: createStubNewsProvider(
      { id: "newsapi", kind: "news", displayName: "NewsAPI" },
      options?.newsFetcher ?? createNewsApiNewsFetcher(shared),
    ),
    sentiment: createStubSentimentProvider(
      { id: "newsapi", kind: "sentiment", displayName: "NewsAPI Sentiment" },
      options?.sentimentFetcher ?? createNewsApiSentimentFetcher(shared),
    ),
  };
}
