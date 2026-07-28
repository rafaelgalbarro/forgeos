/** Program 7000 — Public documentation index */

import { DOC_ARTICLES } from "@/lib/launch";
import { getDocsPortalSections, getDocsPortalStats } from "@/lib/commercial/docs-portal";
import type { PublicDocEntry } from "./types";

export function getPublicDocsIndex(): PublicDocEntry[] {
  const portal = getDocsPortalSections();
  return portal.flatMap((section) =>
    section.articles.map((a) => ({
      id: a.id,
      title: a.title,
      summary: a.summary,
      href: a.href ?? `/docs/${a.id}`,
      category: section.title,
    }))
  );
}

export function getPublicDocsQuickstart(): PublicDocEntry | undefined {
  const article = DOC_ARTICLES.find((a) => a.slug === "quickstart");
  if (!article) return undefined;
  return {
    id: article.slug,
    title: article.title,
    summary: article.summary,
    href: `/docs/${article.slug}`,
    category: "Quickstart",
  };
}

export function getPublicDocsStats() {
  return getDocsPortalStats();
}
