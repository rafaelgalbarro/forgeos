/** ForgeOS Business Skills — Business Customers risk (RC4.4). */

import { assessActionRisk, buildActionRiskMaps } from "../shared/factory";
import { CUSTOMERS_DEF } from "./types";

export const CUSTOMERS_RISK_MAP = buildActionRiskMaps(CUSTOMERS_DEF);
export function assessCustomersRisk(action: string) {
  return assessActionRisk(CUSTOMERS_DEF, action);
}
