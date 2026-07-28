/** Venture Core — capability registry. */

import type { ProgramCapability } from "../shared";

const capabilities: ProgramCapability[] = [
  {
    id: "discovery",
    label: "Discovery",
    description: "Clasificación de ideas, preguntas y riesgos de definición.",
    status: "active",
  },
  {
    id: "portfolio",
    label: "Portfolio",
    description: "Gestión de ventures y snapshot de portafolio.",
    status: "active",
  },
  {
    id: "simulator",
    label: "Venture Simulator",
    description: "Modelado de escenarios y venture scoring.",
    status: "active",
  },
  {
    id: "export",
    label: "Export",
    description: "Exportación ZIP/PDF de artefactos del venture.",
    status: "active",
  },
  {
    id: "design-system",
    label: "Design System",
    description: "Tokens, componentes y guías de marca ForgeOS.",
    status: "active",
  },
  {
    id: "knowledge",
    label: "Knowledge",
    description: "Base de conocimiento estructurada del estudio.",
    status: "active",
  },
];

export function listVentureCoreCapabilities(): ProgramCapability[] {
  return [...capabilities];
}
