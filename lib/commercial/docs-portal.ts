/** Program 6000 — Documentation portal data */

import { DOC_ARTICLES } from "@/lib/launch";
import { listKnowledgeBaseArticles } from "./knowledge-base";
import { listLegalDocuments } from "./legal";
import type { DocsPortalSection, KnowledgeBaseArticle } from "./types";

export const COMMERCIAL_DOC_SECTIONS: DocsPortalSection[] = [
  {
    id: "product",
    title: "Producto",
    articles: DOC_ARTICLES.map((a) => ({
      id: a.slug,
      title: a.title,
      summary: a.summary,
      category: a.category,
      href: `/docs/${a.slug}`,
    })),
  },
  {
    id: "commercial",
    title: "Comercial",
    articles: [
      {
        id: "commercial-pricing",
        title: "Planes y precios",
        summary: "Starter, Pro, Business y Enterprise.",
        category: "commercial",
        href: "/pricing",
      },
      {
        id: "commercial-billing",
        title: "Facturación",
        summary: "Suscripciones, facturas y portal de billing.",
        category: "commercial",
        href: "/billing",
      },
      {
        id: "commercial-api",
        title: "API pública",
        summary: "Endpoints, claves y webhooks.",
        category: "commercial",
        href: "/api-keys",
      },
    ],
  },
  {
    id: "support",
    title: "Soporte",
    articles: listKnowledgeBaseArticles(),
  },
  {
    id: "legal",
    title: "Legal",
    articles: listLegalDocuments().map((d) => ({
      id: d.id,
      title: d.title,
      summary: d.summary,
      category: "legal",
      href: d.href,
    })),
  },
];

export function getDocsPortalSections(): DocsPortalSection[] {
  return COMMERCIAL_DOC_SECTIONS;
}

export function getAllDocsArticles(): KnowledgeBaseArticle[] {
  return COMMERCIAL_DOC_SECTIONS.flatMap((s) => s.articles);
}

export function getDocsPortalStats(): { sections: number; articles: number } {
  const sections = COMMERCIAL_DOC_SECTIONS.length;
  const articles = getAllDocsArticles().length;
  return { sections, articles };
}
