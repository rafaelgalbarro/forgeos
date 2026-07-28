export * from "./types";
export * from "./beta-signup";
export * from "./onboarding-flow";
export * from "./analytics-hooks";
export * from "./feedback-widget";
export * from "./changelog";
export * from "./public-roadmap";

import type { DocArticle, PricingTier, SupportArticle, StatusService } from "./types";

export const PRICING_TIERS: PricingTier[] = [
  {
    id: "starter",
    name: "Starter",
    price: "€0",
    period: "/mes",
    description: "Para explorar ForgeOS y tu primera venture demo.",
    features: [
      "1 venture demo activa",
      "AI discovery básico",
      "Venture Factory (dry-run)",
      "Acceso a docs y comunidad",
    ],
    cta: "Empezar gratis",
  },
  {
    id: "founder",
    name: "Founder",
    price: "€49",
    period: "/mes",
    description: "Para fundadores que construyen ventures reales.",
    features: [
      "5 ventures activas",
      "Venture Intelligence completo",
      "Founder dashboard + journey",
      "Live AI operations",
      "Soporte prioritario",
    ],
    cta: "Solicitar beta",
    highlighted: true,
    badge: "Más popular",
  },
  {
    id: "studio",
    name: "Studio",
    price: "€199",
    period: "/mes",
    description: "Para estudios y equipos que escalan portfolios.",
    features: [
      "Ventures ilimitadas",
      "Autonomous organization",
      "Marketplace + store",
      "Forge Capital lab",
      "API access (próximamente)",
      "Account manager dedicado",
    ],
    cta: "Contactar ventas",
  },
];

export const DOC_ARTICLES: DocArticle[] = [
  {
    slug: "quickstart",
    title: "Quickstart — Tu primera venture en 10 minutos",
    summary: "Desde beta signup hasta tu primera venture demo en ForgeOS.",
    category: "quickstart",
    readMinutes: 5,
  },
  {
    slug: "onboarding",
    title: "Guía de onboarding",
    summary: "Configura tu perfil, objetivos y workspace.",
    category: "guide",
    readMinutes: 3,
  },
  {
    slug: "venture-factory",
    title: "Venture Factory",
    summary: "Pipeline completo: idea → brand → landing → launch.",
    category: "guide",
    readMinutes: 8,
  },
  {
    slug: "founder-journey",
    title: "Founder Journey",
    summary: "Recorrido guiado del fundador por fases de la venture.",
    category: "guide",
    readMinutes: 6,
  },
  {
    slug: "pricing",
    title: "Planes y límites",
    summary: "Comparativa de tiers y qué incluye cada plan.",
    category: "reference",
    readMinutes: 4,
  },
  {
    slug: "privacy",
    title: "Privacidad",
    summary: "Cómo tratamos tus datos en la beta privada.",
    category: "legal",
    readMinutes: 5,
  },
  {
    slug: "security",
    title: "Seguridad",
    summary: "Prácticas de seguridad y dry-run en RC12.",
    category: "legal",
    readMinutes: 5,
  },
];

export const SUPPORT_ARTICLES: SupportArticle[] = [
  {
    id: "getting-started-beta",
    title: "¿Cómo accedo a la beta?",
    summary: "Regístrate en /beta, completa onboarding y entra a /os.",
    category: "getting-started",
  },
  {
    id: "first-venture",
    title: "Crear mi primera venture",
    summary: "Usa Venture Factory o Founder Journey desde /os.",
    category: "getting-started",
  },
  {
    id: "billing-placeholder",
    title: "Facturación (próximamente)",
    summary: "RC12 no incluye pagos reales. Los planes son informativos.",
    category: "billing",
  },
  {
    id: "local-storage",
    title: "¿Dónde se guardan mis datos?",
    summary: "En RC12, ventures y preferencias usan localStorage del navegador.",
    category: "technical",
  },
  {
    id: "reset-data",
    title: "Resetear mi cuenta local",
    summary: "Limpia localStorage o usa reset:dev en desarrollo.",
    category: "account",
  },
];

export const STATUS_SERVICES: StatusService[] = [
  {
    id: "forgeos-app",
    name: "ForgeOS App",
    status: "operational",
    description: "Aplicación principal y rutas de producto.",
  },
  {
    id: "ai-runtime",
    name: "AI Runtime",
    status: "operational",
    description: "Model router, prompt compiler y streaming.",
  },
  {
    id: "venture-factory",
    name: "Venture Factory",
    status: "operational",
    description: "Pipeline de generación de ventures.",
  },
  {
    id: "live-ops",
    name: "Live Operations",
    status: "degraded",
    description: "Centro de operaciones en modo dry-run.",
  },
  {
    id: "forge-cloud",
    name: "Forge Cloud Deploy",
    status: "maintenance",
    description: "Deploy real programado para Q4 2026.",
  },
];
