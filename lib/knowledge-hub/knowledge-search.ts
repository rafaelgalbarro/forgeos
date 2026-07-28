/** Venture Knowledge Hub — full-text search across nodes (Epic 7.5). */

import type { DocumentTree, KnowledgeCategory, KnowledgeNode, KnowledgeSearchResult } from "./types";

function normalize(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
}

function tokenize(query: string): string[] {
  return normalize(query)
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
}

function scoreField(text: string, tokens: string[]): number {
  const norm = normalize(text);
  let score = 0;
  for (const token of tokens) {
    if (norm.includes(token)) score += 10;
    if (norm.split(/\s+/).some((w) => w.startsWith(token))) score += 3;
  }
  return score;
}

export function searchKnowledgeNodes(
  tree: DocumentTree,
  query: string,
  options?: { category?: KnowledgeCategory }
): KnowledgeSearchResult[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const tokens = tokenize(trimmed);
  if (tokens.length === 0) return [];

  const results: KnowledgeSearchResult[] = [];

  for (const node of tree.nodes) {
    if (options?.category && node.category !== options.category) continue;

    const matchedFields: string[] = [];
    let score = 0;

    const titleScore = scoreField(node.title, tokens);
    if (titleScore > 0) {
      score += titleScore * 2;
      matchedFields.push("title");
    }

    const summaryScore = scoreField(node.summary, tokens);
    if (summaryScore > 0) {
      score += summaryScore;
      matchedFields.push("summary");
    }

    const contentScore = scoreField(node.content, tokens) * 0.5;
    if (contentScore > 0) {
      score += contentScore;
      matchedFields.push("content");
    }

    if (node.tags?.some((tag) => tokens.some((t) => normalize(tag).includes(t)))) {
      score += 5;
      matchedFields.push("tags");
    }

    if (score > 0) {
      results.push({ node, score, matchedFields });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}

export function filterTreeBySearch(
  tree: DocumentTree,
  query: string
): Set<string> {
  const results = searchKnowledgeNodes(tree, query);
  const visible = new Set<string>();

  for (const { node } of results) {
    visible.add(node.id);
    if (node.parentId) visible.add(node.parentId);
    for (const child of tree.nodes.filter((n) => n.parentId === node.id)) {
      visible.add(child.id);
    }
  }

  return visible;
}

export function highlightMatch(text: string, query: string): string {
  const tokens = tokenize(query);
  if (tokens.length === 0) return text;
  let result = text;
  for (const token of tokens) {
    const re = new RegExp(`(${token})`, "gi");
    result = result.replace(re, "**$1**");
  }
  return result;
}

export function nodeMatchesQuery(node: KnowledgeNode, query: string): boolean {
  if (!query.trim()) return true;
  const tokens = tokenize(query);
  const haystack = normalize(`${node.title} ${node.summary} ${node.content} ${node.tags?.join(" ") ?? ""}`);
  return tokens.every((t) => haystack.includes(t));
}
