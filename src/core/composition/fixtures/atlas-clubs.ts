/**
 * PROGRAM 6085 — ATLAS CLUBS certification fixture (data only; not hardcoded in engines).
 */
export const ATLAS_CLUBS_FIXTURE = {
  name: "ATLAS CLUBS",
  slug: "atlas-clubs",
  description:
    "Plataforma SaaS para centros deportivos que gestiona socios, reservas, clases, entrenadores, pagos, planes, accesos, métricas e incidencias.",
  changeRequest:
    "Añadir reservas recurrentes, bonos familiares y un rol de entrenador con permisos limitados.",
  workspaceName: "ATLAS CLUBS Workspace",
  ventureName: "ATLAS CLUBS",
  capabilities: [
    "Venture",
    "Brand",
    "Website",
    "Web Application",
    "Backend",
    "Database",
    "Code Generation",
    "Static Validation",
    "Preview Plan",
    "QA",
    "Release",
    "Preview Deployment Plan",
  ] as const,
  impactTargets: {
    recurrentBookings: true,
    familyVouchers: true,
    limitedTrainerRole: true,
  },
} as const;

export type AtlasClubsFixture = typeof ATLAS_CLUBS_FIXTURE;
