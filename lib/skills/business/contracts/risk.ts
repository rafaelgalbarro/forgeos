/** ForgeOS Business Skills — Business Contracts risk (RC4.4). */

import { assessActionRisk, buildActionRiskMaps } from "../shared/factory";
import { CONTRACTS_DEF } from "./types";

export const CONTRACTS_RISK_MAP = buildActionRiskMaps(CONTRACTS_DEF);
export function assessContractsRisk(action: string) {
  return assessActionRisk(CONTRACTS_DEF, action);
}
