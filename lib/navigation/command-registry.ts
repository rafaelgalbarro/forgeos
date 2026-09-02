/** PROGRAM 4100 + 6060 — Unified command palette registry. */

export type CommandStatus = "active" | "legacy" | "lab" | "hidden";

export interface ProductCommand {
  id: string;
  label: string;
  description?: string;
  href?: string;
  keywords?: string[];
  group: "create" | "navigate" | "execute" | "search";
  status?: CommandStatus;
}

export const PRODUCT_COMMANDS: ProductCommand[] = [
  {
    id: "create-venture",
    label: "Create Venture",
    description: "Commands V2 — iniciar Creator",
    href: "/os/creator",
    keywords: ["nuevo", "empresa", "startup", "creator", "venture"],
    group: "create",
    status: "active",
  },
  {
    id: "start-mission",
    label: "Start Mission",
    description: "Commands V2 — Mission Control",
    href: "/mission-control",
    keywords: ["mission", "misión", "start", "ceo"],
    group: "execute",
    status: "active",
  },
  {
    id: "open-studio",
    label: "Open Studio",
    description: "Commands V2 — Studio V2",
    href: "/studio",
    keywords: ["studio", "outputs", "preview"],
    group: "navigate",
    status: "active",
  },
  {
    id: "request-change",
    label: "Request Change",
    description: "Commands V2 — cambio en Studio",
    href: "/studio",
    keywords: ["change", "cambio", "request"],
    group: "execute",
    status: "active",
  },
  {
    id: "build",
    label: "Build",
    description: "Commands V2 StartBuild",
    href: "/build",
    keywords: ["build", "pipeline"],
    group: "execute",
    status: "active",
  },
  {
    id: "preview",
    label: "Preview",
    description: "Commands V2 CreatePreview",
    href: "/studio",
    keywords: ["preview", "sandbox"],
    group: "execute",
    status: "active",
  },
  {
    id: "create-release",
    label: "Create Release",
    description: "Commands V2 CreateRelease",
    href: "/studio",
    keywords: ["release", "release"],
    group: "execute",
    status: "active",
  },
  {
    id: "deploy-preview",
    label: "Deploy Preview",
    description: "Commands V2 DeployPreview",
    href: "/deployments",
    keywords: ["deploy", "preview"],
    group: "execute",
    status: "active",
  },
  {
    id: "review-company",
    label: "Review Company",
    description: "Commands V2 — Company OS",
    href: "/company",
    keywords: ["company", "review", "os"],
    group: "navigate",
    status: "active",
  },
  {
    id: "pause-mission",
    label: "Pause Mission",
    description: "Commands V2 PauseMission",
    href: "/mission-control",
    keywords: ["pause", "pausar", "mission"],
    group: "execute",
    status: "active",
  },
  {
    id: "open-mission-control",
    label: "Mission Control",
    description: "Entrada principal ForgeOS V2",
    href: "/mission-control",
    keywords: ["mission", "control", "ceo"],
    group: "navigate",
    status: "active",
  },
  {
    id: "open-activity",
    label: "Activity",
    description: "Hub de actividad",
    href: "/activity",
    keywords: ["activity", "actividad", "feed"],
    group: "navigate",
    status: "active",
  },
  {
    id: "open-settings",
    label: "Settings",
    description: "Preferencias",
    href: "/settings",
    keywords: ["settings", "config"],
    group: "navigate",
    status: "active",
  },
  {
    id: "open-command-center",
    label: "Command Center",
    description: "Centro de mando (legacy)",
    href: "/command-center",
    keywords: ["command", "centro", "mando", "home", "hub"],
    group: "navigate",
    status: "legacy",
  },
  {
    id: "open-os",
    label: "ForgeOS Desktop",
    description: "Sistema operativo ForgeOS",
    href: "/os",
    keywords: ["os", "desktop", "sistema"],
    group: "navigate",
    status: "active",
  },
  {
    id: "open-founder",
    label: "Founder Dashboard",
    description: "Experiencia fundador (legacy)",
    href: "/founder",
    keywords: ["founder", "fundador", "dashboard"],
    group: "navigate",
    status: "legacy",
  },
  {
    id: "open-creator",
    label: "Creator Flow",
    description: "Pipeline Idea → Growth (legacy)",
    href: "/creator",
    keywords: ["creator", "flujo", "idea"],
    group: "navigate",
    status: "legacy",
  },
  {
    id: "open-ceo",
    label: "Open CEO",
    description: "Director General (legacy — prefer Mission Control)",
    href: "/ceo",
    keywords: ["ceo", "director", "ejecutivo"],
    group: "navigate",
    status: "legacy",
  },
  {
    id: "live-ai",
    label: "Live AI",
    description: "Operaciones en vivo",
    href: "/live",
    keywords: ["live", "ai", "operaciones"],
    group: "navigate",
    status: "active",
  },
  {
    id: "deployments",
    label: "Deployments",
    description: "Pipeline de build unificado",
    href: "/deployments",
    keywords: ["deployments", "despliegues", "pipeline"],
    group: "navigate",
    status: "active",
  },
  {
    id: "capital",
    label: "Capital",
    description: "Capital y financiación",
    href: "/capital",
    keywords: ["capital", "financiación", "inversión"],
    group: "navigate",
    status: "active",
  },
  {
    id: "open-investment",
    label: "ForgeOS Investment",
    description: "ForgeOS Investment — AI Investment Operating System",
    href: "/investment",
    keywords: ["investment", "forgeos investment", "ibkr", "broker", "portfolio", "trading", "inversión"],
    group: "navigate",
    status: "active",
  },
  {
    id: "marketplace",
    label: "Marketplace",
    description: "Plantillas y activos",
    href: "/marketplace",
    keywords: ["marketplace", "plantillas", "store"],
    group: "navigate",
    status: "active",
  },
  {
    id: "production",
    label: "Production",
    description: "Salud de producción 24/7",
    href: "/production",
    keywords: ["production", "producción", "health", "salud"],
    group: "navigate",
    status: "active",
  },
  {
    id: "view-labs",
    label: "View Labs",
    description: "Índice central de laboratorios",
    href: "/labs",
    keywords: ["labs", "laboratorio", "ingeniería"],
    group: "navigate",
    status: "lab",
  },
  {
    id: "venture-aurea",
    label: "Aurea Facilities",
    description: "Venture E2E — Aurea Facilities",
    href: "/ventures/aurea-facilities",
    keywords: ["aurea", "facilities", "venture"],
    group: "navigate",
    status: "active",
  },
  {
    id: "company-aurea",
    label: "Company OS — Aurea",
    description: "Company OS executive",
    href: "/company/aurea-facilities",
    keywords: ["company", "aurea"],
    group: "navigate",
    status: "active",
  },
];

const VISIBLE_COMMANDS = PRODUCT_COMMANDS.filter((c) => c.status !== "hidden");

export function filterProductCommands(query: string, limit = 12): ProductCommand[] {
  const q = query.trim().toLowerCase();
  if (!q) return VISIBLE_COMMANDS.slice(0, limit);
  return VISIBLE_COMMANDS.filter(
    (c) =>
      c.label.toLowerCase().includes(q) ||
      c.description?.toLowerCase().includes(q) ||
      c.keywords?.some((k) => k.toLowerCase().includes(q))
  ).slice(0, limit);
}
