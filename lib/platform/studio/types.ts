/** Studio pillar — type contracts. */

import type { VentureId } from "../shared/types";

export interface StudioSnapshot {
  ventureId: VentureId;
  portfolioLinked: boolean;
  knowledgeDomains: string[];
  updatedAt: string;
}
