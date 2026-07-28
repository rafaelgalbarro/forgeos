/** Venture Ecosystem Program — capital and marketplace. */

import type { ProgramCapability, ProgramEngine } from "../shared";
import { PROGRAM_VERSION, createEmptyEpicRegistry } from "../shared";
import { VENTURE_ECOSYSTEM_MODULES } from "./modules";
import { listVentureEcosystemCapabilities } from "./registry";

const LINKED_PILLAR_IDS = ["capital"] as const;

export const VentureEcosystemProgram: ProgramEngine = {
  id: "venture-ecosystem",
  name: "Venture Ecosystem",
  objective: "Capital, marketplace y conexión con el ecosistema externo de ventures.",
  status: "scaffold",
  linkedPillarIds: [...LINKED_PILLAR_IDS],
  existingModules: VENTURE_ECOSYSTEM_MODULES,
  epicRegistry: createEmptyEpicRegistry(),

  getCapabilities(): ProgramCapability[] {
    return listVentureEcosystemCapabilities();
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
