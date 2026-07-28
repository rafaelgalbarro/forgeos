/** ForgeOS Business Skills — Business ERP risk (RC4.4). */

import { assessActionRisk, buildActionRiskMaps } from "../shared/factory";
import { ERP_DEF } from "./types";

export const ERP_RISK_MAP = buildActionRiskMaps(ERP_DEF);
export function assessErpRisk(action: string) {
  return assessActionRisk(ERP_DEF, action);
}
