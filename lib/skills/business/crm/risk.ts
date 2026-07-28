/** ForgeOS Business Skills — Business CRM risk (RC4.4). */

import { assessActionRisk, buildActionRiskMaps } from "../shared/factory";
import { CRM_DEF } from "./types";

export const CRM_RISK_MAP = buildActionRiskMaps(CRM_DEF);
export function assessCrmRisk(action: string) {
  return assessActionRisk(CRM_DEF, action);
}
