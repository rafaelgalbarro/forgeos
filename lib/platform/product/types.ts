/** Product pillar — type contracts. */

import type { VentureId } from "../shared/types";

export interface ProductModuleId {
  prd: "prd";
  roadmap: "roadmap";
  ux: "ux";
  mvp: "mvp";
}

export interface ProductSnapshot {
  ventureId: VentureId;
  modules: string[];
  hasPrd: boolean;
  updatedAt: string;
}
