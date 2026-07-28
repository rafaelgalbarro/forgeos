/** Venture Intelligence — existing module references (paths only). */

import type { ProgramModuleRef } from "../shared";

export const VENTURE_INTELLIGENCE_MODULES: ProgramModuleRef[] = [
  { path: "lib/intelligence-layer", label: "Intelligence Layer", connected: true },
  { path: "lib/venture-intelligence", label: "Venture Intelligence RC8", connected: true },
  { path: "lib/forge-capital", label: "Forge Capital RC8", connected: true },
  { path: "lib/ceo", label: "CEO", connected: false, notes: "No conectado a UI." },
  { path: "lib/board", label: "Board", connected: false, notes: "No conectado a UI." },
  { path: "lib/fos", label: "FOS Kernel", connected: false, notes: "Desconectado — scaffold." },
];
