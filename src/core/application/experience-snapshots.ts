/**
 * PROGRAM 6060 — Light experience snapshots for SSR / first paint.
 * Adapts Query Layer V2 concepts without loading engines or requiring UoW on UI routes.
 * When in-memory/query bus is available, presentation adapters may enrich from handlers.
 */

export type DataProvenance = "DEMO" | "ESTIMATED" | "CONNECTED" | "LIVE";

export type ViewAvailability =
  | "ready"
  | "empty"
  | "unavailable"
  | "permission_denied"
  | "partial"
  | "degraded"
  | "error";

export interface QueryMetaLight {
  query: string;
  generatedAt: string;
  provenance: DataProvenance;
  availability: ViewAvailability;
  degradedReason?: string;
  message?: string;
}

export interface MissionOverviewSnapshot {
  meta: QueryMetaLight;
  missionId: string | null;
  objective: string;
  stage: string;
  nextDecision: string | null;
  nextAction: string;
  ceoOpening: string;
  planSummary: string[];
  outputs: { id: string; label: string; status: string }[];
  activity: { id: string; at: string; label: string; kind: string }[];
  risks: { id: string; label: string; severity: "low" | "medium" | "high" }[];
  approvals: { id: string; label: string; status: "pending" | "approved" | "rejected" }[];
}

export interface MissionPlanSnapshot {
  meta: QueryMetaLight;
  missionId: string;
  stages: { id: string; label: string; status: string }[];
  milestones: string[];
}

export interface CompanyOverviewSnapshot {
  meta: QueryMetaLight;
  ventureId: string;
  name: string;
  executiveSummary: string;
  products: { id: string; name: string; status: string }[];
  customers: { id: string; label: string; provenance: DataProvenance }[];
  growth: { metric: string; value: string; provenance: DataProvenance }[];
  finance: { metric: string; value: string; provenance: DataProvenance }[];
  operations: string[];
  risks: { id: string; label: string; severity: string }[];
  roadmap: { id: string; label: string; when: string }[];
  activeMissions: { id: string; title: string; href: string }[];
  deployments: { id: string; label: string; environment: string; provenance: DataProvenance }[];
}

export interface StudioSectionsSnapshot {
  meta: QueryMetaLight;
  missionId: string;
  sections: { id: string; label: string; href: string; available: boolean }[];
}

function nowIso(): string {
  return new Date().toISOString();
}

/** Light GetMissionOverview fallback — pairs with Query Layer V2 GetMissionOverview. */
export function getMissionOverview(missionId?: string | null): MissionOverviewSnapshot {
  const id = missionId?.trim() || null;
  return {
    meta: {
      query: "GetMissionOverview",
      generatedAt: nowIso(),
      provenance: "DEMO",
      availability: id ? "ready" : "empty",
      message: id ? undefined : "Sin misión activa — describe un objetivo para empezar.",
    },
    missionId: id,
    objective: id
      ? `Avanzar la misión ${id} hacia el siguiente hito operable.`
      : "Define el objetivo de tu compañía o producto.",
    stage: id ? "execution" : "intake",
    nextDecision: id ? "Aprobar el plan de outputs propuesto" : null,
    nextAction: id
      ? "Revisar plan y confirmar outputs en Studio"
      : "Abre Mission Control y describe qué quieres construir",
    ceoOpening: id
      ? "Estoy listo para continuar. Revisemos el plan, riesgos y la siguiente decisión."
      : "Soy tu AI CEO. Cuéntame la empresa o producto que quieres crear y operaremos juntos.",
    planSummary: id
      ? ["Clarificar objetivo", "Seleccionar outputs", "Build / Preview", "Release / Deploy"]
      : [],
    outputs: id
      ? [
          { id: "brand", label: "Brand", status: "pending" },
          { id: "website", label: "Website", status: "pending" },
          { id: "webapp", label: "Web App", status: "pending" },
        ]
      : [],
    activity: id
      ? [
          {
            id: "a1",
            at: nowIso(),
            label: "Snapshot de misión cargado (Query Layer V2 light)",
            kind: "system",
          },
        ]
      : [],
    risks: id
      ? [{ id: "r1", label: "Datos demo — conectar proveedores para LIVE", severity: "low" }]
      : [],
    approvals: id
      ? [{ id: "ap1", label: "Aprobación de plan", status: "pending" }]
      : [],
  };
}

export function getMissionPlan(missionId: string): MissionPlanSnapshot {
  return {
    meta: {
      query: "GetMissionPlan",
      generatedAt: nowIso(),
      provenance: "DEMO",
      availability: missionId ? "ready" : "empty",
    },
    missionId,
    stages: [
      { id: "intake", label: "Intake", status: "done" },
      { id: "plan", label: "Plan", status: "active" },
      { id: "build", label: "Build", status: "pending" },
      { id: "release", label: "Release", status: "pending" },
    ],
    milestones: ["Objetivo confirmado", "Outputs seleccionados", "Preview listo", "Release"],
  };
}

export function getCompanyOverview(ventureId: string): CompanyOverviewSnapshot {
  const id = ventureId.trim() || "unknown";
  return {
    meta: {
      query: "GetCompanyOperatingOverview",
      generatedAt: nowIso(),
      provenance: "DEMO",
      availability: id === "unknown" ? "empty" : "ready",
    },
    ventureId: id,
    name: id.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    executiveSummary:
      "Vista ejecutiva Company OS — métricas etiquetadas DEMO | ESTIMATED | CONNECTED | LIVE. Nunca se presenta demo como LIVE.",
    products: [{ id: "p1", name: "Producto principal", status: "planned" }],
    customers: [{ id: "c1", label: "Segmento early adopters", provenance: "ESTIMATED" }],
    growth: [{ metric: "Pipeline", value: "—", provenance: "DEMO" }],
    finance: [{ metric: "Burn (estimado)", value: "—", provenance: "ESTIMATED" }],
    operations: ["Mission Control activo", "Studio disponible"],
    risks: [{ id: "risk1", label: "Sin conectores LIVE configurados", severity: "medium" }],
    roadmap: [{ id: "rm1", label: "MVP operable", when: "próximo ciclo" }],
    activeMissions: [
      {
        id: `mission-${id}`,
        title: `Misión activa · ${id}`,
        href: `/missions/mission-${id}`,
      },
    ],
    deployments: [
      {
        id: "d1",
        label: "Preview (no desplegado)",
        environment: "preview",
        provenance: "DEMO",
      },
    ],
  };
}

export const STUDIO_SECTION_DEFS = [
  { id: "company", label: "Company" },
  { id: "brand", label: "Brand" },
  { id: "website", label: "Website" },
  { id: "web-app", label: "Web App" },
  { id: "mobile", label: "Mobile" },
  { id: "backend", label: "Backend" },
  { id: "data", label: "Data" },
  { id: "code", label: "Code" },
  { id: "build", label: "Build" },
  { id: "preview", label: "Preview" },
  { id: "release", label: "Release" },
  { id: "deployment", label: "Deployment" },
] as const;

export function getStudioSections(missionId: string): StudioSectionsSnapshot {
  return {
    meta: {
      query: "GetStudioSections",
      generatedAt: nowIso(),
      provenance: "DEMO",
      availability: missionId ? "ready" : "empty",
    },
    missionId,
    sections: STUDIO_SECTION_DEFS.map((s) => ({
      id: s.id,
      label: s.label,
      href: `/studio/${missionId}/${s.id}`,
      available: true,
    })),
  };
}
