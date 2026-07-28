/** Venture Core — existing module references (paths only). */

import type { ProgramModuleRef } from "../shared";

export const VENTURE_CORE_MODULES: ProgramModuleRef[] = [
  { path: "lib/discovery", label: "Discovery", connected: true },
  { path: "lib/portfolio", label: "Portfolio", connected: true },
  { path: "lib/intelligence", label: "Intelligence", connected: true },
  { path: "lib/venture-simulator", label: "Venture Simulator", connected: true },
  { path: "lib/build-plan", label: "Build Plan", connected: true },
  { path: "lib/export", label: "Export", connected: true },
  { path: "lib/design-system", label: "Design System", connected: true },
  { path: "lib/knowledge", label: "Knowledge", connected: true },
];
