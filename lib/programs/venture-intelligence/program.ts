/** Venture Intelligence Program — memory, patterns and executive orchestration. */

import type { ProgramCapability, ProgramEngine } from "../shared";
import { PROGRAM_VERSION, createEmptyEpicRegistry } from "../shared";
import { VENTURE_INTELLIGENCE_MODULES } from "./modules";
import { listVentureIntelligenceCapabilities } from "./registry";

const LINKED_PILLAR_IDS = ["intelligence", "ceo"] as const;

export const VentureIntelligenceProgram: ProgramEngine = {
  id: "venture-intelligence",
  name: "Venture Intelligence",
  objective:
    "Capa de inteligencia, memoria y orquestación ejecutiva (CEO, Board, FOS).",
  status: "scaffold",
  linkedPillarIds: [...LINKED_PILLAR_IDS],
  existingModules: VENTURE_INTELLIGENCE_MODULES,
  epicRegistry: createEmptyEpicRegistry(),

  getCapabilities(): ProgramCapability[] {
    return listVentureIntelligenceCapabilities();
  },

  getDescriptor() {
    return {
      id: this.id,
      name: this.name,
      version: PROGRAM_VERSION,
      objective: this.objective,
      status: this.status,
      linkedPillarIds: [...this.linkedPillarIds],
      existingModules: [...this.existingModules],
      epicRegistry: this.epicRegistry,
      capabilities: this.getCapabilities(),
    };
  },
};
