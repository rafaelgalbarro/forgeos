/** Venture Execution — existing module references (paths only). */

import type { ProgramModuleRef } from "../shared";

export const VENTURE_EXECUTION_MODULES: ProgramModuleRef[] = [
  { path: "lib/build-engine", label: "Build Engine", connected: true },
  {
    path: "lib/build-plan",
    label: "Build Plan",
    connected: true,
    notes: "Compartido con Venture Core — referencia cruzada.",
  },
  {
    path: "lib/platform/build/connectors",
    label: "Build Connectors",
    connected: true,
  },
];
