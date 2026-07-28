/** Venture Platform Program — studio ops and future SaaS scaffold. */

import type { ProgramCapability, ProgramEngine } from "../shared";
import { PROGRAM_VERSION, createEmptyEpicRegistry } from "../shared";
import { VENTURE_PLATFORM_MODULES } from "./modules";
import { listVenturePlatformCapabilities } from "./registry";

const LINKED_PILLAR_IDS = ["studio", "launch", "growth"] as const;

export const VenturePlatformProgram: ProgramEngine = {
  id: "venture-platform",
  name: "Venture Platform",
  objective:
    "Operaciones de plataforma SaaS: launch, growth, notificaciones y headquarters.",
  status: "scaffold",
  linkedPillarIds: [...LINKED_PILLAR_IDS],
  existingModules: VENTURE_PLATFORM_MODULES,
  epicRegistry: createEmptyEpicRegistry(),

  getCapabilities(): ProgramCapability[] {
    return listVenturePlatformCapabilities();
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
