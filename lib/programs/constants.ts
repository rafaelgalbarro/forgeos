/** ForgeOS Master Program 2030 — metadata constants. */

import type { ProgramId } from "./types";

export const PROGRAM_VERSION = "2030.0.0" as const;
export const PROGRAM_NAME = "ForgeOS Master Program" as const;

export const PROGRAM_NAMES: Record<ProgramId, string> = {
  "venture-core": "Venture Core",
  "venture-execution": "Venture Execution",
  "venture-intelligence": "Venture Intelligence",
  "venture-platform": "Venture Platform",
  "venture-ecosystem": "Venture Ecosystem",
};

export const PROGRAM_OBJECTIVES: Record<ProgramId, string> = {
  "venture-core":
    "Estrategia, producto y operaciones de estudio: discovery, portfolio, simulación, export y design system.",
  "venture-execution":
    "Ejecución técnica: build engine, build plan y conectores de desarrollo.",
  "venture-intelligence":
    "Capa de inteligencia, memoria y orquestación ejecutiva (CEO, Board, FOS).",
  "venture-platform":
    "Operaciones de plataforma SaaS: launch, growth, notificaciones y headquarters.",
  "venture-ecosystem":
    "Capital, marketplace y conexión con el ecosistema externo de ventures.",
};

export const PROGRAM_STATUSES: Record<ProgramId, "active" | "scaffold"> = {
  "venture-core": "active",
  "venture-execution": "active",
  "venture-intelligence": "scaffold",
  "venture-platform": "scaffold",
  "venture-ecosystem": "scaffold",
};

export const PROGRAM_PRINCIPLES = [
  "Decision First",
  "Founder Centric",
  "No Module Outside Programs",
  "Pillar Alignment",
  "Incremental Delivery",
  "Zero Breaking Changes",
  "Documentation as Contract",
  "Scaffold Before Wire",
] as const;

export type ProgramPrinciple = (typeof PROGRAM_PRINCIPLES)[number];

export const PROGRAM_IDS: ProgramId[] = [
  "venture-core",
  "venture-execution",
  "venture-intelligence",
  "venture-platform",
  "venture-ecosystem",
];
