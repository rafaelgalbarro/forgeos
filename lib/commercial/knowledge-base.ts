/** Program 6000 — Knowledge base articles stub */

import type { KnowledgeBaseArticle } from "./types";

export const KNOWLEDGE_BASE_ARTICLES: KnowledgeBaseArticle[] = [
  {
    id: "kb-getting-started",
    title: "Primeros pasos con ForgeOS",
    summary: "Registro, onboarding y tu primera venture.",
    category: "getting-started",
    href: "/docs/quickstart",
  },
  {
    id: "kb-billing-faq",
    title: "Preguntas sobre facturación",
    summary: "Planes, trials, upgrades y facturas.",
    category: "billing",
    href: "/billing",
  },
  {
    id: "kb-api-keys",
    title: "Gestionar API keys",
    summary: "Crear, rotar y revocar claves API.",
    category: "api",
    href: "/api-keys",
  },
  {
    id: "kb-plans-limits",
    title: "Límites por plan",
    summary: "Comparativa Starter, Pro, Business y Enterprise.",
    category: "billing",
    href: "/pricing",
  },
  {
    id: "kb-support",
    title: "Contactar soporte",
    summary: "Canales de ayuda durante beta y comercial.",
    category: "support",
    href: "/support",
  },
  {
    id: "kb-security",
    title: "Seguridad y cumplimiento",
    summary: "GDPR, SOC2 y mejores prácticas.",
    category: "security",
    href: "/security",
  },
];

export function listKnowledgeBaseArticles(category?: string): KnowledgeBaseArticle[] {
  if (!category) return KNOWLEDGE_BASE_ARTICLES;
  return KNOWLEDGE_BASE_ARTICLES.filter((a) => a.category === category);
}

export function searchKnowledgeBase(query: string): KnowledgeBaseArticle[] {
  const q = query.toLowerCase();
  return KNOWLEDGE_BASE_ARTICLES.filter(
    (a) => a.title.toLowerCase().includes(q) || a.summary.toLowerCase().includes(q)
  );
}
