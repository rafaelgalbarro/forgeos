import type { RoadmapItem } from "./types";

export const PUBLIC_ROADMAP: RoadmapItem[] = [
  {
    id: "launch-surfaces",
    title: "Launch Surfaces RC12",
    description: "Landing, pricing, onboarding, docs y beta flow.",
    quarter: "Q3 2026",
    status: "shipped",
    category: "platform",
  },
  {
    id: "venture-factory-v2",
    title: "Venture Factory v2",
    description: "Pipeline mejorado con validación de mercado en tiempo real.",
    quarter: "Q3 2026",
    status: "in-progress",
    category: "ai",
  },
  {
    id: "forge-cloud",
    title: "Forge Cloud Deploy",
    description: "Deploy real a Vercel/Supabase con un clic.",
    quarter: "Q4 2026",
    status: "planned",
    category: "platform",
  },
  {
    id: "marketplace-v1",
    title: "Marketplace v1",
    description: "Skills, templates y plugins de la comunidad.",
    quarter: "Q4 2026",
    status: "planned",
    category: "ecosystem",
  },
  {
    id: "enterprise-sso",
    title: "Enterprise SSO & RBAC",
    description: "Single sign-on, roles y audit logs para equipos.",
    quarter: "Q1 2027",
    status: "planned",
    category: "enterprise",
  },
  {
    id: "ai-board",
    title: "AI Board of Directors",
    description: "Consejo ejecutivo autónomo con decisiones gobernadas.",
    quarter: "Q1 2027",
    status: "planned",
    category: "ai",
  },
];

export const ROADMAP_BY_STATUS = {
  shipped: PUBLIC_ROADMAP.filter((i) => i.status === "shipped"),
  "in-progress": PUBLIC_ROADMAP.filter((i) => i.status === "in-progress"),
  planned: PUBLIC_ROADMAP.filter((i) => i.status === "planned"),
};
