/**
 * PROGRAM 6090 — ORBITA SPORTS certification fixture (generic fixture data only).
 */
export const ORBITA_SPORTS_FIXTURE = {
  name: "ORBITA SPORTS",
  slug: "orbita-sports",
  description:
    "Plataforma SaaS para centros deportivos que gestiona socios, reservas, clases, entrenadores, accesos, pagos, planes, incidencias y metricas operativas.",
  workspaceName: "ORBITA SPORTS Workspace",
  ventureName: "ORBITA SPORTS",
  missionFocus: [
    "socios",
    "reservas",
    "clases",
    "entrenadores",
    "accesos",
    "pagos",
    "planes",
    "incidencias",
    "metricas",
  ] as const,
} as const;

export type OrbitaSportsFixture = typeof ORBITA_SPORTS_FIXTURE;
