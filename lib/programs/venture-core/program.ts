/** Venture Core Program — strategy, product and studio operations. */

import type { ProgramCapability, ProgramEngine } from "../shared";
import { PROGRAM_VERSION, createEmptyEpicRegistry } from "../shared";
import { VENTURE_CORE_MODULES } from "./modules";
import { listVentureCoreCapabilities } from "./registry";

const LINKED_PILLAR_IDS = ["strategy", "product", "studio"] as const;

export const VentureCoreProgram: ProgramEngine = {
  id: "venture-core",
  name: "Venture Core",
  objective:
    "Estrategia, producto y operaciones de estudio: discovery, portfolio, simulación, export y design system.",
  status: "active",
  linkedPillarIds: [...LINKED_PILLAR_IDS],
  existingModules: VENTURE_CORE_MODULES,
  epicRegistry: createEmptyEpicRegistry(),

  getCapabilities(): ProgramCapability[] {
    return listVentureCoreCapabilities();
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
