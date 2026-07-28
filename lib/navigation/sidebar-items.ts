/** Sidebar navigation — PROGRAM 6060 Experience Layer Consolidation. */

export type SidebarSection = "primary" | "secondary" | "system" | "advanced";
export type SidebarStatus = "active" | "legacy" | "lab" | "hidden";

export interface SidebarItem {
  id: string;
  label: string;
  href: string;
  icon: string;
  section: SidebarSection;
  status: SidebarStatus;
  description?: string;
  developmentOnly?: boolean;
  requiredFeatureFlag?: string;
  children?: { label: string; href: string }[];
}

/**
 * Primary: Mission Control, Ventures, Studio, Company, Activity, Settings.
 * Advanced: Labs, Administration, Architecture, Providers.
 * Factories leave primary navigation (secondary / lab / legacy).
 */
export const SIDEBAR_ITEMS: SidebarItem[] = [
  {
    id: "mission-control",
    label: "Mission Control",
    href: "/mission-control",
    icon: "🎯",
    section: "primary",
    status: "active",
    description: "Experiencia principal — AI CEO, misión, decisiones y actividad",
  },
  {
    id: "ventures",
    label: "Ventures",
    href: "/ventures",
    icon: "◫",
    section: "primary",
    status: "active",
    description: "Portfolio de empresas",
  },
  {
    id: "studio",
    label: "Studio",
    href: "/studio",
    icon: "✦",
    section: "primary",
    status: "active",
    description: "Outputs — company, brand, website, app, build, release",
  },
  {
    id: "company",
    label: "Company",
    href: "/company",
    icon: "▣",
    section: "primary",
    status: "active",
    description: "Company OS — overview ejecutivo por venture",
  },
  {
    id: "activity",
    label: "Activity",
    href: "/activity",
    icon: "◎",
    section: "primary",
    status: "active",
    description: "Actividad reciente, eventos y estado del sistema",
  },
  {
    id: "settings",
    label: "Settings",
    href: "/settings",
    icon: "⚙",
    section: "primary",
    status: "active",
    description: "Preferencias y configuración",
  },
  {
    id: "labs",
    label: "Labs",
    href: "/labs",
    icon: "🧪",
    section: "advanced",
    status: "lab",
    description: "Índice central de laboratorios",
    developmentOnly: true,
    requiredFeatureFlag: "labs",
  },
  {
    id: "administration",
    label: "Administration",
    href: "/admin",
    icon: "⊞",
    section: "advanced",
    status: "active",
    description: "Administración de plataforma",
  },
  {
    id: "architecture",
    label: "Architecture",
    href: "/docs",
    icon: "⬡",
    section: "advanced",
    status: "active",
    description: "Arquitectura y documentación V2",
  },
  {
    id: "providers",
    label: "Providers",
    href: "/ai",
    icon: "◇",
    section: "advanced",
    status: "active",
    description: "Proveedores IA y telemetría",
  },
  {
    id: "create-venture",
    label: "Crear Venture",
    href: "/os/creator",
    icon: "+",
    section: "system",
    status: "active",
    description: "Iniciar flujo Creator",
  },
  {
    id: "website-factory",
    label: "Website Factory",
    href: "/website-factory",
    icon: "🌐",
    section: "secondary",
    status: "lab",
    description: "Fábrica de sitios (advanced / lab)",
    developmentOnly: true,
  },
  {
    id: "mobile-factory",
    label: "Mobile Factory",
    href: "/mobile-factory",
    icon: "📱",
    section: "secondary",
    status: "lab",
    description: "Fábrica móvil (advanced / lab)",
    developmentOnly: true,
  },
  {
    id: "application-factory",
    label: "Application Factory",
    href: "/application-factory",
    icon: "💻",
    section: "secondary",
    status: "lab",
    description: "Fábrica de aplicaciones (advanced / lab)",
    developmentOnly: true,
  },
  {
    id: "marketplace",
    label: "Marketplace",
    href: "/marketplace",
    icon: "◇",
    section: "secondary",
    status: "active",
    description: "Plantillas y activos",
    children: [
      { label: "Hub Marketplace", href: "/marketplace" },
      { label: "Agentes IA", href: "/marketplace/agents" },
    ],
  },
  {
    id: "capital",
    label: "Capital",
    href: "/capital",
    icon: "◈",
    section: "secondary",
    status: "active",
    description: "Capital y financiación",
    children: [
      { label: "Capital Hub", href: "/capital" },
      { label: "OS Capital", href: "/os/capital" },
    ],
  },
  {
    id: "production",
    label: "Production",
    href: "/production",
    icon: "✓",
    section: "secondary",
    status: "active",
    description: "Salud de producción",
    children: [
      { label: "Production Health", href: "/production" },
      { label: "Cloud Foundation", href: "/cloud" },
    ],
  },
  {
    id: "ceo",
    label: "CEO",
    href: "/ceo",
    icon: "◉",
    section: "secondary",
    status: "legacy",
    description: "Director General (legacy — usar Mission Control)",
  },
  {
    id: "live",
    label: "Live",
    href: "/live",
    icon: "●",
    section: "secondary",
    status: "active",
    description: "Live AI Operations",
  },
  {
    id: "build",
    label: "Build",
    href: "/build",
    icon: "⚒",
    section: "secondary",
    status: "active",
    description: "Plataforma de build",
    children: [
      { label: "Build Pipeline", href: "/build" },
      { label: "Deployments", href: "/deployments" },
    ],
  },
  {
    id: "network",
    label: "Network",
    href: "/network",
    icon: "⬡",
    section: "secondary",
    status: "active",
    description: "Red de inteligencia",
  },
  {
    id: "self-evolution",
    label: "Self Evolution",
    href: "/self-evolution",
    icon: "↻",
    section: "secondary",
    status: "lab",
    description: "Motor de auto-evolución",
    developmentOnly: true,
  },
  {
    id: "enterprise",
    label: "Enterprise",
    href: "/enterprise",
    icon: "▣",
    section: "secondary",
    status: "active",
    description: "Multi-tenant y RBAC",
  },
  {
    id: "customer-success",
    label: "Customer Success",
    href: "/customer-success",
    icon: "♥",
    section: "secondary",
    status: "active",
    description: "Éxito del cliente",
  },
  {
    id: "forgeos-os",
    label: "ForgeOS OS",
    href: "/os",
    icon: "⌂",
    section: "system",
    status: "active",
    description: "Sistema operativo ForgeOS",
  },
  {
    id: "command-center",
    label: "Command Center",
    href: "/command-center",
    icon: "⌘",
    section: "system",
    status: "legacy",
    description: "Centro de mando del fundador (legacy)",
  },
];

