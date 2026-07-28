/** PROGRAM 4400 — Website Templates catalog. */

import type { Template } from "./types";

export const WEBSITE_TEMPLATES: Template[] = [
  {
    id: "landing-saas",
    name: "Landing SaaS",
    category: "saas",
    description: "Landing page moderna para producto SaaS con hero, features y pricing.",
    tags: ["saas", "b2b", "conversion"],
    defaultPages: ["home", "pricing", "about"],
    suggestedComponents: ["Hero", "FeatureGrid", "PricingTable", "CTA", "Footer"],
  },
  {
    id: "portfolio-creative",
    name: "Portfolio Creativo",
    category: "portfolio",
    description: "Showcase visual para diseñadores, fotógrafos y creativos.",
    tags: ["portfolio", "creativo", "personal"],
    defaultPages: ["home", "work", "about", "contact"],
    suggestedComponents: ["Hero", "ProjectGrid", "Testimonials", "ContactForm"],
  },
  {
    id: "landing-startup",
    name: "Landing Startup",
    category: "landing",
    description: "Página de aterrizaje para startup early-stage con waitlist.",
    tags: ["startup", "waitlist", "mvp"],
    defaultPages: ["home"],
    suggestedComponents: ["Hero", "ProblemSolution", "WaitlistForm", "SocialProof"],
  },
  {
    id: "blog-magazine",
    name: "Blog / Revista",
    category: "blog",
    description: "Sitio editorial con listado de artículos y categorías.",
    tags: ["blog", "contenido", "seo"],
    defaultPages: ["home", "blog", "article", "about"],
    suggestedComponents: ["ArticleList", "ArticleHero", "Newsletter", "Sidebar"],
  },
  {
    id: "ecommerce-lite",
    name: "E-commerce Lite",
    category: "ecommerce",
    description: "Catálogo simple con productos destacados y checkout stub.",
    tags: ["ecommerce", "retail", "catalogo"],
    defaultPages: ["home", "shop", "product", "cart"],
    suggestedComponents: ["ProductGrid", "ProductCard", "CartDrawer", "CheckoutStub"],
  },
  {
    id: "docs-product",
    name: "Documentación",
    category: "docs",
    description: "Hub de documentación con navegación lateral y búsqueda.",
    tags: ["docs", "api", "developer"],
    defaultPages: ["home", "docs", "api-reference"],
    suggestedComponents: ["DocsSidebar", "DocsContent", "CodeBlock", "SearchBar"],
  },
];

export function getTemplateById(id: string): Template | undefined {
  return WEBSITE_TEMPLATES.find((t) => t.id === id);
}

export function listTemplatesByCategory(category: Template["category"]): Template[] {
  return WEBSITE_TEMPLATES.filter((t) => t.category === category);
}
