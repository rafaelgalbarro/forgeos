/** Venture Execution Program — technical build and delivery. */

import type { ProgramCapability, ProgramEngine } from "../shared";
import { PROGRAM_VERSION, createEmptyEpicRegistry } from "../shared";
import { VENTURE_EXECUTION_MODULES } from "./modules";
import { listVentureExecutionCapabilities } from "./registry";

const LINKED_PILLAR_IDS = ["build"] as const;

export const VentureExecutionProgram: ProgramEngine = {
  id: "venture-execution",
  name: "Venture Execution",
  objective: "Ejecución técnica: build engine, build plan y conectores de desarrollo.",
  status: "active",
  linkedPillarIds: [...LINKED_PILLAR_IDS],
  existingModules: VENTURE_EXECUTION_MODULES,
  epicRegistry: createEmptyEpicRegistry(),

  getCapabilities(): ProgramCapability[] {
    return listVentureExecutionCapabilities();
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
