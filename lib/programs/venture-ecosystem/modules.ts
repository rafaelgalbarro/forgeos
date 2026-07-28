/** Venture Ecosystem — existing module references (paths only). */

import type { ProgramModuleRef } from "../shared";

export const VENTURE_ECOSYSTEM_MODULES: ProgramModuleRef[] = [
  { path: "lib/platform/capital", label: "Capital Pillar", connected: false },
  {
    path: "lib/marketplace",
    label: "Marketplace",
    connected: false,
    notes: "Futuro — no existe aún en lib/.",
  },
];
