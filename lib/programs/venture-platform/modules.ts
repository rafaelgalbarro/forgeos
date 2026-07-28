/** Venture Platform — existing module references (paths only). */

import type { ProgramModuleRef } from "../shared";

export const VENTURE_PLATFORM_MODULES: ProgramModuleRef[] = [
  { path: "lib/platform/launch", label: "Launch Pillar", connected: false },
  { path: "lib/platform/growth", label: "Growth Pillar", connected: false },
  { path: "lib/notifications", label: "Notifications", connected: true },
  { path: "lib/headquarters", label: "Headquarters", connected: true },
];
