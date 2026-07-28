/** CEO pillar — type contracts. */

import type { VentureId } from "../shared/types";

export interface CeoPriorityItem {
  id: string;
  title: string;
  urgency: "low" | "medium" | "high";
  ventureId?: VentureId;
}

export interface CeoBriefingStub {
  ventureId: VentureId;
  summary: string;
  priorities: CeoPriorityItem[];
  generatedAt: string;
}

export interface CeoSnapshot {
  ventureId: VentureId;
  modules: string[];
  updatedAt: string;
}