/** Legacy routes — reachable but not shown in primary/secondary sidebar. */
export const LEGACY_SIDEBAR_ITEMS: SidebarItem[] = [
  {
    id: "home",
    label: "Home (legacy entry)",
    href: "/",
    icon: "⌂",
    section: "system",
    status: "legacy",
    description: "Landing — Mission Control es la entrada V2",
  },
  {
    id: "dashboard",
    label: "Dashboard (legacy)",
    href: "/dashboard",
    icon: "◉",
    section: "system",
    status: "legacy",
    description: "Consolidado en Mission Control",
  },
  {
    id: "founder",
    label: "Founder (legacy)",
    href: "/founder",
    icon: "★",
    section: "system",
    status: "legacy",
    description: "Consolidado en Mission Control",
  },
  {
    id: "creator",
    label: "Creator (legacy)",
    href: "/creator",
    icon: "✦",
    section: "system",
    status: "legacy",
    description: "Consolidado en Command Center / Creator OS",
  },
];

export const PRIMARY_SIDEBAR_ITEMS = SIDEBAR_ITEMS.filter((i) => i.section === "primary");
export const SECONDARY_SIDEBAR_ITEMS = SIDEBAR_ITEMS.filter((i) => i.section === "secondary");
export const ADVANCED_SIDEBAR_ITEMS = SIDEBAR_ITEMS.filter((i) => i.section === "advanced");
export const SYSTEM_SIDEBAR_ITEMS = SIDEBAR_ITEMS.filter((i) => i.section === "system");

export function getSidebarItemById(id: string): SidebarItem | undefined {
  return SIDEBAR_ITEMS.find((i) => i.id === id) ?? LEGACY_SIDEBAR_ITEMS.find((i) => i.id === id);
}
