/** PROGRAM 5350 — Generic demo fixtures (no venture-specific motor logic). */

export interface GenericDemoScenario {
  id: string;
  label: string;
  description: string;
  entities: string[];
  roles: { id: string; label: string; permissions: string[] }[];
  flows: { id: string; label: string; steps: string[] }[];
}

const ENTITY_TEMPLATES = [
  "technicians",
  "incidents",
  "routes",
  "work_orders",
  "inventory",
  "clients",
  "budgets",
  "billing",
  "analytics",
];

export function buildGenericDemoScenario(ideaText: string): GenericDemoScenario {
  const keyword = ideaText.split(/\s+/).slice(0, 3).join(" ") || "operaciones";
  const entityCount = Math.min(ENTITY_TEMPLATES.length, 6 + (ideaText.length % 4));

  return {
    id: "default",
    label: "Escenario demo",
    description: `Flujos de demostración para: ${keyword}`,
    entities: ENTITY_TEMPLATES.slice(0, entityCount),
    roles: [
      { id: "admin", label: "Administrador", permissions: ["read", "write", "delete", "manage_users"] },
      { id: "manager", label: "Gestor", permissions: ["read", "write", "approve"] },
      { id: "technician", label: "Técnico de campo", permissions: ["read", "write_own"] },
      { id: "viewer", label: "Visualizador", permissions: ["read"] },
    ],
    flows: [
      {
        id: "onboarding",
        label: "Onboarding",
        steps: ["Login demo", "Dashboard", "Crear registro", "Ver detalle"],
      },
      {
        id: "operations",
        label: "Operaciones",
        steps: ["Listar items", "Filtrar", "Asignar", "Cerrar"],
      },
      {
        id: "reporting",
        label: "Informes",
        steps: ["Analytics", "Exportar", "Compartir"],
      },
    ],
  };
}

export function buildGenericBackendEntities(ideaText: string): {
  entities: { name: string; fields: string[]; relations?: string[] }[];
  relations: { from: string; to: string; type: string }[];
} {
  const scenario = buildGenericDemoScenario(ideaText);
  const entities = scenario.entities.map((name) => ({
    name,
    fields: ["id", "name", "status", "created_at", "updated_at"],
    relations: name === "incidents" ? ["technicians", "clients"] : undefined,
  }));

  const relations = [
    { from: "incidents", to: "technicians", type: "many-to-one" },
    { from: "work_orders", to: "routes", type: "many-to-one" },
    { from: "billing", to: "clients", type: "many-to-one" },
  ].filter((r) => scenario.entities.includes(r.from) && scenario.entities.includes(r.to));

  return { entities, relations };
}

export const WEBSITE_DEMO_PAGES = [
  { id: "home", path: "/", label: "Home" },
  { id: "features", path: "/features", label: "Features" },
  { id: "pricing", path: "/pricing", label: "Pricing" },
  { id: "about", path: "/about", label: "About" },
  { id: "contact", path: "/contact", label: "Contact" },
  { id: "legal", path: "/legal", label: "Legal" },
  { id: "blog", path: "/blog", label: "Blog" },
];

export const MOBILE_DEMO_SCREENS = [
  { id: "home", path: "/home", label: "Inicio" },
  { id: "list", path: "/list", label: "Listado" },
  { id: "detail", path: "/detail", label: "Detalle" },
  { id: "profile", path: "/profile", label: "Perfil" },
  { id: "settings", path: "/settings", label: "Ajustes" },
];
