/** Capital pillar — public exports. */

export type {
  CapitalModuleId,
  InvestorPackSection,
  DataRoomDocument,
  CapTableEntry,
  ValuationModel,
  PitchDeckSlide,
  ExitScenario,
  IpoReadiness,
  FundraisingRound,
  CapitalSnapshot,
} from "./types";
export { CapitalPillarEngine, capitalPillarEngine } from "./engine";
export { listCapitalCapabilities, getCapitalCapability } from "./registry";
