import type { DetectedTag } from "@/lib/intelligence/types";
import { detectTags } from "@/lib/intelligence/heuristics";
import type { KnowledgeDomain, KnowledgeEntryBase, KnowledgeQuery, KnowledgeStore } from "./types";
import { knowledgeStore } from "./knowledge-store";
import { getDefaultDomainsForWorker } from "./worker-scope";
import type { PatternEntry } from "./patterns";

export interface IdeaPatternMatch {
  entry: KnowledgeEntryBase;
  score: number;
  matchedTags: string[];
}

export interface RecommendedPatternsResult {
  patterns: IdeaPatternMatch[];
  architectures: IdeaPatternMatch[];
  businessModels: IdeaPatternMatch[];
  competitors: IdeaPatternMatch[];
}

function scoreEntry(entry: KnowledgeEntryBase, tagIds: string[], ideaText: string): { score: number; matchedTags: string[] } {
  const matchedTags = entry.tags.filter((tag) => tagIds.includes(tag));
  let score = matchedTags.length * 10;

  const q = ideaText.toLowerCase();
  if (entry.title.toLowerCase().split(/\s+/).some((w) => w.length > 3 && q.includes(w.toLowerCase()))) {
    score += 5;
  }
  if (entry.description.toLowerCase().split(/\s+/).slice(0, 8).some((w) => w.length > 4 && q.includes(w))) {
    score += 3;
  }

  return { score, matchedTags };
}

function rankEntries(entries: KnowledgeEntryBase[], tagIds: string[], ideaText: string, limit = 5): IdeaPatternMatch[] {
  return entries
    .map((entry) => {
      const { score, matchedTags } = scoreEntry(entry, tagIds, ideaText);
      return { entry, score, matchedTags };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function getKnowledgeByDomain(
  domain: KnowledgeDomain,
  store: KnowledgeStore = knowledgeStore
): KnowledgeEntryBase[] {
  return store.getByDomain(domain);
}

export function searchKnowledge(
  query: string,
  options: Omit<KnowledgeQuery, "search"> = {},
  store: KnowledgeStore = knowledgeStore
): KnowledgeEntryBase[] {
  return store.query({ ...options, search: query });
}

export function getKnowledgeForWorker(
  workerId: string,
  options: Omit<KnowledgeQuery, "workerId"> = {},
  store: KnowledgeStore = knowledgeStore
): KnowledgeEntryBase[] {
  const domains = getDefaultDomainsForWorker(workerId);
  const byWorker = store.query({ ...options, workerId });

  if (byWorker.length > 0) {
    return options.limit ? byWorker.slice(0, options.limit) : byWorker;
  }

  const byDomain = domains.flatMap((domain) =>
    store.query({ domain: domain as KnowledgeDomain, ...options })
  );

  const unique = new Map(byDomain.map((e) => [e.id, e]));
  const results = [...unique.values()];
  return options.limit ? results.slice(0, options.limit) : results;
}

export function getRecommendedPatternsForIdea(
  ideaText: string,
  tags?: DetectedTag[],
  store: KnowledgeStore = knowledgeStore
): RecommendedPatternsResult {
  const detected = tags ?? detectTags(ideaText);
  const tagIds = detected.map((t) => t.id);

  return {
    patterns: rankEntries(store.getByDomain("patterns"), tagIds, ideaText, 4),
    architectures: rankEntries(store.getByDomain("architecture"), tagIds, ideaText, 3),
    businessModels: rankEntries(store.getByDomain("business-models"), tagIds, ideaText, 3),
    competitors: rankEntries(store.getByDomain("competitors"), tagIds, ideaText, 4),
  };
}

export function getTopPatternTitles(ideaText: string, tags?: DetectedTag[]): string[] {
  const { patterns } = getRecommendedPatternsForIdea(ideaText, tags);
  return patterns.map((p) => (p.entry as PatternEntry).title);
}
