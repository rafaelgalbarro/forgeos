/** ForgeOS Business Skills — Business Payments risk (RC4.4). */

import { assessActionRisk, buildActionRiskMaps } from "../shared/factory";
import { PAYMENTS_DEF } from "./types";

export const PAYMENTS_RISK_MAP = buildActionRiskMaps(PAYMENTS_DEF);
export function assessPaymentsRisk(action: string) {
  return assessActionRisk(PAYMENTS_DEF, action);
}
