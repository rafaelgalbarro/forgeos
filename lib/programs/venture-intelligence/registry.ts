/** Venture Intelligence — capability registry. */

import type { ProgramCapability } from "../shared";

const capabilities: ProgramCapability[] = [
  {
    id: "memory",
    label: "Venture Memory",
    description: "Memoria persistente de decisiones y contexto del venture.",
    status: "active",
  },
  {
    id: "decision-engine",
    label: "Decision Engine",
    description: "Motor de decisiones y recomendaciones.",
    status: "active",
  },
  {
    id: "pattern-engine",
    label: "Pattern Engine",
    description: "Detección de patrones en ventures y portafolio.",
    status: "scaffold",
  },
  {
    id: "ceo-office",
    label: "CEO Office",
    description: "Orquestación ejecutiva y prioridades.",
    status: "scaffold",
  },
  {
    id: "board",
    label: "AI Board",
    description: "Sesiones de board, debate y consenso.",
    status: "scaffold",
  },
  {
    id: "fos-kernel",
    label: "FOS Kernel",
    description: "Kernel de orquestación ForgeOS (desconectado).",
    status: "scaffold",
  },
];

export function listVentureIntelligenceCapabilities(): ProgramCapability[] {
  return [...capabilities];
}
