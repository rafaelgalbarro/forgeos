/** Capital pillar — type contracts. */

import type { VentureId } from "../shared/types";

export type CapitalModuleId =
  | "investor-pack"
  | "data-room"
  | "cap-table"
  | "valuation"
  | "pitch-deck"
  | "exit"
  | "ipo"
  | "fundraising";

export interface InvestorPackSection {
  id: string;
  title: string;
  status: "missing" | "draft" | "ready";
}

export interface DataRoomDocument {
  id: string;
  category: "legal" | "financial" | "product" | "team";
  name: string;
  url?: string;
}

export interface CapTableEntry {
  holder: string;
  shares: number;
  percentage: number;
  type: "founder" | "investor" | "employee" | "option-pool";
}

export interface ValuationModel {
  method: "dcf" | "comparables" | "scorecard";
  preMoney: number | null;
  postMoney: number | null;
  currency: string;
}

export interface PitchDeckSlide {
  index: number;
  title: string;
  notes: string;
}

export interface ExitScenario {
  type: "acquisition" | "ipo" | "secondary";
  timeline: string;
  valuationRange: [number, number] | null;
}

export interface IpoReadiness {
  score: number;
  gaps: string[];
}

export interface FundraisingRound {
  stage: "pre-seed" | "seed" | "series-a" | "series-b+";
  target: number;
  committed: number;
  status: "planning" | "active" | "closed";
}

export interface CapitalSnapshot {
  ventureId: VentureId;
  modules: CapitalModuleId[];
  fundraisingActive: boolean;
  updatedAt: string;
}
