/** Program 4600 — Mobile app templates. */

import type { Template } from "./types";

export const MOBILE_TEMPLATES: Template[] = [
  {
    id: "consumer-app",
    name: "App de Consumo",
    description: "Experiencia B2C con onboarding, feed y perfil de usuario.",
    category: "consumer",
    icon: "📱",
    techStack: ["React Native", "Expo", "Android", "iOS"],
    defaultScreens: ["Onboarding", "Home", "Explore", "Profile", "Settings"],
    defaultNav: "tabs",
    features: ["Onboarding", "Push notifications", "Perfil editable"],
  },
  {
    id: "saas-mobile",
    name: "SaaS Móvil",
    description: "Dashboard ejecutivo, métricas y gestión de equipo.",
    category: "saas",
    icon: "💼",
    techStack: ["React Native", "Expo", "Android", "iOS"],
    defaultScreens: ["Login", "Dashboard", "Analytics", "Team", "Billing"],
    defaultNav: "drawer",
    features: ["Auth empresarial", "KPIs", "Multi-tenant"],
  },
  {
    id: "marketplace",
    name: "Marketplace",
    description: "Catálogo, carrito, checkout y seguimiento de pedidos.",
    category: "marketplace",
    icon: "🛒",
    techStack: ["React Native", "Expo", "Android", "iOS"],
    defaultScreens: ["Home", "Catalog", "ProductDetail", "Cart", "Orders"],
    defaultNav: "tabs",
    features: ["Búsqueda", "Pagos", "Tracking"],
  },
  {
    id: "social",
    name: "Red Social",
    description: "Feed, mensajes, notificaciones y perfiles públicos.",
    category: "social",
    icon: "💬",
    techStack: ["React Native", "Expo", "Android", "iOS"],
    defaultScreens: ["Feed", "Messages", "Notifications", "Profile", "CreatePost"],
    defaultNav: "tabs",
    features: ["Feed infinito", "Chat", "Media upload"],
  },
  {
    id: "fitness",
    name: "Fitness & Wellness",
    description: "Rutinas, progreso, calendario y comunidad.",
    category: "fitness",
    icon: "🏃",
    techStack: ["React Native", "Expo", "Android", "iOS"],
    defaultScreens: ["Today", "Workouts", "Progress", "Community", "Profile"],
    defaultNav: "tabs",
    features: ["Tracking", "Calendario", "Gamificación"],
  },
  {
    id: "fintech",
    name: "Fintech Wallet",
    description: "Billetera digital, transacciones y KYC simplificado.",
    category: "fintech",
    icon: "💳",
    techStack: ["React Native", "Expo", "Android", "iOS"],
    defaultScreens: ["Wallet", "Transactions", "Send", "Receive", "KYC"],
    defaultNav: "stack",
    features: ["Biometría", "Historial", "KYC stub"],
  },
  {
    id: "utility",
    name: "Utilidad / Herramienta",
    description: "App de productividad con flujos simples y offline-first.",
    category: "utility",
    icon: "🔧",
    techStack: ["React Native", "Expo", "Android", "iOS"],
    defaultScreens: ["Home", "Tasks", "Notes", "Settings"],
    defaultNav: "stack",
    features: ["Offline", "Sync", "Widgets"],
  },
];

export function getTemplateById(id: string): Template | undefined {
  return MOBILE_TEMPLATES.find((t) => t.id === id);
}

export function getTemplatesByCategory(category: Template["category"]): Template[] {
  return MOBILE_TEMPLATES.filter((t) => t.category === category);
}
