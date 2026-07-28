/** Program 7000 — Knowledge base (extends commercial KB) */

import {
  KNOWLEDGE_BASE_ARTICLES,
  listKnowledgeBaseArticles,
  searchKnowledgeBase,
} from "@/lib/commercial/knowledge-base";
import { SUPPORT_ARTICLES } from "@/lib/launch";
import type { PublicDocEntry } from "./types";

export { KNOWLEDGE_BASE_ARTICLES, listKnowledgeBaseArticles, searchKnowledgeBase };

export const LAUNCH_KB_ARTICLES: PublicDocEntry[] = [
  ...KNOWLEDGE_BASE_ARTICLES.map((a) => ({
    id: a.id,
    title: a.title,
    summary: a.summary,
    href: a.href ?? `/docs/${a.id}`,
    category: a.category,
  })),
  ...SUPPORT_ARTICLES.map((a) => ({
    id: a.id,
    title: a.title,
    summary: a.summary,
    href: `/support#${a.id}`,
    category: a.category,
  })),
  {
    id: "launch-hub",
    title: "Hub de lanzamiento ForgeOS 1.0",
    summary: "Navegación por todas las superficies públicas del launch.",
    href: "/launch",
    category: "launch",
  },
  {
    id: "product-tour",
    title: "Tour de producto interactivo",
    summary: "Recorrido guiado por Venture Factory, Founder Journey y Live Ops.",
    href: "/demo",
    category: "launch",
  },
];

export function listLaunchKnowledgeBase(category?: string): PublicDocEntry[] {
  if (!category) return LAUNCH_KB_ARTICLES;
  return LAUNCH_KB_ARTICLES.filter((a) => a.category === category);
}

export function searchLaunchKnowledgeBase(query: string): PublicDocEntry[] {
  const q = query.toLowerCase();
  return LAUNCH_KB_ARTICLES.filter(
    (a) => a.title.toLowerCase().includes(q) || a.summary.toLowerCase().includes(q)
  );
}
