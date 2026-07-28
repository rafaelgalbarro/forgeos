/** Venture Execution — capability registry. */

import type { ProgramCapability } from "../shared";

const capabilities: ProgramCapability[] = [
  {
    id: "build-engine",
    label: "Build Engine",
    description: "Orquestación de generación, QA, despliegue y timeline de build.",
    status: "active",
  },
  {
    id: "build-plan",
    label: "Build Plan",
    description: "Planificación técnica y fases de construcción.",
    status: "active",
  },
  {
    id: "connectors",
    label: "Build Connectors",
    description: "Conectores hacia herramientas de desarrollo (Cursor, etc.).",
    status: "scaffold",
  },
];

export function listVentureExecutionCapabilities(): ProgramCapability[] {
  return [...capabilities];
}
