/** Intelligence pillar — type contracts. */

import type { VentureId } from "../shared/types";

export interface IntelligenceSnapshot {
  ventureId: VentureId;
  modules: string[];
  memorySynced: boolean;
  updatedAt: string;
}
